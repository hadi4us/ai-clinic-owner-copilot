function getFinanceSummary(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const rows = getRowsAsObjects_('metric_monthly_summary')
    .filter(r => r.tenant_id === tenantId && r.clinic_id === clinicId && r.period === period);
  return rows[0] || null;
}

function healthCheck() {
  const spreadsheet = getWarehouseSpreadsheet_();
  const missingSheets = getPhase1SheetNames_().filter(name => !spreadsheet.getSheetByName(name));
  return {
    ok: missingSheets.length === 0,
    appName: APP_CONFIG.appName,
    spreadsheetId: APP_CONFIG.spreadsheetId,
    schemaVersion: APP_CONFIG.schemaVersion,
    missingSheets,
  };
}

function doGet() {
  const summary = getFinanceSummary(APP_CONFIG.defaultTenantId, APP_CONFIG.defaultClinicId, '2026-06');
  const html = HtmlService.createHtmlOutput(`<pre>${JSON.stringify({ health: healthCheck(), summary }, null, 2)}</pre>`);
  html.setTitle(APP_CONFIG.appName);
  return html;
}
