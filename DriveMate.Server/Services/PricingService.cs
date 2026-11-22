using DriveMate.Server.Models;

namespace DriveMate.Server.Services;

/// <summary>The result of a price calculation, broken down for the trip summary.</summary>
public record PriceQuote(
    int Days, decimal VehicleCost, decimal LongRentalDiscount, decimal DriverCost, decimal ProtectionCost,
    decimal DeliveryFee, ProtectionPlan Plan, decimal SecurityDeposit)
{
    /// <summary>Set with `quote with { PromoDiscount = ... }` after checking a promo code.</summary>
    public decimal PromoDiscount { get; init; }

    /// <summary>Everything before the promo code.</summary>
    public decimal Subtotal => VehicleCost - LongRentalDiscount + DriverCost + ProtectionCost + DeliveryFee;

    /// <summary>What the customer pays (the deposit is separate because it's refunded).</summary>
    public decimal Total => Subtotal - PromoDiscount;

    /// <summary>Owner's share: 85% of the (discounted) vehicle cost, plus the full delivery fee (they do the driving).</summary>
    public decimal OwnerPayout => PricingService.Payout(VehicleCost - LongRentalDiscount) + DeliveryFee;

    /// <summary>Driver's share of the driver cost.</summary>
    public decimal DriverPayout => PricingService.Payout(DriverCost);

    /// <summary>DriveMate keeps the rest. Promo codes are paid by DriveMate, so they lower this, not the partners' share.</summary>
    public decimal PlatformFee => Total - OwnerPayout - DriverPayout;
}

/// <summary>One protection plan's terms, as shown on the plan picker.</summary>
public record ProtectionPlanInfo(ProtectionPlan Plan, string Name, decimal PricePerDay, decimal Liability, string Description);

/// <summary>
/// DriveMate's pricing rules, kept in one place so the server is the only source of truth.
/// (The frontend can show an estimate, but the server always recalculates when booking.)
/// </summary>
public static class PricingService
{
    /// <summary>
    /// "Liability" = the most the customer pays if the car is damaged during the trip.
    /// A higher daily price buys a lower liability.
    /// </summary>
    public static readonly IReadOnlyList<ProtectionPlanInfo> Plans =
    [
        new(ProtectionPlan.Basic, "Basic", 0m, 20_000m, "Included. You pay up to ₱20,000 for damage."),
        new(ProtectionPlan.Standard, "Standard", 250m, 5_000m, "You pay up to ₱5,000 for damage."),
        new(ProtectionPlan.Premium, "Premium", 450m, 0m, "Zero liability: damage is fully covered."),
    ];

    /// <summary>Refundable deposit. Lower with a driver, since a DriveMate driver handles the car.</summary>
    public const decimal SelfDriveDeposit = 3_000m;
    public const decimal WithDriverDeposit = 1_000m;

    /// <summary>
    /// DriveMate's service fee on the vehicle and driver cost (how the business earns money).
    /// Protection plan fees go fully to DriveMate, which carries the damage cover.
    /// </summary>
    public const decimal PlatformFeeRate = 0.15m;

    /// <summary>Long rentals are cheaper per day, like on Turo: 7+ days = weekly, 28+ days = monthly.</summary>
    public const int WeeklyDays = 7, MonthlyDays = 28;
    public const decimal WeeklyDiscountRate = 0.10m, MonthlyDiscountRate = 0.25m;

    public static decimal LongRentalRate(int days) =>
        days >= MonthlyDays ? MonthlyDiscountRate : days >= WeeklyDays ? WeeklyDiscountRate : 0m;

    /// <summary>A partner's share after the fee, rounded to centavos.</summary>
    public static decimal Payout(decimal cost) => Math.Round(cost * (1 - PlatformFeeRate), 2);

    public static ProtectionPlanInfo PlanInfo(ProtectionPlan plan) => Plans.First(p => p.Plan == plan);

    /// <summary>Days = EndDate − StartDate in calendar days, minimum 1.</summary>
    public static int CalculateDays(DateTime start, DateTime end) =>
        Math.Max(1, (end.Date - start.Date).Days);

    /// <summary>
    /// Total = vehicle cost − long-rental discount + driver + protection + delivery (− promo, applied later).
    /// The discount only applies to the vehicle: drivers are paid their full daily rate.
    /// </summary>
    public static PriceQuote Quote(decimal vehiclePricePerDay, decimal? driverPricePerDay, DateTime start, DateTime end,
        ProtectionPlan plan = ProtectionPlan.Basic, decimal deliveryFee = 0m)
    {
        var days = CalculateDays(start, end);
        var vehicleCost = vehiclePricePerDay * days;
        var longDiscount = Math.Round(vehicleCost * LongRentalRate(days), 2);
        var driverCost = (driverPricePerDay ?? 0m) * days;
        var protectionCost = PlanInfo(plan).PricePerDay * days;
        var deposit = driverPricePerDay is null ? SelfDriveDeposit : WithDriverDeposit;
        return new PriceQuote(days, vehicleCost, longDiscount, driverCost, protectionCost, deliveryFee, plan, deposit);
    }
}
