using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>
/// Driver profile. The driver's name/phone/photo live on the linked AppUser;
/// this table holds the driving-specific info.
/// </summary>
public class Driver
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;
    public AppUser? User { get; set; }

    [MaxLength(30)]
    public string LicenseNumber { get; set; } = string.Empty;

    public int YearsExperience { get; set; }
    public double Rating { get; set; }

    /// <summary>How many ratings Rating is the average of.</summary>
    public int RatingCount { get; set; }

    /// <summary>The driver's own "I'm accepting trips" switch.</summary>
    public bool IsAvailable { get; set; } = true;

    /// <summary>Driver service fee per day in PHP.</summary>
    public decimal PricePerDay { get; set; }

    public List<Booking> Bookings { get; set; } = [];
}
