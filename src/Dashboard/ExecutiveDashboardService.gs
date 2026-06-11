/**
 * ExecutiveDashboardService.gs
 *
 * Payload service for Executive Dashboard HTML Service.
 * Reads approved aggregate/business warehouse sheets only.
 */
function getExecutiveDashboardPayload(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  const session = getCurrentSession();
  requireClinicAccess_(session, clinicId);

  const financeSummary = getExecutiveFinanceSummary_(tenantId, clinicId, period);
  const bpjsSummary = getExecutiveBpjsSummary_(tenantId, clinicId, period);
  const inventorySummary = getExecutiveInventoryRisk_(tenantId, clinicId, period);
  const growthTrend = getExecutiveGrowthTrend_(tenantId, clinicId, period, financeSummary);

  return {
    ok: true,
    appName: APP_CONFIG.appName,
    tenantId: tenantId,
    clinicId: clinicId,
    period: period,
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
    dataStatus: combineExecutiveDataStatus_([financeSummary.dataStatus, bpjsSummary.dataStatus, inventorySummary.dataStatus]),
    traceStatus: financeSummary.traceStatus || TRACE_STATUS.NOT_APPLICABLE,
    cards: {
      revenue: financeSummary.totalRevenue,
      profit: financeSummary.netProfit,
      bpjsReceivable: bpjsSummary.outstandingAmount,
      inventoryRisk: inventorySummary.riskScore,
      growth: growthTrend.growthRate,
    },
    finance: financeSummary,
    bpjs: bpjsSummary,
    pharmacy: inventorySummary,
    trend: growthTrend.rows,
    caveat: buildExecutiveDashboardCaveat_(financeSummary, bpjsSummary, inventorySummary),
  };
}

function getDefaultExecutiveDashboardPayload() {
  return getExecutiveDashboardPayload(APP_CONFIG.defaultTenantId, APP_CONFIG.defaultClinicId, '2026-06');
}

function getExecutiveFinanceSummary_(tenantId, clinicId, period) {
  const rows = readExecutiveRowsFromAnySheet_(['metric_monthly_summary', 'KPI_BULANAN'], tenantId, clinicId)
    .filter(function (row) { return String(row.period || '') === String(period || ''); });
  const row = rows[0] || {};
  const totalRevenue = asNumber_(row.total_revenue || row.totalRevenue, 0);
  const directCost = asNumber_(row.direct_cost || row.directCost, 0);
  const operatingExpense = asNumber_(row.operating_expense || row.operatingExpense, 0);
  const grossProfit = row.gross_profit !== undefined ? asNumber_(row.gross_profit, 0) : totalRevenue - directCost;
  const netProfit = row.net_profit !== undefined ? asNumber_(row.net_profit, 0) : grossProfit - operatingExpense;
  return {
    period: period,
    totalVisits: asNumber_(row.total_visits || row.totalVisits, 0),
    totalRevenue: totalRevenue,
    directCost: directCost,
    operatingExpense: operatingExpense,
    grossProfit: grossProfit,
    netProfit: netProfit,
    profitMargin: totalRevenue === 0 ? null : netProfit / totalRevenue,
    dataStatus: row.data_status || row.dataStatus || (rows.length ? DATA_STATUS.ESTIMATED : DATA_STATUS.INCOMPLETE),
    traceStatus: row.trace_status || row.traceStatus || (rows.length ? TRACE_STATUS.PARTIALLY_TRACEABLE : TRACE_STATUS.NOT_APPLICABLE),
  };
}

function getExecutiveBpjsSummary_(tenantId, clinicId, period) {
  const rows = readExecutiveRowsFromAnySheet_(['BPJS_KLAIM', 'bpjs_claim', 'metric_bpjs_summary'], tenantId, clinicId)
    .filter(function (row) {
      const rowPeriod = row.claim_month || row.period || row.visit_period || '';
      return !period || String(rowPeriod).slice(0, 7) === String(period).slice(0, 7);
    });
  const submitted = sumExecutiveFields_(rows, ['submitted_amount', 'submittedAmount', 'claimed_amount']);
  const approved = sumExecutiveFields_(rows, ['approved_amount', 'approvedAmount']);
  const paid = sumExecutiveFields_(rows, ['paid_amount', 'paidAmount']);
  const explicitOutstanding = sumExecutiveFields_(rows, ['outstanding_amount', 'outstandingAmount']);
  const outstanding = explicitOutstanding || Math.max(approved - paid, submitted - paid, 0);
  const rejected = rows.filter(function (row) { return String(row.claim_status || row.status || '').toLowerCase() === 'rejected'; }).length;
  return {
    period: period,
    claimCount: rows.length,
    submittedAmount: submitted,
    approvedAmount: approved,
    paidAmount: paid,
    outstandingAmount: outstanding,
    rejectedCount: rejected,
    dataStatus: rows.length ? DATA_STATUS.ESTIMATED : DATA_STATUS.INCOMPLETE,
    traceStatus: TRACE_STATUS.NOT_APPLICABLE,
  };
}

function getExecutiveInventoryRisk_(tenantId, clinicId, period) {
  const medicineRows = readExecutiveRowsFromAnySheet_(['MASTER_OBAT', 'master_medicine'], tenantId, clinicId);
  const prescriptionRows = readExecutiveRowsFromAnySheet_(['RESEP', 'prescription', 'metric_pharmacy_summary'], tenantId, clinicId)
    .filter(function (row) {
      const rowDate = row.prescription_date || row.date || row.period || '';
      if (!period) return true;
      return String(rowDate).slice(0, 7) === String(period).slice(0, 7);
    });

  const gross = sumExecutiveFields_(prescriptionRows, ['gross_amount', 'grossAmount', 'revenue_amount']);
  const cogs = sumExecutiveFields_(prescriptionRows, ['cogs_amount', 'cogsAmount', 'cost_amount']);
  const margin = gross === 0 ? null : (gross - cogs) / gross;
  const noMovementCount = countNoMovementMedicines_(medicineRows, prescriptionRows);
  const highCogsRisk = margin !== null && margin < 0.2 ? 35 : 0;
  const noMovementRisk = medicineRows.length === 0 ? 0 : Math.min(40, Math.round((noMovementCount / medicineRows.length) * 40));
  const lowDataRisk = prescriptionRows.length === 0 ? 25 : 0;
  const riskScore = Math.min(100, highCogsRisk + noMovementRisk + lowDataRisk);
  return {
    period: period,
    medicineCount: medicineRows.length,
    prescriptionRows: prescriptionRows.length,
    medicineRevenue: gross,
    cogsAmount: cogs,
    medicineMargin: margin,
    noMovementCount: noMovementCount,
    riskScore: riskScore,
    riskLevel: classifyInventoryRisk_(riskScore),
    dataStatus: prescriptionRows.length ? DATA_STATUS.ESTIMATED : DATA_STATUS.INCOMPLETE,
    traceStatus: TRACE_STATUS.NOT_APPLICABLE,
  };
}

function getExecutiveGrowthTrend_(tenantId, clinicId, period, financeSummary) {
  const rows = readExecutiveRowsFromAnySheet_(['metric_growth_trend', 'KPI_BULANAN', 'metric_monthly_summary'], tenantId, clinicId)
    .map(function (row) {
      return {
        period: row.period || row.claim_month || '',
        totalRevenue: asNumber_(row.total_revenue || row.totalRevenue, 0),
        netProfit: asNumber_(row.net_profit || row.netProfit, 0),
        totalVisits: asNumber_(row.total_visits || row.totalVisits, 0),
      };
    })
    .filter(function (row) { return row.period; })
    .sort(function (a, b) { return String(a.period).localeCompare(String(b.period)); });

  const trendRows = rows.length ? rows : [{
    period: period,
    totalRevenue: financeSummary.totalRevenue,
    netProfit: financeSummary.netProfit,
    totalVisits: financeSummary.totalVisits,
  }];
  const current = trendRows[trendRows.length - 1] || {};
  const previous = trendRows.length > 1 ? trendRows[trendRows.length - 2] : null;
  const growthRate = previous && previous.totalRevenue !== 0 ? (current.totalRevenue - previous.totalRevenue) / previous.totalRevenue : null;
  return { rows: trendRows, growthRate: growthRate };
}

function readExecutiveRowsFromAnySheet_(sheetNames, tenantId, clinicId) {
  const spreadsheet = openWarehouseSpreadsheet_();
  for (var i = 0; i < sheetNames.length; i++) {
    const sheet = spreadsheet.getSheetByName(sheetNames[i]);
    if (sheet) {
      return readSheetAsObjects_(sheet).filter(function (row) {
        return row.tenant_id === tenantId && (!clinicId || !row.clinic_id || row.clinic_id === clinicId);
      });
    }
  }
  return [];
}

function sumExecutiveFields_(rows, fieldNames) {
  return (rows || []).reduce(function (total, row) {
    for (var i = 0; i < fieldNames.length; i++) {
      if (row[fieldNames[i]] !== undefined && row[fieldNames[i]] !== '') return total + asNumber_(row[fieldNames[i]], 0);
    }
    return total;
  }, 0);
}

function countNoMovementMedicines_(medicineRows, prescriptionRows) {
  if (!medicineRows.length) return 0;
  const moved = prescriptionRows.reduce(function (acc, row) {
    const id = row.medicine_id || row.source_medicine_id || '';
    if (id) acc[id] = true;
    return acc;
  }, {});
  return medicineRows.filter(function (row) {
    const id = row.medicine_id || row.source_medicine_id || '';
    return id && !moved[id];
  }).length;
}

function classifyInventoryRisk_(score) {
  if (score >= 70) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function combineExecutiveDataStatus_(statuses) {
  if ((statuses || []).indexOf(DATA_STATUS.INCOMPLETE) !== -1) return DATA_STATUS.INCOMPLETE;
  if ((statuses || []).indexOf(DATA_STATUS.ESTIMATED) !== -1) return DATA_STATUS.ESTIMATED;
  return DATA_STATUS.COMPLETE;
}

function buildExecutiveDashboardCaveat_(financeSummary, bpjsSummary, inventorySummary) {
  const parts = [];
  if (financeSummary.dataStatus !== DATA_STATUS.COMPLETE || financeSummary.traceStatus !== TRACE_STATUS.TRACEABLE) {
    parts.push('Finance belum final jika data_status/trace_status belum complete dan traceable.');
  }
  if (bpjsSummary.dataStatus !== DATA_STATUS.COMPLETE) {
    parts.push('BPJS Receivable bersifat management estimate berdasarkan klaim yang tersedia.');
  }
  if (inventorySummary.dataStatus !== DATA_STATUS.COMPLETE) {
    parts.push('Inventory Risk bersifat indikatif karena belum memakai stok opname/aging lengkap.');
  }
  return parts.join(' ');
}
