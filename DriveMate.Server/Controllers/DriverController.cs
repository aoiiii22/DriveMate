using System.Security.Claims;
using DriveMate.Server.Data;
using DriveMate.Server.DTOs;
using DriveMate.Server.Models;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Controllers;

/// <summary>The driver dashboard: availability, rate, trip requests (accept/decline) and earnings.</summary>
[ApiController]
[Authorize(Roles = Roles.Driver)]
[Route("api/driver")]
public class DriverController(AppDbContext db, Notifier notifier) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private Task<Driver?> Me() => db.Drivers.Include(d => d.User).FirstOrDefaultAsync(d => d.UserId == UserId);

    [HttpGet("me")]
    public async Task<ActionResult<DriverProfileDto>> Profile()
    {
        var d = await Me();
        return d is null ? NotFound() : ToDto(d);
    }

    /// <summary>The "I'm accepting trips" switch and the daily rate (only affects new bookings).</summary>
    [HttpPut("me")]
    public async Task<ActionResult<DriverProfileDto>> Update(UpdateDriverProfileRequest request)
    {
        var d = await Me();
        if (d is null) return NotFound();
        d.IsAvailable = request.IsAvailable;
        d.PricePerDay = request.PricePerDay;
        await db.SaveChangesAsync();
        return ToDto(d);
    }

    private static DriverProfileDto ToDto(Driver d) =>
        new(d.Id, d.User!.FullName, d.LicenseNumber, d.YearsExperience, d.Rating, d.PricePerDay, d.IsAvailable);

    [HttpGet("trips")]
    public async Task<ActionResult<List<DriverTripDto>>> Trips()
    {
        var uid = UserId;
        var now = DateTime.Now;
        var endOfToday = DateTime.Today.AddDays(1);
        return await db.Bookings.AsNoTracking()
            .Where(b => b.Driver != null && b.Driver.UserId == uid)
            .OrderByDescending(b => b.StartDate)
            .Select(b => new DriverTripDto(b.Id, b.Status, b.StartDate, b.EndDate,
                b.Vehicle!.Name, b.Vehicle.PlateNumber, b.Customer!.FullName,
                b.DriverAcceptedAt != null && (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Ongoing)
                    ? b.Customer.PhoneNumber : null, // phone only after accepting a confirmed trip
                b.PickupLocation, b.Destination, b.DriverPayout, b.DriverAcceptedAt != null,
                b.DepositStatus, b.Inspections.Count,
                b.DriverAcceptedAt == null && (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed) && b.StartDate > now,
                b.DriverAcceptedAt != null && b.Status == BookingStatus.Confirmed && b.StartDate < endOfToday
                    && !b.Inspections.Any(i => i.Stage == InspectionStage.PickUp),
                b.Status == BookingStatus.Ongoing && !b.Inspections.Any(i => i.Stage == InspectionStage.Return)))
            .ToListAsync();
    }

    [HttpPost("trips/{id:int}/accept")]
    public async Task<IActionResult> Accept(int id)
    {
        var booking = await MyOpenTrip(id);
        if (booking is null) return NotFound();
        if (booking.DriverAcceptedAt != null)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "You already accepted this trip.");

        booking.DriverAcceptedAt = DateTime.UtcNow;
        notifier.Send(booking.CustomerId, "Driver confirmed",
            $"{User.FindFirstValue(ClaimTypes.Name)} accepted your trip #{id}.", "bookings", id);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Say no to a trip. DriveMate hands it to the best-rated free driver whose rate is the same or lower
    /// (the customer keeps the price they agreed to). If nobody is free, the booking is cancelled and refunded.
    /// </summary>
    [HttpPost("trips/{id:int}/decline")]
    public async Task<ActionResult<DeclineResultDto>> Decline(int id, DeclineTripRequest request)
    {
        await using var tx = await db.Database.BeginTransactionAsync(); // reassignment must not double-book a driver

        var booking = await MyOpenTrip(id);
        if (booking is null) return NotFound();
        if (booking.DriverAcceptedAt != null)
            return Problem(statusCode: StatusCodes.Status400BadRequest,
                title: "You already accepted this trip. Contact DriveMate support to cancel.");

        var current = booking.Driver!;
        db.DriverDeclines.Add(new DriverDecline
        {
            BookingId = booking.Id, DriverId = current.Id,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
        });

        var days = PricingService.CalculateDays(booking.StartDate, booking.EndDate);
        var declinedIds = db.DriverDeclines.Where(x => x.BookingId == booking.Id).Select(x => x.DriverId);
        var busyIds = db.Bookings.ActiveOverlapping(booking.StartDate, booking.EndDate)
            .Where(b => b.DriverId != null).Select(b => b.DriverId!.Value);
        var replacement = await db.Drivers.Include(d => d.User)
            .Where(d => d.IsAvailable && d.Id != current.Id && d.UserId != booking.CustomerId
                && d.PricePerDay * days <= booking.DriverCost
                && !declinedIds.Contains(d.Id) && !busyIds.Contains(d.Id))
            .OrderByDescending(d => d.Rating).ThenByDescending(d => d.YearsExperience)
            .FirstOrDefaultAsync();

        DeclineResultDto result;
        if (replacement is not null)
        {
            // The new driver earns the booked rate (≥ their own), so the customer pays the same.
            booking.DriverId = replacement.Id;
            booking.DriverAcceptedAt = null; // the new driver must accept too
            result = new DeclineResultDto(true, $"Trip handed to {replacement.User!.FullName}.");
            notifier.Send(booking.CustomerId, "New driver assigned",
                $"Your driver couldn't make trip #{id}. {replacement.User.FullName} will drive you instead, same price.", "bookings", id);
            notifier.Send(replacement.UserId, "New trip request", $"Trip #{id} needs a driver. Please accept or decline.", "driver", id);
        }
        else
        {
            booking.Status = BookingStatus.Cancelled;
            booking.CancellationReason = "Your driver couldn't make it and no other driver was free. You have been fully refunded.";
            if (booking.DepositStatus == DepositStatus.Held) booking.DepositStatus = DepositStatus.Refunded;
            result = new DeclineResultDto(false, "No other driver was free, so the booking was cancelled and refunded.");
            notifier.Send(booking.CustomerId, "Booking cancelled", booking.CancellationReason, "bookings", id);
            var ownerId = await db.Vehicles.Where(v => v.Id == booking.VehicleId).Select(v => v.OwnerId).FirstAsync();
            notifier.Send(ownerId, "Booking cancelled", $"Booking #{id} was cancelled: no driver was available.", "owner", id);
        }

        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return result;
    }

    /// <summary>A trip assigned to me that hasn't started yet.</summary>
    private Task<Booking?> MyOpenTrip(int id)
    {
        var uid = UserId;
        var now = DateTime.Now;
        return db.Bookings.Include(b => b.Driver)
            .FirstOrDefaultAsync(b => b.Id == id && b.Driver != null && b.Driver.UserId == uid
                && (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed) && b.StartDate > now);
    }

    [HttpGet("earnings")]
    public async Task<ActionResult<EarningsDto>> Earnings()
    {
        var uid = UserId;
        var rows = await db.Bookings.AsNoTracking()
            .Where(b => b.Driver != null && b.Driver.UserId == uid)
            .Select(b => new EarningRow(b.Status, b.EndDate, b.DriverPayout, b.DriverCost - b.DriverPayout, 0m))
            .ToListAsync();
        return EarningsCalculator.Summarize(rows, DateTime.Today);
    }
}
