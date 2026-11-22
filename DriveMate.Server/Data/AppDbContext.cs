using DriveMate.Server.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace DriveMate.Server.Data;

/// <summary>
/// The EF Core database context. IdentityDbContext adds the Identity tables
/// (AspNetUsers, AspNetRoles, AspNetUserRoles, ...) on top of our own tables.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<PartnerApplication> PartnerApplications => Set<PartnerApplication>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<UserVerification> UserVerifications => Set<UserVerification>();
    public DbSet<TripInspection> TripInspections => Set<TripInspection>();
    public DbSet<TripPhoto> TripPhotos => Set<TripPhoto>();
    public DbSet<VehicleBlock> VehicleBlocks => Set<VehicleBlock>();
    public DbSet<DriverDecline> DriverDeclines => Set<DriverDecline>();
    public DbSet<PromoCode> PromoCodes => Set<PromoCode>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Store every enum as readable text ("Confirmed") instead of a number (1).
        configurationBuilder.Properties<Enum>().HaveConversion<string>().HaveMaxLength(20);

        // SQLite has no real decimal type and can't ORDER BY / SUM a C# decimal.
        // Storing money as REAL (double) fixes that; peso amounts fit easily.
        configurationBuilder.Properties<decimal>().HaveConversion<double>();
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder); // Required: configures the Identity tables.

        // Naming rule: properties ending in "At" (CreatedAt, SubmittedAt...) are UTC timestamps.
        // SQLite forgets a DateTime's "Kind", so without this they'd come back as "Unspecified",
        // be sent to React without a "Z", and show 8 hours off in the Philippines.
        // (StartDate/EndDate/LicenseExpiry are local Philippine times and are left alone.)
        var utc = new ValueConverter<DateTime, DateTime>(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var utcNullable = new ValueConverter<DateTime?, DateTime?>(v => v, v => v == null ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
        foreach (var property in builder.Model.GetEntityTypes().SelectMany(t => t.GetProperties()))
        {
            if (!property.Name.EndsWith("At", StringComparison.Ordinal)) continue;
            if (property.ClrType == typeof(DateTime)) property.SetValueConverter(utc);
            else if (property.ClrType == typeof(DateTime?)) property.SetValueConverter(utcNullable);
        }

        builder.Entity<Vehicle>(e =>
        {
            e.HasOne(v => v.Owner).WithMany().HasForeignKey(v => v.OwnerId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(v => v.PlateNumber).IsUnique();
            e.HasOne(v => v.Photo).WithMany().HasForeignKey(v => v.PhotoId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<VehicleBlock>(e =>
        {
            e.HasOne(b => b.Vehicle).WithMany(v => v.Blocks).HasForeignKey(b => b.VehicleId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(b => new { b.VehicleId, b.StartDate, b.EndDate });
        });

        builder.Entity<PromoCode>(e => e.HasIndex(p => p.Code).IsUnique());

        // No foreign keys on purpose: the log must survive even if an account is deleted.
        builder.Entity<AuditLog>(e => e.HasIndex(a => a.CreatedAt));

        builder.Entity<Favorite>(e =>
        {
            e.HasKey(f => new { f.UserId, f.VehicleId }); // composite key: a user can heart a car once
            e.HasOne(f => f.User).WithMany().HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(f => f.Vehicle).WithMany().HasForeignKey(f => f.VehicleId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Message>(e =>
        {
            e.HasOne(m => m.Booking).WithMany(b => b.Messages).HasForeignKey(m => m.BookingId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.Sender).WithMany().HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(m => new { m.BookingId, m.CreatedAt });
        });

        builder.Entity<Notification>(e =>
        {
            e.HasOne(n => n.User).WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt }); // fast "unread for me" lookups
        });

        builder.Entity<DriverDecline>(e =>
        {
            e.HasOne(d => d.Booking).WithMany(b => b.DriverDeclines).HasForeignKey(d => d.BookingId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(d => d.Driver).WithMany().HasForeignKey(d => d.DriverId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Driver>(e =>
        {
            e.HasOne(d => d.User).WithMany().HasForeignKey(d => d.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(d => d.UserId).IsUnique(); // one driver profile per user
        });

        builder.Entity<Booking>(e =>
        {
            e.HasOne(b => b.Customer).WithMany().HasForeignKey(b => b.CustomerId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(b => b.Vehicle).WithMany(v => v.Bookings).HasForeignKey(b => b.VehicleId)
             .OnDelete(DeleteBehavior.Restrict); // can't delete a vehicle that has bookings
            e.HasOne(b => b.Driver).WithMany(d => d.Bookings).HasForeignKey(b => b.DriverId)
             .OnDelete(DeleteBehavior.SetNull);

            // Speeds up the "is this vehicle already booked for these dates?" check.
            e.HasIndex(b => new { b.VehicleId, b.StartDate, b.EndDate });
            e.HasIndex(b => new { b.DriverId, b.StartDate, b.EndDate });
        });

        builder.Entity<Review>(e =>
        {
            // One review per booking (one-to-one).
            e.HasOne(r => r.Booking).WithOne(b => b.Review).HasForeignKey<Review>(r => r.BookingId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Customer).WithMany().HasForeignKey(r => r.CustomerId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.Vehicle).WithMany(v => v.Reviews).HasForeignKey(r => r.VehicleId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.Driver).WithMany().HasForeignKey(r => r.DriverId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<PartnerApplication>(e =>
        {
            e.HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<StoredFile>(e =>
        {
            e.HasOne(f => f.UploadedBy).WithMany().HasForeignKey(f => f.UploadedById)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(f => f.Booking).WithMany().HasForeignKey(f => f.BookingId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<UserVerification>(e =>
        {
            e.HasOne(v => v.User).WithMany().HasForeignKey(v => v.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(v => v.UserId).IsUnique(); // one verification per user
            e.HasOne(v => v.LicensePhoto).WithMany().HasForeignKey(v => v.LicensePhotoId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(v => v.IdPhoto).WithMany().HasForeignKey(v => v.IdPhotoId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<TripInspection>(e =>
        {
            e.HasOne(i => i.Booking).WithMany(b => b.Inspections).HasForeignKey(i => i.BookingId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.CreatedBy).WithMany().HasForeignKey(i => i.CreatedById)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(i => new { i.BookingId, i.Stage }).IsUnique(); // one pick-up + one return per booking
        });

        builder.Entity<TripPhoto>(e =>
        {
            e.HasOne(p => p.Inspection).WithMany(i => i.Photos).HasForeignKey(p => p.InspectionId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(p => p.File).WithMany().HasForeignKey(p => p.FileId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(p => p.FileId).IsUnique(); // a photo can't be reused in two inspections
        });
    }
}
