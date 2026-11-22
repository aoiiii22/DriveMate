using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DriveMate.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class ExtrasAndPolish : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "AirportFee",
                table: "Vehicles",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DeliveryFee",
                table: "Vehicles",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RatingCount",
                table: "Vehicles",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DriverStars",
                table: "Reviews",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RatingCount",
                table: "Drivers",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "DeliveryFee",
                table: "Bookings",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "Handover",
                table: "Bookings",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                defaultValue: "OwnerLocation"); // existing bookings: picked up from the owner

            migrationBuilder.AddColumn<double>(
                name: "LongRentalDiscount",
                table: "Bookings",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "PromoCode",
                table: "Bookings",
                type: "TEXT",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "PromoDiscount",
                table: "Bookings",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.CreateTable(
                name: "Favorites",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    VehicleId = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Favorites", x => new { x.UserId, x.VehicleId });
                    table.ForeignKey(
                        name: "FK_Favorites_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Favorites_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Messages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BookingId = table.Column<int>(type: "INTEGER", nullable: false),
                    SenderId = table.Column<string>(type: "TEXT", nullable: false),
                    Body = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Messages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Messages_AspNetUsers_SenderId",
                        column: x => x.SenderId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Messages_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Body = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Page = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    BookingId = table.Column<int>(type: "INTEGER", nullable: true),
                    IsRead = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PromoCodes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Code = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    PercentOff = table.Column<double>(type: "REAL", nullable: true),
                    AmountOff = table.Column<double>(type: "REAL", nullable: true),
                    MaxDiscount = table.Column<double>(type: "REAL", nullable: true),
                    MinSpend = table.Column<double>(type: "REAL", nullable: false),
                    ValidUntil = table.Column<DateTime>(type: "TEXT", nullable: true),
                    UsageLimit = table.Column<int>(type: "INTEGER", nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromoCodes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_VehicleId",
                table: "Favorites",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_BookingId_CreatedAt",
                table: "Messages",
                columns: new[] { "BookingId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderId",
                table: "Messages",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_IsRead_CreatedAt",
                table: "Notifications",
                columns: new[] { "UserId", "IsRead", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PromoCodes_Code",
                table: "PromoCodes",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Favorites");

            migrationBuilder.DropTable(
                name: "Messages");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "PromoCodes");

            migrationBuilder.DropColumn(
                name: "AirportFee",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "DeliveryFee",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "RatingCount",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "DriverStars",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "RatingCount",
                table: "Drivers");

            migrationBuilder.DropColumn(
                name: "DeliveryFee",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "Handover",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "LongRentalDiscount",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PromoCode",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PromoDiscount",
                table: "Bookings");
        }
    }
}
