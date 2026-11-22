using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using DriveMate.Server.Data;
using DriveMate.Server.Models;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Controllers;

// ============================== Messages ==============================

public record MessageDto(int Id, string SenderName, string SenderRole, bool Mine, string Body, DateTime CreatedAt);

public class SendMessageRequest
{
    [Required, MinLength(1), MaxLength(1000)]
    public string Body { get; set; } = string.Empty;
}

/// <summary>A chat thread per booking, for its customer, vehicle owner and driver.</summary>
[ApiController]
[Authorize]
[Route("api/bookings/{bookingId:int}/messages")]
public class MessagesController(AppDbContext db, Notifier notifier) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<List<MessageDto>>> List(int bookingId)
    {
        var uid = UserId;
        if (!await db.Bookings.InvolvingUser(uid).AnyAsync(b => b.Id == bookingId)) return NotFound();

        return await db.Messages.AsNoTracking()
            .Where(m => m.BookingId == bookingId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new MessageDto(m.Id, m.Sender!.FullName,
                // Label each sender by their part in THIS booking, not their account role.
                m.SenderId == m.Booking!.CustomerId ? "Customer"
                    : m.SenderId == m.Booking.Vehicle!.OwnerId ? "Owner" : "Driver",
                m.SenderId == uid, m.Body, m.CreatedAt))
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<MessageDto>> Send(int bookingId, SendMessageRequest request)
    {
        var uid = UserId;
        var parties = await db.Bookings.InvolvingUser(uid).Parties(bookingId).FirstOrDefaultAsync();
        if (parties is null) return NotFound();

        var body = request.Body.Trim();
        if (body.Length == 0)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Type a message first.");

        var message = new Message { BookingId = bookingId, SenderId = uid, Body = body };
        db.Messages.Add(message);
        var name = User.FindFirstValue(ClaimTypes.Name) ?? "Someone";
        var preview = body.Length > 80 ? body[..80] + "…" : body;
        notifier.BookingParties(parties, uid, $"Message from {name}", $"#{bookingId}: {preview}");
        await db.SaveChangesAsync();

        var role = uid == parties.CustomerId ? "Customer" : uid == parties.OwnerId ? "Owner" : "Driver";
        return new MessageDto(message.Id, name, role, true, message.Body, message.CreatedAt);
    }
}

// ============================== Notifications ==============================

public record NotificationDto(int Id, string Title, string Body, string Page, int? BookingId, bool IsRead, DateTime CreatedAt);

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>The latest 30 notifications, newest first.</summary>
    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> List() =>
        await db.Notifications.AsNoTracking()
            .Where(n => n.UserId == UserId)
            .OrderByDescending(n => n.CreatedAt).Take(30)
            .Select(n => new NotificationDto(n.Id, n.Title, n.Body, n.Page, n.BookingId, n.IsRead, n.CreatedAt))
            .ToListAsync();

    /// <summary>Cheap call the bell polls every 30 seconds.</summary>
    [HttpGet("unread-count")]
    public async Task<int> UnreadCount() => await db.Notifications.CountAsync(n => n.UserId == UserId && !n.IsRead);

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> Read(int id)
    {
        // ExecuteUpdate = one SQL UPDATE, without loading the row first.
        var changed = await db.Notifications.Where(n => n.Id == id && n.UserId == UserId)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return changed == 0 ? NotFound() : NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> ReadAll()
    {
        await db.Notifications.Where(n => n.UserId == UserId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return NoContent();
    }
}

// ============================== Favorites ==============================

[ApiController]
[Authorize]
[Route("api/favorites")]
public class FavoritesController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>The ids of my hearted cars (the full list uses GET /api/vehicles?favorites=true).</summary>
    [HttpGet]
    public async Task<List<int>> Ids() =>
        await db.Favorites.Where(f => f.UserId == UserId).Select(f => f.VehicleId).ToListAsync();

    /// <summary>PUT = "make it so": hearting twice is harmless (idempotent).</summary>
    [HttpPut("{vehicleId:int}")]
    public async Task<IActionResult> Add(int vehicleId)
    {
        if (!await db.Vehicles.AnyAsync(v => v.Id == vehicleId)) return NotFound();
        if (!await db.Favorites.AnyAsync(f => f.UserId == UserId && f.VehicleId == vehicleId))
        {
            db.Favorites.Add(new Favorite { UserId = UserId, VehicleId = vehicleId });
            await db.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpDelete("{vehicleId:int}")]
    public async Task<IActionResult> Remove(int vehicleId)
    {
        await db.Favorites.Where(f => f.UserId == UserId && f.VehicleId == vehicleId).ExecuteDeleteAsync();
        return NoContent();
    }
}

// ============================== Admin: promo codes ==============================

public record PromoDto(int Id, string Code, string Description, decimal? PercentOff, decimal? AmountOff,
    decimal? MaxDiscount, decimal MinSpend, DateTime? ValidUntil, int? UsageLimit, int TimesUsed, bool IsActive);

public class PromoRequest : IValidatableObject
{
    [Required, MaxLength(30), RegularExpression("^[A-Za-z0-9]+$", ErrorMessage = "Codes use letters and numbers only.")]
    public string Code { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string Description { get; set; } = string.Empty;
    [Range(1, 100)] public decimal? PercentOff { get; set; }
    [Range(1, 100_000)] public decimal? AmountOff { get; set; }
    [Range(1, 100_000)] public decimal? MaxDiscount { get; set; }
    [Range(0, 1_000_000)] public decimal MinSpend { get; set; }
    public DateTime? ValidUntil { get; set; }
    [Range(1, 1_000_000)] public int? UsageLimit { get; set; }
    public bool IsActive { get; set; } = true;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if ((PercentOff is null) == (AmountOff is null))
            yield return new ValidationResult("Give either a percentage or a peso amount, not both.", [nameof(PercentOff)]);
    }
}

[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/admin/promos")]
public class AdminPromosController(AppDbContext db, Auditor audit) : ControllerBase
{
    [HttpGet]
    public async Task<List<PromoDto>> List() =>
        await db.PromoCodes.AsNoTracking().OrderByDescending(p => p.CreatedAt)
            .Select(p => new PromoDto(p.Id, p.Code, p.Description, p.PercentOff, p.AmountOff, p.MaxDiscount, p.MinSpend,
                p.ValidUntil, p.UsageLimit,
                db.Bookings.Count(b => b.PromoCode == p.Code && b.Status != BookingStatus.Cancelled), p.IsActive))
            .ToListAsync();

    [HttpPost]
    public async Task<IActionResult> Create(PromoRequest r)
    {
        var code = r.Code.Trim().ToUpperInvariant();
        if (await db.PromoCodes.AnyAsync(p => p.Code == code))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "That code already exists.");
        db.PromoCodes.Add(Apply(new PromoCode { Code = code }, r));
        audit.Log("PromoCreated", details: $"{code}: {r.Description.Trim()}");
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Edit a code (the code text itself stays the same: old bookings refer to it).</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, PromoRequest r)
    {
        var promo = await db.PromoCodes.FindAsync(id);
        if (promo is null) return NotFound();
        Apply(promo, r);
        audit.Log("PromoUpdated", details: $"{promo.Code} ({(promo.IsActive ? "on" : "off")})");
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static PromoCode Apply(PromoCode p, PromoRequest r)
    {
        p.Description = r.Description.Trim();
        p.PercentOff = r.PercentOff;
        p.AmountOff = r.AmountOff;
        p.MaxDiscount = r.PercentOff is null ? null : r.MaxDiscount;
        p.MinSpend = r.MinSpend;
        p.ValidUntil = r.ValidUntil?.Date;
        p.UsageLimit = r.UsageLimit;
        p.IsActive = r.IsActive;
        return p;
    }
}
