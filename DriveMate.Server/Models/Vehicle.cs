using System.ComponentModel.DataAnnotations;

namespace DriveMate.Server.Models;

/// <summary>A vehicle listed by an Owner that customers can rent.</summary>
public class Vehicle
{
    public int Id { get; set; }

    // Foreign key: the Id of the AppUser who owns this vehicle.
    public string OwnerId { get; set; } = string.Empty;
    // Navigation property: lets us write vehicle.Owner.FullName in C#.
    public AppUser? Owner { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public VehicleType Type { get; set; }
    public int Seats { get; set; }
    public Transmission Transmission { get; set; }
    public FuelType FuelType { get; set; }

    /// <summary>Rental price per day in Philippine pesos (PHP).</summary>
    public decimal PricePerDay { get; set; }

    /// <summary>Either a placeholder ("/images/vehicles/suv.svg") or an uploaded photo ("/api/files/{id}").</summary>
    [MaxLength(300)]
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>The uploaded photo, if the owner added one. Uploaded car photos are public.</summary>
    public Guid? PhotoId { get; set; }
    public StoredFile? Photo { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    public List<VehicleBlock> Blocks { get; set; } = [];

    [MaxLength(20)]
    public string PlateNumber { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Location { get; set; } = string.Empty;

    /// <summary>Owner's on/off switch. Date-based availability is checked against Bookings.</summary>
    public bool IsAvailable { get; set; } = true;

    public double Rating { get; set; }

    /// <summary>How many ratings Rating is the average of (so a new review updates it correctly).</summary>
    public int RatingCount { get; set; }

    /// <summary>Fee to deliver the car to the customer's address. Null = owner doesn't deliver.</summary>
    public decimal? DeliveryFee { get; set; }

    /// <summary>Fee to hand over the car at NAIA airport. Null = no airport pick-up.</summary>
    public decimal? AirportFee { get; set; }

    public List<Booking> Bookings { get; set; } = [];
    public List<Review> Reviews { get; set; } = [];
}
