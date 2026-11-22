using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace DriveMate.Server.Models;

/// <summary>
/// A DriveMate user. It inherits from IdentityUser, which already gives us
/// Id, Email, PhoneNumber, PasswordHash and more, so we only add our own fields.
/// </summary>
public class AppUser : IdentityUser
{
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// The user's main role, copied here for convenience (e.g. showing it in lists).
    /// The real permission check uses Identity's role tables (AspNetUserRoles).
    /// </summary>
    [MaxLength(20)]
    public string Role { get; set; } = Roles.Customer;

    [MaxLength(300)]
    public string? ProfilePhotoUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
