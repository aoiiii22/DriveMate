using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DriveMate.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class TrustAndSafety : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AgreementAcceptedAt",
                table: "Bookings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AgreementVersion",
                table: "Bookings",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DepositStatus",
                table: "Bookings",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                defaultValue: "None"); // existing bookings had no deposit

            migrationBuilder.AddColumn<double>(
                name: "ProtectionCost",
                table: "Bookings",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "ProtectionPlan",
                table: "Bookings",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                defaultValue: "Basic"); // existing bookings had the free plan

            migrationBuilder.AddColumn<double>(
                name: "SecurityDeposit",
                table: "Bookings",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.CreateTable(
                name: "StoredFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UploadedById = table.Column<string>(type: "TEXT", nullable: false),
                    BookingId = table.Column<int>(type: "INTEGER", nullable: true),
                    RelativePath = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ContentType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SizeBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoredFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoredFiles_AspNetUsers_UploadedById",
                        column: x => x.UploadedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StoredFiles_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TripInspections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BookingId = table.Column<int>(type: "INTEGER", nullable: false),
                    Stage = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    OdometerKm = table.Column<int>(type: "INTEGER", nullable: false),
                    FuelPercent = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    CreatedById = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripInspections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripInspections_AspNetUsers_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TripInspections_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserVerifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    LicenseNumber = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    LicenseExpiry = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LicensePhotoId = table.Column<Guid>(type: "TEXT", nullable: true),
                    IdPhotoId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    RejectionReason = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserVerifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserVerifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserVerifications_StoredFiles_IdPhotoId",
                        column: x => x.IdPhotoId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserVerifications_StoredFiles_LicensePhotoId",
                        column: x => x.LicensePhotoId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TripPhotos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    InspectionId = table.Column<int>(type: "INTEGER", nullable: false),
                    FileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Angle = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripPhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripPhotos_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TripPhotos_TripInspections_InspectionId",
                        column: x => x.InspectionId,
                        principalTable: "TripInspections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_BookingId",
                table: "StoredFiles",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_UploadedById",
                table: "StoredFiles",
                column: "UploadedById");

            migrationBuilder.CreateIndex(
                name: "IX_TripInspections_BookingId_Stage",
                table: "TripInspections",
                columns: new[] { "BookingId", "Stage" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TripInspections_CreatedById",
                table: "TripInspections",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_TripPhotos_FileId",
                table: "TripPhotos",
                column: "FileId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TripPhotos_InspectionId",
                table: "TripPhotos",
                column: "InspectionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserVerifications_IdPhotoId",
                table: "UserVerifications",
                column: "IdPhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_UserVerifications_LicensePhotoId",
                table: "UserVerifications",
                column: "LicensePhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_UserVerifications_UserId",
                table: "UserVerifications",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TripPhotos");

            migrationBuilder.DropTable(
                name: "UserVerifications");

            migrationBuilder.DropTable(
                name: "TripInspections");

            migrationBuilder.DropTable(
                name: "StoredFiles");

            migrationBuilder.DropColumn(
                name: "AgreementAcceptedAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "AgreementVersion",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "DepositStatus",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ProtectionCost",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ProtectionPlan",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "SecurityDeposit",
                table: "Bookings");
        }
    }
}
