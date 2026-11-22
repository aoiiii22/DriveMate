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
/// The owner dashboard: list cars, manage the calendar, see bookings and earnings,
/// and settle the deposit after a trip. Every query is limited to the caller's own cars.
/// </summary>
[ApiController]
[Authorize(Roles = Roles.Owner)]
[Route("api/owner")]
public class OwnerController(AppDbContext db, Notifier notifier) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private IQueryable<Vehicle> MyVehicles() => db.Vehicles.Where(v => v.OwnerId == UserId);
    private IQueryable<Booking> MyBookings() => db.Bookings.Where(b => b.Vehicle!.OwnerId == UserId);

    // ------------------------------- Cars -------------------------------

    [HttpGet("vehicles")]
    public async Task<ActionResult<List<OwnerVehicleDto>>> Vehicles()
    {
        var now = DateTime.Now;
        return await MyVehicles().AsNoTracking()
            .OrderBy(v => v.Name)
            .Select(v => new OwnerVehicleDto(v.Id, v.Name, v.Type, v.Seats, v.Transmission, v.FuelType,
                v.PricePerDay, v.ImageUrl, v.PhotoId, v.PlateNumber, v.Location, v.Description, v.IsAvailable, v.Rating,
                v.Bookings.Count(b => b.Status == BookingStatus.Completed),
                v.Bookings.Where(b => b.Status == BookingStatus.Completed).Sum(b => b.OwnerPayout + b.DepositDeduction),
                v.Bookings.Where(b => BookingRules.BlockingStatuses.Contains(b.Status) && b.EndDate >= now)
                    .OrderBy(b => b.StartDate).Select(b => (DateTime?)b.StartDate).FirstOrDefault(),
                v.DeliveryFee, v.AirportFee, v.RatingCount))
            .ToListAsync();
    }

    /// <summary>List a new car. It appears in search straight away.</summary>
    [HttpPost("vehicles")]
    public async Task<ActionResult<OwnerVehicleDto>> Create(VehicleListingRequest request)
    {
        if (request.Type == VehicleType.Motorcycle)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "DriveMate no longer lists motorcycles. Choose Sedan, SUV or Van.");

        var plate = NormalizePlate(request.PlateNumber);
        if (await db.Vehicles.AnyAsync(v => v.PlateNumber == plate))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "A vehicle with this plate number is already listed.");

        var vehicle = new Vehicle { OwnerId = UserId, PlateNumber = plate, Type = request.Type!.Value };
        if (await Apply(vehicle, request) is { } problem) return problem;

        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Vehicles), null, await OneVehicle(vehicle.Id));
    }

    [HttpPut("vehicles/{id:int}")]
    public async Task<ActionResult<OwnerVehicleDto>> Update(int id, VehicleListingRequest request)
    {
        var vehicle = await MyVehicles().FirstOrDefaultAsync(v => v.Id == id);
        if (vehicle is null) return NotFound();
        if (await Apply(vehicle, request) is { } problem) return problem;

        await db.SaveChangesAsync();
        return await OneVehicle(id);
    }

    /// <summary>Copies the editable fields. Plate and type stay as created (they identify the car).</summary>
    private async Task<ActionResult?> Apply(Vehicle v, VehicleListingRequest r)
    {
        if (r.PhotoId != v.PhotoId)
        {
            if (r.PhotoId is { } photoId)
            {
                // Only the owner's own plain uploads; never a licence/ID or a trip photo (those are private).
                var file = await db.StoredFiles.FirstOrDefaultAsync(f => f.Id == photoId && f.UploadedById == UserId
                    && f.BookingId == null
                    && !db.UserVerifications.Any(x => x.LicensePhotoId == f.Id || x.IdPhotoId == f.Id));
                if (file is null)
                    return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Please upload the car photo again.");
                file.IsPublic = true; // car photos are shown to everyone in search
                v.ImageUrl = $"/api/files/{file.Id}";
            }
            else
            {
                v.ImageUrl = $"/images/vehicles/{v.Type.ToString().ToLowerInvariant()}.svg";
            }
            v.PhotoId = r.PhotoId;
        }
        else if (string.IsNullOrEmpty(v.ImageUrl))
        {
            v.ImageUrl = $"/images/vehicles/{v.Type.ToString().ToLowerInvariant()}.svg";
        }

        v.Name = r.Name.Trim();
        v.Seats = r.Seats;
        v.Transmission = r.Transmission!.Value;
        v.FuelType = r.FuelType!.Value;
        v.PricePerDay = r.PricePerDay; // only affects new bookings: old ones keep their stored price
        v.Location = r.Location.Trim();
        v.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
        if (v.Type == VehicleType.Motorcycle && r.IsAvailable)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Motorcycles are no longer offered, so this listing stays hidden.");
        v.IsAvailable = r.IsAvailable;
        v.DeliveryFee = r.DeliveryFee;
        v.AirportFee = r.AirportFee;
        return null;
    }

    private static string NormalizePlate(string plate) =>
        string.Join(' ', plate.Trim().ToUpperInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));

    private async Task<OwnerVehicleDto> OneVehicle(int id) => (await Vehicles()).Value!.First(v => v.Id == id);

    // ------------------------------- Calendar -------------------------------

    /// <summary>Bookings and blocks between from and to, for the month calendar.</summary>
    [HttpGet("vehicles/{id:int}/calendar")]
    public async Task<ActionResult<List<CalendarEntryDto>>> Calendar(int id, [FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        if (!await MyVehicles().AnyAsync(v => v.Id == id)) return NotFound();
        if (to <= from || (to - from).TotalDays > 400)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Choose a range of up to about a year.");

        var bookings = await db.Bookings.AsNoTracking()
            .Where(b => b.VehicleId == id && b.Status != BookingStatus.Cancelled && b.StartDate < to && from < b.EndDate)
            .Select(b => new CalendarEntryDto("Booking", b.Id, b.StartDate, b.EndDate,
                b.Customer!.FullName, b.Status))
            .ToListAsync();
        var blocks = await db.VehicleBlocks.AsNoTracking()
            .Where(b => b.VehicleId == id).Overlapping(from, to)
            .Select(b => new CalendarEntryDto("Block", b.Id, b.StartDate, b.EndDate, b.Reason ?? "Blocked", null))
            .ToListAsync();

        return bookings.Concat(blocks).OrderBy(e => e.Start).ToList();
    }

    /// <summary>Close dates (e.g. maintenance). Not allowed over an existing booking.</summary>
    [HttpPost("vehicles/{id:int}/blocks")]
    public async Task<ActionResult<CalendarEntryDto>> Block(int id, BlockDatesRequest request)
    {
        if (!await MyVehicles().AnyAsync(v => v.Id == id)) return NotFound();
        var start = request.Start!.Value;
        var end = request.End!.Value;

        if (await db.Bookings.ActiveOverlapping(start, end).AnyAsync(b => b.VehicleId == id))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "There's a booking in those dates. Blocks can only cover free days.");

        var block = new VehicleBlock
        {
            VehicleId = id, StartDate = start, EndDate = end,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
        };
        db.VehicleBlocks.Add(block);
        await db.SaveChangesAsync();
        return new CalendarEntryDto("Block", block.Id, start, end, block.Reason ?? "Blocked", null);
    }

    [HttpDelete("vehicles/{id:int}/blocks/{blockId:int}")]
    public async Task<IActionResult> Unblock(int id, int blockId)
    {
        var block = await db.VehicleBlocks.FirstOrDefaultAsync(b => b.Id == blockId && b.VehicleId == id && b.Vehicle!.OwnerId == UserId);
        if (block is null) return NotFound();
        db.VehicleBlocks.Remove(block);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ------------------------------- Bookings -------------------------------

    [HttpGet("bookings")]
    public async Task<ActionResult<List<OwnerBookingDto>>> Bookings()
    {
        var endOfToday = DateTime.Today.AddDays(1);
        // The customer's phone is only shared once the booking is confirmed (privacy).
        return await MyBookings().AsNoTracking()
            .OrderByDescending(b => b.StartDate)
            .Select(b => new OwnerBookingDto(b.Id, b.Status, b.StartDate, b.EndDate,
                b.VehicleId, b.Vehicle!.Name, b.Vehicle.PlateNumber,
                b.Customer!.FullName,
                b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Ongoing ? b.Customer.PhoneNumber : null,
                b.WithDriver, b.Driver != null ? b.Driver.User!.FullName : null,
                b.PickupLocation, b.Destination, b.ProtectionPlan,
                b.VehicleCost, b.OwnerPayout, b.SecurityDeposit, b.DepositStatus,
                b.DepositDeduction, b.DepositNote, b.Inspections.Count,
                b.Status == BookingStatus.Confirmed && b.StartDate < endOfToday
                    && !b.Inspections.Any(i => i.Stage == InspectionStage.PickUp),
                b.Status == BookingStatus.Completed && b.DepositStatus == DepositStatus.Held))
            .ToListAsync();
    }

    /// <summary>
    /// After checking the return photos, the owner refunds the deposit, keeping part of it
    /// (with a reason) for missing fuel or new damage. Capped at the deposit amount.
    /// </summary>
    [HttpPost("bookings/{id:int}/deposit")]
    public async Task<IActionResult> SettleDeposit(int id, SettleDepositRequest request)
    {
        var booking = await MyBookings().FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound();
        if (booking.Status != BookingStatus.Completed || booking.DepositStatus != DepositStatus.Held)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "The deposit can be settled once, after the vehicle is returned.");
        if (request.Deduction > booking.SecurityDeposit)
            return Problem(statusCode: StatusCodes.Status400BadRequest,
                title: $"You can keep at most the deposit amount (₱{booking.SecurityDeposit:N0}).");

        booking.DepositDeduction = request.Deduction;
        booking.DepositNote = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        booking.DepositStatus = DepositStatus.Refunded;
        booking.DepositSettledAt = DateTime.UtcNow;
        var refund = booking.SecurityDeposit - booking.DepositDeduction;
        notifier.Send(booking.CustomerId, "Deposit refunded",
            booking.DepositDeduction > 0
                ? $"₱{refund:N0} refunded for booking #{id}. ₱{booking.DepositDeduction:N0} kept: {booking.DepositNote}"
                : $"Your full deposit of ₱{refund:N0} for booking #{id} was refunded.",
            "bookings", id);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ------------------------------- Earnings -------------------------------

    [HttpGet("earnings")]
    public async Task<ActionResult<EarningsDto>> Earnings()
    {
        var rows = await MyBookings().AsNoTracking()
            .Select(b => new EarningRow(b.Status, b.EndDate, b.OwnerPayout, b.VehicleCost - b.OwnerPayout, b.DepositDeduction))
            .ToListAsync();
        return EarningsCalculator.Summarize(rows, DateTime.Today);
    }
}
