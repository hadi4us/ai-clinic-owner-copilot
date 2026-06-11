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
