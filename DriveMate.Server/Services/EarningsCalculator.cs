using System.Globalization;
using DriveMate.Server.DTOs;
using DriveMate.Server.Models;

namespace DriveMate.Server.Services;

/// <summary>One booking's money from a partner's point of view.</summary>
public record EarningRow(BookingStatus Status, DateTime EndDate, decimal Payout, decimal FeePaid, decimal DepositDeduction);

/// <summary>Turns a partner's bookings into the numbers on the earnings dashboard.</summary>
public static class EarningsCalculator
{
    public static EarningsDto Summarize(IReadOnlyCollection<EarningRow> rows, DateTime today)
    {
        // Money counts as "earned" once the trip is completed.
        var done = rows.Where(r => r.Status == BookingStatus.Completed).ToList();
        var upcoming = rows.Where(r => r.Status is BookingStatus.Confirmed or BookingStatus.Ongoing).Sum(r => r.Payout);
        var monthStart = new DateTime(today.Year, today.Month, 1);

        // Last 6 months, oldest first, including months with zero trips.
        var months = Enumerable.Range(0, 6)
            .Select(i => monthStart.AddMonths(i - 5))
            .Select(m =>
            {
                var inMonth = done.Where(r => r.EndDate >= m && r.EndDate < m.AddMonths(1)).ToList();
                return new MonthEarningsDto(m.ToString("MMM yyyy", CultureInfo.InvariantCulture),
                    inMonth.Sum(r => r.Payout + r.DepositDeduction), inMonth.Count);
            })
            .ToList();

        return new EarningsDto(
            Earned: done.Sum(r => r.Payout + r.DepositDeduction),
            Upcoming: upcoming,
            ThisMonth: months[^1].Earned,
            PlatformFees: done.Sum(r => r.FeePaid),
            DepositDeductions: done.Sum(r => r.DepositDeduction),
            CompletedTrips: done.Count,
            Months: months);
    }
}
