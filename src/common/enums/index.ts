export enum UserRole {
  BANK_ADMIN = 'bank_admin',
  ACCOUNT_MANAGER = 'account_manager',
  CLIENT = 'client',
  AUDITOR = 'auditor',
}

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  BUSINESS = 'business',
  CREDIT = 'credit',
}

export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  PAYMENT = 'payment',
  FEE = 'fee',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  UNDER_REVIEW = 'under_review',
}

export enum KycStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCOUNT_CREATED = 'account_created',
  TRANSACTION_CREATED = 'transaction_created',
  KYC_UPDATED = 'kyc_updated',
  USER_CREATED = 'user_created',
  ROLE_CHANGED = 'role_changed',
  FRAUD_DETECTED = 'fraud_detected',
}
