using System.Security.Claims;
using DriveMate.Server.Data;
using DriveMate.Server.Models;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Controllers;

public record UploadedFileDto(Guid Id, string ContentType, long SizeBytes);

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class FilesController(AppDbContext db, FileStorage storage) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>
    /// Upload one image (multipart form field "file"). Pass bookingId for trip photos.
    /// Returns its id, which is then sent with the verification or inspection form.
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(FileStorage.MaxBytes + 64 * 1024)] // the photo plus a little form overhead
    public async Task<ActionResult<UploadedFileDto>> Upload(IFormFile file, [FromForm] int? bookingId, CancellationToken ct)
    {
        if (file.Length == 0 || file.Length > FileStorage.MaxBytes)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Photos must be between 1 byte and 5 MB.");

        if (bookingId is { } id && !await db.Bookings.InvolvingUser(UserId).AnyAsync(b => b.Id == id, ct))
            return NotFound();

        var stored = await storage.SaveAsync(file, UserId, bookingId, ct);
        if (stored is null)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Only JPEG, PNG or WebP photos are allowed.");

        db.StoredFiles.Add(stored);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            storage.Delete(stored); // don't leave an orphan file on disk
            throw;
        }

        return new UploadedFileDto(stored.Id, stored.ContentType, stored.SizeBytes);
    }

    /// <summary>
    /// Download an image. Car listing photos are public. Private ones are allowed for: the uploader,
    /// admins, and (for trip photos) the booking's customer, vehicle owner and driver. Everyone else gets 404.
    /// </summary>
    [AllowAnonymous] // public car photos must load in search for logged-out visitors too
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ""; // "" when logged out: matches nothing
        var isAdmin = User.IsInRole(Roles.Admin);

        var file = await db.StoredFiles.AsNoTracking()
            .Where(f => f.Id == id)
            .Where(f => f.IsPublic || isAdmin || (uid != "" && f.UploadedById == uid)
                || (f.BookingId != null && db.Bookings.InvolvingUser(uid).Any(b => b.Id == f.BookingId)))
            .FirstOrDefaultAsync(ct);
        if (file is null) return NotFound();

        var path = storage.FullPath(file);
        if (!System.IO.File.Exists(path)) return NotFound();

        // Private photos: browsers may cache them, shared proxies may not (personal data).
        Response.Headers.CacheControl = file.IsPublic ? "public, max-age=86400" : "private, max-age=3600";
        return PhysicalFile(path, file.ContentType);
    }
}
