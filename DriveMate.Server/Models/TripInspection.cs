using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>
/// The car's condition at pick-up or return: photos, odometer and fuel.
/// Comparing the two protects both customer and owner in a damage dispute.
/// </summary>
public class TripInspection
{
    public int Id { get; set; }

    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    public InspectionStage Stage { get; set; }

    public int OdometerKm { get; set; }

    /// <summary>0, 25, 50, 75 or 100.</summary>
    public int FuelPercent { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public string CreatedById { get; set; } = string.Empty;
    public AppUser? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<TripPhoto> Photos { get; set; } = [];
}

public class TripPhoto
{
    public int Id { get; set; }

    public int InspectionId { get; set; }
    public TripInspection? Inspection { get; set; }

    public Guid FileId { get; set; }
    public StoredFile? File { get; set; }

    public PhotoAngle Angle { get; set; }
}
