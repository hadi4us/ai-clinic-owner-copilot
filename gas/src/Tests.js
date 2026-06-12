function smokeTestPhase1() {
  const testContext = { actorId: 'test-owner@example.test', role: 'owner', tenantId: APP_CONFIG.defaultTenantId, clinicId: APP_CONFIG.defaultClinicId, source: 'test' };
  const result = resetPocFixtureDataForContext_(testContext);
  const expected = {
    totalVisits: 5,
    totalRevenue: 1950000,
    totalCost: 2060000,
    grossProfit: 1950000,
    netProfit: -110000,
    dataStatus: 'complete',
    traceStatus: 'traceable',
  };
  Object.keys(expected).forEach(key => {
    if (result[key] !== expected[key]) throw new Error(`Smoke test failed for ${key}: expected ${expected[key]}, got ${result[key]}`);
  });
  const dashboard = getDashboardPayloadForContext_(testContext, '2026-06');
  if (!dashboard.summary || dashboard.summary.totalRevenue !== 1950000 || dashboard.summary.netProfit !== -110000) {
    throw new Error('Smoke test failed: dashboard summary mismatch.');
  }
  return { ok: true, result, dashboardSummary: dashboard.summary };
}


function testDashboardEscapingStatic() {
  const html = HtmlService.createHtmlOutputFromFile('Dashboard').getContent();
  if (html.indexOf('rows.map(r=>`<div class="row"') !== -1) throw new Error('Dashboard breakdown still uses template innerHTML for dynamic rows.');
  if (html.indexOf('rows.map(a=>`<div class="alert') !== -1) throw new Error('Dashboard alerts still uses template innerHTML for dynamic alerts.');
  if (html.indexOf('textContent=a.message') === -1) throw new Error('Dashboard alert message is not assigned via textContent.');
  return { ok: true };
}

function testMutatingGetDisabledStatic() {
  const response = doGet({ parameter: { action: 'resetFixture' } });
  const payload = JSON.parse(response.getContent());
  if (payload.ok !== false || payload.error !== 'MUTATING_GET_DISABLED') throw new Error('resetFixture GET must be disabled.');
  return { ok: true };
}

function testTraceGateIncompleteExpense() {
  const status = determinePocDataStatus_(1000000, 0, 'traceable');
  if (status !== 'estimated') throw new Error('Revenue without expenses must be estimated, got ' + status);
  return { ok: true };
}

function testTraceGateMissingSourceRow() {
  const status = determineTraceStatusFromFinal_([{ tenant_id: 'klinik_001', clinic_id: 'clinic_001', import_id: 'imp_1', source_row_id: '', trace_status: 'traceable' }], 'revenue');
  if (status !== 'not_traceable') throw new Error('Missing source_row_id must be not_traceable, got ' + status);
  return { ok: true };
}

function testUnknownUserDenied() {
  try {
    requireClinicAccess_({ userId: 'unknown@example.test' }, 'klinik_001', 'clinic_001', 'owner');
  } catch (err) {
    if (String(err.message).indexOf('FORBIDDEN') !== -1) return { ok: true };
    throw err;
  }
  throw new Error('Unknown user should be denied.');
}

function testCrossTenantDenied() {
  const actor = { userId: 'owner@example.test' };
  const originalGetRows = getRowsAsObjects_;
  getRowsAsObjects_ = function(sheetName) {
    if (sheetName === 'USER_ACCESS') return [{ tenant_id: 'tenant_a', user_id: 'owner@example.test', email: 'owner@example.test', role: 'owner', clinic_scope: 'clinic_a', status: 'active' }];
    return originalGetRows(sheetName);
  };
  try {
    try { requireClinicAccess_(actor, 'tenant_b', 'clinic_a', 'owner'); } catch (err) {
      if (String(err.message).indexOf('FORBIDDEN') !== -1) return { ok: true };
      throw err;
    }
    throw new Error('Cross-tenant request should be denied.');
  } finally {
    getRowsAsObjects_ = originalGetRows;
  }
}


function testCriticalValidationBlocksFinalKpi() {
  const status = determinePocDataStatus_(1000000, 1, 'traceable', 1);
  if (status !== 'incomplete') throw new Error('Critical validation issue must mark KPI incomplete, got ' + status);
  return { ok: true };
}

function testImportValidationRejectsInvalidAmount() {
  const row = { tenant_id: 'klinik_001', clinic_id: 'clinic_001', revenue_id: 'rev_1', transaction_id: 'trx_1', transaction_date: '2026-06-01', net_amount: 0 };
  const validation = validateFinalRow_('PENDAPATAN', row, 2);
  if (validation.ok) throw new Error('Zero revenue amount should be invalid.');
  if (!validation.errors.some(err => err.issueType === 'invalid_amount')) throw new Error('Expected invalid_amount validation error.');
  return { ok: true };
}

function testSupportedUploadTypeGuard() {
  if (!isSupportedUploadType_('report.csv', 'text/csv')) throw new Error('CSV should be supported.');
  if (isSupportedUploadType_('malware.exe', 'application/octet-stream')) throw new Error('Unsupported executable should be rejected.');
  return { ok: true };
}

function testSensitiveRowsDetectedBeforeRawStorage() {
  if (!rowHasSensitiveKeys_({ nama_pasien: 'Budi', amount: 100000 })) throw new Error('Sensitive patient key should be detected.');
  return { ok: true };
}


function testDashboardCacheStatic() {
  const source = getFunctionSourceText_('getDashboardPayloadForContext_') + getFunctionSourceText_('invalidateDashboardCache_');
  if (source.indexOf('CacheService.getScriptCache') === -1) throw new Error('Dashboard payload cache must use CacheService.');
  if (source.indexOf('cache.removeAll') === -1) throw new Error('Dashboard cache invalidation must remove cached keys.');
  return { ok: true };
}

function getFunctionSourceText_(name) {
  try { return String(eval(name)); } catch (err) { return ''; }
}


function testReadinessCheckStatic() {
  const source = getFunctionSourceText_('readinessCheck');
  if (source.indexOf('mutation_token_configured') === -1) throw new Error('Readiness check must verify mutation token config.');
  if (source.indexOf('owner_access_seeded') === -1) throw new Error('Readiness check must verify owner USER_ACCESS seed.');
  if (source.indexOf('maskId_') === -1) throw new Error('Readiness check must mask spreadsheet id.');
  return { ok: true };
}

function runAllTests() {
  return {
    ok: true,
    smoke: smokeTestPhase1(),
    xss: testDashboardEscapingStatic(),
    mutatingGet: testMutatingGetDisabledStatic(),
    traceGate: testTraceGateIncompleteExpense(),
    traceMissingSource: testTraceGateMissingSourceRow(),
    criticalDqGate: testCriticalValidationBlocksFinalKpi(),
    invalidAmount: testImportValidationRejectsInvalidAmount(),
    uploadTypeGuard: testSupportedUploadTypeGuard(),
    sensitiveRowGuard: testSensitiveRowsDetectedBeforeRawStorage(),
    dashboardCache: testDashboardCacheStatic(),
    readiness: testReadinessCheckStatic(),
    unknownUser: testUnknownUserDenied(),
    crossTenant: testCrossTenantDenied(),
  };
}
