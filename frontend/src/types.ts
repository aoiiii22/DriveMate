// TypeScript shapes of the JSON the API sends. Each one matches a C# DTO record.

// 'Motorcycle' is no longer offered, but old hidden listings may still carry it.
export type VehicleType = 'Sedan' | 'SUV' | 'Van' | 'Motorcycle';
export type Transmission = 'Automatic' | 'Manual';
export type FuelType = 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric';
export type BookingStatus = 'Pending' | 'Confirmed' | 'Ongoing' | 'Completed' | 'Cancelled';
export type PaymentMethod = 'GCash' | 'Card' | 'CashOnPickup';
export type ProtectionPlan = 'Basic' | 'Standard' | 'Premium';
export type DepositStatus = 'None' | 'Unpaid' | 'Held' | 'Refunded';
export type VerificationStatus = 'Pending' | 'Approved' | 'Rejected';
export type InspectionStage = 'PickUp' | 'Return';
export type PhotoAngle = 'Front' | 'Back' | 'Left' | 'Right' | 'Dashboard' | 'Interior' | 'Damage';

export interface ProtectionPlanInfo {
  plan: ProtectionPlan;
  name: string;
  pricePerDay: number;
  liability: number;
  description: string;
}

export interface Agreement {
  version: string;
  terms: string[];
}

export interface MyVerification {
  status: VerificationStatus | null; // null = not submitted yet
  licenseNumber: string | null;
  licenseExpiry: string | null;
  licensePhotoId: string | null;
  idPhotoId: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
}

export interface AdminVerification {
  id: number;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  licenseNumber: string;
  licenseExpiry: string;
  licensePhotoId: string | null;
  idPhotoId: string | null;
  status: VerificationStatus;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface Inspection {
  id: number;
  stage: InspectionStage;
  odometerKm: number;
  fuelPercent: number;
  notes: string | null;
  createdByName: string;
  createdAt: string;
  photos: { fileId: string; angle: PhotoAngle }[];
}

export interface VehicleSummary {
  id: number;
  name: string;
  type: VehicleType;
  seats: number;
  transmission: Transmission;
  fuelType: FuelType;
  pricePerDay: number;
  imageUrl: string;
  location: string;
  rating: number;
  reviewCount: number;
  isFavorite: boolean;
  offersDelivery: boolean;
  offersAirport: boolean;
  /** Only when dates were searched. */
  tripDays?: number | null;
  tripTotal?: number | null;
}

export type HandoverType = 'OwnerLocation' | 'Delivery' | 'Airport';

export interface Message {
  id: number;
  senderName: string;
  senderRole: 'Customer' | 'Owner' | 'Driver';
  mine: boolean;
  body: string;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  page: string;
  bookingId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface Promo {
  id: number;
  code: string;
  description: string;
  percentOff: number | null;
  amountOff: number | null;
  maxDiscount: number | null;
  minSpend: number;
  validUntil: string | null;
  usageLimit: number | null;
  timesUsed: number;
  isActive: boolean;
}

export interface Review {
  id: number;
  stars: number;
  comment: string | null;
  customerName: string;
  createdAt: string;
}

export interface VehicleDetail extends Omit<VehicleSummary, 'reviewCount' | 'offersDelivery' | 'offersAirport'> {
  ratingCount: number;
  deliveryFee: number | null;
  airportFee: number | null;
  plateNumber: string;
  isAvailable: boolean;
  ownerName: string;
  reviews: Review[];
  bookedDates: { start: string; end: string }[];
  description: string | null;
}

export interface Driver {
  id: number;
  fullName: string;
  profilePhotoUrl: string | null;
  rating: number;
  yearsExperience: number;
  pricePerDay: number;
  isAvailable: boolean;
  ratingCount: number;
}

export interface Quote {
  days: number;
  vehicleCost: number;
  longRentalDiscount: number;
  longRentalRate: number;
  driverCost: number;
  protectionCost: number;
  deliveryFee: number;
  subtotal: number;
  promoCode: string | null;
  promoDiscount: number;
  promoError: string | null;
  total: number;
  plan: ProtectionPlan;
  securityDeposit: number;
}

export interface Booking {
  id: number;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  destination: string;
  withDriver: boolean;
  vehicleId: number;
  vehicleName: string;
  vehicleImageUrl: string;
  vehiclePlate: string;
  driverId: number | null;
  driverName: string | null;
  vehicleCost: number;
  driverCost: number;
  protectionCost: number;
  totalPrice: number;
  protectionPlan: ProtectionPlan;
  securityDeposit: number;
  depositStatus: DepositStatus;
  agreementVersion: string | null;
  agreementAcceptedAt: string | null;
  paymentMethod: PaymentMethod | null;
  isPaid: boolean;
  createdAt: string;
  canPay: boolean;
  canCancel: boolean;
  canCheckIn: boolean;
  canReturn: boolean;
  inspectionCount: number;
  driverAccepted: boolean;
  depositDeduction: number;
  depositNote: string | null;
  cancellationReason: string | null;
  longRentalDiscount: number;
  promoCode: string | null;
  promoDiscount: number;
  handover: HandoverType;
  deliveryFee: number;
  canReview: boolean;
  reviewStars: number | null;
}

/** The few booking fields the check-in screen needs (customer, owner and driver views all have them). */
export interface InspectionTarget {
  id: number;
  vehicleName: string;
  vehiclePlate: string;
  depositStatus: DepositStatus;
}

// ---------- Owner & driver tools ----------

export interface OwnerVehicle {
  id: number;
  name: string;
  type: VehicleType;
  seats: number;
  transmission: Transmission;
  fuelType: FuelType;
  pricePerDay: number;
  imageUrl: string;
  photoId: string | null;
  plateNumber: string;
  location: string;
  description: string | null;
  isAvailable: boolean;
  rating: number;
  completedTrips: number;
  earned: number;
  nextTripStart: string | null;
  deliveryFee: number | null;
  airportFee: number | null;
  ratingCount: number;
}

export interface CalendarEntry {
  kind: 'Booking' | 'Block';
  id: number | null;
  start: string;
  end: string;
  label: string;
  status: BookingStatus | null;
}

export interface OwnerBooking extends InspectionTarget {
  status: BookingStatus;
  startDate: string;
  endDate: string;
  vehicleId: number;
  customerName: string;
  customerPhone: string | null;
  withDriver: boolean;
  driverName: string | null;
  pickupLocation: string;
  destination: string;
  protectionPlan: ProtectionPlan;
  vehicleCost: number;
  ownerPayout: number;
  securityDeposit: number;
  depositDeduction: number;
  depositNote: string | null;
  inspectionCount: number;
  canCheckIn: boolean;
  canSettleDeposit: boolean;
}

export interface Earnings {
  earned: number;
  upcoming: number;
  thisMonth: number;
  platformFees: number;
  depositDeductions: number;
  completedTrips: number;
  months: { month: string; earned: number; trips: number }[];
}

export interface DriverProfile {
  id: number;
  fullName: string;
  licenseNumber: string;
  yearsExperience: number;
  rating: number;
  pricePerDay: number;
  isAvailable: boolean;
}

export interface DriverTrip extends InspectionTarget {
  status: BookingStatus;
  startDate: string;
  endDate: string;
  customerName: string;
  customerPhone: string | null;
  pickupLocation: string;
  destination: string;
  driverPayout: number;
  accepted: boolean;
  inspectionCount: number;
  canRespond: boolean;
  canCheckIn: boolean;
  canReturn: boolean;
}

export type PartnerType = 'Owner' | 'Driver';
export type ApplicationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PartnerApplication {
  id: number;
  type: PartnerType;
  details: string;
  licenseNumber: string | null;
  yearsExperience: number | null;
  pricePerDay: number | null;
  status: ApplicationStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  verificationStatus: VerificationStatus | null;
}

/** What the customer has filled in on the booking form. Kept by App so it survives the login page. */
export interface BookingDraft {
  withDriver: boolean;
  driverId: number | null;
  pickup: string;
  destination: string;
  plan: ProtectionPlan;
  acceptAgreement: boolean;
  handover: HandoverType;
  /** The promo code the customer applied (empty = none). */
  promoCode: string;
}

export const emptyDraft: BookingDraft = {
  withDriver: false, driverId: null, pickup: '', destination: '', plan: 'Basic', acceptAgreement: false,
  handover: 'OwnerLocation', promoCode: '',
};

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: 'Customer' | 'Driver' | 'Owner' | 'Admin' | 'SuperAdmin';
  profilePhotoUrl: string | null;
  /** Set when a super admin is viewing the app as this user. */
  impersonatedBy: string | null;
}

// ---------- Super admin ----------

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: User['role'];
  isLocked: boolean;
  createdAt: string;
  bookingCount: number;
  verification: VerificationStatus | null;
}

export interface UserDetail {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: User['role'];
  roles: string[];
  isLocked: boolean;
  createdAt: string;
  verification: VerificationStatus | null;
  licenseNumber: string | null;
  driver: DriverProfile | null;
  vehicles: { id: number; name: string; plateNumber: string; isAvailable: boolean; rating: number }[];
  bookings: { id: number; vehicleName: string; startDate: string; endDate: string; status: BookingStatus; totalPrice: number }[];
  applications: PartnerApplication[];
  canManage: boolean;
}

export interface AuditEntry {
  id: number;
  actorName: string;
  action: string;
  targetUserId: string | null;
  targetName: string | null;
  details: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}
