using System.Security.Claims;
using DriveMate.Server.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;

namespace DriveMate.Server.Services;

/// <summary>Runs after a JWT's signature is checked, on every request that sends one.</summary>
public static class AccountCheck
{
    public static async Task ValidateAsync(TokenValidatedContext context)
    {
        var users = context.HttpContext.RequestServices.GetRequiredService<UserManager<AppUser>>();
        var identity = context.Principal?.Identity as ClaimsIdentity;
        var userId = identity?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = userId is null ? null : await users.FindByIdAsync(userId);

        // Deleted or locked accounts are logged out straight away.
        if (identity is null || user is null || await users.IsLockedOutAsync(user))
        {
            context.Fail("This account no longer exists or is locked.");
            return;
        }

        // A "view as" session ends as soon as the super admin is locked or loses the role.
        if (identity.FindFirst(TokenService.ImpersonatorIdClaim)?.Value is { } impId)
        {
            var impersonator = await users.FindByIdAsync(impId);
            if (impersonator is null || await users.IsLockedOutAsync(impersonator)
                || !await users.IsInRoleAsync(impersonator, Roles.SuperAdmin))
            {
                context.Fail("The view-as session is no longer allowed.");
                return;
            }
        }

        // Use the roles in the database now, not the ones copied into the token at login.
        foreach (var old in identity.FindAll(ClaimTypes.Role).ToList()) identity.RemoveClaim(old);
        foreach (var role in await users.GetRolesAsync(user)) identity.AddClaim(new Claim(ClaimTypes.Role, role));
    }
}
