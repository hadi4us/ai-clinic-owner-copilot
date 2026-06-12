/**
 * Creates/updates final spreadsheet tabs and headers.
 * Safe to rerun: does not delete existing sheets and only rewrites header rows.
 */
function setupPhase1Warehouse() {
  return setupFinalWarehouseSheets();
}

function seedPocConfig_() {
  const now = new Date();
  const tenantSheet = ensureSheet_('MASTER_TENANT');
  if (tenantSheet.getLastRow() < 2) {
    appendObjects_('MASTER_TENANT', [{ tenant_id: APP_CONFIG.defaultTenantId, tenant_name: 'Klinik Sehat Sentosa', owner_name: 'Owner', timezone: APP_CONFIG.timezone, currency: 'IDR', status: 'active', created_at: now, updated_at: now }]);
  }
  const clinicSheet = ensureSheet_('MASTER_KLINIK');
  if (clinicSheet.getLastRow() < 2) {
    appendObjects_('MASTER_KLINIK', [{ tenant_id: APP_CONFIG.defaultTenantId, clinic_id: APP_CONFIG.defaultClinicId, clinic_name: 'Klinik Sehat Sentosa', clinic_type: 'pratama', city: '', address_summary: '', timezone: APP_CONFIG.timezone, currency: 'IDR', status: 'active', created_at: now, updated_at: now }]);
  }
  seedPilotOwnerAccess_(now);
  const settingsSheet = ensureSheet_('SETTINGS');
  if (settingsSheet.getLastRow() < 2) {
    appendObjects_('SETTINGS', [
      { tenant_id: APP_CONFIG.defaultTenantId, clinic_id: APP_CONFIG.defaultClinicId, setting_key: 'poc_period_default', setting_value: 'auto', setting_type: 'string', category: 'dashboard', is_secret: false, updated_by: 'system', updated_at: now },
      { tenant_id: APP_CONFIG.defaultTenantId, clinic_id: APP_CONFIG.defaultClinicId, setting_key: 'ai_enabled', setting_value: 'false', setting_type: 'boolean', category: 'ai', is_secret: false, updated_by: 'system', updated_at: now },
    ]);
  }
}


function seedPilotOwnerAccess_(now) {
  const ownerEmail = getScriptPropertySafe_('PILOT_OWNER_EMAIL', '');
  if (!ownerEmail) return;
  const sheet = ensureSheet_('USER_ACCESS');
  const existing = getRowsAsObjects_('USER_ACCESS').some(row => String(row.email || '').toLowerCase() === String(ownerEmail).toLowerCase());
  if (existing) return;
  appendObjects_('USER_ACCESS', [{
    tenant_id: APP_CONFIG.defaultTenantId,
    user_id: String(ownerEmail).toLowerCase(),
    user_name: 'Pilot Owner',
    email: String(ownerEmail).toLowerCase(),
    telegram_id: '',
    whatsapp_id: '',
    role: 'owner',
    clinic_scope: APP_CONFIG.defaultClinicId,
    status: 'active',
    last_login_at: '',
    created_at: now,
    updated_at: now,
  }]);
}

function getScriptPropertySafe_(key, fallbackValue) {
  try {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    return value === null || value === undefined || value === '' ? fallbackValue : value;
  } catch (err) {
    return fallbackValue;
  }
}

function resetPocFixtureData() {
  const context = resolveRequestContext_({}, {}, 'owner');
  return resetPocFixtureDataForContext_(context);
}

function resetPocFixtureDataForContext_(context) {
  assertContextScope_(context, context.tenantId, context.clinicId);
  return withTenantClinicLock_('reset_poc_fixture_data', context.tenantId, context.clinicId, function() {
    ensurePhase1WarehouseSheetsNoLock_();
    ['IMPORT_BATCH', 'IMPORT_FILE', 'VALIDATION_LOG', 'RAW_IMPORT', 'KUNJUNGAN', 'TINDAKAN', 'RESEP', 'PENDAPATAN', 'BIAYA', 'KPI_HARIAN', 'KPI_BULANAN', 'ALERT_LOG', 'SYNC_LOG'].forEach(clearSheetDataByName_);
    seedPocFixtureData_();
    const result = computePocKpisNoLock_(context.tenantId, context.clinicId, '2026-06');
    invalidateDashboardCache_(context.tenantId, context.clinicId, '2026-06');
    return result;
  });
}
