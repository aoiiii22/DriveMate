using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>A user's request to become an Owner or Driver partner. Admin approves or rejects it.</summary>
public class PartnerApplication
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;
    public AppUser? User { get; set; }

    public PartnerType Type { get; set; }

    /// <summary>Free text from the form, e.g. vehicle info or license number.</summary>
    [MaxLength(2000)]
    public string Details { get; set; } = string.Empty;

    // Driver applications only: becomes the Driver profile when approved.
    [MaxLength(30)]
    public string? LicenseNumber { get; set; }
    public int? YearsExperience { get; set; }
    public decimal? PricePerDay { get; set; }

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;

    [MaxLength(500)]
    public string? RejectionReason { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
