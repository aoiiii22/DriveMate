using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.DTOs;

public class RegisterRequest
{
    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Phone, MaxLength(30)]
    public string? PhoneNumber { get; set; }

    [Required, MinLength(8), MaxLength(100)]
    public string Password { get; set; } = string.Empty;
}

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

/// <summary>The signed-in user, as the React app needs it.</summary>
/// <param name="ImpersonatedBy">The super admin's name when they are viewing the app as this user; otherwise null.</param>
public record UserDto(string Id, string FullName, string Email, string? PhoneNumber, string Role, string? ProfilePhotoUrl,
    string? ImpersonatedBy = null);

/// <summary>Returned by login and register: the token plus who it belongs to.</summary>
public record AuthResponse(string Token, DateTime ExpiresAt, UserDto User);
