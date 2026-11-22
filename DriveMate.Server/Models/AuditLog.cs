using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>
/// A record of an important admin action (role change, lock, password reset, "view as" ...).
/// Names are copied in, so the log still reads correctly if an account is later changed.
/// </summary>
public class AuditLog
{
    public int Id { get; set; }

    public string ActorId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ActorName { get; set; } = string.Empty;

    /// <summary>Short code, e.g. "RoleChanged", "UserLocked", "ViewAsStarted".</summary>
    [MaxLength(40)]
    public string Action { get; set; } = string.Empty;

    public string? TargetUserId { get; set; }

    [MaxLength(100)]
    public string? TargetName { get; set; }

    [MaxLength(500)]
    public string? Details { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
