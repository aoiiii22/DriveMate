using System.ComponentModel.DataAnnotations;
using DriveMate.Server.Models;

namespace DriveMate.Server.DTOs;

/// <summary>Body for PUT /api/verification/me.</summary>
public class SubmitVerificationRequest : IValidatableObject
{
    [Required, MaxLength(30), RegularExpression(@"^[A-Za-z0-9\- ]+$", ErrorMessage = "Licence number may only contain letters, numbers, dashes and spaces.")]
    public string LicenseNumber { get; set; } = string.Empty;

    [Required] public DateTime? LicenseExpiry { get; set; }
    [Required] public Guid? LicensePhotoId { get; set; }
    [Required] public Guid? IdPhotoId { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (LicenseExpiry?.Date <= DateTime.Today)
            yield return new ValidationResult("This licence has expired.", [nameof(LicenseExpiry)]);
        if (LicensePhotoId == IdPhotoId)
            yield return new ValidationResult("Upload two different photos: your licence and a government ID.", [nameof(IdPhotoId)]);
    }
}

public class RejectVerificationRequest
{
    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}

/// <summary>The caller's own verification. Status is null when nothing was submitted yet.</summary>
public record MyVerificationDto(
    VerificationStatus? Status, string? LicenseNumber, DateTime? LicenseExpiry,
    Guid? LicensePhotoId, Guid? IdPhotoId, string? RejectionReason, DateTime? SubmittedAt)
{
    public static readonly MyVerificationDto None = new(null, null, null, null, null, null, null);
}

/// <summary>A verification as the Admin sees it in the review queue.</summary>
public record AdminVerificationDto(
    int Id, string UserId, string FullName, string Email, string? PhoneNumber,
    string LicenseNumber, DateTime LicenseExpiry, Guid? LicensePhotoId, Guid? IdPhotoId,
    VerificationStatus Status, string? RejectionReason, DateTime SubmittedAt, DateTime? ReviewedAt);
