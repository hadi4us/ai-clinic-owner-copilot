function healthCheck() {
  const spreadsheet = getWarehouseSpreadsheet_();
  const missingSheets = getPocSheetNames_().filter(name => !spreadsheet.getSheetByName(name));
  return { ok: missingSheets.length === 0, appName: APP_CONFIG.appName, spreadsheetId: APP_CONFIG.spreadsheetId, schemaVersion: APP_CONFIG.schemaVersion, missingSheets, aiEnabled: false, pocScope: ['upload_excel', 'data_warehouse', 'kpi_engine', 'dashboard_revenue', 'dashboard_profit'] };
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action;
  if (action === 'health') return jsonOutput_(healthCheck());
  if (action === 'setup') return jsonOutput_(setupFinalWarehouseSheets());
  if (action === 'compute') return jsonOutput_(computePocKpis(params.tenantId || APP_CONFIG.defaultTenantId, params.clinicId || APP_CONFIG.defaultClinicId, params.period || getLatestAvailablePeriod_() || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
  if (action === 'dashboardPayload') return jsonOutput_(getDashboardPayload(params.tenantId || APP_CONFIG.defaultTenantId, params.clinicId || APP_CONFIG.defaultClinicId, params.period || getLatestAvailablePeriod_() || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
  if (action === 'resetFixture') return jsonOutput_(resetPocFixtureData());

  const html = HtmlService.createTemplateFromFile('Dashboard').evaluate();
  html.setTitle(APP_CONFIG.appName + ' - POC Dashboard');
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return html;
}

function doPost(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.action === 'upload') {
    const payload = JSON.parse(e.postData.contents || '{}');
    return jsonOutput_(uploadPocFile(payload.base64Data, payload.fileName, payload.mimeType, payload.options || {}));
  }
  return jsonOutput_({ ok: false, error: 'Unknown action' });
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value, null, 2)).setMimeType(ContentService.MimeType.JSON);
}
