using System.ComponentModel.DataAnnotations;
using DriveMate.Server.Models;

namespace DriveMate.Server.DTOs;

// ===================== Owner: listings =====================

/// <summary>Body for creating or editing a listing. PlateNumber and Type can't change after creation.</summary>
public class VehicleListingRequest
{
    [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
    [Required] public VehicleType? Type { get; set; }
    [Range(1, 50)] public int Seats { get; set; }
    [Required] public Transmission? Transmission { get; set; }
    [Required] public FuelType? FuelType { get; set; }
    [Range(100, 100_000)] public decimal PricePerDay { get; set; }

    [Required, MaxLength(20), RegularExpression(@"^[A-Za-z0-9 ]+$", ErrorMessage = "Plate number may only contain letters, numbers and spaces.")]
    public string PlateNumber { get; set; } = string.Empty;

    [Required, MaxLength(100)] public string Location { get; set; } = string.Empty;
    [MaxLength(1000)] public string? Description { get; set; }

    /// <summary>Fee to deliver to the customer's address. Null = no delivery.</summary>
    [Range(0, 20_000)] public decimal? DeliveryFee { get; set; }

    /// <summary>Fee to hand over at NAIA airport. Null = no airport pick-up.</summary>
    [Range(0, 20_000)] public decimal? AirportFee { get; set; }

    /// <summary>An uploaded photo (POST /api/files). Null keeps the type placeholder.</summary>
    public Guid? PhotoId { get; set; }

    public bool IsAvailable { get; set; } = true;
}

/// <summary>A car on the owner's "My cars" tab.</summary>
public record OwnerVehicleDto(
    int Id, string Name, VehicleType Type, int Seats, Transmission Transmission, FuelType FuelType,
    decimal PricePerDay, string ImageUrl, Guid? PhotoId, string PlateNumber, string Location, string? Description,
    bool IsAvailable, double Rating, int CompletedTrips, decimal Earned, DateTime? NextTripStart,
    decimal? DeliveryFee, decimal? AirportFee, int RatingCount);

public class BlockDatesRequest : DateRangeRequest
{
    [MaxLength(200)] public string? Reason { get; set; }
}

public record CalendarEntryDto(string Kind, int? Id, DateTime Start, DateTime End, string Label, BookingStatus? Status);

// ===================== Owner: bookings + deposit =====================

public record OwnerBookingDto(
    int Id, BookingStatus Status, DateTime StartDate, DateTime EndDate,
    int VehicleId, string VehicleName, string VehiclePlate,
    string CustomerName, string? CustomerPhone, bool WithDriver, string? DriverName,
    string PickupLocation, string Destination, ProtectionPlan ProtectionPlan,
    decimal VehicleCost, decimal OwnerPayout, decimal SecurityDeposit, DepositStatus DepositStatus,
    decimal DepositDeduction, string? DepositNote, int InspectionCount,
    bool CanCheckIn, bool CanSettleDeposit);

public class SettleDepositRequest : IValidatableObject
{
    [Range(0, 1_000_000)] public decimal Deduction { get; set; }
    [MaxLength(500)] public string? Note { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Deduction > 0 && string.IsNullOrWhiteSpace(Note))
            yield return new ValidationResult("Explain why part of the deposit is kept (e.g. \"Fuel ½ tank short\").", [nameof(Note)]);
    }
}

// ===================== Earnings (owner and driver) =====================

public record MonthEarningsDto(string Month, decimal Earned, int Trips);

public record EarningsDto(
    decimal Earned, decimal Upcoming, decimal ThisMonth, decimal PlatformFees, decimal DepositDeductions,
    int CompletedTrips, IReadOnlyList<MonthEarningsDto> Months);

// ===================== Driver =====================

public record DriverProfileDto(int Id, string FullName, string LicenseNumber, int YearsExperience,
    double Rating, decimal PricePerDay, bool IsAvailable);

public class UpdateDriverProfileRequest
{
    public bool IsAvailable { get; set; }
    [Range(100, 20_000)] public decimal PricePerDay { get; set; }
}

public record DriverTripDto(
    int Id, BookingStatus Status, DateTime StartDate, DateTime EndDate,
    string VehicleName, string VehiclePlate, string CustomerName, string? CustomerPhone,
    string PickupLocation, string Destination, decimal DriverPayout, bool Accepted,
    DepositStatus DepositStatus, int InspectionCount,
    bool CanRespond, bool CanCheckIn, bool CanReturn);

public class DeclineTripRequest
{
    [MaxLength(300)] public string? Reason { get; set; }
}

/// <summary>What happened after a decline: reassigned to another driver, or cancelled.</summary>
public record DeclineResultDto(bool Reassigned, string Message);

// ===================== Partner applications =====================

public class PartnerApplicationRequest : IValidatableObject
{
    [Required] public PartnerType? Type { get; set; }

    [Required, MinLength(20), MaxLength(2000)]
    public string Details { get; set; } = string.Empty;

    [MaxLength(30)] public string? LicenseNumber { get; set; }
    [Range(0, 60)] public int? YearsExperience { get; set; }
    [Range(100, 20_000)] public decimal? PricePerDay { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Type == PartnerType.Driver && (string.IsNullOrWhiteSpace(LicenseNumber) || YearsExperience is null || PricePerDay is null))
            yield return new ValidationResult("Drivers must give a licence number, years of experience and a daily rate.",
                [nameof(LicenseNumber)]);
    }
}

public record PartnerApplicationDto(
    int Id, PartnerType Type, string Details, string? LicenseNumber, int? YearsExperience, decimal? PricePerDay,
    ApplicationStatus Status, string? RejectionReason, DateTime CreatedAt, DateTime? ReviewedAt,
    string FullName, string Email, string? PhoneNumber, VerificationStatus? VerificationStatus);
