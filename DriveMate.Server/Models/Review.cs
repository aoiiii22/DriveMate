using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>A customer's 1–5 star rating of a completed booking.</summary>
public class Review
{
    public int Id { get; set; }

    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    public string CustomerId { get; set; } = string.Empty;
    public AppUser? Customer { get; set; }

    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public int? DriverId { get; set; }
    public Driver? Driver { get; set; }

    /// <summary>Rating of the vehicle (and owner).</summary>
    [Range(1, 5)]
    public int Stars { get; set; }

    /// <summary>Rating of the driver, for trips with a driver.</summary>
    [Range(1, 5)]
    public int? DriverStars { get; set; }

    [MaxLength(1000)]
    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
