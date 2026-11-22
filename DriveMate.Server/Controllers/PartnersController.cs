using System.Linq.Expressions;
using System.Security.Claims;
using DriveMate.Server.Data;
using DriveMate.Server.DTOs;
using DriveMate.Server.Models;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Controllers;

/// <summary>"Become a partner": customers apply to list their car (Owner) or drive for DriveMate (Driver).</summary>
[ApiController]
[Authorize]
[Route("api/partners")]
public class PartnersController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("mine")]
    public async Task<ActionResult<List<PartnerApplicationDto>>> Mine() =>
        await db.PartnerApplications.AsNoTracking()
            .Where(a => a.UserId == UserId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(PartnerMapping.ToDto(db))
            .ToListAsync();

    [HttpPost("apply")]
    public async Task<ActionResult<PartnerApplicationDto>> Apply(PartnerApplicationRequest request)
    {
        var type = request.Type!.Value;
        var role = type == PartnerType.Owner ? Roles.Owner : Roles.Driver;
        if (User.IsInRole(role))
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: $"You are already a DriveMate {role.ToLowerInvariant()}.");
        if (await db.PartnerApplications.AnyAsync(a => a.UserId == UserId && a.Type == type && a.Status == ApplicationStatus.Pending))
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "You already have a pending application of this type.");

        var isDriver = type == PartnerType.Driver;
        var app = new PartnerApplication
        {
            UserId = UserId,
            Type = type,
            Details = request.Details.Trim(),
            LicenseNumber = isDriver ? request.LicenseNumber!.Trim().ToUpperInvariant() : null,
            YearsExperience = isDriver ? request.YearsExperience : null,
            PricePerDay = isDriver ? request.PricePerDay : null,
        };
        db.PartnerApplications.Add(app);
        await db.SaveChangesAsync();

        return await db.PartnerApplications.AsNoTracking().Where(a => a.Id == app.Id).Select(PartnerMapping.ToDto(db)).FirstAsync();
    }
}

/// <summary>Admin review of partner applications.</summary>
[ApiController]
[Authorize(Roles = Roles.Admin)]
[Route("api/admin/partners")]
public class AdminPartnersController(AppDbContext db, UserManager<AppUser> userManager, Notifier notifier, Auditor audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<PartnerApplicationDto>>> List([FromQuery] ApplicationStatus? status) =>
        await db.PartnerApplications.AsNoTracking()
            .Where(a => status == null || a.Status == status)
            .OrderBy(a => a.CreatedAt)
            .Select(PartnerMapping.ToDto(db))
            .ToListAsync();

    /// <summary>
    /// Approve: the user gets the Owner or Driver role (keeping Customer, so they can still rent),
    /// and drivers get a Driver profile. They see the new dashboard on their next page load.
    /// </summary>
    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var app = await db.PartnerApplications.Include(a => a.User).FirstOrDefaultAsync(a => a.Id == id);
        if (app is null) return NotFound();
        if (app.Status != ApplicationStatus.Pending)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Only pending applications can be reviewed.");

        await using var tx = await db.Database.BeginTransactionAsync();
        var user = app.User!;
        var role = app.Type == PartnerType.Owner ? Roles.Owner : Roles.Driver;
        if (!await userManager.IsInRoleAsync(user, role))
        {
            var result = await userManager.AddToRoleAsync(user, role);
            if (!result.Succeeded)
                return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Could not add the role.");
        }
        user.Role = role; // the "main" role shown in the app; the Customer role is kept

        if (app.Type == PartnerType.Driver && !await db.Drivers.AnyAsync(d => d.UserId == user.Id))
        {
            db.Drivers.Add(new Driver
            {
                UserId = user.Id,
                LicenseNumber = app.LicenseNumber ?? "",
                YearsExperience = app.YearsExperience ?? 0,
                PricePerDay = app.PricePerDay ?? 500,
                Rating = 0, // new drivers start unrated
                IsAvailable = false, // they switch themselves on from the driver dashboard
            });
        }

        app.Status = ApplicationStatus.Approved;
        app.ReviewedAt = DateTime.UtcNow;
        audit.Log("PartnerApproved", user.Id, user.FullName, $"Now a {role}");
        notifier.Send(user.Id, "Welcome, partner! 🎉",
            app.Type == PartnerType.Owner ? "You can now list your cars in the Owner dashboard."
                : "Your driver profile is ready. Switch on \"Accepting trips\" in the Driver dashboard.",
            app.Type == PartnerType.Owner ? "owner" : "driver");
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, RejectVerificationRequest request)
    {
        var app = await db.PartnerApplications.FindAsync(id);
        if (app is null) return NotFound();
        if (app.Status != ApplicationStatus.Pending)
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Only pending applications can be reviewed.");

        app.Status = ApplicationStatus.Rejected;
        app.RejectionReason = request.Reason.Trim();
        app.ReviewedAt = DateTime.UtcNow;
        var name = await db.Users.Where(u => u.Id == app.UserId).Select(u => u.FullName).FirstOrDefaultAsync();
        audit.Log("PartnerRejected", app.UserId, name, $"{app.Type}: {app.RejectionReason}");
        notifier.Send(app.UserId, "Partner application not approved", $"Reason: {app.RejectionReason}", "partner");
        await db.SaveChangesAsync();
        return NoContent();
    }
}

internal static class PartnerMapping
{
    /// <summary>Includes the applicant's ID verification status so the admin can check it first.</summary>
    public static Expression<Func<PartnerApplication, PartnerApplicationDto>> ToDto(AppDbContext db) =>
        a => new PartnerApplicationDto(a.Id, a.Type, a.Details, a.LicenseNumber, a.YearsExperience, a.PricePerDay,
            a.Status, a.RejectionReason, a.CreatedAt, a.ReviewedAt,
            a.User!.FullName, a.User.Email ?? "", a.User.PhoneNumber,
            db.UserVerifications.Where(v => v.UserId == a.UserId).Select(v => (VerificationStatus?)v.Status).FirstOrDefault());
}
