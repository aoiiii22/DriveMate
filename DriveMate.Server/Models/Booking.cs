using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>A customer's rental of a vehicle, optionally with a driver.</summary>
public class Booking
{
    public int Id { get; set; }

    public string CustomerId { get; set; } = string.Empty;
    public AppUser? Customer { get; set; }

    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    // Nullable (int?) because self-drive bookings have no driver.
    public int? DriverId { get; set; }
    public Driver? Driver { get; set; }

    [MaxLength(200)]
    public string PickupLocation { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Destination { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    public bool WithDriver { get; set; }

    // Prices are calculated on the server (PricingService) and stored,
    // so a later price change doesn't alter old bookings.
    public decimal VehicleCost { get; set; }
    public decimal DriverCost { get; set; }
    public decimal ProtectionCost { get; set; }

    /// <summary>VehicleCost + DriverCost + ProtectionCost. The deposit is NOT included (it's refundable).</summary>
    public decimal TotalPrice { get; set; }

    public ProtectionPlan ProtectionPlan { get; set; } = ProtectionPlan.Basic;

    /// <summary>Refundable security deposit, held during the trip.</summary>
    public decimal SecurityDeposit { get; set; }
    public DepositStatus DepositStatus { get; set; } = DepositStatus.None;

    /// <summary>Which rental agreement text the customer accepted, and when.</summary>
    [MaxLength(20)]
    public string? AgreementVersion { get; set; }
    public DateTime? AgreementAcceptedAt { get; set; }

    public List<TripInspection> Inspections { get; set; } = [];

    // ----- Money split, stored at booking time like the prices (see PricingService) -----
    /// <summary>What the vehicle owner receives: vehicle cost minus DriveMate's fee.</summary>
    public decimal OwnerPayout { get; set; }
    /// <summary>What the driver receives: driver cost minus DriveMate's fee.</summary>
    public decimal DriverPayout { get; set; }
    /// <summary>DriveMate's revenue: the fee on vehicle + driver cost, plus protection plan fees.</summary>
    public decimal PlatformFee { get; set; }

    /// <summary>When the assigned driver accepted the trip. Null = waiting for the driver.</summary>
    public DateTime? DriverAcceptedAt { get; set; }

    // ----- Deposit settlement after the return check (done by the vehicle owner) -----
    /// <summary>Amount kept from the deposit (e.g. missing fuel, damage). The rest is refunded.</summary>
    public decimal DepositDeduction { get; set; }
    [MaxLength(500)]
    public string? DepositNote { get; set; }
    public DateTime? DepositSettledAt { get; set; }

    /// <summary>Why it was cancelled, shown to the customer (e.g. "No driver available").</summary>
    [MaxLength(300)]
    public string? CancellationReason { get; set; }

    public List<DriverDecline> DriverDeclines { get; set; } = [];

    // ----- Extras: discounts, promo code, delivery -----
    /// <summary>Automatic weekly/monthly discount on the vehicle cost.</summary>
    public decimal LongRentalDiscount { get; set; }

    [MaxLength(30)]
    public string? PromoCode { get; set; }
    public decimal PromoDiscount { get; set; }

    /// <summary>Owner location, delivered to an address, or at the airport. PickupLocation holds the address/terminal.</summary>
    public HandoverType Handover { get; set; } = HandoverType.OwnerLocation;
    public decimal DeliveryFee { get; set; }

    public List<Message> Messages { get; set; } = [];

    public BookingStatus Status { get; set; } = BookingStatus.Pending;

    public PaymentMethod? PaymentMethod { get; set; }
    public bool IsPaid { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Review? Review { get; set; }
}
