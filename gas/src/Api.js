function healthCheck() {
  const spreadsheet = getWarehouseSpreadsheet_();
  const missingSheets = getPocSheetNames_().filter(name => !spreadsheet.getSheetByName(name));
  return { ok: missingSheets.length === 0, appName: APP_CONFIG.appName, tenantId: getActiveTenantId_(), spreadsheetId: getConfiguredSpreadsheetId_(), schemaVersion: APP_CONFIG.schemaVersion, tenantRegistry: getTenantRegistrySummary_(), missingSheets, aiEnabled: false, pocScope: ['upload_excel', 'manual_input', 'data_warehouse', 'kpi_engine', 'dashboard_revenue', 'dashboard_profit', 'financial_reports_id', 'tax_summary_id', 'growth_ai_companion'] };
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action;
  if (action === 'authState') return jsonOutput_(getDefaultAuthState());
  if (action === 'userAccess') return jsonOutput_(getDefaultUserAccessPayload());
  if (action === 'tenantAdmin') return jsonOutput_(getDefaultTenantAdminPayload());
  if (action === 'importJobs') return jsonOutput_(getDefaultImportJobPayload(params.limit || 10));
  if (action === 'health') return jsonOutput_(healthCheck());
  if (action === 'readiness') return jsonOutput_(readinessCheck());
  if (action === 'dashboardPayload') {
    const context = resolveRequestContext_(params, {}, 'viewer');
    return jsonOutput_(getDashboardPayloadForContext_(context, params.period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
  }
  if (action === 'financialReport') {
    const context = resolveRequestContext_(params, {}, 'finance');
    return jsonOutput_(getFinancialReportPayload(context.tenantId, context.clinicId, params.period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
  }
  if (action === 'transactionList') {
    const context = resolveRequestContext_(params, {}, 'finance');
    return jsonOutput_(getTransactionListPayloadForContext_(context, params.type || 'all', params.period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM'), params.limit || 100));
  }
  if (action === 'growthAssistant') {
    const context = resolveRequestContext_(params, {}, 'viewer');
    return jsonOutput_(getGrowthAssistantPayloadForContext_(context, params.period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
  }
  if (['setup', 'compute', 'resetFixture', 'upload', 'manualInput', 'suggestCoa', 'approveCoaSuggestion', 'updateTransaction', 'deleteTransaction'].indexOf(action) !== -1) {
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
    const context = resolveRequestContext_(params, payload, 'finance');
    return jsonOutput_(uploadPocFileForContext_(context, payload.base64Data, payload.fileName, payload.mimeType, payload.options || {}));
  }
  if (action === 'setup') {
    // Bootstrap exception: setup may need to create initial USER_ACCESS from PILOT_OWNER_EMAIL.
    assertPilotMutationAllowed_(params, payload);
    return jsonOutput_(setupFinalWarehouseSheets());
  }
  if (action === 'compute') {
    assertPilotMutationAllowed_(params, payload);
    const context = resolveRequestContext_(params, payload, 'finance');
    return jsonOutput_(computePocKpis(context.tenantId, context.clinicId, payload.period || params.period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
  }
  if (action === 'manualInput') {
    assertPilotMutationAllowed_(params, payload);
    const context = resolveRequestContext_(params, payload, 'finance');
    return jsonOutput_(saveManualClinicEntryForContext_(context, payload.entry || payload));
  }
  if (action === 'suggestCoa') {
    assertPilotMutationAllowed_(params, payload);
    const context = resolveRequestContext_(params, payload, 'finance');
    return jsonOutput_(suggestCoaForContext_(context, payload.entry || payload));
  }
  if (action === 'approveCoaSuggestion') {
    assertPilotMutationAllowed_(params, payload);
    const context = resolveRequestContext_(params, payload, 'finance');
    return jsonOutput_(approveCoaSuggestionForContext_(context, payload.suggestionId || params.suggestionId, payload.approvedAccountId || params.approvedAccountId));
  }
  if (action === 'updateTransaction') {
    assertPilotMutationAllowed_(params, payload);
    const context = resolveRequestContext_(params, payload, 'finance');
    return jsonOutput_(updateTransactionEntryForContext_(context, payload.transaction || payload));
  }
  if (action === 'deleteTransaction') {
    assertPilotMutationAllowed_(params, payload);
    const context = resolveRequestContext_(params, payload, 'finance');
    return jsonOutput_(deleteTransactionEntryForContext_(context, payload.type || params.type, payload.id || params.id));
  }
  if (action === 'userAccessSave') {
    assertPilotMutationAllowed_(params, payload);
    return jsonOutput_(saveDefaultUserAccessEntry(payload.entry || payload));
  }
  if (action === 'userAccessDeactivate') {
    assertPilotMutationAllowed_(params, payload);
    return jsonOutput_(deactivateDefaultUserAccessEntry(payload.email || params.email));
  }
  if (action === 'repairPilotOwnerAccess') {
    return jsonOutput_(repairPilotOwnerUserAccess());
  }
  if (action === 'provisionTenant') {
    assertPilotMutationAllowed_(params, payload);
    return jsonOutput_(provisionDefaultTenant(payload.tenant || payload));
  }
  if (action === 'resetFixture') {
    assertPilotMutationAllowed_(params, payload);
    const context = resolveRequestContext_(params, payload, 'owner');
    return jsonOutput_(resetPocFixtureDataForContext_(context));
  }
  return jsonOutput_({ ok: false, error: 'Unknown action' });
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
