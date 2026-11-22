using System.Linq.Expressions;
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
/// [Authorize] on the class: every action needs a valid JWT unless marked [AllowAnonymous].
/// Without a token the API answers 401 Unauthorized.
/// </summary>
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class BookingsController(AppDbContext db, PromoService promos, Notifier notifier) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>The hand-over fee for this car, or null if the owner doesn't offer that option.</summary>
    private static decimal? HandoverFee(decimal? deliveryFee, decimal? airportFee, HandoverType handover) => handover switch
    {
        HandoverType.Delivery => deliveryFee,
        HandoverType.Airport => airportFee,
        _ => 0m,
    };

    /// <summary>The protection plans customers can pick from.</summary>
    [AllowAnonymous]
    [HttpGet("plans")]
    public IReadOnlyList<ProtectionPlanInfo> Plans() => PricingService.Plans;

    /// <summary>The current rental agreement text.</summary>
    [AllowAnonymous]
    [HttpGet("agreement")]
    public AgreementDto Agreement() => new(RentalAgreement.Version, RentalAgreement.Terms);

    /// <summary>Price breakdown before booking. Public so guests can see prices too.</summary>
    [AllowAnonymous]
    [HttpGet("quote")]
    public async Task<ActionResult<QuoteDto>> Quote([FromQuery] QuoteQuery query)
    {
        var vehicle = await db.Vehicles.AsNoTracking().Where(v => v.Id == query.VehicleId)
            .Select(v => new { v.PricePerDay, v.DeliveryFee, v.AirportFee }).FirstOrDefaultAsync();
        if (vehicle is null) return NotFound();

        decimal? driverPrice = null;
        if (query.DriverId is { } driverId)
        {
            driverPrice = await db.Drivers.Where(d => d.Id == driverId)
                .Select(d => (decimal?)d.PricePerDay).FirstOrDefaultAsync();
            if (driverPrice is null) return NotFound();
        }

        if (HandoverFee(vehicle.DeliveryFee, vehicle.AirportFee, query.Handover) is not { } fee)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "This car doesn't offer that pick-up option.");

        var q = PricingService.Quote(vehicle.PricePerDay, driverPrice, query.Start!.Value, query.End!.Value, query.Plan, fee);
        // Guests can try codes too; the "already used" check needs a login, so it's skipped for them.
        var customerId = User.Identity?.IsAuthenticated == true ? UserId : null;
        var promo = await promos.CheckAsync(query.PromoCode, q.Subtotal, customerId);
        q = q with { PromoDiscount = promo.Discount };

        return new QuoteDto(q.Days, q.VehicleCost, q.LongRentalDiscount, PricingService.LongRentalRate(q.Days), q.DriverCost,
            q.ProtectionCost, q.DeliveryFee, q.Subtotal, promo.Code, q.PromoDiscount, promo.Error, q.Total, q.Plan, q.SecurityDeposit);
    }

    /// <summary>Book a vehicle (optionally with a driver). Starts as Pending until paid.</summary>
    [Authorize(Roles = Roles.Customer)]
    [HttpPost]
    public async Task<ActionResult<BookingDto>> Create(CreateBookingRequest request)
    {
        var start = request.Start!.Value;
        var end = request.End!.Value;

        // Trust & safety: self-drive needs an approved, unexpired licence.
        // With a driver, the customer only needs to have sent their ID (and not been rejected).
        var verification = await db.UserVerifications.AsNoTracking().FirstOrDefaultAsync(v => v.UserId == UserId);
        if (!request.WithDriver)
        {
            if (verification?.Status != VerificationStatus.Approved)
                return Problem(statusCode: StatusCodes.Status403Forbidden,
                    title: "Self-drive needs a verified driver's licence. Verify your account first, or book with a driver.");
            if (verification.LicenseExpiry.Date < end.Date)
                return Problem(statusCode: StatusCodes.Status403Forbidden,
                    title: "Your licence expires before this trip ends. Please update your verification.");
        }
        else if (verification is null || verification.Status == VerificationStatus.Rejected)
        {
            return Problem(statusCode: StatusCodes.Status403Forbidden,
                title: "Please verify your account (upload your ID) before booking.");
        }

        // A transaction makes the "is it free?" check and the insert happen as one unit,
        // so two customers can't grab the same car for the same dates at the same moment.
        await using var tx = await db.Database.BeginTransactionAsync();

        var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.Id == request.VehicleId);
        if (vehicle is null || !vehicle.IsAvailable)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "This vehicle can't be booked right now.");
        if (await db.Bookings.ActiveOverlapping(start, end).AnyAsync(b => b.VehicleId == vehicle.Id)
            || await db.VehicleBlocks.Overlapping(start, end).AnyAsync(b => b.VehicleId == vehicle.Id))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "This vehicle is already booked for those dates.");
        if (vehicle.OwnerId == UserId)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "You can't book your own vehicle.");

        Driver? driver = null;
        if (request.WithDriver)
        {
            driver = await db.Drivers.FirstOrDefaultAsync(d => d.Id == request.DriverId);
            if (driver is null || !driver.IsAvailable)
                return Problem(statusCode: StatusCodes.Status400BadRequest, title: "This driver isn't available.");
            if (await db.Bookings.ActiveOverlapping(start, end).AnyAsync(b => b.DriverId == driver.Id))
                return Problem(statusCode: StatusCodes.Status409Conflict, title: "This driver is already booked for those dates.");
        }

        if (HandoverFee(vehicle.DeliveryFee, vehicle.AirportFee, request.Handover) is not { } handoverFee)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "This car doesn't offer that pick-up option.");

        // The server always calculates the price itself. Never trust a price sent by the browser.
        var quote = PricingService.Quote(vehicle.PricePerDay, driver?.PricePerDay, start, end, request.ProtectionPlan, handoverFee);
        var promo = await promos.CheckAsync(request.PromoCode, quote.Subtotal, UserId);
        if (promo.Error is not null)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: promo.Error);
        quote = quote with { PromoDiscount = promo.Discount };

        var booking = new Booking
        {
            CustomerId = UserId,
            VehicleId = vehicle.Id,
            DriverId = driver?.Id,
            WithDriver = driver is not null,
            PickupLocation = request.PickupLocation.Trim(),
            Destination = request.Destination.Trim(),
            StartDate = start,
            EndDate = end,
            VehicleCost = quote.VehicleCost,
            DriverCost = quote.DriverCost,
            ProtectionCost = quote.ProtectionCost,
            TotalPrice = quote.Total,
            ProtectionPlan = quote.Plan,
            SecurityDeposit = quote.SecurityDeposit,
            DepositStatus = DepositStatus.Unpaid,
            OwnerPayout = quote.OwnerPayout,
            DriverPayout = quote.DriverPayout,
            PlatformFee = quote.PlatformFee,
            AgreementVersion = RentalAgreement.Version,
            AgreementAcceptedAt = DateTime.UtcNow,
            Status = BookingStatus.Pending,
            LongRentalDiscount = quote.LongRentalDiscount,
            PromoCode = promo.Code,
            PromoDiscount = quote.PromoDiscount,
            Handover = request.Handover,
            DeliveryFee = quote.DeliveryFee,
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync(); // first save gives the booking its Id for the notifications

        var when = $"{start:MMM d}–{end:MMM d}";
        notifier.Send(vehicle.OwnerId, "New booking request", $"{vehicle.Name}, {when}. Waiting for payment.", "owner", booking.Id);
        if (driver is not null)
            notifier.Send(driver.UserId, "New trip request", $"{vehicle.Name}, {when}. Please accept or decline.", "driver", booking.Id);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        var dto = await MyBookings().Where(b => b.Id == booking.Id).Select(ToDto()).FirstAsync();
        return CreatedAtAction(nameof(GetOne), new { id = booking.Id }, dto);
    }

    /// <summary>The signed-in customer's bookings, newest trip first.</summary>
    [HttpGet("mine")]
    public async Task<ActionResult<List<BookingDto>>> Mine() =>
        await MyBookings().OrderByDescending(b => b.StartDate).Select(ToDto()).ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BookingDto>> GetOne(int id)
    {
        var dto = await MyBookings().Where(b => b.Id == id).Select(ToDto()).FirstOrDefaultAsync();
        return dto is null ? NotFound() : dto;
    }

    /// <summary>
    /// Simulated payment. GCash/Card pay the rental and the deposit now.
    /// Cash on pick-up confirms the booking; both are paid at pick-up (see InspectionsController).
    /// No real money moves (see README).
    /// </summary>
    [HttpPost("{id:int}/pay")]
    public async Task<ActionResult<BookingDto>> Pay(int id, PayRequest request)
    {
        var booking = await MyBookings().FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound();
        if (booking.Status != BookingStatus.Pending)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Only pending bookings can be paid.");

        var paysNow = request.Method != PaymentMethod.CashOnPickup;
        booking.PaymentMethod = request.Method;
        booking.IsPaid = paysNow;
        if (booking.SecurityDeposit > 0)
            booking.DepositStatus = paysNow ? DepositStatus.Held : DepositStatus.Unpaid;
        booking.Status = BookingStatus.Confirmed;
        notifier.BookingParties(await db.Bookings.Parties(id).FirstAsync(), UserId, "Booking confirmed",
            $"Booking #{id} is confirmed ({(paysNow ? "paid online" : "cash on pick-up")}).");
        await db.SaveChangesAsync();

        return await GetOne(id);
    }

    /// <summary>Cancel a Pending or Confirmed booking before the trip starts. A held deposit is refunded.</summary>
    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<BookingDto>> Cancel(int id)
    {
        var booking = await MyBookings().FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound();
        if (booking.Status is not (BookingStatus.Pending or BookingStatus.Confirmed) || booking.StartDate <= DateTime.Now)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "This booking can no longer be cancelled.");

        booking.Status = BookingStatus.Cancelled;
        if (booking.DepositStatus == DepositStatus.Held)
            booking.DepositStatus = DepositStatus.Refunded;
        notifier.BookingParties(await db.Bookings.Parties(id).FirstAsync(), UserId,
            "Booking cancelled", $"The customer cancelled booking #{id}.");
        await db.SaveChangesAsync();

        return await GetOne(id);
    }

    /// <summary>
    /// Rate a completed trip: the car (always) and the driver (if there was one). One review per booking.
    /// Ratings are a running average: new = (old × count + stars) / (count + 1).
    /// </summary>
    [HttpPost("{id:int}/review")]
    public async Task<ActionResult<BookingDto>> Review(int id, ReviewRequest request)
    {
        var booking = await MyBookings().Include(b => b.Vehicle).Include(b => b.Driver).Include(b => b.Review)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound();
        if (booking.Status != BookingStatus.Completed)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "You can review a trip once it's completed.");
        if (booking.Review is not null)
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "You already reviewed this trip.");
        if (booking.Driver is not null && request.DriverStars is null)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Please rate your driver too.");

        db.Reviews.Add(new Review
        {
            BookingId = id, CustomerId = UserId, VehicleId = booking.VehicleId, DriverId = booking.DriverId,
            Stars = request.Stars,
            DriverStars = booking.Driver is null ? null : request.DriverStars,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
        });

        var v = booking.Vehicle!;
        v.Rating = Math.Round((v.Rating * v.RatingCount + request.Stars) / (v.RatingCount + 1), 2);
        v.RatingCount++;
        notifier.Send(v.OwnerId, "New review", $"{request.Stars}★ for {v.Name}.", "owner", id);

        if (booking.Driver is { } d && request.DriverStars is { } ds)
        {
            d.Rating = Math.Round((d.Rating * d.RatingCount + ds) / (d.RatingCount + 1), 2);
            d.RatingCount++;
            notifier.Send(d.UserId, "New review", $"A customer rated you {ds}★.", "driver", id);
        }

        await db.SaveChangesAsync();
        return await GetOne(id);
    }

    /// <summary>Only the caller's own bookings. Returning 404 for others' bookings hides that they exist.</summary>
    private IQueryable<Booking> MyBookings() => db.Bookings.Where(b => b.CustomerId == UserId);

    /// <summary>
    /// An Expression (not a plain method) so EF Core can translate it into SQL.
    /// The Can* flags must match the rules in Cancel() and InspectionsController.
    /// </summary>
    private static Expression<Func<Booking, BookingDto>> ToDto()
    {
        var now = DateTime.Now;
        var endOfToday = DateTime.Today.AddDays(1);
        return b => new BookingDto(
            b.Id, b.Status, b.StartDate, b.EndDate, b.PickupLocation, b.Destination, b.WithDriver,
            b.VehicleId, b.Vehicle!.Name, b.Vehicle.ImageUrl, b.Vehicle.PlateNumber,
            b.DriverId, b.Driver != null ? b.Driver.User!.FullName : null,
            b.VehicleCost, b.DriverCost, b.ProtectionCost, b.TotalPrice,
            b.ProtectionPlan, b.SecurityDeposit, b.DepositStatus, b.AgreementVersion, b.AgreementAcceptedAt,
            b.PaymentMethod, b.IsPaid, b.CreatedAt,
            b.Status == BookingStatus.Pending,
            (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed) && b.StartDate > now,
            b.Status == BookingStatus.Confirmed && b.StartDate < endOfToday
                && !b.Inspections.Any(i => i.Stage == InspectionStage.PickUp),
            b.Status == BookingStatus.Ongoing && !b.Inspections.Any(i => i.Stage == InspectionStage.Return),
            b.Inspections.Count,
            b.DriverAcceptedAt != null, b.DepositDeduction, b.DepositNote, b.CancellationReason,
            b.LongRentalDiscount, b.PromoCode, b.PromoDiscount, b.Handover, b.DeliveryFee,
            b.Status == BookingStatus.Completed && b.Review == null,
            b.Review != null ? b.Review.Stars : null);
    }
}
