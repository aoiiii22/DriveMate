using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DriveMate.Server.Models;
using Microsoft.IdentityModel.Tokens;

namespace DriveMate.Server.Services;

/// <summary>Settings from the "Jwt" section of appsettings.json.</summary>
public class JwtOptions
{
    public const string Section = "Jwt";

    public string Issuer { get; set; } = "DriveMate";
    public string Audience { get; set; } = "DriveMate";

    /// <summary>Secret used to sign tokens. At least 32 characters. Never commit a real one.</summary>
    public string Key { get; set; } = string.Empty;

    public int ExpiresHours { get; set; } = 8;

    public SymmetricSecurityKey SigningKey() => new(Encoding.UTF8.GetBytes(Key));
}

/// <summary>
/// Creates JWTs (JSON Web Tokens). A JWT is a signed "ID card" the React app stores and
/// sends back in the Authorization header, so the API knows who is calling without a session.
/// </summary>
public class TokenService(JwtOptions options)
{
    /// <summary>Extra claims on a "view as" token: who the super admin really is.</summary>
    public const string ImpersonatorIdClaim = "impersonator_id";
    public const string ImpersonatorNameClaim = "impersonator_name";

    /// <summary>"View as" sessions are short on purpose.</summary>
    public static readonly TimeSpan ImpersonationLifetime = TimeSpan.FromHours(1);

    /// <param name="impersonator">Set when a super admin is viewing the app as <paramref name="user"/>.</param>
    public (string Token, DateTime ExpiresAt) Create(AppUser user, IEnumerable<string> roles, AppUser? impersonator = null)
    {
        // Claims are facts about the user written inside the token.
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, user.FullName),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        if (impersonator is not null)
        {
            claims.Add(new Claim(ImpersonatorIdClaim, impersonator.Id));
            claims.Add(new Claim(ImpersonatorNameClaim, impersonator.FullName));
        }

        var expiresAt = impersonator is null
            ? DateTime.UtcNow.AddHours(options.ExpiresHours)
            : DateTime.UtcNow.Add(ImpersonationLifetime);
        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(options.SigningKey(), SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
