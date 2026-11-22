using DriveMate.Server.Data;
using DriveMate.Server.DTOs;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DriversController(AppDbContext db) : ControllerBase
{
    /// <summary>Drivers who are switched on and have no overlapping booking for the dates. Best rated first.</summary>
    [HttpGet("available")]
    public async Task<ActionResult<List<DriverDto>>> GetAvailable([FromQuery] DriverAvailabilityQuery query)
    {
        var busyIds = db.Bookings.ActiveOverlapping(query.Start!.Value, query.End!.Value)
            .Where(b => b.DriverId != null)
            .Select(b => b.DriverId!.Value);

        return await db.Drivers.AsNoTracking()
            .Where(d => d.IsAvailable && !busyIds.Contains(d.Id))
            .OrderByDescending(d => d.Rating).ThenByDescending(d => d.YearsExperience)
            .Select(d => new DriverDto(d.Id, d.User!.FullName, d.User.ProfilePhotoUrl, d.Rating,
                d.YearsExperience, d.PricePerDay, d.IsAvailable, d.RatingCount))
            .ToListAsync();
    }

    /// <summary>What customers said about this driver (newest first).</summary>
    [HttpGet("{id:int}/reviews")]
    public async Task<ActionResult<List<ReviewDto>>> Reviews(int id) =>
        await db.Reviews.AsNoTracking()
            .Where(r => r.DriverId == id && r.DriverStars != null)
            .OrderByDescending(r => r.CreatedAt).Take(20)
            .Select(r => new ReviewDto(r.Id, r.DriverStars!.Value, r.Comment, r.Customer!.FullName, r.CreatedAt))
            .ToListAsync();
}
