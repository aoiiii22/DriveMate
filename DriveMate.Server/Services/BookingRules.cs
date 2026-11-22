using DriveMate.Server.Models;

namespace DriveMate.Server.Services;

/// <summary>
/// Reusable query rules for bookings. These are extension methods on IQueryable,
/// so EF Core translates them to SQL (the filtering happens in the database, not in C#).
/// </summary>
public static class BookingRules
{
    /// <summary>Statuses that "hold" a vehicle/driver. Cancelled and Completed bookings free them up.</summary>
    public static readonly BookingStatus[] BlockingStatuses =
        [BookingStatus.Pending, BookingStatus.Confirmed, BookingStatus.Ongoing];

    /// <summary>
    /// Active bookings whose dates overlap [start, end).
    /// Two ranges overlap when each one starts before the other ends.
    /// </summary>
    public static IQueryable<Booking> ActiveOverlapping(this IQueryable<Booking> bookings, DateTime start, DateTime end) =>
        bookings.Where(b => BlockingStatuses.Contains(b.Status) && b.StartDate < end && start < b.EndDate);

    /// <summary>Owner-blocked periods overlapping [start, end).</summary>
    public static IQueryable<VehicleBlock> Overlapping(this IQueryable<VehicleBlock> blocks, DateTime start, DateTime end) =>
        blocks.Where(b => b.StartDate < end && start < b.EndDate);
}
