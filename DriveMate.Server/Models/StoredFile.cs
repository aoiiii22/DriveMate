using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>
/// An uploaded image (licence, ID, trip photo). The bytes live on disk in a private folder;
/// this row records who uploaded it, so FilesController can decide who may see it.
/// </summary>
public class StoredFile
{
    /// <summary>A random Guid, so file links can't be guessed by counting 1, 2, 3...</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UploadedById { get; set; } = string.Empty;
    public AppUser? UploadedBy { get; set; }

    /// <summary>Set for trip photos, so the vehicle owner and driver of that booking can see them too.</summary>
    public int? BookingId { get; set; }
    public Booking? Booking { get; set; }

    /// <summary>Path relative to the uploads folder, e.g. "2026/11/3f2a....jpg".</summary>
    [MaxLength(200)]
    public string RelativePath { get; set; } = string.Empty;

    [MaxLength(50)]
    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    /// <summary>True for car listing photos: anyone (even logged out) may see them.</summary>
    public bool IsPublic { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
