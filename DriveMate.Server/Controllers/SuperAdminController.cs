using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Security.Cryptography;
using DriveMate.Server.Data;
using DriveMate.Server.DTOs;
using DriveMate.Server.Models;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Controllers;

// ------------------------------- DTOs -------------------------------

public record UserListItemDto(string Id, string FullName, string Email, string? PhoneNumber, string Role,
    bool IsLocked, DateTime CreatedAt, int BookingCount, VerificationStatus? Verification);

public record UserBookingDto(int Id, string VehicleName, DateTime StartDate, DateTime EndDate, BookingStatus Status, decimal TotalPrice);
public record UserVehicleDto(int Id, string Name, string PlateNumber, bool IsAvailable, double Rating);

public record UserDetailDto(
    string Id, string FullName, string Email, string? PhoneNumber, string Role, IReadOnlyList<string> Roles,
    bool IsLocked, DateTime CreatedAt, VerificationStatus? Verification, string? LicenseNumber,
    DriverProfileDto? Driver, IReadOnlyList<UserVehicleDto> Vehicles, IReadOnlyList<UserBookingDto> Bookings,
    IReadOnlyList<PartnerApplicationDto> Applications, bool CanManage);

public class ChangeRoleRequest
{
    [Required, RegularExpression("^(Customer|Owner|Driver|Admin)$", ErrorMessage = "Role must be Customer, Owner, Driver or Admin.")]
    public string Role { get; set; } = string.Empty;
}

public class LockRequest
{
    [Required, MaxLength(300)]
    public string Reason { get; set; } = string.Empty;
}

public record TemporaryPasswordDto(string TemporaryPassword);

public record AuditLogDto(int Id, string ActorName, string Action, string? TargetUserId, string? TargetName, string? Details, DateTime CreatedAt);

// ------------------------------- Controller -------------------------------

/// <summary>
/// Super admin tools: every account, role changes (including making Admins), locks,
/// password resets, "view as" and the activity log. Only the SuperAdmin role can call these.
/// </summary>
[ApiController]
[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/superadmin")]
public class SuperAdminController(AppDbContext db, UserManager<AppUser> users, TokenService tokens,
    Auditor audit, Notifier notifier) : ControllerBase
{
    private string MyId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("users")]
    public async Task<ActionResult<List<UserListItemDto>>> List([FromQuery] string? search, [FromQuery] string? role)
    {
        var q = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            q = q.Where(u => EF.Functions.Like(u.FullName, s) || EF.Functions.Like(u.Email!, s) || EF.Functions.Like(u.PhoneNumber!, s));
        }
        if (!string.IsNullOrWhiteSpace(role)) q = q.Where(u => u.Role == role);

        var now = DateTimeOffset.UtcNow;
        return await q.OrderBy(u => u.FullName).Take(200)
            .Select(u => new UserListItemDto(u.Id, u.FullName, u.Email ?? "", u.PhoneNumber, u.Role,
                u.LockoutEnd != null && u.LockoutEnd > now, u.CreatedAt,
                db.Bookings.Count(b => b.CustomerId == u.Id),
                db.UserVerifications.Where(v => v.UserId == u.Id).Select(v => (VerificationStatus?)v.Status).FirstOrDefault()))
            .ToListAsync();
    }

    [HttpGet("users/{id}")]
    public async Task<ActionResult<UserDetailDto>> Detail(string id)
    {
        var u = await users.FindByIdAsync(id);
        if (u is null) return NotFound();

        var roles = await users.GetRolesAsync(u);
        var verification = await db.UserVerifications.AsNoTracking().FirstOrDefaultAsync(v => v.UserId == id);
        var driver = await db.Drivers.AsNoTracking().Where(d => d.UserId == id)
            .Select(d => new DriverProfileDto(d.Id, u.FullName, d.LicenseNumber, d.YearsExperience, d.Rating, d.PricePerDay, d.IsAvailable))
            .FirstOrDefaultAsync();
        var vehicles = await db.Vehicles.AsNoTracking().Where(v => v.OwnerId == id).OrderBy(v => v.Name)
            .Select(v => new UserVehicleDto(v.Id, v.Name, v.PlateNumber, v.IsAvailable, v.Rating)).ToListAsync();
        var bookings = await db.Bookings.AsNoTracking().Where(b => b.CustomerId == id)
            .OrderByDescending(b => b.StartDate).Take(20)
            .Select(b => new UserBookingDto(b.Id, b.Vehicle!.Name, b.StartDate, b.EndDate, b.Status, b.TotalPrice)).ToListAsync();
        var apps = await db.PartnerApplications.AsNoTracking().Where(a => a.UserId == id)
            .OrderByDescending(a => a.CreatedAt).Select(PartnerMapping.ToDto(db)).ToListAsync();

        return new UserDetailDto(u.Id, u.FullName, u.Email ?? "", u.PhoneNumber, u.Role, roles.ToList(),
            await users.IsLockedOutAsync(u), u.CreatedAt, verification?.Status, verification?.LicenseNumber,
            driver, vehicles, bookings, apps, CanManage(u, roles));
    }

    /// <summary>
    /// Change someone's role. Owners and drivers keep the Customer role so they can still rent.
    /// Making someone an Admin (or removing Admin) is only possible here, so only the super admin can do it.
    /// </summary>
    [HttpPut("users/{id}/role")]
    public async Task<IActionResult> ChangeRole(string id, ChangeRoleRequest request)
    {
        var (u, roles, problem) = await LoadManageable(id);
        if (problem is not null) return problem;

        string[] wanted = request.Role switch
        {
            Roles.Owner => [Roles.Customer, Roles.Owner],
            Roles.Driver => [Roles.Customer, Roles.Driver],
            Roles.Admin => [Roles.Admin],
            _ => [Roles.Customer],
        };
        var oldRole = u!.Role;

        await using var tx = await db.Database.BeginTransactionAsync();
        var removed = await users.RemoveFromRolesAsync(u, roles.Except(wanted));
        var added = await users.AddToRolesAsync(u, wanted.Except(roles));
        if (!removed.Succeeded || !added.Succeeded)
            return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Could not change the role.");

        u.Role = request.Role;
        var extra = new List<string>();

        // Leaving Owner: hide their cars so nobody books a car without a manager.
        if (roles.Contains(Roles.Owner) && !wanted.Contains(Roles.Owner))
        {
            var hidden = await db.Vehicles.Where(v => v.OwnerId == id && v.IsAvailable)
                .ExecuteUpdateAsync(s => s.SetProperty(v => v.IsAvailable, false));
            if (hidden > 0) extra.Add($"{hidden} car(s) hidden from search");
        }
        // Leaving Driver: switch the driver profile offline.
        if (roles.Contains(Roles.Driver) && !wanted.Contains(Roles.Driver))
            await db.Drivers.Where(d => d.UserId == id).ExecuteUpdateAsync(s => s.SetProperty(d => d.IsAvailable, false));
        // Becoming a Driver without a profile: create one (offline until they switch it on).
        if (request.Role == Roles.Driver && !await db.Drivers.AnyAsync(d => d.UserId == id))
        {
            var license = await db.UserVerifications.Where(v => v.UserId == id).Select(v => v.LicenseNumber).FirstOrDefaultAsync();
            db.Drivers.Add(new Driver { UserId = id, LicenseNumber = license ?? "", PricePerDay = 500, IsAvailable = false });
            extra.Add("driver profile created (offline)");
        }

        audit.Log("RoleChanged", u.Id, u.FullName,
            $"{oldRole} → {request.Role}{(extra.Count > 0 ? $" ({string.Join(", ", extra)})" : "")}");
        notifier.Send(u.Id, "Your account was updated", $"Your DriveMate role is now {request.Role}.", PageFor(request.Role));
        await users.UpdateAsync(u); // also saves the audit entry and notification (same DbContext)
        await tx.CommitAsync();
        return NoContent();
    }

    /// <summary>Lock an account: they can't log in, and any open session stops working right away.</summary>
    [HttpPost("users/{id}/lock")]
    public async Task<IActionResult> Lock(string id, LockRequest request)
    {
        var (u, _, problem) = await LoadManageable(id);
        if (problem is not null) return problem;

        await users.SetLockoutEnabledAsync(u!, true);
        await users.SetLockoutEndDateAsync(u!, DateTimeOffset.MaxValue);
        audit.Log("UserLocked", u!.Id, u.FullName, request.Reason.Trim());
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("users/{id}/unlock")]
    public async Task<IActionResult> Unlock(string id)
    {
        var (u, _, problem) = await LoadManageable(id);
        if (problem is not null) return problem;

        await users.SetLockoutEndDateAsync(u!, null);
        await users.ResetAccessFailedCountAsync(u!);
        audit.Log("UserUnlocked", u!.Id, u.FullName);
        notifier.Send(u.Id, "Account unlocked", "Your DriveMate account is active again.", "bookings");
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Sets a random temporary password and shows it ONCE to the super admin, who passes it on.
    /// The password itself is never written to the activity log.
    /// </summary>
    [HttpPost("users/{id}/reset-password")]
    public async Task<ActionResult<TemporaryPasswordDto>> ResetPassword(string id)
    {
        var (u, _, problem) = await LoadManageable(id);
        if (problem is not null) return problem;

        var temp = MakeTemporaryPassword();
        if (await users.HasPasswordAsync(u!)) await users.RemovePasswordAsync(u!);
        var result = await users.AddPasswordAsync(u!, temp);
        if (!result.Succeeded)
            return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Could not reset the password.");

        audit.Log("PasswordReset", u!.Id, u.FullName, "Temporary password issued");
        await db.SaveChangesAsync();
        return new TemporaryPasswordDto(temp);
    }

    /// <summary>
    /// "View as": a 1-hour token for the user, marked with who the super admin really is.
    /// The app shows a banner the whole time, and the start is recorded in the activity log.
    /// </summary>
    [HttpPost("users/{id}/view-as")]
    public async Task<ActionResult<AuthResponse>> ViewAs(string id)
    {
        var (u, roles, problem) = await LoadManageable(id);
        if (problem is not null) return problem;
        if (await users.IsLockedOutAsync(u!))
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Unlock the account first.");

        var me = await users.FindByIdAsync(MyId);
        var (token, expiresAt) = tokens.Create(u!, roles, me);
        audit.Log("ViewAsStarted", u!.Id, u.FullName, "Signed in as this user for up to 1 hour");
        await db.SaveChangesAsync();
        return new AuthResponse(token, expiresAt, AuthController.ToDto(u, me!.FullName));
    }

    [HttpGet("audit")]
    public async Task<List<AuditLogDto>> Audit([FromQuery] string? action, [FromQuery] string? userId) =>
        await db.AuditLogs.AsNoTracking()
            .Where(a => action == null || a.Action == action)
            .Where(a => userId == null || a.TargetUserId == userId || a.ActorId == userId)
            .OrderByDescending(a => a.CreatedAt).Take(300)
            .Select(a => new AuditLogDto(a.Id, a.ActorName, a.Action, a.TargetUserId, a.TargetName, a.Details, a.CreatedAt))
            .ToListAsync();

    // ------------------------------- helpers -------------------------------

    /// <summary>Super admins can manage everyone except themselves and other super admins.</summary>
    private bool CanManage(AppUser u, IList<string> roles) => u.Id != MyId && !roles.Contains(Roles.SuperAdmin);

    private async Task<(AppUser? User, IList<string> Roles, ActionResult? Problem)> LoadManageable(string id)
    {
        var u = await users.FindByIdAsync(id);
        if (u is null) return (null, [], NotFound());
        var roles = await users.GetRolesAsync(u);
        if (!CanManage(u, roles))
            return (null, roles, Problem(statusCode: StatusCodes.Status403Forbidden,
                title: u.Id == MyId ? "You can't change your own account here." : "Super admin accounts can't be changed here."));
        return (u, roles, null);
    }

    private static string PageFor(string role) => role switch
    {
        Roles.Owner => "owner",
        Roles.Driver => "driver",
        Roles.Admin => "admin",
        _ => "bookings",
    };

    /// <summary>12 random characters plus one of each kind Identity requires (upper, lower, digit, symbol).</summary>
    private static string MakeTemporaryPassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"; // no look-alikes like 0/O, 1/l
        var core = new string(Enumerable.Range(0, 12).Select(_ => chars[RandomNumberGenerator.GetInt32(chars.Length)]).ToArray());
        return $"{core}-Aa7";
    }
}
