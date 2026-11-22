using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DriveMate.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class OwnerAndDriverTools : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Vehicles",
                type: "TEXT",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PhotoId",
                table: "Vehicles",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "StoredFiles",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LicenseNumber",
                table: "PartnerApplications",
                type: "TEXT",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "PricePerDay",
                table: "PartnerApplications",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "PartnerApplications",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "PartnerApplications",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "YearsExperience",
                table: "PartnerApplications",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                table: "Bookings",
                type: "TEXT",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DepositDeduction",
                table: "Bookings",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "DepositNote",
                table: "Bookings",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DepositSettledAt",
                table: "Bookings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DriverAcceptedAt",
                table: "Bookings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DriverPayout",
                table: "Bookings",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "OwnerPayout",
                table: "Bookings",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "PlatformFee",
                table: "Bookings",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.CreateTable(
                name: "DriverDeclines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BookingId = table.Column<int>(type: "INTEGER", nullable: false),
                    DriverId = table.Column<int>(type: "INTEGER", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DriverDeclines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DriverDeclines_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DriverDeclines_Drivers_DriverId",
                        column: x => x.DriverId,
                        principalTable: "Drivers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehicleBlocks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    VehicleId = table.Column<int>(type: "INTEGER", nullable: false),
                    StartDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleBlocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VehicleBlocks_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_PhotoId",
                table: "Vehicles",
                column: "PhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_DriverDeclines_BookingId",
                table: "DriverDeclines",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_DriverDeclines_DriverId",
                table: "DriverDeclines",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleBlocks_VehicleId_StartDate_EndDate",
                table: "VehicleBlocks",
                columns: new[] { "VehicleId", "StartDate", "EndDate" });

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_StoredFiles_PhotoId",
                table: "Vehicles",
                column: "PhotoId",
                principalTable: "StoredFiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Backfill bookings made before this feature with the 85% / 15% split
            // (same rule as PricingService.PlatformFeeRate), so earnings include past trips.
            migrationBuilder.Sql("""
                UPDATE Bookings SET
                    OwnerPayout = ROUND(VehicleCost * 0.85, 2),
                    DriverPayout = ROUND(DriverCost * 0.85, 2),
                    PlatformFee = TotalPrice - ROUND(VehicleCost * 0.85, 2) - ROUND(DriverCost * 0.85, 2);
                -- Existing driver trips count as already accepted by their driver.
                UPDATE Bookings SET DriverAcceptedAt = CreatedAt
                WHERE DriverId IS NOT NULL AND Status <> 'Cancelled';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_StoredFiles_PhotoId",
                table: "Vehicles");

            migrationBuilder.DropTable(
                name: "DriverDeclines");

            migrationBuilder.DropTable(
                name: "VehicleBlocks");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_PhotoId",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "PhotoId",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "StoredFiles");

            migrationBuilder.DropColumn(
                name: "LicenseNumber",
                table: "PartnerApplications");

            migrationBuilder.DropColumn(
                name: "PricePerDay",
                table: "PartnerApplications");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "PartnerApplications");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "PartnerApplications");

            migrationBuilder.DropColumn(
                name: "YearsExperience",
                table: "PartnerApplications");

            migrationBuilder.DropColumn(
                name: "CancellationReason",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "DepositDeduction",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "DepositNote",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "DepositSettledAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "DriverAcceptedAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "DriverPayout",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "OwnerPayout",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PlatformFee",
                table: "Bookings");
        }
    }
}
