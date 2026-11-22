using DriveMate.Server.Models;

namespace DriveMate.Server.Services;

/// <summary>
/// Saves uploaded images in a private folder (App_Data/uploads), outside wwwroot,
/// so they can only be read through FilesController, which checks permissions.
/// </summary>
public class FileStorage(string rootFolder)
{
    public const long MaxBytes = 5 * 1024 * 1024; // 5 MB: plenty for a phone photo

    /// <summary>
    /// Works out the real image type from the first bytes ("magic numbers").
    /// We don't trust the file name or the browser's Content-Type: both can be faked.
    /// </summary>
    public static (string ContentType, string Extension)? DetectImageType(ReadOnlySpan<byte> header)
    {
        if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return ("image/jpeg", ".jpg");
        if (header.Length >= 8 && header[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return ("image/png", ".png");
        if (header.Length >= 12 && header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8))
            return ("image/webp", ".webp");
        return null;
    }

    /// <summary>Saves the upload and returns the database row (not yet added to the DbContext).</summary>
    public async Task<StoredFile?> SaveAsync(IFormFile upload, string userId, int? bookingId, CancellationToken ct)
    {
        await using var input = upload.OpenReadStream();
        var header = new byte[12];
        var read = await input.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, ct);
        if (DetectImageType(header.AsSpan(0, read)) is not { } type)
            return null;

        var file = new StoredFile
        {
            UploadedById = userId,
            BookingId = bookingId,
            ContentType = type.ContentType,
            SizeBytes = upload.Length,
        };
        // Our own random name: the user's file name never touches the disk path.
        file.RelativePath = Path.Combine(DateTime.UtcNow.ToString("yyyy-MM"), file.Id.ToString("N") + type.Extension);

        var fullPath = FullPath(file);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        await using var output = File.Create(fullPath);
        await output.WriteAsync(header.AsMemory(0, read), ct);
        await input.CopyToAsync(output, ct);
        return file;
    }

    public string FullPath(StoredFile file) => Path.Combine(rootFolder, file.RelativePath);

    /// <summary>Removes a file from disk, e.g. when saving its database row failed.</summary>
    public void Delete(StoredFile file)
    {
        var path = FullPath(file);
        if (File.Exists(path)) File.Delete(path);
    }
}
