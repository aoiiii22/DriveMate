using DriveMate.Server.Data;
using DriveMate.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Services;

/// <summary>Result of checking a promo code: the discount, or a message saying why it doesn't work.</summary>
public record PromoResult(string? Code, decimal Discount, string? Error);

/// <summary>Checks promo codes against their rules and works out the discount.</summary>
public class PromoService(AppDbContext db)
{
    public async Task<PromoResult> CheckAsync(string? rawCode, decimal subtotal, string? customerId)
    {
        if (string.IsNullOrWhiteSpace(rawCode)) return new PromoResult(null, 0, null);
        var code = rawCode.Trim().ToUpperInvariant();

        var promo = await db.PromoCodes.AsNoTracking().FirstOrDefaultAsync(p => p.Code == code);
        if (promo is null || !promo.IsActive) return Fail(code, "This promo code doesn't exist.");
        if (promo.ValidUntil is { } until && DateTime.Today > until.Date) return Fail(code, "This promo code has expired.");
        if (subtotal < promo.MinSpend) return Fail(code, $"This code needs a rental of at least ₱{promo.MinSpend:N0}.");

        // A code counts as "used" by any booking that isn't cancelled.
        var uses = db.Bookings.Where(b => b.PromoCode == code && b.Status != BookingStatus.Cancelled);
        if (promo.UsageLimit is { } limit && await uses.CountAsync() >= limit) return Fail(code, "This promo code has been fully used.");
        if (customerId is not null && await uses.AnyAsync(b => b.CustomerId == customerId))
            return Fail(code, "You've already used this promo code.");

        var discount = promo.PercentOff is { } pct
            ? Math.Round(subtotal * pct / 100m, 2)
            : promo.AmountOff ?? 0m;
        if (promo.MaxDiscount is { } max) discount = Math.Min(discount, max);
        discount = Math.Min(discount, subtotal); // never below ₱0

        return new PromoResult(code, discount, null);
    }

    private static PromoResult Fail(string code, string error) => new(code, 0, error);
}
