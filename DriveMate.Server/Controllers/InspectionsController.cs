using System.Security.Claims;
using DriveMate.Server.Data;
using DriveMate.Server.DTOs;
using DriveMate.Server.Models;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Controllers;

/// <summary>
/// Trip check-in (pick-up) and check-out (return) with photos, odometer and fuel.
/// Pick-up starts the trip (Confirmed → Ongoing); return ends it (Ongoing → Completed).
/// </summary>
[ApiController]
[Authorize]
[Route("api/bookings/{bookingId:int}/inspections")]
public class InspectionsController(AppDbContext db, Notifier notifier) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>Visible to the customer, vehicle owner, driver and admins.</summary>
    [HttpGet]
    public async Task<ActionResult<List<InspectionDto>>> List(int bookingId)
    {
        var uid = UserId;
        var canSee = User.IsInRole(Roles.Admin)
            || await db.Bookings.InvolvingUser(uid).AnyAsync(b => b.Id == bookingId);
        if (!canSee) return NotFound();

        return await db.TripInspections.AsNoTracking()
            .Where(i => i.BookingId == bookingId)
            .OrderBy(i => i.Stage)
            .Select(i => new InspectionDto(i.Id, i.Stage, i.OdometerKm, i.FuelPercent, i.Notes,
                i.CreatedBy!.FullName, i.CreatedAt,
                i.Photos.OrderBy(p => p.Angle).Select(p => new InspectionPhotoDto(p.FileId, p.Angle)).ToList()))
            .ToListAsync();
    }

    /// <summary>The customer, the vehicle owner (hand-over) or the booked driver records the car's condition.</summary>
    [HttpPost]
    public async Task<ActionResult<InspectionDto>> Create(int bookingId, CreateInspectionRequest request)
    {
        var uid = UserId;
        var booking = await db.Bookings
            .Include(b => b.Inspections)
            .InvolvingUser(uid)
            .FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking is null) return NotFound();

        var stage = request.Stage!.Value;
        if (booking.Inspections.Any(i => i.Stage == stage))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: $"The {stage} inspection was already done.");

        if (stage == InspectionStage.PickUp)
        {
            if (booking.Status != BookingStatus.Confirmed)
                return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Only confirmed bookings can be picked up. Pay first.");
            if (booking.StartDate.Date > DateTime.Today)
                return Problem(statusCode: StatusCodes.Status400BadRequest, title: "You can check in on the day of pick-up.");
        }
        else
        {
            if (booking.Status != BookingStatus.Ongoing)
                return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Only ongoing trips can be returned.");
            var pickup = booking.Inspections.FirstOrDefault(i => i.Stage == InspectionStage.PickUp);
            if (pickup is not null && request.OdometerKm < pickup.OdometerKm)
                return Problem(statusCode: StatusCodes.Status400BadRequest,
                    title: $"Odometer can't be lower than at pick-up ({pickup.OdometerKm:N0} km).");
        }

        // Photos must be uploads for THIS booking, by this user, not already used elsewhere.
        var fileIds = request.Photos.Select(p => p.FileId!.Value).ToList();
        var validFiles = await db.StoredFiles.CountAsync(f => fileIds.Contains(f.Id)
            && f.UploadedById == uid && f.BookingId == bookingId
            && !db.TripPhotos.Any(p => p.FileId == f.Id));
        if (validFiles != fileIds.Count)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Some photos are invalid. Please upload them again.");

        var inspection = new TripInspection
        {
            BookingId = bookingId,
            Stage = stage,
            OdometerKm = request.OdometerKm,
            FuelPercent = request.FuelPercent,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedById = uid,
            Photos = request.Photos.Select(p => new TripPhoto { FileId = p.FileId!.Value, Angle = p.Angle!.Value }).ToList(),
        };
        db.TripInspections.Add(inspection);

        if (stage == InspectionStage.PickUp)
        {
            booking.Status = BookingStatus.Ongoing;
            // Cash on pick-up: rental and deposit are handed over now.
            booking.IsPaid = true;
            if (booking.DepositStatus == DepositStatus.Unpaid)
                booking.DepositStatus = DepositStatus.Held;
        }
        else
        {
            // The deposit stays Held until the owner checks the return photos (Owner tools, next phase).
            booking.Status = BookingStatus.Completed;
        }

        notifier.BookingParties(await db.Bookings.Parties(bookingId).FirstAsync(), uid,
            stage == InspectionStage.PickUp ? "Trip started" : "Vehicle returned",
            stage == InspectionStage.PickUp
                ? $"Pick-up photos for #{bookingId} are in. Have a safe trip!"
                : $"Return photos for #{bookingId} are in. Owner: please check them and settle the deposit.");
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(List), new { bookingId }, new InspectionDto(
            inspection.Id, inspection.Stage, inspection.OdometerKm, inspection.FuelPercent, inspection.Notes,
            User.FindFirstValue(ClaimTypes.Name) ?? "", inspection.CreatedAt,
            inspection.Photos.OrderBy(p => p.Angle).Select(p => new InspectionPhotoDto(p.FileId, p.Angle)).ToList()));
    }
}
