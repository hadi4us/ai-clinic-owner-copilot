function buildFactsFromStaging_() {
  const spreadsheet = getWarehouseSpreadsheet_();
  const now = new Date();
  const visitRows = getRowsAsObjects_('stg_visit')
    .filter(r => r.tenant_id === APP_CONFIG.defaultTenantId && r.validation_status !== 'rejected')
    .map((r, i) => [r.tenant_id, r.clinic_id, `visit_${String(i + 1).padStart(3, '0')}`, r.source_visit_id, r.visit_date, normalizeDoctorId_(r.source_doctor_id), normalizePoliId_(r.source_poli_id), r.patient_ref, r.visit_type, r.status, r.sync_id, now]);

  const revenueRows = getRowsAsObjects_('stg_revenue')
    .filter(r => r.tenant_id === APP_CONFIG.defaultTenantId && r.validation_status !== 'rejected')
    .map((r, i) => [r.tenant_id, r.clinic_id, `rev_${String(i + 1).padStart(3, '0')}`, r.source_transaction_id, r.transaction_date, lookupVisitId_(r.source_visit_id), normalizeDoctorId_(r.source_doctor_id), normalizePoliId_(r.source_poli_id), r.payer_type, r.revenue_category, Number(r.amount || 0), r.sync_id, now]);

  const expenseRows = getRowsAsObjects_('stg_expense')
    .filter(r => r.tenant_id === APP_CONFIG.defaultTenantId && r.validation_status !== 'rejected')
    .map((r, i) => [r.tenant_id, r.clinic_id, `exp_${String(i + 1).padStart(3, '0')}`, r.expense_date, r.expense_category, Number(r.amount || 0), r.allocation_target || 'shared', r.sync_id, now]);

  clearDataKeepHeader_(spreadsheet.getSheetByName('fact_visit'));
  clearDataKeepHeader_(spreadsheet.getSheetByName('fact_revenue'));
  clearDataKeepHeader_(spreadsheet.getSheetByName('fact_expense'));
  appendRows_(spreadsheet.getSheetByName('fact_visit'), visitRows);
  appendRows_(spreadsheet.getSheetByName('fact_revenue'), revenueRows);
  appendRows_(spreadsheet.getSheetByName('fact_expense'), expenseRows);
}

function computePhase1Metrics(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const spreadsheet = getWarehouseSpreadsheet_();
  const now = new Date();
  const prefix = `${period}-`;

  const visits = getRowsAsObjects_('fact_visit').filter(r => inScope_(r, tenantId, clinicId) && String(r.visit_date).startsWith(prefix) && r.status === 'completed');
  const revenues = getRowsAsObjects_('fact_revenue').filter(r => inScope_(r, tenantId, clinicId) && String(r.transaction_date).startsWith(prefix));
  const costs = getRowsAsObjects_('fact_cost').filter(r => inScope_(r, tenantId, clinicId) && String(r.cost_date).startsWith(prefix));
  const expenses = getRowsAsObjects_('fact_expense').filter(r => inScope_(r, tenantId, clinicId) && String(r.expense_date).startsWith(prefix));

  const totalVisits = visits.length;
  const totalRevenue = sumAmount_(revenues);
  const directCost = sumAmount_(costs);
  const operatingExpense = sumAmount_(expenses);
  const grossProfit = totalRevenue - directCost;
  const netProfit = grossProfit - operatingExpense;
  const profitMargin = totalRevenue === 0 ? null : netProfit / totalRevenue;
  const dataStatus = determineDataStatus_(totalRevenue, costs.length, expenses.length);

  clearDataKeepHeader_(spreadsheet.getSheetByName('metric_monthly_summary'));
  appendRows_(spreadsheet.getSheetByName('metric_monthly_summary'), [[tenantId, clinicId, period, totalVisits, totalRevenue, directCost, operatingExpense, grossProfit, netProfit, profitMargin, dataStatus, now]]);

  writeFinanceBreakdown_(tenantId, clinicId, period, revenues, costs, expenses, now);
  writeDataQuality_(tenantId, clinicId, period, totalRevenue, costs.length, expenses.length, now);

  return { tenantId, clinicId, period, totalVisits, totalRevenue, directCost, operatingExpense, grossProfit, netProfit, profitMargin, dataStatus };
}

function writeFinanceBreakdown_(tenantId, clinicId, period, revenues, costs, expenses, now) {
  const sheet = getWarehouseSpreadsheet_().getSheetByName('metric_finance_breakdown');
  clearDataKeepHeader_(sheet);
  const rows = [];
  addBreakdownRows_(rows, tenantId, clinicId, period, 'revenue_category', revenues, 'revenue_category', now);
  addBreakdownRows_(rows, tenantId, clinicId, period, 'direct_cost_category', costs, 'cost_category', now);
  addBreakdownRows_(rows, tenantId, clinicId, period, 'expense_category', expenses, 'expense_category', now);
  appendRows_(sheet, rows);
}

function writeDataQuality_(tenantId, clinicId, period, totalRevenue, costCount, expenseCount, now) {
  const sheet = getWarehouseSpreadsheet_().getSheetByName('metric_data_quality');
  clearDataKeepHeader_(sheet);
  const rows = [];
  if (totalRevenue === 0) rows.push([tenantId, clinicId, period, 'missing_revenue', 'critical', 'open', 'fact_revenue', 0, 'Revenue tidak ditemukan untuk periode ini.', now]);
  if (costCount === 0) rows.push([tenantId, clinicId, period, 'missing_direct_cost', 'high', 'open', 'fact_cost', 0, 'Biaya langsung belum tersedia. Net profit belum final.', now]);
  if (expenseCount === 0) rows.push([tenantId, clinicId, period, 'missing_operating_expense', 'high', 'open', 'fact_expense', 0, 'Biaya operasional belum tersedia. Net profit belum lengkap.', now]);
  appendRows_(sheet, rows);
}
