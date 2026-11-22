using DriveMate.Server.Data;
using DriveMate.Server.Models;

namespace DriveMate.Server.Services;

/// <summary>
/// Adds in-app notifications. It only ADDS them to the DbContext: they're saved by the
/// caller's own SaveChangesAsync, so the notification and the change it describes are saved together.
/// </summary>
public class Notifier(AppDbContext db)
{
    public void Send(string? userId, string title, string body, string page, int? bookingId = null)
    {
        if (string.IsNullOrEmpty(userId)) return;
        db.Notifications.Add(new Notification
        {
            UserId = userId, Title = title, Body = body, Page = page, BookingId = bookingId,
        });
    }

    /// <summary>Tells the customer, the vehicle owner and the driver about a booking, except whoever caused it.</summary>
    public void BookingParties(BookingParties parties, string? exceptUserId, string title, string body)
    {
        if (parties.CustomerId != exceptUserId) Send(parties.CustomerId, title, body, "bookings", parties.BookingId);
        if (parties.OwnerId != exceptUserId) Send(parties.OwnerId, title, body, "owner", parties.BookingId);
        if (parties.DriverUserId is { } d && d != exceptUserId) Send(d, title, body, "driver", parties.BookingId);
    }
}

/// <summary>The three people involved in a booking.</summary>
public record BookingParties(int BookingId, string CustomerId, string OwnerId, string? DriverUserId);
