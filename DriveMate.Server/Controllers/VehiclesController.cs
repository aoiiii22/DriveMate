using System.Security.Claims;
using DriveMate.Server.Data;
using DriveMate.Server.DTOs;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Controllers;

/// <summary>
/// [ApiController] turns on API conveniences: automatic 400 responses for invalid input
/// and binding complex query objects like VehicleQuery.
/// [Route("api/[controller]")] → "api/vehicles" ([controller] = class name minus "Controller").
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class VehiclesController(AppDbContext db) : ControllerBase
{
    // AppDbContext arrives through the constructor: that's dependency injection (DI).
    // ASP.NET Core creates it per request and disposes it afterwards.

    /// <summary>List vehicles, optionally filtered and limited to those free for the given dates.</summary>
    [HttpGet]
    public async Task<ActionResult<List<VehicleSummaryDto>>> GetVehicles([FromQuery] VehicleQuery query)
    {
        var vehicles = db.Vehicles.AsNoTracking().Where(v => v.IsAvailable);
        // The search is public, but if a token was sent we know who it is (for the ♥ hearts).
        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

        // Each filter is only added when provided. Nothing hits the database until ToListAsync.
        if (query.Favorites) vehicles = vehicles.Where(v => db.Favorites.Any(f => f.UserId == uid && f.VehicleId == v.Id));
        if (query.Delivery) vehicles = vehicles.Where(v => v.DeliveryFee != null);
        if (query.Type is { } type) vehicles = vehicles.Where(v => v.Type == type);
        if (query.Seats is { } seats) vehicles = vehicles.Where(v => v.Seats >= seats);
        if (query.Transmission is { } t) vehicles = vehicles.Where(v => v.Transmission == t);
        if (query.FuelType is { } fuel) vehicles = vehicles.Where(v => v.FuelType == fuel);
        if (query.MaxPrice is { } max) vehicles = vehicles.Where(v => v.PricePerDay <= max);
        if (!string.IsNullOrWhiteSpace(query.Location))
            vehicles = vehicles.Where(v => EF.Functions.Like(v.Location, $"%{query.Location.Trim()}%"));

        if (query.Start is { } start && query.End is { } end)
        {
            // Exclude vehicles that have an active booking overlapping the requested dates.
            var busyIds = db.Bookings.ActiveOverlapping(start, end).Select(b => b.VehicleId);
            var blockedIds = db.VehicleBlocks.Overlapping(start, end).Select(b => b.VehicleId);
            vehicles = vehicles.Where(v => !busyIds.Contains(v.Id) && !blockedIds.Contains(v.Id));
        }

        vehicles = query.Sort switch
        {
            "price_desc" => vehicles.OrderByDescending(v => v.PricePerDay),
            "rating" => vehicles.OrderByDescending(v => v.Rating).ThenBy(v => v.PricePerDay),
            _ => vehicles.OrderBy(v => v.PricePerDay),
        };

        // Select(...) is a "projection": EF Core only reads the columns the DTO needs.
        var list = await vehicles
            .Select(v => new VehicleSummaryDto(
                v.Id, v.Name, v.Type, v.Seats, v.Transmission, v.FuelType, v.PricePerDay,
                v.ImageUrl, v.Location, v.Rating, v.Reviews.Count,
                db.Favorites.Any(f => f.UserId == uid && f.VehicleId == v.Id),
                v.DeliveryFee != null, v.AirportFee != null))
            .ToListAsync();

        // Like Turo: show the price for the whole trip, not just per day (same rules as booking).
        if (query.Start is { } s && query.End is { } e)
        {
            list = list.Select(v =>
            {
                var q = PricingService.Quote(v.PricePerDay, null, s, e);
                return v with { TripDays = q.Days, TripTotal = q.VehicleCost - q.LongRentalDiscount };
            }).ToList();
        }
        return list;
    }

    /// <summary>Full details for one vehicle, including reviews and booked dates.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<VehicleDetailDto>> GetVehicle(int id)
    {
        var now = DateTime.Today;
        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var blocked = await db.VehicleBlocks.AsNoTracking()
            .Where(b => b.VehicleId == id && b.EndDate >= now)
            .Select(b => new DateRangeDto(b.StartDate, b.EndDate))
            .ToListAsync();

        var vehicle = await db.Vehicles.AsNoTracking()
            .Where(v => v.Id == id)
            .Select(v => new VehicleDetailDto(
                v.Id, v.Name, v.Type, v.Seats, v.Transmission, v.FuelType, v.PricePerDay,
                v.ImageUrl, v.Location, v.Rating, v.PlateNumber, v.IsAvailable, v.Description,
                v.Owner!.FullName,
                v.Reviews.OrderByDescending(r => r.CreatedAt)
                    .Select(r => new ReviewDto(r.Id, r.Stars, r.Comment, r.Customer!.FullName, r.CreatedAt))
                    .ToList(),
                v.Bookings.Where(b => BookingRules.BlockingStatuses.Contains(b.Status) && b.EndDate >= now)
                    .OrderBy(b => b.StartDate)
                    .Select(b => new DateRangeDto(b.StartDate, b.EndDate))
                    .ToList(),
                v.RatingCount, v.DeliveryFee, v.AirportFee,
                db.Favorites.Any(f => f.UserId == uid && f.VehicleId == v.Id)))
            .FirstOrDefaultAsync();

        if (vehicle is null) return NotFound(); // NotFound() → HTTP 404

        // Customers just see "unavailable" dates; they don't need to know if it's a booking or a block.
        var unavailable = vehicle.BookedDates.Concat(blocked).OrderBy(d => d.Start).ToList();
        return vehicle with { BookedDates = unavailable }; // returning the object → HTTP 200 with JSON
    }
}
