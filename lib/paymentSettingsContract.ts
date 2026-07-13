export const PAYMENT_SETTINGS_CONTRACT_VERSION = "owner-payment-settings.v1";

export type CurrencyCode = "USD" | "EUR" | "CDF";
export type TimezoneCode = "UTC" | "Africa/Kinshasa" | "America/New_York";

export type OrganizationPaymentSettings = {
  companyName: string;
  email: string;
  currency: CurrencyCode;
  timezone: TimezoneCode;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentInstructions: string;
  rentDueDay: number;
  lateFeeAmount: number;
  tenantAccessDefault: boolean;
  notifications: boolean;
  maintenanceAlerts: boolean;
  leaseReminders: boolean;
};

export type TenantPaymentSettings = Pick<
  OrganizationPaymentSettings,
  | "companyName"
  | "email"
  | "currency"
  | "logoUrl"
  | "primaryColor"
  | "supportEmail"
  | "bankName"
  | "bankAccountName"
  | "bankAccountNumber"
  | "paymentInstructions"
  | "rentDueDay"
  | "lateFeeAmount"
>;

export type TenantPaymentMapping = {
  key: keyof TenantPaymentSettings;
  label: string;
  ownerValue: string;
  tenantLocation: string;
};

export const CURRENCY_OPTIONS: Array<{ value: CurrencyCode; label: string }> = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "CDF", label: "CDF - Congolese Franc" },
];

export const TIMEZONE_OPTIONS: Array<{ value: TimezoneCode; label: string }> = [
  { value: "UTC", label: "UTC" },
  { value: "Africa/Kinshasa", label: "Africa/Kinshasa" },
  { value: "America/New_York", label: "America/New York" },
];

export const TENANT_PAYMENT_FIELD_MAP: ReadonlyArray<{
  key: keyof TenantPaymentSettings;
  label: string;
  tenantLocation: string;
}> = [
  {
    key: "bankName",
    label: "Bank / Payment Method",
    tenantLocation: "Tenant portal -> Payment Details",
  },
  {
    key: "bankAccountName",
    label: "Account Name",
    tenantLocation: "Tenant portal -> Payment Details",
  },
  {
    key: "bankAccountNumber",
    label: "Account / Routing / Zelle / CashApp",
    tenantLocation: "Tenant portal -> Payment Details",
  },
  {
    key: "rentDueDay",
    label: "Rent Due Day",
    tenantLocation: "Tenant portal -> Due Date",
  },
  {
    key: "lateFeeAmount",
    label: "Late Fee",
    tenantLocation: "Tenant portal -> Late Fee",
  },
  {
    key: "paymentInstructions",
    label: "Payment Instructions",
    tenantLocation: "Tenant portal -> Payment Instructions",
  },
  {
    key: "supportEmail",
    label: "Support Email",
    tenantLocation: "Tenant portal -> Support",
  },
];

const DEFAULT_ORGANIZATION_PAYMENT_SETTINGS: OrganizationPaymentSettings = {
  companyName: "",
  email: "",
  currency: "USD",
  timezone: "UTC",
  logoUrl: "",
  primaryColor: "#1f3270",
  supportEmail: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  paymentInstructions: "",
  rentDueDay: 1,
  lateFeeAmount: 0,
  tenantAccessDefault: true,
  notifications: true,
  maintenanceAlerts: true,
  leaseReminders: true,
};

export function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidHttpUrl(value: string) {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: isCurrencyCode(currency) ? currency : "USD",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);
  }
}

export function formatRentDueDay(
  day?: number | null,
  style: "short" | "full" = "full"
) {
  const safeDay = normalizeRentDueDay(day);
  const suffix =
    safeDay % 10 === 1 && safeDay !== 11
      ? "st"
      : safeDay % 10 === 2 && safeDay !== 12
      ? "nd"
      : safeDay % 10 === 3 && safeDay !== 13
      ? "rd"
      : "th";

  const formatted = `${safeDay}${suffix} day`;
  return style === "short" ? formatted : `${formatted} of every month`;
}

export function normalizeOrganizationPaymentSettings(
  value: unknown
): OrganizationPaymentSettings {
  const source = isRecord(value) ? value : {};

  return {
    companyName: readString(source.companyName),
    email: readString(source.email),
    currency: readCurrency(source.currency),
    timezone: readTimezone(source.timezone),
    logoUrl: readString(source.logoUrl),
    primaryColor: readString(source.primaryColor) || "#1f3270",
    supportEmail: readString(source.supportEmail),
    bankName: readString(source.bankName),
    bankAccountName: readString(source.bankAccountName),
    bankAccountNumber: readString(source.bankAccountNumber),
    paymentInstructions: readString(source.paymentInstructions),
    rentDueDay: normalizeRentDueDay(source.rentDueDay),
    lateFeeAmount: normalizeMoneyAmount(source.lateFeeAmount),
    tenantAccessDefault: readBoolean(
      source.tenantAccessDefault,
      DEFAULT_ORGANIZATION_PAYMENT_SETTINGS.tenantAccessDefault
    ),
    notifications: readBoolean(
      source.notifications,
      DEFAULT_ORGANIZATION_PAYMENT_SETTINGS.notifications
    ),
    maintenanceAlerts: readBoolean(
      source.maintenanceAlerts,
      DEFAULT_ORGANIZATION_PAYMENT_SETTINGS.maintenanceAlerts
    ),
    leaseReminders: readBoolean(
      source.leaseReminders,
      DEFAULT_ORGANIZATION_PAYMENT_SETTINGS.leaseReminders
    ),
  };
}

export function normalizeTenantPaymentSettings(
  value: unknown
): TenantPaymentSettings {
  const settings = normalizeOrganizationPaymentSettings(value);

  return {
    companyName: settings.companyName,
    email: settings.email,
    currency: settings.currency,
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
    supportEmail: settings.supportEmail,
    bankName: settings.bankName,
    bankAccountName: settings.bankAccountName,
    bankAccountNumber: settings.bankAccountNumber,
    paymentInstructions: settings.paymentInstructions,
    rentDueDay: settings.rentDueDay,
    lateFeeAmount: settings.lateFeeAmount,
  };
}

export function buildOrganizationSettingsPayload(
  settings: OrganizationPaymentSettings
) {
  return {
    companyName: settings.companyName.trim(),
    email: settings.email.trim(),
    currency: settings.currency,
    timezone: settings.timezone,
    logoUrl: settings.logoUrl.trim(),
    primaryColor: settings.primaryColor.trim(),
    supportEmail: settings.supportEmail.trim(),
    bankName: settings.bankName.trim(),
    bankAccountName: settings.bankAccountName.trim(),
    bankAccountNumber: settings.bankAccountNumber.trim(),
    paymentInstructions: settings.paymentInstructions.trim(),
    rentDueDay: settings.rentDueDay,
    lateFeeAmount: settings.lateFeeAmount,
    tenantAccessDefault: settings.tenantAccessDefault,
    notifications: settings.notifications,
    maintenanceAlerts: settings.maintenanceAlerts,
    leaseReminders: settings.leaseReminders,
  };
}

export function validateOrganizationPaymentSettings(
  settings: OrganizationPaymentSettings
) {
  const errors: string[] = [];

  if (!settings.companyName.trim()) {
    errors.push("Company name is required.");
  }

  if (!settings.email.trim()) {
    errors.push("Company email is required.");
  }

  if (!isValidEmail(settings.email)) {
    errors.push("Company email must be valid.");
  }

  if (!isValidEmail(settings.supportEmail)) {
    errors.push("Support email must be valid when provided.");
  }

  if (!isValidHttpUrl(settings.logoUrl)) {
    errors.push("Logo URL must start with http:// or https://.");
  }

  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(settings.primaryColor)) {
    errors.push("Primary brand color must be a valid hex color.");
  }

  if (!isCurrencyCode(settings.currency)) {
    errors.push("Currency is not supported.");
  }

  if (!isTimezoneCode(settings.timezone)) {
    errors.push("Timezone is not supported.");
  }

  if (
    !Number.isInteger(settings.rentDueDay) ||
    settings.rentDueDay < 1 ||
    settings.rentDueDay > 31
  ) {
    errors.push("Rent due day must be between 1 and 31.");
  }

  if (!Number.isFinite(settings.lateFeeAmount) || settings.lateFeeAmount < 0) {
    errors.push("Late fee amount cannot be negative.");
  }

  return errors;
}

export function getTenantPaymentMapping(
  settings: TenantPaymentSettings
): TenantPaymentMapping[] {
  return TENANT_PAYMENT_FIELD_MAP.map((field) => ({
    key: field.key,
    label: field.label,
    tenantLocation: field.tenantLocation,
    ownerValue: formatTenantPaymentFieldValue(field.key, settings),
  }));
}

export function formatTenantPaymentFieldValue(
  key: keyof TenantPaymentSettings,
  settings: TenantPaymentSettings
) {
  if (key === "rentDueDay") {
    return formatRentDueDay(settings.rentDueDay, "full");
  }

  if (key === "lateFeeAmount") {
    return formatMoney(settings.lateFeeAmount, settings.currency);
  }

  if (key === "supportEmail") {
    return settings.supportEmail || settings.email || "Not configured";
  }

  const value = settings[key];
  return typeof value === "string" && value.trim() ? value : "Not configured";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function readBoolean(value: unknown, fallback: boolean) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function readCurrency(value: unknown): CurrencyCode {
  const candidate = readString(value).toUpperCase();
  return isCurrencyCode(candidate) ? candidate : "USD";
}

function readTimezone(value: unknown): TimezoneCode {
  const candidate = readString(value);
  return isTimezoneCode(candidate) ? candidate : "UTC";
}

function normalizeRentDueDay(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), 31);
}

function normalizeMoneyAmount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCY_OPTIONS.some((option) => option.value === value);
}

function isTimezoneCode(value: string): value is TimezoneCode {
  return TIMEZONE_OPTIONS.some((option) => option.value === value);
}
