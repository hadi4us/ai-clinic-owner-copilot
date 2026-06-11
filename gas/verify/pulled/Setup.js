/**
 * Creates/updates Phase 1 spreadsheet tabs and headers.
 * Safe to rerun: does not delete existing sheets and only rewrites header rows.
 */
function setupPhase1Warehouse() {
  const spreadsheet = getWarehouseSpreadsheet_();
  getPhase1SheetNames_().forEach(sheetName => {
    const sheet = getOrCreateSheet_(spreadsheet, sheetName);
    setHeader_(sheet, SHEET_SCHEMAS[sheetName]);
  });
  seedPhase1Config_();
  writeAudit_('system', 'system', 'setup_phase1_warehouse', 'spreadsheet_schema', { schemaVersion: APP_CONFIG.schemaVersion });
  return {
    ok: true,
    spreadsheetId: APP_CONFIG.spreadsheetId,
    schemaVersion: APP_CONFIG.schemaVersion,
    sheetsCreatedOrUpdated: getPhase1SheetNames_().length,
  };
}

function seedPhase1Config_() {
  const spreadsheet = getWarehouseSpreadsheet_();
  const now = new Date();

  const tenantSheet = spreadsheet.getSheetByName('cfg_tenant');
  if (tenantSheet.getLastRow() < 2) {
    appendRows_(tenantSheet, [[...PHASE1_FIXTURE.tenant, now, now]]);
  }

  const clinicSheet = spreadsheet.getSheetByName('cfg_clinic');
  if (clinicSheet.getLastRow() < 2) {
    appendRows_(clinicSheet, [PHASE1_FIXTURE.clinic]);
  }

  const integrationSheet = spreadsheet.getSheetByName('cfg_integration_source');
  if (integrationSheet.getLastRow() < 2) {
    appendRows_(integrationSheet, [[APP_CONFIG.defaultTenantId, 'sim_export_main', 'csv', '', 'default_phase1_v1', '', 'active']]);
  }
}

function resetPhase1FixtureData() {
  setupPhase1Warehouse();
  ['stg_visit', 'stg_revenue', 'stg_expense', 'fact_visit', 'fact_revenue', 'fact_cost', 'fact_expense', 'metric_daily_summary', 'metric_monthly_summary', 'metric_finance_breakdown', 'metric_growth_trend', 'metric_profit_change_driver', 'metric_data_quality'].forEach(sheetName => {
    clearDataKeepHeader_(getWarehouseSpreadsheet_().getSheetByName(sheetName));
  });
  seedPhase1FixtureData_();
  return computePhase1Metrics('klinik_001', 'clinic_001', '2026-06');
}
