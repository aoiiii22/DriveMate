# DriveMate — *Your Ride, Your Choice.*

Vehicle rental + professional driver services platform for the Philippines.
Rent a vehicle (self-drive) or book it with a driver, all in one app.
BM2506 Wadhwani Venture Journey project, STI.

## Tech stack

| Part | Technology |
|---|---|
| Backend | ASP.NET Core Web API (.NET 10), C# |
| Database | Entity Framework Core + SQLite (file: `DriveMate.Server/App_Data/drivemate.db`) |
| Auth | ASP.NET Core Identity + JWT, roles `Customer`, `Driver`, `Owner`, `Admin` |
| Frontend | React 19 + Vite + TypeScript (`frontend/`) |
| Orchestration | .NET Aspire AppHost (starts API + React together) |
| API docs | Swagger UI (development only) |

## Prerequisites

- **Visual Studio 2026** with the **ASP.NET and web development** workload.
  Visual Studio 2022 can't load `DriveMate.AppHost` (it shows "(unloaded)": its build tools don't support the .NET 10 SDK that Aspire 13 needs).
- **.NET SDK 10** (`dotnet --list-sdks`)
- **Node.js LTS** (20.19+ or 22.13+) with npm (`node --version`)

## Run it (one click)

1. Open `DriveMate.slnx` in Visual Studio.
2. Make sure **DriveMate.AppHost** is the startup project (right-click → *Set as Startup Project*).
3. Press **F5**.

The **Aspire dashboard** opens in your browser. It lists every running part with its logs. Then:

| What | URL |
|---|---|
| React app | http://localhost:5173 |
| API | https://localhost:7599 (also http://localhost:5536) |
| Swagger UI | https://localhost:7599/swagger |
| Aspire dashboard | https://localhost:17133 |

On first run, the database file is created automatically (EF Core migrations) and filled with demo data.

> **First time only:** if `frontend/node_modules` is missing, run `npm install` inside `frontend/`.
> If the browser warns about the HTTPS certificate, run `dotnet dev-certs https --trust` once.

### Run without Visual Studio

```powershell
dotnet run --project DriveMate.AppHost
```

## Test accounts

All accounts use the password **`DriveMate123!`**

| Email | Role | Notes |
|---|---|---|
| superadmin@drivemate.local | SuperAdmin | All accounts: roles (incl. making Admins), lock/unlock, password reset, "view as", activity log |
| admin@drivemate.local | Admin | Verifications, partner applications, promo codes |
| customer@drivemate.local | Customer | Juan Dela Cruz, has sample bookings |
| owner@drivemate.local | Owner | Maria Santos, owns 5 vehicles |
| owner2@drivemate.local | Owner | Ramon Cruz, owns 5 vehicles |
| driver@drivemate.local | Driver | Mark Santiago ("Mark S."), ★4.9, 5 yrs, ₱500/day |
| driver2@ … driver5@drivemate.local | Driver | Jose, Ana, Carlo, Liza |
| applicant@drivemate.local | Customer | Has a pending Owner application |

## Reset the database

Stop the app, then delete the database file. It is recreated and reseeded on the next run.

```powershell
Remove-Item DriveMate.Server\App_Data\drivemate.db*
```

Sample booking dates are relative to the day the database was seeded, so reset it if the demo data looks stale.

## Changing the data model

After editing a class in `DriveMate.Server/Models`, create a migration (from the solution folder):

```powershell
dotnet tool restore          # first time: installs dotnet-ef from dotnet-tools.json
dotnet ef migrations add <Name> --project DriveMate.Server --output-dir Data/Migrations
```

The migration is applied automatically the next time the app starts.

## Project structure

```
DriveMate.slnx
├─ DriveMate.AppHost/        Aspire launcher (F5 starts API + React)
├─ DriveMate.Server/         ASP.NET Core Web API
│  ├─ Controllers/           HTTP endpoints (/api/...)
│  ├─ Data/                  AppDbContext, SeedData, Migrations/
│  ├─ DTOs/                  Request/response shapes
│  ├─ Models/                EF Core entities
│  ├─ Services/              Business rules (pricing, booking overlap)
│  └─ Program.cs             Startup: services + request pipeline
└─ frontend/                 React + Vite + TypeScript
   ├─ public/images/         Vehicle placeholder images
   └─ src/
```

## Business rules

- **Days** = EndDate − StartDate in calendar days, minimum 1.
- **Total** = vehicle price/day × days + (with driver ? driver price/day × days : 0), always calculated on the server.
- A vehicle or driver can't be double-booked: Pending, Confirmed and Ongoing bookings block overlapping dates.
- Payments are **simulated** (GCash, Card, Cash on pick-up). No real money moves.

### Trust & safety

- **Verification:** customers upload a driver's licence + government ID; an Admin approves it.
  Self-drive needs an *Approved* licence that is valid until the trip ends. With a driver, a submitted ID is enough.
  The demo customer is already verified.
- **Protection plans:** Basic (free, ₱20,000 liability), Standard (₱250/day, ₱5,000), Premium (₱450/day, ₱0). Added to the total.
- **Security deposit:** ₱3,000 self-drive, ₱1,000 with driver. Refundable, not part of the total.
  Held when paid (GCash/Card now, cash at pick-up), refunded on cancel.
- **Rental agreement:** must be accepted to book; the version and time are saved on the booking (`Services/RentalAgreement.cs`).
- **Trip photos:** on pick-up day the customer checks in with 5 photos (front, back, left, right, dashboard), odometer and fuel.
  This starts the trip. The same at return completes it. The customer, vehicle owner, driver and admins can see them.
- **Uploads** are stored privately in `DriveMate.Server/App_Data/uploads` (JPEG/PNG/WebP, max 5 MB) and served only through `GET /api/files/{id}` after a permission check.
- Timestamps ending in `At` are stored in UTC; trip dates (`StartDate`, `EndDate`) are Philippine local time.

### Owner & driver tools

- **Service fee:** DriveMate keeps 15% of the vehicle and driver cost plus all protection fees (`PricingService.PlatformFeeRate`).
  Owner and driver payouts are stored on each booking when it's made, like the prices.
- **Owner dashboard:** list/edit cars (with a public photo upload), a month calendar per car with blocked dates
  (blocked dates can't be booked and can't cover an existing booking), bookings with payouts, hand-over check-in,
  deposit settlement after the return (keep part of it only with a reason), and earnings for the last 6 months.
- **Driver dashboard:** "Accepting trips" switch, daily rate, accept/decline trips, start/end trip photos, earnings.
  The customer's phone number is shown only after the driver accepts a paid trip.
- **Declined trips** go to the best-rated free driver whose rate × days is within what the customer already pays
  (the customer's price never changes). If nobody is free, the booking is cancelled and refunded with a reason.
- **Become a partner:** customers apply as Owner or Driver; an Admin approves. Approval adds the role (the Customer
  role is kept) and, for drivers, creates a Driver profile that starts offline. The app refreshes the login token
  on each page load (`POST /api/auth/refresh`), so the new dashboard appears after a reload.

### Extras

- **Long-rental discounts:** 10% off the vehicle cost for 7+ days, 25% for 28+ days. Drivers are paid their full rate.
- **Promo codes:** created by Admins (% or ₱ off, optional cap, minimum, expiry, usage limit). One use per customer.
  DriveMate pays for promos, so owner/driver payouts don't change. Demo codes: `WELCOME10`, `ROADTRIP500`.
- **Delivery & airport:** owners set a delivery fee and/or a NAIA airport fee (empty = not offered). The owner keeps 100% of it.
- **Reviews:** after a completed trip the customer rates the car (and the driver). Ratings are a running average.
- **Favorites, messages, notifications:** ♥ cars; a chat per booking for customer, owner and driver;
  in-app notifications (🔔, checked every 30 s) for bookings, payments, drivers, deposits, reviews and messages.

### Super admin

- The **SuperAdmin** role is above Admin (the account has both, so all Admin pages work). Page: `/superadmin`.
- **Users:** search every account; see profile, roles, ID status, cars, driver profile, bookings, applications.
  Change role (Customer / Owner / Driver / Admin — only the super admin can make or remove Admins),
  lock/unlock (with a reason), and reset the password to a one-time temporary password shown once.
  Leaving Owner hides that person's cars; leaving Driver switches their profile offline.
- **View as user:** a 1-hour session as that person, with an orange banner and "Return to super admin".
- **Activity log:** role changes, locks, password resets, "view as", ID and partner decisions, promo changes.
- Safety: the super admin can't change or "view as" themselves or another super admin, and nobody can be made
  SuperAdmin through the app. Every request re-checks the account (`Services/AccountCheck.cs`), so a lock or
  role change works immediately instead of when the login token expires.

## Car photos and vehicle types

- DriveMate offers **Sedan, SUV and Van** only. Motorcycles were removed: they are gone from filters, the home page and
  the owner form, the API rejects new motorcycle listings, and old motorcycle listings are hidden (not deleted) at start-up.
- Demo cars use real photos in `frontend/public/images/cars/` (free-licence photos from Wikimedia Commons, CC BY-SA 4.0).
  Credits are in `frontend/src/photoCredits.ts`, shown under each car photo and on the **Photo credits** page (`/credits`).
  If you replace a photo, update its credit too.
- At start-up, demo cars that still use the old drawing get their photo (`SeedData.EnsureCarPhotosAsync`).
  Photos uploaded by owners are never replaced.

## Design system

- **Look:** brand purple and pink (gradient buttons), navy text, 10-12 px corners, quiet shadows, Inter typeface.
  All colours are variables at the top of `frontend/src/index.css` (`--dm-navy`, `--dm-accent`, `--dm-danger`, ...).
  `frontend/src/polish.css` is the final style layer and is loaded after `App.css`.
- **Icons:** [Lucide](https://lucide.dev) via `lucide-react` (1.66.0). Use `<Star className="ico" aria-hidden="true" />`;
  `.ico` sizes the icon with the surrounding text. No emoji in the interface.
- **Logo:** `frontend/src/components/Logo.tsx` (also `public/favicon.svg`).
- Text/background pairs were checked for WCAG AA contrast (at least 4.5:1).

## Installable app (PWA)

DriveMate is a Progressive Web App: the same site, installable on a phone or PC with its own icon, full-screen.

- **Files:** `frontend/public/manifest.webmanifest` (name, colours, icons, shortcuts), `sw.js` (service worker),
  `offline.html` (shown when there's no connection), `icons/` (PNG icons drawn by `Logo`'s design).
- **Install:** Android/Chrome/Edge: use the **Install** card on Home/Account (or the browser's install icon).
  iPhone: Safari → Share → **Add to Home Screen**.
- **Offline rules:** `/api/*` is never cached, so bookings and prices are always live. Pages are network-first
  with the offline page as a fallback; built files (`/assets`) are cached.
- The service worker is only registered in the built app, not in `npm run dev` (it would serve stale files).
- Phones require **HTTPS** to install (localhost is exempt). When you publish, use an https:// address.
- In `Program.cs`, `UseFileServer()` must stay **before** `UseRouting()`; otherwise the catch-all page fallback
  hides every static file.

## Pages (React Router)

| URL | Page |
|---|---|
| `/` | Home: search, car types, how it works, top-rated cars |
| `/search?start=…&end=…&type=SUV&sort=rating` | Results (filters live in the URL, so Back and shared links work) |
| `/cars/:id?start=…&end=…` | Car details + 3-step booking |
| `/pay/:id` | Checkout for a booking |
| `/trips` | My trips (Upcoming / Past / Cancelled) |
| `/verify`, `/partner`, `/account`, `/alerts` | ID check, become a partner, account menu, notifications |
| `/owner`, `/driver`, `/admin`, `/superadmin` | Dashboards (role needed) |

On phones (< 768 px) a bottom tab bar replaces the top menu, and the car page has a sticky "total + Continue" bar.
When published, the server returns `index.html` for any non-`/api` URL so refreshing a page works.
