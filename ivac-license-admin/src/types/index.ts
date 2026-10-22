export type LicenseStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';
export type InstallationStatus = 'ACTIVE' | 'REVOKED';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface LicenseInstallation {
  id: string;
  licenseId: string;
  installationId: string;
  installationLabel?: string | null;
  firstActivatedAt: string;
  lastSeenAt: string;
  status: InstallationStatus;
  revokedAt?: string | null;
  revokedBy?: string | null;
  createdAt: string;
}

export interface License {
  id: string;
  keyMasked: string;
  status: LicenseStatus;
  validityDays: number;
  activatedAt?: string | null;
  expiresAt?: string | null;
  maxInstallations: number;
  activeInstallationsCount: number;
  availableSlots?: number;
  customerName?: string | null;
  customerContact?: string | null;
  adminNotes?: string | null;
  lastValidatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  installations?: LicenseInstallation[];
  paymentRequests?: PaymentRequest[];
}

export interface PaymentPlan {
  code: string;
  name: string;
  validityDays: number;
  maxInstallations: number;
  price: number;
  currency: string;
}

export interface PaymentSettings {
  bkashNumber: string;
  nagadNumber: string;
  bankInstructions?: string | null;
  whatsappNumber: string;
  instructionText?: string | null;
}

export interface PaymentRequest {
  id: string;
  transactionId: string;
  paymentMethod: string;
  planCode: string;
  amount: number;
  currency: string;
  payerContact: string;
  licenseId?: string | null;
  status: PaymentStatus;
  adminNote?: string | null;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  license?: {
    id: string;
    keyMasked: string;
    customerName?: string | null;
  };
}

export interface DashboardStats {
  totalLicenses: number;
  activeLicenses: number;
  pendingLicenses: number;
  expiredLicenses: number;
  revokedLicenses: number;
  suspendedLicenses: number;
  pendingPayments: number;
  activeInstallations: number;
  licensesExpiringSoon: number;
}

export interface AuditLog {
  id: string;
  adminId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  admin?: {
    username: string;
    email: string;
  } | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
