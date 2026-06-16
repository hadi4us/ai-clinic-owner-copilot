function getDashboardPayload(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const summary = getFinanceSummary(tenantId, clinicId, period) || computePocKpis(tenantId, clinicId, period);
  const alerts = getScopedRows_('ALERT_LOG', tenantId, clinicId)
    .filter(r => r.status === 'open' && String(r.kpi_ref || '').indexOf(period) !== -1);
  const daily = getScopedPeriodRows_('KPI_HARIAN', tenantId, clinicId, 'kpi_date', period)
    .sort((a, b) => String(a.kpi_date).localeCompare(String(b.kpi_date)));
  const revenueBreakdown = buildRevenueBreakdown_(tenantId, clinicId, period);
  const costBreakdown = buildCostBreakdown_(tenantId, clinicId, period);
  const dataQualityWarnings = getDashboardDataQualityWarnings_(tenantId, clinicId, period);
  const normalizedSummary = normalizeSummaryForClient_(summary);
  const normalizedAlerts = alerts.map(normalizeAlertForClient_);
  const analysis = buildDashboardAiAnalysis_(normalizedSummary, revenueBreakdown, costBreakdown, dataQualityWarnings, normalizedAlerts);
  const dataQualitySummary = buildDashboardDataQualitySummary_(tenantId, clinicId, period, dataQualityWarnings);
  return {
    appName: APP_CONFIG.appName,
    tenantId,
    clinicId,
    period,
    summary: normalizedSummary,
    revenueBreakdown,
    costBreakdown,
    alerts: normalizedAlerts,
    aiAnalysis: analysis,
    dataQualityWarnings: dataQualityWarnings.map(normalizeValidationIssueForClient_),
    dataQualitySummary,
    trend: daily.map(normalizeDailyTrendForClient_),
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
  };
}

function buildDashboardAiAnalysis_(summary, revenueBreakdown, costBreakdown, dataQualityWarnings, alerts) {
  const insights = [];
  const actions = [];
  const generatedAlerts = [];
  const margin = summary && summary.profitMargin !== null && summary.profitMargin !== undefined ? Number(summary.profitMargin) : null;
  const revenue = summary ? Number(summary.totalRevenue || 0) : 0;
  const cost = summary ? Number(summary.totalCost || 0) : 0;
  const profit = summary ? Number(summary.netProfit || 0) : 0;
  const revenueGrowth = summary && summary.revenueGrowth !== null && summary.revenueGrowth !== undefined ? Number(summary.revenueGrowth) : null;
  const profitGrowth = summary && summary.profitGrowth !== null && summary.profitGrowth !== undefined ? Number(summary.profitGrowth) : null;
  const topRevenue = (revenueBreakdown || [])[0];
  const topCost = (costBreakdown || [])[0];

  if (!revenue) {
    insights.push('Belum ada pendapatan untuk periode ini, jadi dashboard belum bisa memberi analisa bisnis yang solid.');
    actions.push('Upload data PENDAPATAN dan BIAYA, atau input manual minimal transaksi harian utama.');
    generatedAlerts.push({ type: 'missing_revenue', severity: 'medium', title: 'Data pendapatan belum tersedia', message: 'Dashboard belum menerima data pendapatan periode ini. KPI profit dan margin belum representatif.', kpiRef: 'revenue' });
  } else {
    insights.push('Revenue periode ini sudah terbaca. Fokus berikutnya adalah menjaga margin dan komposisi biaya agar profit tidak tergerus.');
  }

  if (margin !== null) {
    if (margin < 0) {
      insights.push('Margin profit negatif: biaya lebih besar daripada pendapatan pada periode ini.');
      actions.push('Cek biaya terbesar, diskon, piutang belum tertagih, dan transaksi pendapatan yang mungkin belum masuk.');
      generatedAlerts.push({ type: 'negative_margin', severity: 'critical', title: 'Margin profit negatif', message: 'Biaya periode ini lebih besar dari pendapatan. Perlu cek biaya utama dan kelengkapan pendapatan.', kpiRef: 'profit_margin' });
    } else if (margin < 0.15) {
      insights.push('Margin profit masih tipis. Klinik menghasilkan laba, tetapi ruang aman operasional belum besar.');
      actions.push('Review harga layanan, HPP obat/BMHP, dan beban operasional berulang.');
      generatedAlerts.push({ type: 'thin_margin', severity: 'high', title: 'Margin profit tipis', message: 'Net margin di bawah 15%. Owner sebaiknya review komponen biaya dan pricing layanan.', kpiRef: 'profit_margin' });
    } else if (margin >= 0.3) {
      insights.push('Margin profit terlihat sehat untuk pembacaan manajemen awal. Tetap validasi dengan data biaya lengkap.');
      actions.push('Pertahankan layanan dengan kontribusi revenue tinggi dan pastikan biaya tetap tercatat lengkap.');
    }
  }

  if (revenueGrowth !== null && revenueGrowth < -0.1) {
    insights.push('Revenue turun lebih dari 10% dibanding periode sebelumnya.');
    actions.push('Bandingkan jumlah kunjungan, layanan terlaris, dan kanal pembayaran/penjamin yang menurun.');
    generatedAlerts.push({ type: 'revenue_drop', severity: 'high', title: 'Revenue menurun', message: 'Revenue turun lebih dari 10% dibanding periode sebelumnya.', kpiRef: 'revenue_growth' });
  }
  if (profitGrowth !== null && profitGrowth < -0.1) {
    insights.push('Profit turun lebih dari 10%. Jika revenue stabil, kemungkinan tekanan datang dari biaya atau diskon.');
    actions.push('Cek komposisi biaya terbesar dan bandingkan dengan bulan sebelumnya.');
  }
  if (topRevenue && topRevenue.category) insights.push('Kontributor pendapatan terbesar saat ini: ' + topRevenue.category + '.');
  if (topCost && topCost.category) {
    insights.push('Pos biaya terbesar saat ini: ' + topCost.category + '.');
    if (revenue && Number(topCost.amount || 0) / revenue > 0.35) {
      actions.push('Pos biaya ' + topCost.category + ' cukup dominan terhadap omzet; cek apakah wajar secara operasional.');
      generatedAlerts.push({ type: 'dominant_cost', severity: 'medium', title: 'Biaya dominan perlu dicek', message: 'Pos biaya ' + topCost.category + ' mengambil porsi besar dari omzet periode ini.', kpiRef: 'cost_breakdown' });
    }
  }
  if ((dataQualityWarnings || []).length) {
    insights.push('Ada ' + dataQualityWarnings.length + ' isu kualitas data yang bisa memengaruhi akurasi KPI.');
    actions.push('Buka Data Quality dan koreksi baris yang warning sebelum mengambil keputusan final.');
    generatedAlerts.push({ type: 'data_quality', severity: 'medium', title: 'Data perlu dibersihkan', message: 'Ada warning kualitas data yang dapat memengaruhi KPI dan laporan.', kpiRef: 'data_quality' });
  }

  if (!actions.length) actions.push('Pantau trend harian dan lanjutkan input/upload data secara rutin agar analisa makin akurat.');
  const allAlerts = (alerts || []).concat(generatedAlerts).slice(0, 6);
  return {
    basis: 'rule_based_management_analysis',
    confidence: revenue && (!dataQualityWarnings || !dataQualityWarnings.length) ? 'medium' : 'low',
    summary: insights.slice(0, 4).join(' '),
    insights: insights.slice(0, 6),
    recommendedActions: actions.slice(0, 5),
    generatedAlerts: allAlerts,
    disclaimer: 'Analisa ini berbasis rule KPI dan data yang tersedia. Untuk keputusan pajak/akuntansi final tetap perlu validasi profesional.'
  };
}

function getDashboardPayloadForContext_(context, period) {
  const resolvedPeriod = period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM');
  const cached = getDashboardPayloadFromCache_(context.tenantId, context.clinicId, resolvedPeriod);
  if (cached) return cached;
  const payload = getDashboardPayload(context.tenantId, context.clinicId, resolvedPeriod);
  putDashboardPayloadCache_(context.tenantId, context.clinicId, resolvedPeriod, payload);
  return payload;
}

function getDefaultDashboardPayload(period) {
  const context = resolveRequestContext_({}, {}, 'viewer');
  return getDashboardPayloadForContext_(context, period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM'));
}

function getDashboardPayloadCacheKey_(tenantId, clinicId, period) {
  return ['dashboard_payload_v1', tenantId, clinicId, period || 'latest'].join(':');
}

function getDashboardPayloadFromCache_(tenantId, clinicId, period) {
  try {
    const raw = CacheService.getScriptCache().get(getDashboardPayloadCacheKey_(tenantId, clinicId, period));
    if (!raw) return null;
    const payload = JSON.parse(raw);
    payload.cache = { hit: true, ttlSeconds: APP_CONFIG.dashboardCacheTtlSeconds || 120 };
    return payload;
  } catch (err) {
    return null;
  }
}

function putDashboardPayloadCache_(tenantId, clinicId, period, payload) {
  try {
    const ttl = APP_CONFIG.dashboardCacheTtlSeconds || 120;
    const clone = JSON.parse(JSON.stringify(payload));
    clone.cache = { hit: false, ttlSeconds: ttl };
    CacheService.getScriptCache().put(getDashboardPayloadCacheKey_(tenantId, clinicId, period), JSON.stringify(clone), ttl);
  } catch (err) {
    // Cache is best-effort. Dashboard must still work if payload is too large or CacheService is unavailable.
  }
}

function invalidateDashboardCache_(tenantId, clinicId, period) {
  try {
    const cache = CacheService.getScriptCache();
    const keys = [];
    if (period) keys.push(getDashboardPayloadCacheKey_(tenantId, clinicId, period));
    keys.push(getDashboardPayloadCacheKey_(tenantId, clinicId, Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
    keys.push(getDashboardPayloadCacheKey_(tenantId, clinicId, getLatestAvailablePeriodForScope_(tenantId, clinicId) || 'latest'));
    cache.removeAll(Array.from(new Set(keys)));
  } catch (err) {
    // Best-effort cache invalidation.
  }
  if (typeof invalidateGrowthAssistantCache_ === 'function') invalidateGrowthAssistantCache_(tenantId, clinicId, period);
  if (typeof invalidateFinancialReportCache_ === 'function') invalidateFinancialReportCache_(tenantId, clinicId, period);
  if (typeof invalidateManualOptionsCache_ === 'function') invalidateManualOptionsCache_(tenantId, clinicId);
  if (typeof invalidateTransactionListCache_ === 'function') invalidateTransactionListCache_(tenantId, clinicId, period);
}

function getLatestAvailablePeriod_() {
  return getLatestAvailablePeriodForScope_(APP_CONFIG.defaultTenantId, APP_CONFIG.defaultClinicId);
}

function getLatestAvailablePeriodForContext_(context) {
  return getLatestAvailablePeriodForScope_(context.tenantId, context.clinicId);
}

function getLatestAvailablePeriodForScope_(tenantId, clinicId) {
  const rows = getScopedRows_('KPI_BULANAN', tenantId, clinicId);
  if (rows.length) return rows.map(r => toPeriodString_(r.period)).filter(Boolean).sort().pop();
  const rev = getScopedRows_('PENDAPATAN', tenantId, clinicId);
  if (rev.length) return rev.map(r => toPeriodString_(r.transaction_date)).sort().pop();
  return '';
}

function normalizeSummaryForClient_(row) {
  if (!row) return null;
  return {
    tenantId: row.tenant_id || row.tenantId,
    clinicId: row.clinic_id || row.clinicId,
    period: toPeriodString_(row.period),
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


function buildDashboardDataQualitySummary_(tenantId, clinicId, period, validationWarnings) {
  const expenses = getScopedPeriodRows_('BIAYA', tenantId, clinicId, 'expense_date', period);
  const revenues = getScopedPeriodRows_('PENDAPATAN', tenantId, clinicId, 'transaction_date', period);
  const coaPending = getScopedPeriodRows_('AI_COA_SUGGESTION', tenantId, clinicId, 'transaction_date', period).filter(r => String(r.review_status || '') === 'pending_review');
  const missingExpenseCoa = expenses.filter(r => !r.account_id).length;
  const missingExpenseCategory = expenses.filter(r => !r.expense_category).length;
  const missingRevenueCategory = revenues.filter(r => !r.revenue_type).length;
  const validationCount = (validationWarnings || []).length;
  const issues = [];
  if (coaPending.length) issues.push({ severity: 'medium', label: 'COA perlu review', count: coaPending.length, message: 'Ada rekomendasi AI COA yang belum di-approve owner.' });
  if (missingExpenseCoa) issues.push({ severity: 'high', label: 'Biaya tanpa COA', count: missingExpenseCoa, message: 'Biaya belum punya akun COA sehingga laporan akuntansi belum final.' });
  if (missingExpenseCategory) issues.push({ severity: 'medium', label: 'Biaya tanpa kategori', count: missingExpenseCategory, message: 'Kategori biaya kosong mengganggu breakdown biaya.' });
  if (missingRevenueCategory) issues.push({ severity: 'medium', label: 'Pendapatan tanpa kategori', count: missingRevenueCategory, message: 'Kategori pendapatan kosong mengganggu breakdown omzet.' });
  if (validationCount) issues.push({ severity: 'high', label: 'Validasi import', count: validationCount, message: 'Ada baris import yang gagal/warning dan belum diselesaikan.' });
  return {
    ok: issues.length === 0,
    pendingCoaReview: coaPending.length,
    missingExpenseCoa,
    missingExpenseCategory,
    missingRevenueCategory,
    validationIssues: validationCount,
    issues,
  };
}

function getDashboardDataQualityWarnings_(tenantId, clinicId, period) {
  const importIds = {};
  getScopedPeriodRows_('PENDAPATAN', tenantId, clinicId, 'transaction_date', period)
    .concat(getScopedPeriodRows_('BIAYA', tenantId, clinicId, 'expense_date', period), getScopedPeriodRows_('TINDAKAN', tenantId, clinicId, 'procedure_date', period), getScopedPeriodRows_('RESEP', tenantId, clinicId, 'prescription_date', period))
    .forEach(row => { if (row.import_id) importIds[row.import_id] = true; });
  return getRowsAsObjects_('VALIDATION_LOG')
    .filter(row => row.tenant_id === tenantId && row.clinic_id === clinicId && importIds[row.import_id] && String(row.resolved || 'false').toLowerCase() !== 'true')
    .slice(0, 20);
}

function normalizeValidationIssueForClient_(row) {
  return { severity: row.severity, issueType: row.issue_type, targetSheet: row.target_sheet, rowNumber: row.row_number, columnName: row.column_name, message: row.message };
}

function buildRevenueBreakdown_(tenantId, clinicId, period) {
  const revenues = getScopedPeriodRows_('PENDAPATAN', tenantId, clinicId, 'transaction_date', period);
  return groupRowsForBreakdown_(revenues, 'revenue_type', 'net_amount');
}

function buildCostBreakdown_(tenantId, clinicId, period) {
  const expenses = getScopedPeriodRows_('BIAYA', tenantId, clinicId, 'expense_date', period);
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
