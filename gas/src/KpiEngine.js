function computePocKpis(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  return withTenantClinicLock_('compute_poc_kpis', tenantId, clinicId, function() {
    return computePocKpisNoLock_(tenantId, clinicId, period);
  });
}

function computePocKpisNoLock_(tenantId, clinicId, period) {
  ensurePhase1WarehouseSheetsNoLock_();
  const now = new Date();
  const visits = getRowsAsObjects_('KUNJUNGAN').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.visit_date, period) && String(r.status || 'completed') !== 'cancelled');
  const revenues = getRowsAsObjects_('PENDAPATAN').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.transaction_date, period) && ['cancel', 'refund'].indexOf(String(r.status || '').toLowerCase()) === -1);
  const procedures = getRowsAsObjects_('TINDAKAN').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.procedure_date, period) && String(r.status || 'active') !== 'cancelled');
  const prescriptions = getRowsAsObjects_('RESEP').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.prescription_date, period) && String(r.status || 'active') !== 'cancelled');
  const expenses = getRowsAsObjects_('BIAYA').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.expense_date, period) && String(r.status || 'paid') !== 'cancel');
  const bpjsClaims = getRowsAsObjects_('BPJS_KLAIM').filter(r => inScope_(r, tenantId, clinicId) && String(r.claim_period || r.service_month || '').slice(0, 7) === period);
  const inventory = getRowsAsObjects_('PERSEDIAAN').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.stock_date, period));
  const taxes = getRowsAsObjects_('PAJAK').filter(r => inScope_(r, tenantId, clinicId) && String(r.tax_period || '').slice(0, 7) === period);

  const totalRevenue = sumByField_(revenues, 'net_amount') || (sumByField_(procedures, 'net_amount') + sumByField_(prescriptions, 'net_amount'));
  const procedureRevenue = sumByField_(procedures, 'net_amount') || sumRevenueByType_(revenues, ['tindakan', 'procedure', 'lab', 'admin']);
  const medicineRevenue = sumByField_(prescriptions, 'net_amount') || sumRevenueByType_(revenues, ['resep', 'farmasi', 'obat', 'medicine']);
  const medicineCogs = sumByField_(prescriptions, 'cogs_amount');
  const totalCost = sumByField_(expenses, 'amount') + medicineCogs;
  const grossProfit = totalRevenue - medicineCogs;
  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue === 0 ? null : netProfit / totalRevenue;
  const revenueTrace = determineTraceStatusFromFinal_(revenues, 'revenue');
  const expenseTrace = determineTraceStatusFromFinal_(expenses, 'expense');
  const traceStatus = combineFinalTraceStatuses_([revenueTrace, expenseTrace]);
  const criticalIssues = getOpenCriticalValidationIssues_(tenantId, clinicId, period, revenues.concat(expenses, procedures, prescriptions));
  const dataStatus = determinePocDataStatus_(totalRevenue, expenses.length, traceStatus, criticalIssues.length);
  const bpjsClaimAmount = sumByField_(bpjsClaims, 'claim_amount');
  const bpjsPaidAmount = sumByField_(bpjsClaims, 'paid_amount');
  const bpjsOutstandingAmount = sumByField_(bpjsClaims, 'outstanding_amount');
  const inventoryValue = sumByField_(inventory, 'stock_value');
  const expiredStockValue = inventory.filter(r => String(r.status || '').toLowerCase() === 'expired').reduce((sum, r) => sum + asNumber_(r.stock_value, 0), 0);
  const taxPayable = sumByField_(taxes, 'tax_payable');
  const pharmacyGrossMargin = medicineRevenue === 0 ? null : (medicineRevenue - medicineCogs) / medicineRevenue;
  const prev = getPreviousMonthlyKpi_(tenantId, clinicId, period);
  const revenueGrowth = prev && asNumber_(prev.total_revenue, 0) ? (totalRevenue - asNumber_(prev.total_revenue, 0)) / asNumber_(prev.total_revenue, 0) : null;
  const profitGrowth = prev && asNumber_(prev.net_profit, 0) ? (netProfit - asNumber_(prev.net_profit, 0)) / Math.abs(asNumber_(prev.net_profit, 0)) : null;

  upsertKpiBulanan_(tenantId, clinicId, period, {
    total_visits: visits.length,
    total_revenue: totalRevenue,
    procedure_revenue: procedureRevenue,
    medicine_revenue: medicineRevenue,
    total_cost: totalCost,
    gross_profit: grossProfit,
    net_profit: netProfit,
    profit_margin: profitMargin,
    revenue_growth: revenueGrowth,
    profit_growth: profitGrowth,
    bpjs_claim_amount: bpjsClaimAmount,
    bpjs_paid_amount: bpjsPaidAmount,
    bpjs_outstanding_amount: bpjsOutstandingAmount,
    pharmacy_gross_margin: pharmacyGrossMargin,
    inventory_value: inventoryValue,
    expired_stock_value: expiredStockValue,
    tax_payable: taxPayable,
    data_status: dataStatus,
    trace_status: traceStatus,
    computed_at: now,
  });
  computePocDailyKpis_(tenantId, clinicId, period, revenues, prescriptions, procedures, expenses, visits, bpjsClaims, inventory, taxes, traceStatus, dataStatus);
  writePocAlerts_(tenantId, clinicId, period, { totalRevenue, totalCost, netProfit, profitMargin, dataStatus, traceStatus, expenseRows: expenses.length, criticalIssues });
  invalidateDashboardCache_(tenantId, clinicId, period);
  return { tenantId, clinicId, period, totalVisits: visits.length, totalRevenue, totalCost, grossProfit, netProfit, profitMargin, dataStatus, traceStatus, dataQualityWarnings: criticalIssues.length };
}

function computePhase1Metrics(tenantId, clinicId, period) {
  return computePocKpis(tenantId, clinicId, period);
}

function upsertKpiBulanan_(tenantId, clinicId, period, metrics) {
  const rows = getRowsAsObjects_('KPI_BULANAN').filter(r => !(r.tenant_id === tenantId && r.clinic_id === clinicId && r.period === period));
  rows.push(Object.assign({ tenant_id: tenantId, clinic_id: clinicId, period }, metrics));
  replaceObjects_('KPI_BULANAN', rows);
}

function computePocDailyKpis_(tenantId, clinicId, period, revenues, prescriptions, procedures, expenses, visits, bpjsClaims, inventory, taxes, traceStatus, dataStatus) {
  const existingRows = getRowsAsObjects_('KPI_HARIAN').filter(r => !(r.tenant_id === tenantId && r.clinic_id === clinicId && toPeriodString_(r.kpi_date) === period));
  const dates = {};
  revenues.forEach(r => dates[toIsoDateString_(r.transaction_date)] = true);
  expenses.forEach(r => dates[toIsoDateString_(r.expense_date)] = true);
  visits.forEach(r => dates[toIsoDateString_(r.visit_date)] = true);
  const dailyRows = Object.keys(dates).sort().map(date => {
    const dayRevenues = revenues.filter(r => toIsoDateString_(r.transaction_date) === date);
    const dayProcedures = procedures.filter(r => toIsoDateString_(r.procedure_date) === date);
    const dayPrescriptions = prescriptions.filter(r => toIsoDateString_(r.prescription_date) === date);
    const dayExpenses = expenses.filter(r => toIsoDateString_(r.expense_date) === date);
    const totalRevenue = sumByField_(dayRevenues, 'net_amount') || (sumByField_(dayProcedures, 'net_amount') + sumByField_(dayPrescriptions, 'net_amount'));
    const procedureRevenue = sumByField_(dayProcedures, 'net_amount') || sumRevenueByType_(dayRevenues, ['tindakan', 'procedure', 'lab', 'admin']);
    const medicineRevenue = sumByField_(dayPrescriptions, 'net_amount') || sumRevenueByType_(dayRevenues, ['resep', 'farmasi', 'obat', 'medicine']);
    const cogs = sumByField_(dayPrescriptions, 'cogs_amount');
    const totalCost = sumByField_(dayExpenses, 'amount') + cogs;
    const grossProfit = totalRevenue - cogs;
    const netProfit = totalRevenue - totalCost;
    return {
      tenant_id: tenantId,
      clinic_id: clinicId,
      kpi_date: date,
      total_visits: visits.filter(r => toIsoDateString_(r.visit_date) === date).length,
      total_revenue: totalRevenue,
      procedure_revenue: procedureRevenue,
      medicine_revenue: medicineRevenue,
      total_cost: totalCost,
      gross_profit: grossProfit,
      net_profit: netProfit,
      profit_margin: totalRevenue === 0 ? null : netProfit / totalRevenue,
      bpjs_claim_amount: sumByField_(bpjsClaims.filter(r => toIsoDateString_(r.claim_date) === date), 'claim_amount'),
      bpjs_outstanding_amount: sumByField_(bpjsClaims.filter(r => toIsoDateString_(r.claim_date) === date), 'outstanding_amount'),
      inventory_value: sumByField_(inventory.filter(r => toIsoDateString_(r.stock_date) === date), 'stock_value'),
      expired_stock_value: inventory.filter(r => toIsoDateString_(r.stock_date) === date && String(r.status || '').toLowerCase() === 'expired').reduce((sum, r) => sum + asNumber_(r.stock_value, 0), 0),
      tax_payable: sumByField_(taxes.filter(r => toIsoDateString_(r.created_at) === date), 'tax_payable'),
      data_status: dataStatus,
      trace_status: traceStatus,
      computed_at: new Date(),
    };
  });
  replaceObjects_('KPI_HARIAN', existingRows.concat(dailyRows));
}

function getFinanceSummary(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  return getRowsAsObjects_('KPI_BULANAN').find(r => r.tenant_id === tenantId && r.clinic_id === clinicId && r.period === period) || null;
}

function getPreviousMonthlyKpi_(tenantId, clinicId, period) {
  const parts = String(period).split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 2, 1);
  const prevPeriod = Utilities.formatDate(date, APP_CONFIG.timezone, 'yyyy-MM');
  return getRowsAsObjects_('KPI_BULANAN').find(r => r.tenant_id === tenantId && r.clinic_id === clinicId && r.period === prevPeriod) || null;
}

function sumRevenueByType_(revenues, types) {
  const normalizedTypes = types.map(t => String(t).toLowerCase());
  return (revenues || []).filter(r => normalizedTypes.indexOf(String(r.revenue_type || '').toLowerCase()) !== -1).reduce((sum, r) => sum + asNumber_(r.net_amount, 0), 0);
}

function determineTraceStatusFromFinal_(rows, kind) {
  const safeRows = rows || [];
  if (!safeRows.length) return 'not_applicable';
  const traceable = safeRows.filter(row => hasRequiredFinanceTrace_(row) && String(row.trace_status || '').toLowerCase() === 'traceable').length;
  if (traceable === safeRows.length) return 'traceable';
  if (traceable > 0) return 'partially_traceable';
  return 'not_traceable';
}

function hasRequiredFinanceTrace_(row) {
  return !!(row && row.tenant_id && row.clinic_id && row.import_id && row.source_row_id);
}

function combineFinalTraceStatuses_(statuses) {
  const scoped = (statuses || []).filter(s => s && s !== 'not_applicable');
  if (!scoped.length) return 'not_applicable';
  if (scoped.every(s => s === 'traceable')) return 'traceable';
  if (scoped.some(s => s === 'traceable' || s === 'partially_traceable')) return 'partially_traceable';
  return 'not_traceable';
}

function determinePocDataStatus_(totalRevenue, expenseCount, traceStatus, criticalIssueCount) {
  if (criticalIssueCount > 0) return 'incomplete';
  if (totalRevenue === 0) return 'incomplete';
  if (!expenseCount) return 'estimated';
  if (traceStatus === 'traceable') return 'complete';
  if (traceStatus === 'partially_traceable') return 'estimated';
  return 'incomplete';
}

function getOpenCriticalValidationIssues_(tenantId, clinicId, period, sourceRows) {
  const importIds = {};
  (sourceRows || []).forEach(row => { if (row.import_id) importIds[row.import_id] = true; });
  if (!Object.keys(importIds).length) {
    getRowsAsObjects_('IMPORT_BATCH')
      .filter(row => row.tenant_id === tenantId && row.clinic_id === clinicId && String(row.period_start || '').slice(0, 7) === period)
      .forEach(row => { if (row.import_id) importIds[row.import_id] = true; });
  }
  return getRowsAsObjects_('VALIDATION_LOG').filter(row => row.tenant_id === tenantId && row.clinic_id === clinicId && importIds[row.import_id] && String(row.severity || '').toLowerCase() === 'error' && String(row.resolved || 'false').toLowerCase() !== 'true');
}

function isFinalFinanceStatus_(dataStatus, traceStatus) {
  return dataStatus === 'complete' && traceStatus === 'traceable';
}

function getFinanceTrustLabel_(dataStatus, traceStatus) {
  if (isFinalFinanceStatus_(dataStatus, traceStatus)) return 'final';
  if (dataStatus === 'incomplete' || traceStatus === 'not_traceable') return 'incomplete/untraceable';
  return 'estimated';
}

function writePocAlerts_(tenantId, clinicId, period, metrics) {
  const existing = getRowsAsObjects_('ALERT_LOG').filter(r => !(r.tenant_id === tenantId && r.clinic_id === clinicId && String(r.kpi_ref || '').indexOf(period) !== -1));
  const rows = [];
  if (metrics.totalRevenue === 0) rows.push(makeAlert_(tenantId, clinicId, 'finance', 'critical', 'Revenue belum ada', 'Data revenue belum tersedia untuk periode ini.', `total_revenue:${period}`));
  if (metrics.expenseRows === 0) rows.push(makeAlert_(tenantId, clinicId, 'finance', 'warning', 'Biaya belum lengkap', 'Data biaya belum tersedia. Profit ditandai estimated.', `total_cost:${period}`));
  if (metrics.netProfit < 0) rows.push(makeAlert_(tenantId, clinicId, 'finance', 'high', 'Profit negatif', 'Net profit periode ini negatif. Cek revenue dan biaya terbesar.', `net_profit:${period}`));
  if (metrics.criticalIssues && metrics.criticalIssues.length) rows.push(makeAlert_(tenantId, clinicId, 'data_quality', 'critical', 'Data quality blocking', `${metrics.criticalIssues.length} error validasi masih open. Angka finance ditandai incomplete.`, `data_quality:${period}`));
  replaceObjects_('ALERT_LOG', existing.concat(rows));
}

function makeAlert_(tenantId, clinicId, alertType, severity, title, message, kpiRef) {
  return { tenant_id: tenantId, clinic_id: clinicId, alert_id: Utilities.getUuid(), alert_type: alertType, severity, title, message, kpi_ref: kpiRef, source_ref: '', status: 'open', sent_channel: 'dashboard', sent_at: '', resolved_at: '', created_at: new Date() };
}
