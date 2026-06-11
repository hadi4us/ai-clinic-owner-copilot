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
  const settingsSheet = ensureSheet_('SETTINGS');
  if (settingsSheet.getLastRow() < 2) {
    appendObjects_('SETTINGS', [
      { tenant_id: APP_CONFIG.defaultTenantId, clinic_id: APP_CONFIG.defaultClinicId, setting_key: 'poc_period_default', setting_value: 'auto', setting_type: 'string', category: 'dashboard', is_secret: false, updated_by: 'system', updated_at: now },
      { tenant_id: APP_CONFIG.defaultTenantId, clinic_id: APP_CONFIG.defaultClinicId, setting_key: 'ai_enabled', setting_value: 'false', setting_type: 'boolean', category: 'ai', is_secret: false, updated_by: 'system', updated_at: now },
    ]);
  }
}

function resetPocFixtureData() {
  setupFinalWarehouseSheets();
  ['IMPORT_BATCH', 'IMPORT_FILE', 'VALIDATION_LOG', 'RAW_IMPORT', 'KUNJUNGAN', 'TINDAKAN', 'RESEP', 'PENDAPATAN', 'BIAYA', 'KPI_HARIAN', 'KPI_BULANAN', 'ALERT_LOG', 'SYNC_LOG'].forEach(clearSheetDataByName_);
  seedPocFixtureData_();
  return computePocKpis(APP_CONFIG.defaultTenantId, APP_CONFIG.defaultClinicId, '2026-06');
}
