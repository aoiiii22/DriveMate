using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.DTOs;

/// <summary>A driver as shown on the "Add a driver?" card.</summary>
public record DriverDto(
    int Id, string FullName, string? ProfilePhotoUrl, double Rating,
    int YearsExperience, decimal PricePerDay, bool IsAvailable, int RatingCount);

/// <summary>Query-string filters for GET /api/drivers/available.</summary>
public class DriverAvailabilityQuery : IValidatableObject
{
    [Required] public DateTime? Start { get; set; }
    [Required] public DateTime? End { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Start >= End)
            yield return new ValidationResult("End must be after start.", [nameof(End)]);
    }
}
