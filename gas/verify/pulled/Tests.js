function smokeTestPhase1() {
  const result = resetPhase1FixtureData();
  const expected = {
    totalVisits: 5,
    totalRevenue: 1950000,
    directCost: 660000,
    operatingExpense: 1750000,
    grossProfit: 1290000,
    netProfit: -460000,
  };
  Object.keys(expected).forEach(key => {
    if (result[key] !== expected[key]) {
      throw new Error(`Smoke test failed for ${key}: expected ${expected[key]}, got ${result[key]}`);
    }
  });
  return { ok: true, result };
}
