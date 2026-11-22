using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>How the customer gets the car: at the owner's location, delivered, or at the airport (NAIA).</summary>
public enum HandoverType { OwnerLocation, Delivery, Airport }

/// <summary>A discount code an Admin creates, e.g. WELCOME10. Each customer can use a code once.</summary>
public class PromoCode
{
    public int Id { get; set; }

    /// <summary>Stored in UPPERCASE so "welcome10" and "WELCOME10" match.</summary>
    [MaxLength(30)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    /// <summary>Set exactly one of PercentOff (e.g. 10 = 10%) or AmountOff (pesos).</summary>
    public decimal? PercentOff { get; set; }
    public decimal? AmountOff { get; set; }

    /// <summary>Cap for percentage codes, e.g. "10% off, up to ₱500".</summary>
    public decimal? MaxDiscount { get; set; }

    /// <summary>Minimum rental total before the code works.</summary>
    public decimal MinSpend { get; set; }

    /// <summary>Last valid day (local date). Null = never expires.</summary>
    public DateTime? ValidUntil { get; set; }

    /// <summary>Total uses across all customers. Null = unlimited.</summary>
    public int? UsageLimit { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A car a customer hearted.</summary>
public class Favorite
{
    public string UserId { get; set; } = string.Empty;
    public AppUser? User { get; set; }

    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A chat message in a booking's thread (customer, vehicle owner and driver).</summary>
public class Message
{
    public int Id { get; set; }

    public int BookingId { get; set; }
    public Booking? Booking { get; set; }

    public string SenderId { get; set; } = string.Empty;
    public AppUser? Sender { get; set; }

    [MaxLength(1000)]
    public string Body { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>An in-app notification shown under the bell icon.</summary>
public class Notification
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;
    public AppUser? User { get; set; }

    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(300)]
    public string Body { get; set; } = string.Empty;

    /// <summary>Which app page to open: "bookings", "owner", "driver", "verify", "partner", "admin".</summary>
    [MaxLength(20)]
    public string Page { get; set; } = "bookings";

    public int? BookingId { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
