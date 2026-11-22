using System.Security.Claims;
using DriveMate.Server.Data;
using DriveMate.Server.Models;

namespace DriveMate.Server.Services;

/// <summary>
/// Writes the activity log. Like Notifier, it only ADDS the entry: the caller's own
/// SaveChangesAsync saves it together with the change it describes.
/// </summary>
public class Auditor(AppDbContext db, IHttpContextAccessor http)
{
    public void Log(string action, string? targetUserId = null, string? targetName = null, string? details = null)
    {
        var user = http.HttpContext?.User;
        db.AuditLogs.Add(new AuditLog
        {
            ActorId = user?.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
            ActorName = user?.FindFirstValue(ClaimTypes.Name) ?? "System",
            Action = action,
            TargetUserId = targetUserId,
            TargetName = targetName,
            Details = details,
        });
    }
}
