using DriveMate.Server.Models;

namespace DriveMate.Server.Services;

/// <summary>Who is involved in a booking. Used to decide who may see its trip photos.</summary>
public static class BookingAccess
{
    /// <summary>Bookings where the user is the customer, the vehicle owner or the driver.</summary>
    public static IQueryable<Booking> InvolvingUser(this IQueryable<Booking> bookings, string userId) =>
        bookings.Where(b => b.CustomerId == userId
            || b.Vehicle!.OwnerId == userId
            || (b.Driver != null && b.Driver.UserId == userId));

    /// <summary>Loads who to notify about a booking.</summary>
    public static IQueryable<BookingParties> Parties(this IQueryable<Booking> bookings, int bookingId) =>
        bookings.Where(b => b.Id == bookingId)
            .Select(b => new BookingParties(b.Id, b.CustomerId, b.Vehicle!.OwnerId, b.Driver != null ? b.Driver.UserId : null));
}
