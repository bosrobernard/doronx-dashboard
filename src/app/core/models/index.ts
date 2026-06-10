// ─── Enums ───────────────────────────────────────────────────────────────────
export type EEnvironment = 'TEST' | 'LIVE';
export type EPaymentIntentStatus =
  | 'CREATED'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_DETECTED'
  | 'CONFIRMING'
  | 'PAID'
  | 'UNDERPAID'
  | 'OVERPAID'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED';
export type EInvoiceStatus = EPaymentIntentStatus;
export type EWalletMode =
  | 'EXTERNAL_WALLET'
  | 'XPUB'
  | 'CLIENT_SIDE_GENERATED'
  | 'ADDRESS_POOL';
export type EWebhookDeliveryStatus =
  | 'PENDING'
  | 'RETRYING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';
export type EPaymentStandMode = 'OPEN_AMOUNT' | 'FIXED_AMOUNT';
export type ESaaSPlanCode =
  | 'FREE'
  | 'STARTER'
  | 'BUSINESS'
  | 'GROWTH'
  | 'ENTERPRISE';

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  businessName: string;
  businessSlug: string;
  environment: EEnvironment;
  defaultCurrency: string;
  timezone: string;
  planCode: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  environment: EEnvironment;
}

export interface AuthUser {
  userId?: string;
  name: string;
  email: string;
  role: string;
}

// v5: response uses "token" not "smartInvoicingToken"
export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    smartInvoicingToken: string; // ← was "token"
    token?: string;
    apiKey?: string;
    tenantId: string;
    businessId?: string;
    workspaceId: string;
    environment: EEnvironment;
    businessSlug?: string;
    businessName?: string;
    user?: AuthUser;
  };
}

export interface AuthState {
  token: string;
  apiKey: string;
  user: AuthUser;
  tenantId: string;
  businessId: string;
  workspaceId: string;
  environment: EEnvironment;
  businessName: string;
}

// ─── Workspace ───────────────────────────────────────────────────────────────
export interface SetupStep {
  key: string;
  title: string;
  action?: { label: string; route: string };
}

export interface WorkspaceSetup {
  status: 'COMPLETE' | 'INCOMPLETE';
  environment: EEnvironment;
  progress: number;
  canCreateInvoice: boolean;
  canGoLive: boolean;
  nextStep?: SetupStep;
  missingRequired: SetupStep[];
}

export interface WorkspaceConfig {
  workspace: {
    name: string;
    environment: EEnvironment;
    defaultCurrency: string;
  };
  payment: {
    enabledInvoiceCurrencies: string[];
    enabledPaymentAssets: string[];
    hasWalletProfile: boolean;
    hasDefaultWallet: boolean;
  };
  readiness: { canCreateInvoice: boolean };
}

// ─── Wallet Profiles ─────────────────────────────────────────────────────────
export interface WalletProfile {
  _id?: string;
  walletProfileId?: string;
  asset: string;
  network: string;
  address: string;
  custodyMode: string;
  walletMode: EWalletMode;
  isDefault: boolean;
  isActive?: boolean;
  ownershipConfirmed?: boolean;
  label?: string;
}

export interface CreateWalletPayload {
  asset: string;
  network: string;
  address: string;
  label: string;
  isDefault: boolean;
  ownershipProofType: string;
}

// ─── Trade Pairs / Rates ─────────────────────────────────────────────────────
export interface TradePair {
  _id?: string;
  baseAsset: string;
  quoteCurrency: string;
  symbol: string;
  allowedNetworks: string[];
  markupPercent: number;
  spreadPercent: number;
  rateSource: string;
  pricingMode: string;
  status: string;
  minInvoiceAmount?: number;
  maxInvoiceAmount?: number | null;
  rateTtlSeconds?: number;
}

export interface CreateTradePairPayload {
  baseAsset: string;
  quoteCurrency: string;
  allowedNetworks: string[];
  markupPercent: number;
  spreadPercent: number;
  rateSource: string;
  pricingMode: string;
  minInvoiceAmount: number;
  maxInvoiceAmount: number | null;
  rateTtlSeconds: number;
}

export interface RateQuote {
  amount: number;
  invoiceCurrency: string;
  paymentAsset: string;
  expectedCryptoAmount: number;
  rate: number;
  expiresAt: string;
  // legacy compat
  symbol?: string;
  asset?: string;
  profileCurrency?: string;
  cryptoUnits?: number;
  rateSnapshot?: {
    merchantTradePairId: string;
    merchantTradeRateId: string;
    source: string;
    provider: string;
  };
}

// ─── Amount Fingerprint ──────────────────────────────────────────────────────
export interface AmountFingerprint {
  enabled: boolean;
  fingerprint: number;
  finalExpectedAmount: number;
  decimals: number;
}

// ─── Invoices ────────────────────────────────────────────────────────────────
export interface InvoicePayer {
  name?: string;
  email?: string;
  phone?: string;
}

export interface Invoice {
  _id?: string;
  invoiceId?: string;
  invoiceNumber: string;
  referenceCode: string;
  amount: number;
  currency: string;
  asset?: string;
  network?: string;
  expectedCryptoAmount?: number;
  expectedCryptoAsset?: string;
  expectedCryptoNetwork?: string;
  rate?: number;
  rateSource?: string;
  status: EInvoiceStatus;
  description?: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
  payer?: InvoicePayer;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentIntent {
  _id?: string;
  paymentIntentId?: string;
  referenceCode?: string;
  receivingAddress: string;
  status?: string;
  expectedCryptoAmount?: number;
  quotedCryptoAmount?: number;
  expectedCryptoAsset?: string;
  expectedCryptoNetwork?: string;
  depositMatchingStrategy?: string;
  amountFingerprint?: AmountFingerprint;
  paymentInstructions?: { exactAmountRequired: boolean; message: string };
  metadata?: { detectionRegistered: boolean; gatewayDepositIntentId: string };
}

export interface CreateInvoicePayload {
  payerName: string;
  payerEmail: string;
  payerPhone?: string;
  amount: number;
  currency: string;
  asset: string;
  network: string;
  description?: string;
  forceRateRefresh: boolean;
}

export interface InvoiceResponse {
  invoice: Invoice;
  paymentIntent: PaymentIntent;
  paymentUrl: string;
}

export interface InvoiceSearchParams {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

// ─── Payment Stands ──────────────────────────────────────────────────────────
export interface PaymentStand {
  _id?: string;
  standId?: string;
  standName: string;
  standCode: string;
  location?: string;
  tableNumber?: string;
  instructions?: string;
  mode: EPaymentStandMode;
  currency: string;
  allowedAssets: string[];
  allowedNetworks: string[];
  defaultAsset: string;
  defaultNetwork: string;
  publicUrl?: string;
  printUrl?: string;
  qrCode?: string;
  isActive?: boolean;
}

export interface CreatePaymentStandPayload {
  standName: string;
  standCode: string;
  location?: string;
  tableNumber?: string;
  instructions?: string;
  mode: EPaymentStandMode;
  currency: string;
  allowedAssets: string[];
  allowedNetworks: string[];
  defaultAsset: string;
  defaultNetwork: string;
}

// ─── Webhooks ────────────────────────────────────────────────────────────────
export interface WebhookEndpoint {
  _id?: string;
  webhookEndpointId?: string;
  name: string;
  url: string;
  eventTypes: string[];
  secret?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface CreateWebhookPayload {
  name: string;
  url: string;
  eventTypes: string[];
}

export interface WebhookDelivery {
  _id?: string;
  deliveryId?: string;
  eventId: string;
  eventType: string;
  status: EWebhookDeliveryStatus;
  attempts: number;
  responseStatus?: number;
  errorMessage?: string;
  nextAttemptAt?: string;
  createdAt?: string;
}

// ─── Billing ─────────────────────────────────────────────────────────────────
export interface BillingPlan {
  code: ESaaSPlanCode;
  name: string;
  monthlyFee: number;
  currency: string;
  features?: string[];
}

export interface BillingSubscription {
  planCode: ESaaSPlanCode;
  planName: string;
  environment: EEnvironment;
  status: string;
  startDate?: string;
  currentPeriodEnd?: string; // ← API uses this, not nextBillingDate
  nextBillingDate?: string;
  currency?: string;
  monthlyFee?: number;
}

export interface BillingUsage {
  detections: number;
  invoicesCreated: number;
  webhooksSent: number;
  period?: string;
}

export interface BillingBill {
  _id?: string;
  billId?: string;
  billNumber: string;
  totalAmount: number;
  currency: string;
  status: string;
  period?: string;
  dueDate?: string;
  createdAt?: string;
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export interface ReportUsageItem {
  _id: string; // event type e.g. "PAYMENT_STAND_CREATED"
  count: number;
  billableTotal: number;
}

export interface ReportSummary {
  invoices: any[];
  payments: any[];
  volume: Record<string, number>;
  detections: number;
  webhooks: { sent: number; failed: number };
  usage: ReportUsageItem[];
}

// ─── Generic API wrappers ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
  total?: number;
}

export interface SetupStepAction {
  label: string;
  route: string;
}

export interface SetupStep {
  key: string;
  title: string;
  description?: string;
  status?: string;
  completed?: boolean;
  blocking?: boolean;
  action?: SetupStepAction;
  // legacy compat
  route?: string;
}

export interface WorkspaceSetup {
  status: 'COMPLETE' | 'INCOMPLETE';
  environment: EEnvironment;
  progress: number;
  completedSteps: number;
  totalSteps: number;
  canCreateInvoice: boolean;
  canGoLive: boolean;
  nextStep?: SetupStep;
  steps: SetupStep[]; // ← full ordered list
  missingRequired: SetupStep[];
  recommended: SetupStep[];
  notices?: {
    testMode?: string | null;
    liveMode?: string | null;
    nonCustodial?: string | null;
  };
  summary?: Record<string, boolean>;
}
