namespace DriveMate.Server.Services;

/// <summary>
/// The rental agreement customers accept when booking. When the text changes, bump Version,
/// so each booking records exactly which terms the customer agreed to.
/// </summary>
public static class RentalAgreement
{
    public const string Version = "2026-11";

    public static readonly IReadOnlyList<string> Terms =
    [
        "The renter must hold a valid driver's licence for self-drive trips and carry it while driving.",
        "Pick-up and return happen at the agreed place and time. Late returns are charged per extra day.",
        "The renter takes photos of the vehicle, odometer and fuel gauge at pick-up and at return through the DriveMate app.",
        "Return the vehicle with the same fuel level. Missing fuel is deducted from the security deposit.",
        "Damage found at return that is not in the pick-up photos is charged up to the liability of the chosen protection plan.",
        "Traffic violations, tolls and parking fees during the trip are the renter's responsibility.",
        "No smoking, no illegal use, and no driving outside Luzon without the owner's written consent.",
        "The security deposit is refunded after the return inspection, minus any agreed charges.",
        "Cancellations before the trip starts are free in this demo version.",
    ];
}
