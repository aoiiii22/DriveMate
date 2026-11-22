using System.Security.Claims;
using DriveMate.Server.DTOs;
using DriveMate.Server.Models;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace DriveMate.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(UserManager<AppUser> userManager, TokenService tokens) : ControllerBase
{
    /// <summary>Create a Customer account and sign it in straight away.</summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var user = new AppUser
        {
            UserName = request.Email.Trim(),
            Email = request.Email.Trim(),
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            Role = Roles.Customer,
        };

        // CreateAsync hashes the password and checks Identity's rules (length, unique email...).
        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
                ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        await userManager.AddToRoleAsync(user, Roles.Customer);
        return await BuildResponse(user);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());

        // Same message for "no such user" and "wrong password", so attackers can't
        // find out which emails are registered.
        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Wrong email or password.");

        // Checked AFTER the password, so a locked message only appears to someone who knows it.
        if (await userManager.IsLockedOutAsync(user))
            return Problem(statusCode: StatusCodes.Status403Forbidden,
                title: "This account is locked. Please contact DriveMate support.");

        return await BuildResponse(user);
    }

    /// <summary>Who am I? Used by React on page load to check the saved token is still valid.</summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return user is null ? Unauthorized() : ToDto(user, User.FindFirstValue(TokenService.ImpersonatorNameClaim));
    }

    /// <summary>
    /// A fresh token with the user's CURRENT roles. Roles are written inside the token,
    /// so after an admin approves someone as Owner/Driver, the app calls this to pick up the new role.
    /// A "view as" token stays a "view as" token, and only while the super admin is still allowed.
    /// </summary>
    [Authorize]
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh()
    {
        var user = await userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (user is null) return Unauthorized();

        AppUser? impersonator = null;
        if (User.FindFirstValue(TokenService.ImpersonatorIdClaim) is { } impId)
        {
            impersonator = await userManager.FindByIdAsync(impId);
            if (impersonator is null || await userManager.IsLockedOutAsync(impersonator)
                || !await userManager.IsInRoleAsync(impersonator, Roles.SuperAdmin))
                return Unauthorized();
        }
        return await BuildResponse(user, impersonator);
    }

    private async Task<AuthResponse> BuildResponse(AppUser user, AppUser? impersonator = null)
    {
        var roles = await userManager.GetRolesAsync(user);
        var (token, expiresAt) = tokens.Create(user, roles, impersonator);
        return new AuthResponse(token, expiresAt, ToDto(user, impersonator?.FullName));
    }

    internal static UserDto ToDto(AppUser u, string? impersonatedBy = null) =>
        new(u.Id, u.FullName, u.Email ?? string.Empty, u.PhoneNumber, u.Role, u.ProfilePhotoUrl, impersonatedBy);
}
