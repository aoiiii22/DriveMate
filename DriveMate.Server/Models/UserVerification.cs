using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>
/// A customer's driver's licence + government ID check. One per user.
/// An Admin approves it before the customer can book self-drive.
/// </summary>
public class UserVerification
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;
    public AppUser? User { get; set; }

    [MaxLength(30)]
    public string LicenseNumber { get; set; } = string.Empty;

    public DateTime LicenseExpiry { get; set; }

    // Nullable: the seeded demo customer is verified without real photos.
    public Guid? LicensePhotoId { get; set; }
    public StoredFile? LicensePhoto { get; set; }

    public Guid? IdPhotoId { get; set; }
    public StoredFile? IdPhoto { get; set; }

    public VerificationStatus Status { get; set; } = VerificationStatus.Pending;

    [MaxLength(500)]
    public string? RejectionReason { get; set; }

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}
