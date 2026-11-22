using System.ComponentModel.DataAnnotations;
using DriveMate.Server.Models;

namespace DriveMate.Server.DTOs;

public class InspectionPhotoInput
{
    [Required] public Guid? FileId { get; set; }
    [Required] public PhotoAngle? Angle { get; set; }
}

/// <summary>Body for POST /api/bookings/{id}/inspections.</summary>
public class CreateInspectionRequest : IValidatableObject
{
    /// <summary>Photos every inspection must include, so pick-up and return can be compared side by side.</summary>
    public static readonly PhotoAngle[] RequiredAngles =
        [PhotoAngle.Front, PhotoAngle.Back, PhotoAngle.Left, PhotoAngle.Right, PhotoAngle.Dashboard];

    [Required] public InspectionStage? Stage { get; set; }

    [Range(0, 2_000_000)]
    public int OdometerKm { get; set; }

    [Range(0, 100)]
    public int FuelPercent { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [Required, MinLength(5), MaxLength(15)]
    public List<InspectionPhotoInput> Photos { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (FuelPercent % 25 != 0)
            yield return new ValidationResult("Fuel must be Empty, ¼, ½, ¾ or Full.", [nameof(FuelPercent)]);

        var missing = RequiredAngles.Except(Photos.Select(p => p.Angle ?? default)).ToList();
        if (missing.Count > 0)
            yield return new ValidationResult($"Missing photos: {string.Join(", ", missing)}.", [nameof(Photos)]);

        if (Photos.Select(p => p.FileId).Distinct().Count() != Photos.Count)
            yield return new ValidationResult("The same photo was added twice.", [nameof(Photos)]);
    }
}

public record InspectionPhotoDto(Guid FileId, PhotoAngle Angle);

public record InspectionDto(
    int Id, InspectionStage Stage, int OdometerKm, int FuelPercent, string? Notes,
    string CreatedByName, DateTime CreatedAt, IReadOnlyList<InspectionPhotoDto> Photos);
