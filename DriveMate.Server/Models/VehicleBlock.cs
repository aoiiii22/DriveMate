using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>
/// Dates an owner closes on their calendar (maintenance, personal use).
/// Customers can't book a vehicle on blocked dates.
/// </summary>
public class VehicleBlock
{
    public int Id { get; set; }

    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    /// <summary>Local Philippine time, like Booking.StartDate/EndDate.</summary>
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    [MaxLength(200)]
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A driver said no to a trip. Kept so the trip is never offered to them again.</summary>
public class DriverDecline
{
    public int Id { get; set; }

    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    public int DriverId { get; set; }
    public Driver? Driver { get; set; }

    [MaxLength(300)]
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
