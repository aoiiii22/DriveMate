using System.ComponentModel.DataAnnotations;
using DriveMate.Server.Models;

namespace DriveMate.Server.DTOs;

/// <summary>Shared rule for anything with a start and end date.</summary>
public abstract class DateRangeRequest : IValidatableObject
{
    [Required] public DateTime? Start { get; set; }
    [Required] public DateTime? End { get; set; }

    public virtual IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Start >= End)
            yield return new ValidationResult("End must be after start.", [nameof(End)]);
        if (Start < DateTime.Today)
            yield return new ValidationResult("Start can't be in the past.", [nameof(Start)]);
    }
}

/// <summary>Query string for GET /api/bookings/quote.</summary>
public class QuoteQuery : DateRangeRequest
{
    [Required] public int? VehicleId { get; set; }
    public int? DriverId { get; set; }
    public ProtectionPlan Plan { get; set; } = ProtectionPlan.Basic;
    public HandoverType Handover { get; set; } = HandoverType.OwnerLocation;
    [MaxLength(30)] public string? PromoCode { get; set; }
}

/// <summary>Body for POST /api/bookings.</summary>
public class CreateBookingRequest : DateRangeRequest
{
    [Required] public int? VehicleId { get; set; }

    /// <summary>Required when WithDriver is true, ignored otherwise.</summary>
    public int? DriverId { get; set; }

    public bool WithDriver { get; set; }

    [Required, MaxLength(200)]
    public string PickupLocation { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Destination { get; set; } = string.Empty;

    public ProtectionPlan ProtectionPlan { get; set; } = ProtectionPlan.Basic;

    /// <summary>For Delivery, PickupLocation is the customer's address; for Airport, the NAIA terminal.</summary>
    public HandoverType Handover { get; set; } = HandoverType.OwnerLocation;

    [MaxLength(30)] public string? PromoCode { get; set; }

    /// <summary>The customer ticked "I agree to the rental agreement".</summary>
    public bool AcceptAgreement { get; set; }

    public override IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var r in base.Validate(validationContext)) yield return r;
        if (WithDriver && DriverId is null)
            yield return new ValidationResult("Choose a driver, or switch off \"with driver\".", [nameof(DriverId)]);
        if (!AcceptAgreement)
            yield return new ValidationResult("Please accept the rental agreement.", [nameof(AcceptAgreement)]);
    }
}

/// <summary>Body for POST /api/bookings/{id}/pay.</summary>
public class PayRequest
{
    [Required] public PaymentMethod? Method { get; set; }
}

public record QuoteDto(
    int Days, decimal VehicleCost, decimal LongRentalDiscount, decimal LongRentalRate, decimal DriverCost,
    decimal ProtectionCost, decimal DeliveryFee, decimal Subtotal, string? PromoCode, decimal PromoDiscount,
    string? PromoError, decimal Total, ProtectionPlan Plan, decimal SecurityDeposit);

/// <summary>Body for POST /api/bookings/{id}/review.</summary>
public class ReviewRequest
{
    [Range(1, 5)] public int Stars { get; set; }
    [Range(1, 5)] public int? DriverStars { get; set; }
    [MaxLength(1000)] public string? Comment { get; set; }
}

public record AgreementDto(string Version, IReadOnlyList<string> Terms);

/// <summary>A booking as shown on "My bookings" and the confirmation page.</summary>
public record BookingDto(
    int Id, BookingStatus Status, DateTime StartDate, DateTime EndDate,
    string PickupLocation, string Destination, bool WithDriver,
    int VehicleId, string VehicleName, string VehicleImageUrl, string VehiclePlate,
    int? DriverId, string? DriverName,
    decimal VehicleCost, decimal DriverCost, decimal ProtectionCost, decimal TotalPrice,
    ProtectionPlan ProtectionPlan, decimal SecurityDeposit, DepositStatus DepositStatus,
    string? AgreementVersion, DateTime? AgreementAcceptedAt,
    PaymentMethod? PaymentMethod, bool IsPaid, DateTime CreatedAt,
    bool CanPay, bool CanCancel, bool CanCheckIn, bool CanReturn, int InspectionCount,
    bool DriverAccepted, decimal DepositDeduction, string? DepositNote, string? CancellationReason,
    decimal LongRentalDiscount, string? PromoCode, decimal PromoDiscount, HandoverType Handover, decimal DeliveryFee,
    bool CanReview, int? ReviewStars);
