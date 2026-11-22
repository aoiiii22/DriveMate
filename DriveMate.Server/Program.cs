using System.Text.Json.Serialization;
using DriveMate.Server.Data;
using DriveMate.Server.Models;
using DriveMate.Server.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ===== 1. Register services (dependency injection container) =====

// Aspire defaults: health checks, logging/telemetry to the Aspire dashboard.
builder.AddServiceDefaults();

// --- Database: EF Core + SQLite ---
// The connection string lives in appsettings.json. We make the file path absolute
// (relative to the project folder) so it doesn't depend on where the app was started from.
var dbPath = Path.Combine(builder.Environment.ContentRootPath,
    builder.Configuration["Database:FilePath"] ?? "App_Data/drivemate.db");
Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite($"Data Source={dbPath}"));

// --- Identity: users, hashed passwords, roles ---
// AddIdentityCore is the API-friendly version (no built-in login pages / cookies).
builder.Services.AddIdentityCore<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>();

// --- JWT authentication: the API reads "Authorization: Bearer <token>" on each request ---
var jwt = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();
if (jwt.Key.Length < 32)
    throw new InvalidOperationException("Jwt:Key must be set (32+ characters). In development it is in appsettings.Development.json.");
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton<TokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = jwt.SigningKey(),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
        // A token is a snapshot from login time. On every request we re-check the account, so a
        // super admin's lock or role change works IMMEDIATELY instead of when the token expires.
        o.Events = new JwtBearerEvents { OnTokenValidated = AccountCheck.ValidateAsync };
    });
builder.Services.AddAuthorization();

// --- Private photo uploads (licences, IDs, trip photos). Outside wwwroot, so never public. ---
var uploadsPath = Path.Combine(builder.Environment.ContentRootPath,
    builder.Configuration["Uploads:FolderPath"] ?? "App_Data/uploads");
builder.Services.AddSingleton(new FileStorage(uploadsPath));

// Scoped = one per HTTP request, sharing that request's AppDbContext.
builder.Services.AddScoped<PromoService>();
builder.Services.AddScoped<Notifier>();
builder.Services.AddHttpContextAccessor(); // lets Auditor know who is making the request
builder.Services.AddScoped<Auditor>();

// --- Controllers + JSON ---
// JsonStringEnumConverter sends enums as "SUV" instead of 1, which is easier for React to use.
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// --- Error handling: every error is returned as a standard "ProblemDetails" JSON body ---
builder.Services.AddProblemDetails();

// --- API docs: generates the OpenAPI description at /openapi/v1.json ---
builder.Services.AddOpenApi();

var app = builder.Build();

// ===== 2. Create/upgrade the database and seed demo data =====
await SeedData.InitializeAsync(app.Services);

// ===== 3. HTTP request pipeline (order matters!) =====

app.UseExceptionHandler();   // catches unhandled exceptions → 500 ProblemDetails
app.UseStatusCodePages();    // gives empty 404/401/etc. responses a ProblemDetails body

// Serves the built React app (wwwroot) when published; in development Vite serves it.
// This MUST come before UseRouting: once a route matches (the catch-all fallback below matches
// everything), static files are skipped, so images, scripts and the app manifest would never load.
app.UseFileServer();
app.UseRouting();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Swagger UI: an interactive web page for trying the API → https://localhost:7599/swagger
    app.UseSwaggerUI(o =>
    {
        o.SwaggerEndpoint("/openapi/v1.json", "DriveMate API v1");
        o.DocumentTitle = "DriveMate API";
    });
}

app.UseAuthentication();     // reads the JWT and fills in "User"
app.UseAuthorization();      // enforces [Authorize] / roles
app.MapControllers();        // routes requests to our [ApiController] classes
app.MapDefaultEndpoints();   // /health and /alive for Aspire

// React Router pages (/cars/4, /trips...) only exist in the browser. When published, a refresh on
// such a URL must still return index.html. "/api/..." is excluded so unknown API calls stay a real 404.
app.MapFallbackToFile("{*path:regex(^(?!api(/|$)).*$)}", "index.html");

app.Run();
