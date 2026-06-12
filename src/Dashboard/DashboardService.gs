function getDashboardPayload(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const summary = getFinanceSummary(tenantId, clinicId, period) || computePocKpis(tenantId, clinicId, period);
  const alerts = getRowsAsObjects_('ALERT_LOG')
    .filter(r => r.tenant_id === tenantId && r.clinic_id === clinicId && r.status === 'open' && String(r.kpi_ref || '').indexOf(period) !== -1);
  const daily = getRowsAsObjects_('KPI_HARIAN')
    .filter(r => r.tenant_id === tenantId && r.clinic_id === clinicId && toPeriodString_(r.kpi_date) === period)
    .sort((a, b) => String(a.kpi_date).localeCompare(String(b.kpi_date)));
  const revenueBreakdown = buildRevenueBreakdown_(tenantId, clinicId, period);
  const costBreakdown = buildCostBreakdown_(tenantId, clinicId, period);
  return {
    appName: APP_CONFIG.appName,
    tenantId,
    clinicId,
    period,
    summary: normalizeSummaryForClient_(summary),
    revenueBreakdown,
    costBreakdown,
    alerts: alerts.map(normalizeAlertForClient_),
    trend: daily.map(normalizeDailyTrendForClient_),
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
  };
}

function getDashboardPayloadForContext_(context, period) {
  return getDashboardPayload(context.tenantId, context.clinicId, period);
}

function getDefaultDashboardPayload(period) {
  const context = resolveRequestContext_({}, {}, 'owner');
  return getDashboardPayloadForContext_(context, period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM'));
}

function getLatestAvailablePeriod_() {
  return getLatestAvailablePeriodForScope_(APP_CONFIG.defaultTenantId, APP_CONFIG.defaultClinicId);
}

function getLatestAvailablePeriodForContext_(context) {
  return getLatestAvailablePeriodForScope_(context.tenantId, context.clinicId);
}

function getLatestAvailablePeriodForScope_(tenantId, clinicId) {
  const rows = getRowsAsObjects_('KPI_BULANAN').filter(r => r.tenant_id === tenantId && r.clinic_id === clinicId);
  if (rows.length) return rows.map(r => String(r.period)).sort().pop();
  const rev = getRowsAsObjects_('PENDAPATAN').filter(r => r.tenant_id === tenantId && r.clinic_id === clinicId);
  if (rev.length) return rev.map(r => toPeriodString_(r.transaction_date)).sort().pop();
  return '';
}

function normalizeSummaryForClient_(row) {
  if (!row) return null;
  return {
    tenantId: row.tenant_id || row.tenantId,
    clinicId: row.clinic_id || row.clinicId,
    period: row.period,
    totalVisits: Number(row.total_visits || row.totalVisits || 0),
    totalRevenue: Number(row.total_revenue || row.totalRevenue || 0),
    procedureRevenue: Number(row.procedure_revenue || 0),
    medicineRevenue: Number(row.medicine_revenue || 0),
    totalCost: Number(row.total_cost || row.totalCost || 0),
    grossProfit: Number(row.gross_profit || row.grossProfit || 0),
    netProfit: Number(row.net_profit || row.netProfit || 0),
    profitMargin: row.profit_margin === '' || row.profit_margin === null || row.profit_margin === undefined ? null : Number(row.profit_margin),
    revenueGrowth: row.revenue_growth === '' || row.revenue_growth === null || row.revenue_growth === undefined ? null : Number(row.revenue_growth),
    profitGrowth: row.profit_growth === '' || row.profit_growth === null || row.profit_growth === undefined ? null : Number(row.profit_growth),
    dataStatus: row.data_status || row.dataStatus || 'unknown',
    traceStatus: row.trace_status || row.traceStatus || 'unknown',
    financeFinal: isFinalFinanceStatus_(row.data_status || row.dataStatus, row.trace_status || row.traceStatus),
    financeLabel: getFinanceTrustLabel_(row.data_status || row.dataStatus, row.trace_status || row.traceStatus),
  };
}

function buildRevenueBreakdown_(tenantId, clinicId, period) {
  const revenues = getRowsAsObjects_('PENDAPATAN').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.transaction_date, period));
  return groupRowsForBreakdown_(revenues, 'revenue_type', 'net_amount');
}

function buildCostBreakdown_(tenantId, clinicId, period) {
  const expenses = getRowsAsObjects_('BIAYA').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.expense_date, period));
  return groupRowsForBreakdown_(expenses, 'expense_category', 'amount');
}

function groupRowsForBreakdown_(rows, categoryField, amountField) {
  const total = sumByField_(rows, amountField);
  const grouped = (rows || []).reduce((acc, row) => {
    const category = row[categoryField] || 'unknown';
    if (!acc[category]) acc[category] = 0;
    acc[category] += asNumber_(row[amountField], 0);
    return acc;
  }, {});
  return Object.keys(grouped).sort((a, b) => grouped[b] - grouped[a]).map(category => ({ category, amount: grouped[category], pctOfTotal: total ? grouped[category] / total : null }));
}

function normalizeAlertForClient_(row) {
  return { type: row.alert_type, severity: row.severity, title: row.title, message: row.message, kpiRef: row.kpi_ref };
}

function normalizeDailyTrendForClient_(row) {
  return { date: toIsoDateString_(row.kpi_date), totalRevenue: Number(row.total_revenue || 0), netProfit: Number(row.net_profit || 0), totalCost: Number(row.total_cost || 0), totalVisits: Number(row.total_visits || 0) };
}
