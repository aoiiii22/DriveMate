using System.ComponentModel.DataAnnotations;
using DriveMate.Server.Models;

namespace DriveMate.Server.DTOs;

/// <summary>A vehicle as shown on the "Choose a vehicle" list.</summary>
public record VehicleSummaryDto(
    int Id, string Name, VehicleType Type, int Seats, Transmission Transmission, FuelType FuelType,
    decimal PricePerDay, string ImageUrl, string Location, double Rating, int ReviewCount,
    bool IsFavorite, bool OffersDelivery, bool OffersAirport)
{
    /// <summary>When dates are searched: the number of days and the car's total (with long-rental discount).</summary>
    public int? TripDays { get; init; }
    public decimal? TripTotal { get; init; }
}

/// <summary>Everything the "Vehicle details" page needs.</summary>
public record VehicleDetailDto(
    int Id, string Name, VehicleType Type, int Seats, Transmission Transmission, FuelType FuelType,
    decimal PricePerDay, string ImageUrl, string Location, double Rating, string PlateNumber,
    bool IsAvailable, string? Description, string OwnerName, IReadOnlyList<ReviewDto> Reviews, IReadOnlyList<DateRangeDto> BookedDates,
    int RatingCount, decimal? DeliveryFee, decimal? AirportFee, bool IsFavorite);

public record ReviewDto(int Id, int Stars, string? Comment, string CustomerName, DateTime CreatedAt);

/// <summary>A booked period, used to grey out dates on the availability calendar.</summary>
public record DateRangeDto(DateTime Start, DateTime End);

/// <summary>
/// Query-string filters for GET /api/vehicles. [ApiController] validates this automatically
/// and returns 400 Bad Request with details if a rule fails.
/// </summary>
public class VehicleQuery : IValidatableObject
{
    public VehicleType? Type { get; set; }

    /// <summary>Minimum number of seats.</summary>
    [Range(1, 50)]
    public int? Seats { get; set; }

    public Transmission? Transmission { get; set; }

    public FuelType? FuelType { get; set; }

    /// <summary>Only my hearted cars (needs a login token).</summary>
    public bool Favorites { get; set; }

    /// <summary>Only cars that can be delivered to an address.</summary>
    public bool Delivery { get; set; }

    /// <summary>"price" (cheapest first, default), "price_desc" or "rating".</summary>
    [RegularExpression("^(price|price_desc|rating)$")]
    public string? Sort { get; set; }

    /// <summary>Maximum price per day (PHP).</summary>
    [Range(0, 1_000_000)]
    public decimal? MaxPrice { get; set; }

    /// <summary>Optional location text, e.g. "Makati".</summary>
    [MaxLength(100)]
    public string? Location { get; set; }

    /// <summary>If Start and End are given, only vehicles free for that whole period are returned.</summary>
    public DateTime? Start { get; set; }
    public DateTime? End { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Start.HasValue != End.HasValue)
            yield return new ValidationResult("Provide both start and end, or neither.", [nameof(Start), nameof(End)]);
        else if (Start >= End)
            yield return new ValidationResult("End must be after start.", [nameof(End)]);
    }
}
