using System.Security.Claims;
using DriveMate.Server.Data;
using DriveMate.Server.DTOs;
using DriveMate.Server.Models;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Controllers;

/// <summary>The signed-in customer's own licence + ID verification.</summary>
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class VerificationController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("me")]
    public async Task<ActionResult<MyVerificationDto>> Mine()
    {
        var v = await db.UserVerifications.AsNoTracking()
            .Where(x => x.UserId == UserId)
            .Select(x => new MyVerificationDto(x.Status, x.LicenseNumber, x.LicenseExpiry,
                x.LicensePhotoId, x.IdPhotoId, x.RejectionReason, x.SubmittedAt))
            .FirstOrDefaultAsync();
        return v ?? MyVerificationDto.None;
    }

    /// <summary>Submit or resubmit (e.g. after a rejection or a renewed licence). Goes back to Pending.</summary>
    [HttpPut("me")]
    public async Task<ActionResult<MyVerificationDto>> Submit(SubmitVerificationRequest request)
    {
        // Both photos must be this user's own uploads, and not trip photos.
        var photoIds = new[] { request.LicensePhotoId!.Value, request.IdPhotoId!.Value };
        var ownPhotos = await db.StoredFiles
            .CountAsync(f => photoIds.Contains(f.Id) && f.UploadedById == UserId && f.BookingId == null);
        if (ownPhotos != 2)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Please upload your photos again.");

        var v = await db.UserVerifications.FirstOrDefaultAsync(x => x.UserId == UserId);
        if (v is null)
        {
            v = new UserVerification { UserId = UserId };
            db.UserVerifications.Add(v);
        }

        v.LicenseNumber = request.LicenseNumber.Trim().ToUpperInvariant();
        v.LicenseExpiry = request.LicenseExpiry!.Value.Date;
        v.LicensePhotoId = request.LicensePhotoId;
        v.IdPhotoId = request.IdPhotoId;
        v.Status = VerificationStatus.Pending;
        v.RejectionReason = null;
        v.SubmittedAt = DateTime.UtcNow;
        v.ReviewedAt = null;
        await db.SaveChangesAsync();

        return await Mine();
    }
}

/// <summary>Admin review queue for verifications.</summary>
[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/admin/verifications")]
public class AdminVerificationsController(AppDbContext db, Notifier notifier, Auditor audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AdminVerificationDto>>> List([FromQuery] VerificationStatus? status) =>
        await db.UserVerifications.AsNoTracking()
            .Where(v => status == null || v.Status == status)
            .OrderBy(v => v.SubmittedAt) // oldest first: first come, first served
            .Select(v => new AdminVerificationDto(v.Id, v.UserId, v.User!.FullName, v.User.Email ?? "",
                v.User.PhoneNumber, v.LicenseNumber, v.LicenseExpiry, v.LicensePhotoId, v.IdPhotoId,
                v.Status, v.RejectionReason, v.SubmittedAt, v.ReviewedAt))
            .ToListAsync();

    [HttpPost("{id:int}/approve")]
    public Task<IActionResult> Approve(int id) => Review(id, VerificationStatus.Approved, null);

    [HttpPost("{id:int}/reject")]
    public Task<IActionResult> Reject(int id, RejectVerificationRequest request) =>
        Review(id, VerificationStatus.Rejected, request.Reason.Trim());

    private async Task<IActionResult> Review(int id, VerificationStatus status, string? reason)
    {
        var v = await db.UserVerifications.FindAsync(id);
        if (v is null) return NotFound();
        if (v.Status != VerificationStatus.Pending)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Only pending verifications can be reviewed.");

        v.Status = status;
        v.RejectionReason = reason;
        v.ReviewedAt = DateTime.UtcNow;
        var name = await db.Users.Where(x => x.Id == v.UserId).Select(x => x.FullName).FirstOrDefaultAsync();
        audit.Log(status == VerificationStatus.Approved ? "VerificationApproved" : "VerificationRejected", v.UserId, name, reason);
        notifier.Send(v.UserId,
            status == VerificationStatus.Approved ? "You're verified ✅" : "Verification not approved",
            status == VerificationStatus.Approved ? "You can now book self-drive trips." : $"Reason: {reason}. Please submit again.",
            "verify");
        await db.SaveChangesAsync();
        return NoContent(); // 204: done, nothing to return
    }
}
