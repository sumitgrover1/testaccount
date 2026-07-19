// Mirrors prisma/schema.prisma enums/models on the backend. Kept intentionally
// loose (most object fields optional-ish via `Record`-like usage) since the
// UI only reads/writes a subset of each resource's fields.

export type Role =
  | 'SUPER_ADMIN'
  | 'CLINIC_OWNER'
  | 'DOCTOR'
  | 'RECEPTIONIST'
  | 'COUNSELOR'
  | 'INVENTORY_MANAGER'
  | 'ACCOUNTANT'
  | 'MARKETING_TEAM';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type PatientStatus = 'ACTIVE' | 'INACTIVE';
export type PatientDocumentType = 'BEFORE_IMAGE' | 'AFTER_IMAGE' | 'CONSENT_FORM' | 'DOCUMENT' | 'OTHER';

export type LeadSource =
  | 'FACEBOOK_ADS'
  | 'GOOGLE_ADS'
  | 'WEBSITE_FORM'
  | 'WALK_IN'
  | 'PHONE_CALL'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'REFERRAL';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'CONSULTATION_SCHEDULED'
  | 'VISITED_CLINIC'
  | 'TREATMENT_DISCUSSION'
  | 'HOT_LEAD'
  | 'PACKAGE_SHARED'
  | 'CONVERTED'
  | 'COLD'
  | 'LOST'
  | 'DUPLICATE'
  | 'INVALID'
  | 'NO_RESPONSE';

export type EnrollmentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
export type AppointmentStatus = 'BOOKED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
export type StockMovementType = 'PURCHASE' | 'CONSUMPTION' | 'DAMAGE' | 'EXPIRY' | 'ADJUSTMENT' | 'RETURN';
export type OcrStatus = 'PENDING' | 'PROCESSED' | 'FAILED' | 'MANUALLY_CORRECTED';
export type PricingApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'SPLIT';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'REFUNDED';
export type InvoiceItemType = 'TREATMENT' | 'PACKAGE' | 'PRODUCT';
export type CommunicationChannel = 'CALL' | 'WHATSAPP' | 'SMS' | 'EMAIL' | 'NOTE' | 'SYSTEM';
export type FollowUpChannel = 'CALL' | 'WHATSAPP' | 'SMS' | 'EMAIL';
export type FollowUpStatus = 'PENDING' | 'DONE' | 'MISSED' | 'CANCELLED';

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Patient {
  id: string;
  patientNumber: number;
  patientCode: string;
  fullName: string;
  mobileNumber: string;
  gender: Gender;
  dateOfBirth: string | null;
  age: number | null;
  city: string;
  state: string;
  status: PatientStatus;
  email?: string | null;
  address?: string | null;
  occupation?: string | null;
  referralSource?: string | null;
  notes?: string | null;
  allergies?: string | null;
  existingDiseases?: string | null;
  currentMedication?: string | null;
  previousTreatmentHistory?: string | null;
  createdAt: string;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  type: PatientDocumentType;
  fileUrl: string;
  fileName: string;
  notes?: string | null;
  uploadedAt: string;
}

export interface Lead {
  id: string;
  leadNumber: number;
  leadCode: string;
  fullName: string;
  mobileNumber: string;
  email?: string | null;
  interestedTreatmentId?: string | null;
  source: LeadSource;
  campaignId?: string | null;
  assignedCounselorId?: string | null;
  lastFollowUpAt?: string | null;
  nextFollowUpAt?: string | null;
  leadScore: number;
  notes?: string | null;
  status: LeadStatus;
  convertedPatientId?: string | null;
  createdAt: string;
}

export interface Treatment {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  defaultPrice: string | number;
  durationMinutes: number;
  numberOfSessions: number;
  isActive: boolean;
}

export interface PackageTreatmentItem {
  id: string;
  treatmentId: string;
  quantity: number;
  treatment: Treatment;
}

export interface TreatmentPackage {
  id: string;
  name: string;
  description?: string | null;
  defaultPrice: string | number;
  discountPercent?: string | number | null;
  validityDays?: number | null;
  isActive: boolean;
  items: PackageTreatmentItem[];
}

export interface TreatmentEnrollmentItem {
  id: string;
  treatmentId: string;
  sessionsTotal: number;
  sessionsCompleted: number;
  price: string | number;
  status: EnrollmentStatus;
  treatment: Treatment;
}

export interface TreatmentEnrollment {
  id: string;
  patientId: string;
  packageId?: string | null;
  enrollmentDate: string;
  status: EnrollmentStatus;
  expiryDate?: string | null;
  assignedDoctorId: string;
  assignedTherapistId?: string | null;
  totalPrice: string | number;
  items: TreatmentEnrollmentItem[];
  patient?: Patient;
  package?: TreatmentPackage | null;
  assignedDoctor?: { id: string; firstName: string; lastName: string };
}

export interface Appointment {
  id: string;
  appointmentNumber: number;
  patientId: string;
  doctorId: string;
  treatmentId?: string | null;
  scheduledDate: string;
  status: AppointmentStatus;
  notes?: string | null;
  patient?: { id: string; fullName: string; mobileNumber: string };
  doctor?: { id: string; firstName: string; lastName: string };
  treatment?: { id: string; name: string } | null;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  isActive: boolean;
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: string | number;
  mrp?: string | number | null;
  sellingPrice?: string | number | null;
  gstPercent?: string | number | null;
  currentStock: string | number;
  supplierId?: string | null;
  location?: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string | null;
  unit?: string | null;
  minimumStock: string | number;
  sellingPrice?: string | number | null;
  isActive: boolean;
  batches?: ProductBatch[];
}

export interface PurchaseInvoiceItem {
  id: string;
  productNameRaw: string;
  matchedProductId?: string | null;
  batchNumber?: string | null;
  quantity: string | number;
  mrp?: string | number | null;
  purchasePrice?: string | number | null;
  expiryDate?: string | null;
  gstPercent?: string | number | null;
  isValidated: boolean;
}

export interface PurchaseInvoice {
  id: string;
  supplierId?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  rawFileUrl: string;
  ocrStatus: OcrStatus;
  totalAmount?: string | number | null;
  items: PurchaseInvoiceItem[];
  supplier?: Supplier | null;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent?: string | number | null;
  discountAmount?: string | number | null;
  validFrom?: string | null;
  validTo?: string | null;
  maxUses?: number | null;
  usedCount: number;
  isActive: boolean;
}

export interface InvoiceItem {
  id: string;
  itemType: InvoiceItemType;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  discountPercent: string | number;
  gstPercent: string | number;
  lineTotal: string | number;
}

export interface Payment {
  id: string;
  amount: string | number;
  mode: PaymentMode;
  transactionRef?: string | null;
  paidAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: number;
  patientId: string;
  status: InvoiceStatus;
  subtotal: string | number;
  discountAmount: string | number;
  doctorDiscountAmount: string | number;
  gstAmount: string | number;
  totalAmount: string | number;
  createdAt: string;
  items: InvoiceItem[];
  payments: Payment[];
}

export interface Campaign {
  id: string;
  name: string;
  source: LeadSource;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  costPerLead?: string | number | null;
  totalSpend?: string | number | null;
  isActive: boolean;
}

export interface FollowUp {
  id: string;
  leadId?: string | null;
  patientId?: string | null;
  assignedToId: string;
  channel: FollowUpChannel;
  dueAt: string;
  status: FollowUpStatus;
  notes?: string | null;
  lead?: { id: string; fullName: string; mobileNumber: string } | null;
  patient?: { id: string; fullName: string; mobileNumber: string } | null;
  assignedTo?: { id: string; firstName: string; lastName: string };
}

export interface PricingApprovalRequest {
  id: string;
  requestedById: string;
  patientId: string;
  treatmentId?: string | null;
  packageId?: string | null;
  proposedPrice: string | number;
  thresholdPrice: string | number;
  status: PricingApprovalStatus;
  reason?: string | null;
  createdAt: string;
}

export type BlogCategory = 'SKIN' | 'HAIR' | 'WEIGHT_MANAGEMENT' | 'GENERAL';

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  category: BlogCategory;
  excerpt: string;
  content: string[];
  readTimeMinutes: number;
  isPublished: boolean;
  publishedAt?: string | null;
  tags: BlogTag[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  type: 'COMMUNICATION' | 'APPOINTMENT' | 'INVOICE' | 'TREATMENT_SESSION' | 'LEAD_STATUS' | 'FOLLOW_UP';
  occurredAt: string;
  summary: string;
  data: unknown;
}
