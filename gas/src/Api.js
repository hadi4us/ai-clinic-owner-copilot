function healthCheck() {
  const spreadsheet = getWarehouseSpreadsheet_();
  const missingSheets = getPocSheetNames_().filter(name => !spreadsheet.getSheetByName(name));
  return { ok: missingSheets.length === 0, appName: APP_CONFIG.appName, spreadsheetId: APP_CONFIG.spreadsheetId, schemaVersion: APP_CONFIG.schemaVersion, missingSheets, aiEnabled: false, pocScope: ['upload_excel', 'data_warehouse', 'kpi_engine', 'dashboard_revenue', 'dashboard_profit'] };
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action;
  if (action === 'health') return jsonOutput_(healthCheck());
  if (action === 'dashboardPayload') return jsonOutput_(getDashboardPayload(resolveTenantId_(params), resolveClinicId_(params), params.period || getLatestAvailablePeriod_() || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
  if (['setup', 'compute', 'resetFixture', 'upload'].indexOf(action) !== -1) {
    return jsonOutput_({ ok: false, error: 'MUTATING_GET_DISABLED', message: 'Action mutasi hanya tersedia via POST dengan token pilot.' });
  }

  const html = HtmlService.createTemplateFromFile('Dashboard').evaluate();
  html.setTitle(APP_CONFIG.appName + ' - POC Dashboard');
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return html;
}

function doPost(e) {
  const params = e && e.parameter ? e.parameter : {};
  const payload = safeJsonParse_(e && e.postData ? e.postData.contents : '{}', {});
  const action = params.action || payload.action;
  if (action === 'upload') {
    assertPilotMutationAllowed_(params, payload);
    return jsonOutput_(uploadPocFile(payload.base64Data, payload.fileName, payload.mimeType, payload.options || {}));
  }
  if (action === 'setup') {
    assertPilotMutationAllowed_(params, payload);
    return jsonOutput_(setupFinalWarehouseSheets());
  }
  if (action === 'compute') {
    assertPilotMutationAllowed_(params, payload);
    return jsonOutput_(computePocKpis(resolveTenantId_(payload), resolveClinicId_(payload), payload.period || params.period || getLatestAvailablePeriod_() || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
  }
  if (action === 'resetFixture') {
    assertPilotMutationAllowed_(params, payload);
    return jsonOutput_(resetPocFixtureData());
  }
  return jsonOutput_({ ok: false, error: 'Unknown action' });
}

function resolveTenantId_(params) {
  return params && params.tenantId ? params.tenantId : APP_CONFIG.defaultTenantId;
}

function resolveClinicId_(params) {
  return params && params.clinicId ? params.clinicId : APP_CONFIG.defaultClinicId;
}

function assertPilotMutationAllowed_(params, payload) {
  const expected = getPilotMutationToken_();
  if (!expected) throw new Error('Pilot mutation token belum dikonfigurasi. Mutating endpoint dinonaktifkan.');
  const provided = (payload && payload.token) || (params && params.token) || '';
  if (provided !== expected) throw new Error('Unauthorized mutation request.');
}

function getPilotMutationToken_() {
  try { return PropertiesService.getScriptProperties().getProperty('PILOT_MUTATION_TOKEN') || ''; } catch (err) { return ''; }
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value, null, 2)).setMimeType(ContentService.MimeType.JSON);
}
