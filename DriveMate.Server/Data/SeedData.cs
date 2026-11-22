using DriveMate.Server.Models;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DriveMate.Server.Data;

/// <summary>
/// Runs at startup: applies migrations (creates/updates the SQLite file) and,
/// if the database is empty, fills it with demo content.
/// </summary>
public static class SeedData
{
    public const string DemoPassword = "DriveMate123!";

    public static async Task InitializeAsync(IServiceProvider services)
    {
        // A "scope" gives us fresh scoped services (like AppDbContext) outside an HTTP request.
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(SeedData));

        // Creates the database file if missing and applies any migrations not yet applied.
        await db.Database.MigrateAsync();

        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        if (await db.Users.AnyAsync())
        {
            // Already seeded. Delete the .db file to start fresh (see README).
            // Data added by later features is still topped up here, so old databases keep working.
            await EnsureDemoVerificationAsync(db, userManager);
            await EnsureDemoExtrasAsync(db);
            await EnsureSuperAdminAsync(userManager);
            await EnsureCarPhotosAsync(db);
            return;
        }

        logger.LogInformation("Seeding DriveMate demo data...");

        // ---------- Users ----------
        await CreateUserAsync(userManager, "admin@drivemate.local", "DriveMate Admin", "+63 917 000 0001", Roles.Admin);
        var customer = await CreateUserAsync(userManager, "customer@drivemate.local", "Juan Dela Cruz", "+63 917 123 4567", Roles.Customer);
        var owner = await CreateUserAsync(userManager, "owner@drivemate.local", "Maria Santos", "+63 918 234 5678", Roles.Owner);
        var owner2 = await CreateUserAsync(userManager, "owner2@drivemate.local", "Ramon Cruz", "+63 919 345 6789", Roles.Owner);

        // Driver accounts. driver@drivemate.local is Mark S., the star of the demo.
        var markUser = await CreateUserAsync(userManager, "driver@drivemate.local", "Mark Santiago", "+63 920 456 7890", Roles.Driver);
        var joseUser = await CreateUserAsync(userManager, "driver2@drivemate.local", "Jose Reyes", "+63 921 567 8901", Roles.Driver);
        var anaUser = await CreateUserAsync(userManager, "driver3@drivemate.local", "Ana Villanueva", "+63 922 678 9012", Roles.Driver);
        var carloUser = await CreateUserAsync(userManager, "driver4@drivemate.local", "Carlo Mendoza", "+63 923 789 0123", Roles.Driver);
        var lizaUser = await CreateUserAsync(userManager, "driver5@drivemate.local", "Liza Garcia", "+63 924 890 1234", Roles.Driver);

        // ---------- Drivers ----------
        var mark = new Driver { UserId = markUser.Id, LicenseNumber = "N01-15-012345", YearsExperience = 5, Rating = 4.9, PricePerDay = 500 };
        var jose = new Driver { UserId = joseUser.Id, LicenseNumber = "N02-12-023456", YearsExperience = 8, Rating = 4.8, PricePerDay = 600 };
        var ana = new Driver { UserId = anaUser.Id, LicenseNumber = "N03-18-034567", YearsExperience = 3, Rating = 4.7, PricePerDay = 450 };
        var carlo = new Driver { UserId = carloUser.Id, LicenseNumber = "N04-10-045678", YearsExperience = 10, Rating = 4.6, PricePerDay = 650 };
        var liza = new Driver { UserId = lizaUser.Id, LicenseNumber = "N05-16-056789", YearsExperience = 6, Rating = 4.9, PricePerDay = 550, IsAvailable = false };
        db.Drivers.AddRange(mark, jose, ana, carlo, liza);

        // ---------- Vehicles ----------
        // Images are SVG placeholders in frontend/public/images/vehicles/.
        Vehicle V(AppUser o, string name, VehicleType type, int seats, Transmission t, FuelType f,
                  decimal price, string plate, string location, double rating) => new()
        {
            OwnerId = o.Id, Name = name, Type = type, Seats = seats, Transmission = t, FuelType = f,
            PricePerDay = price, PlateNumber = plate, Location = location, Rating = rating,
            ImageUrl = $"/images/vehicles/{type.ToString().ToLowerInvariant()}.svg",
        };

        var vios = V(owner, "Toyota Vios 1.3 XLE", VehicleType.Sedan, 5, Transmission.Automatic, FuelType.Gasoline, 1800, "NBC 1234", "Makati City", 4.8);
        var city = V(owner, "Honda City 1.5 V", VehicleType.Sedan, 5, Transmission.Automatic, FuelType.Gasoline, 2000, "NDA 5678", "Quezon City", 4.7);
        var mirage = V(owner2, "Mitsubishi Mirage G4 GLX", VehicleType.Sedan, 5, Transmission.Manual, FuelType.Gasoline, 1500, "NFE 2468", "Pasig City", 4.5);
        var fortuner = V(owner, "Toyota Fortuner 2.4 G", VehicleType.SUV, 7, Transmission.Automatic, FuelType.Diesel, 2800, "NGH 1357", "Taguig City", 4.9);
        var montero = V(owner2, "Mitsubishi Montero Sport GLS", VehicleType.SUV, 7, Transmission.Automatic, FuelType.Diesel, 3000, "NKL 8642", "Mandaluyong City", 4.8);
        var xpander = V(owner, "Mitsubishi Xpander GLS", VehicleType.SUV, 7, Transmission.Automatic, FuelType.Gasoline, 2400, "NJR 4826", "Pasay City", 4.6);
        var everest = V(owner2, "Ford Everest Trend", VehicleType.SUV, 7, Transmission.Automatic, FuelType.Diesel, 3200, "NMP 9753", "Parañaque City", 4.7);
        var hiace = V(owner, "Toyota Hiace Commuter", VehicleType.Van, 12, Transmission.Manual, FuelType.Diesel, 3500, "NQR 3141", "Pasay City", 4.8);
        var urvan = V(owner2, "Nissan Urvan NV350", VehicleType.Van, 15, Transmission.Manual, FuelType.Diesel, 3800, "NST 2718", "Manila", 4.6);
        db.Vehicles.AddRange(vios, city, mirage, fortuner, montero, xpander, everest, hiace, urvan);

        // ---------- Sample bookings for the demo customer (dates relative to today) ----------
        var today = DateTime.Today;
        Booking B(Vehicle v, Driver? d, string pickup, string dest, int startOffset, int endOffset,
                  BookingStatus status, PaymentMethod? pay)
        {
            var start = today.AddDays(startOffset).AddHours(8);  // 8:00 AM pick-up
            var end = today.AddDays(endOffset).AddHours(18);     // 6:00 PM return
            var q = PricingService.Quote(v.PricePerDay, d?.PricePerDay, start, end);
            return new Booking
            {
                Customer = customer, Vehicle = v, Driver = d, WithDriver = d is not null,
                PickupLocation = pickup, Destination = dest, StartDate = start, EndDate = end,
                VehicleCost = q.VehicleCost, DriverCost = q.DriverCost, TotalPrice = q.Total,
                OwnerPayout = q.OwnerPayout, DriverPayout = q.DriverPayout, PlatformFee = q.PlatformFee,
                DriverAcceptedAt = d is not null && status != BookingStatus.Cancelled ? DateTime.UtcNow : null,
                Status = status, PaymentMethod = pay, IsPaid = pay is not null,
                CreatedAt = DateTime.UtcNow.AddDays(Math.Min(startOffset, 0) - 2),
            };
        }

        var pastVios = B(vios, null, "Ayala Triangle, Makati", "Tagaytay City", -21, -19, BookingStatus.Completed, PaymentMethod.GCash);
        var pastFortuner = B(fortuner, mark, "SM Mall of Asia, Pasay", "Baguio City", -35, -32, BookingStatus.Completed, PaymentMethod.Card);
        var cancelled = B(montero, null, "UP Diliman, Quezon City", "Anilao, Batangas", -10, -8, BookingStatus.Cancelled, null);
        var ongoing = B(hiace, mark, "STI College Ortigas-Cainta", "Tagaytay City", 0, 1, BookingStatus.Ongoing, PaymentMethod.CashOnPickup);
        var upcoming = B(fortuner, jose, "SM Mall of Asia, Pasay", "Tagaytay City", 3, 5, BookingStatus.Confirmed, PaymentMethod.GCash);
        var pending = B(city, null, "Robinsons Galleria, Ortigas", "La Union", 10, 12, BookingStatus.Pending, null);
        db.Bookings.AddRange(pastVios, pastFortuner, cancelled, ongoing, upcoming, pending);

        // One completed trip already has a review; the other is left for the customer to rate.
        db.Reviews.Add(new Review
        {
            Booking = pastVios, Customer = customer, Vehicle = vios, Stars = 5,
            Comment = "Clean car, smooth pick-up. Perfect for our Tagaytay day trip!",
            CreatedAt = DateTime.UtcNow.AddDays(-18),
        });

        // A pending partner application so the Admin dashboard has something to approve.
        var applicant = await CreateUserAsync(userManager, "applicant@drivemate.local", "Bea Lim", "+63 925 901 2345", Roles.Customer);
        db.PartnerApplications.Add(new PartnerApplication
        {
            UserId = applicant.Id, Type = PartnerType.Owner,
            Details = "2021 Toyota Innova 2.8 E, 7 seats, manual, diesel. Located in Marikina City.",
        });

        await db.SaveChangesAsync();
        await EnsureDemoVerificationAsync(db, userManager);
        await EnsureDemoExtrasAsync(db);
        await EnsureSuperAdminAsync(userManager);
        await EnsureCarPhotosAsync(db);
        logger.LogInformation("Seeding complete.");
    }

    /// <summary>Real photos of the demo cars (frontend/public/images/cars, credited on the Photo credits page).</summary>
    private static readonly Dictionary<string, string> CarPhotos = new()
    {
        ["NBC 1234"] = "toyota-vios", ["NDA 5678"] = "honda-city", ["NFE 2468"] = "mitsubishi-mirage-g4",
        ["NGH 1357"] = "toyota-fortuner", ["NKL 8642"] = "mitsubishi-montero-sport", ["NJR 4826"] = "mitsubishi-xpander",
        ["NMP 9753"] = "ford-everest", ["NQR 3141"] = "toyota-hiace-commuter", ["NST 2718"] = "nissan-urvan-nv350",
    };

    /// <summary>
    /// Runs at every start: gives the demo cars their real photos (only while they still use the old drawing,
    /// so a photo an owner chose is never replaced) and hides motorcycle listings (DriveMate no longer offers them;
    /// they are hidden, not deleted, so old bookings keep working).
    /// </summary>
    private static async Task EnsureCarPhotosAsync(AppDbContext db)
    {
        foreach (var v in await db.Vehicles.Where(v => v.ImageUrl.StartsWith("/images/vehicles/") && CarPhotos.Keys.Contains(v.PlateNumber)).ToListAsync())
            v.ImageUrl = $"/images/cars/{CarPhotos[v.PlateNumber]}.jpg";

        await db.Vehicles.Where(v => v.Type == VehicleType.Motorcycle && v.IsAvailable)
            .ExecuteUpdateAsync(s => s.SetProperty(v => v.IsAvailable, false));
        await db.SaveChangesAsync();
    }

    /// <summary>The demo super admin (has both SuperAdmin and Admin, so the Admin pages work too).</summary>
    private static async Task EnsureSuperAdminAsync(UserManager<AppUser> userManager)
    {
        const string email = "superadmin@drivemate.local";
        var user = await userManager.FindByEmailAsync(email)
            ?? await CreateUserAsync(userManager, email, "DriveMate Super Admin", "+63 917 000 0000", Roles.SuperAdmin);
        if (!await userManager.IsInRoleAsync(user, Roles.Admin))
            await userManager.AddToRoleAsync(user, Roles.Admin);
    }

    /// <summary>Demo promo codes, delivery/airport options and rating counts (runs once, when no promo codes exist).</summary>
    private static async Task EnsureDemoExtrasAsync(AppDbContext db)
    {
        if (await db.PromoCodes.AnyAsync()) return;

        db.PromoCodes.AddRange(
            new PromoCode { Code = "WELCOME10", Description = "10% off your first trip (up to ₱500)", PercentOff = 10, MaxDiscount = 500 },
            new PromoCode { Code = "ROADTRIP500", Description = "₱500 off trips of ₱5,000 or more", AmountOff = 500, MinSpend = 5000,
                ValidUntil = DateTime.Today.AddMonths(3), UsageLimit = 100 });

        // A few cars offer delivery and NAIA airport hand-over.
        var plates = new Dictionary<string, (decimal? Delivery, decimal? Airport)>
        {
            ["NBC 1234"] = (300, 500),  // Vios
            ["NGH 1357"] = (500, 800),  // Fortuner
            ["NJR 4826"] = (400, null), // Xpander
            ["NQR 3141"] = (null, 1000), // Hiace
        };
        foreach (var v in await db.Vehicles.Where(v => plates.Keys.Contains(v.PlateNumber)).ToListAsync())
            (v.DeliveryFee, v.AirportFee) = plates[v.PlateNumber];

        // Seeded ratings count as one earlier rating (plus any real reviews), so new reviews blend in.
        foreach (var v in await db.Vehicles.Where(v => v.RatingCount == 0 && v.Rating > 0).ToListAsync())
            v.RatingCount = Math.Max(1, await db.Reviews.CountAsync(r => r.VehicleId == v.Id));
        foreach (var d in await db.Drivers.Where(d => d.RatingCount == 0 && d.Rating > 0).ToListAsync())
            d.RatingCount = 1;

        await db.SaveChangesAsync();
    }

    /// <summary>The demo customer is already verified, so the self-drive demo works straight away.</summary>
    private static async Task EnsureDemoVerificationAsync(AppDbContext db, UserManager<AppUser> userManager)
    {
        var customer = await userManager.FindByEmailAsync("customer@drivemate.local");
        if (customer is null || await db.UserVerifications.AnyAsync(v => v.UserId == customer.Id))
            return;

        db.UserVerifications.Add(new UserVerification
        {
            UserId = customer.Id,
            LicenseNumber = "N10-19-098765",
            LicenseExpiry = DateTime.Today.AddYears(3),
            Status = VerificationStatus.Approved,
            ReviewedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private static async Task<AppUser> CreateUserAsync(UserManager<AppUser> userManager,
        string email, string fullName, string phone, string role)
    {
        var user = new AppUser
        {
            UserName = email, Email = email, EmailConfirmed = true,
            FullName = fullName, PhoneNumber = phone, Role = role,
        };

        var result = await userManager.CreateAsync(user, DemoPassword);
        if (!result.Succeeded)
            throw new InvalidOperationException(
                $"Could not seed {email}: {string.Join("; ", result.Errors.Select(e => e.Description))}");

        await userManager.AddToRoleAsync(user, role);
        return user;
    }
}
