/**
 * Config.gs
 *
 * Foundation configuration for AI Clinic CFO Copilot on Google Apps Script V8.
 * Keep secrets out of this file. Use Script Properties for deploy-time values.
 */
const APP_CONFIG = {
  app: Object.freeze({
    name: 'AI Clinic Owner Copilot',
    productName: 'AI Clinic CFO Copilot',
    environment: 'mvp',
    version: 'mvp_v1_foundation',
    schemaVersion: 'phase1_v1',
  }),

  runtime: Object.freeze({
    timezone: 'Asia/Jakarta',
    locale: 'id-ID',
    currency: 'IDR',
    dateFormat: 'yyyy-MM-dd',
    monthFormat: 'yyyy-MM',
    lockWaitMs: 30000,
    maxUploadBytes: 5 * 1024 * 1024,
    maxImportRows: 5000,
    maxImportSheets: 8,
    dashboardCacheTtlSeconds: 120,
  }),

  storage: Object.freeze({
    spreadsheetId: '',
    cacheTtlSeconds: 300,
  }),

  tenancy: Object.freeze({
    defaultTenantId: 'klinik_001',
    defaultClinicId: 'clinic_001',
    requireTenantScope: true,
    allowCrossTenantQuery: false,
  }),

  security: Object.freeze({
    allowedRoles: Object.freeze(['owner', 'manager', 'staff']),
    privilegedRoles: Object.freeze(['owner', 'manager']),
    ownerRoles: Object.freeze(['owner']),
    patientDataPolicy: 'aggregate_only',
    rawSheetAccessPolicy: 'service_only',
  }),

  finance: Object.freeze({
    requireAccountingTraceability: true,
    allowedDataStatuses: Object.freeze(['complete', 'estimated', 'incomplete']),
    allowedTraceStatuses: Object.freeze(['traceable', 'partially_traceable', 'not_traceable', 'not_applicable']),
    finalFinanceRequiresDataStatus: 'complete',
    finalFinanceRequiresTraceStatus: 'traceable',
  }),

  logging: Object.freeze({
    level: 'INFO',
    redactKeys: Object.freeze(['patient_name', 'patient_phone', 'diagnosis', 'medical_record', 'clinical_note', 'token', 'secret', 'password']),
  }),
};

/**
 * Backward-compatible aliases for older MVP modules.
 * These preserve existing code that reads APP_CONFIG.defaultTenantId, etc.
 */
APP_CONFIG.defaultTenantId = APP_CONFIG.tenancy.defaultTenantId;
APP_CONFIG.defaultClinicId = APP_CONFIG.tenancy.defaultClinicId;
APP_CONFIG.spreadsheetId = APP_CONFIG.storage.spreadsheetId;
APP_CONFIG.schemaVersion = APP_CONFIG.app.schemaVersion;
APP_CONFIG.appName = APP_CONFIG.app.name;
APP_CONFIG.timezone = APP_CONFIG.runtime.timezone;
APP_CONFIG.lockWaitMs = APP_CONFIG.runtime.lockWaitMs;
APP_CONFIG.maxUploadBytes = APP_CONFIG.runtime.maxUploadBytes;
APP_CONFIG.maxImportRows = APP_CONFIG.runtime.maxImportRows;
APP_CONFIG.maxImportSheets = APP_CONFIG.runtime.maxImportSheets;
APP_CONFIG.dashboardCacheTtlSeconds = APP_CONFIG.runtime.dashboardCacheTtlSeconds;
Object.freeze(APP_CONFIG);

const PHASE1_FIXTURE = Object.freeze({
  tenant: ['klinik_001', 'Klinik Sehat Sentosa', 'active', 'Asia/Jakarta', 'IDR'],
  clinic: ['klinik_001', 'clinic_001', 'Klinik Sehat Sentosa', 'pratama', 'active'],
});

function getAppConfig() {
  return APP_CONFIG;
}

function getScriptProperty_(key, fallbackValue) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return value === null || value === undefined || value === '' ? fallbackValue : value;
}

function getConfiguredSpreadsheetId_() {
  return getScriptProperty_('WAREHOUSE_SPREADSHEET_ID', APP_CONFIG.storage.spreadsheetId);
}
