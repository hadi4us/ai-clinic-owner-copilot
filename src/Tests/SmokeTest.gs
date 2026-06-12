function smokeTestPhase1() {
  const result = resetPocFixtureData();
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
  const dashboard = getDefaultDashboardPayload('2026-06');
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

function runAllTests() {
  return {
    ok: true,
    smoke: smokeTestPhase1(),
    xss: testDashboardEscapingStatic(),
    mutatingGet: testMutatingGetDisabledStatic(),
    traceGate: testTraceGateIncompleteExpense(),
  };
}
