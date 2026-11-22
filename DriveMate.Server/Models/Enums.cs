namespace DriveMate.Server.Models;

// Enums are fixed lists of allowed values. EF Core stores them as text in SQLite
// (see AppDbContext.ConfigureConventions), so the database is easy to read.

/// <summary>Motorcycle is no longer offered. The value stays only so old rows still load; such cars are hidden.</summary>
public enum VehicleType { Sedan, SUV, Van, Motorcycle }

public enum Transmission { Automatic, Manual }

public enum FuelType { Gasoline, Diesel, Hybrid, Electric }

public enum BookingStatus { Pending, Confirmed, Ongoing, Completed, Cancelled }

public enum PaymentMethod { GCash, Card, CashOnPickup }

public enum PartnerType { Owner, Driver }

public enum ApplicationStatus { Pending, Approved, Rejected }

/// <summary>Insurance-style cover the customer picks per booking. See ProtectionPlans for prices.</summary>
public enum ProtectionPlan { Basic, Standard, Premium }

/// <summary>
/// The refundable security deposit's journey.
/// None = no deposit; Unpaid = due at pick-up (cash); Held = collected; Refunded = given back.
/// </summary>
public enum DepositStatus { None, Unpaid, Held, Refunded }

public enum VerificationStatus { Pending, Approved, Rejected }

/// <summary>When a trip inspection happens: handing the car over, or giving it back.</summary>
public enum InspectionStage { PickUp, Return }

/// <summary>Which part of the car a trip photo shows. Dashboard = odometer + fuel gauge.</summary>
public enum PhotoAngle { Front, Back, Left, Right, Dashboard, Interior, Damage }

/// <summary>Role names used with ASP.NET Core Identity. Constants avoid typos like "admin" vs "Admin".</summary>
public static class Roles
{
    public const string Customer = "Customer";
    public const string Driver = "Driver";
    public const string Owner = "Owner";
    public const string Admin = "Admin";

    /// <summary>
    /// Above Admin: manages every account (roles, locks, passwords), can "view as" any user,
    /// and is the only one who can make or remove Admins. Always also has the Admin role.
    /// </summary>
    public const string SuperAdmin = "SuperAdmin";

    public static readonly string[] All = [Customer, Driver, Owner, Admin, SuperAdmin];
}
