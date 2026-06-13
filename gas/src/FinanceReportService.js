function getFinancialReportPayload(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  period = normalizeReportPeriod_(period);
  ensurePhase1WarehouseSheetsNoLock_();
  const revenues = getRowsAsObjects_('PENDAPATAN').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.transaction_date, period) && ['cancel', 'refund'].indexOf(String(r.status || '').toLowerCase()) === -1);
  const expenses = getRowsAsObjects_('BIAYA').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.expense_date, period) && String(r.status || '').toLowerCase() !== 'cancel');
  const prescriptions = getRowsAsObjects_('RESEP').filter(r => inScope_(r, tenantId, clinicId) && isInPeriod_(r.prescription_date, period) && String(r.status || 'active').toLowerCase() !== 'cancelled');
  const taxes = getRowsAsObjects_('PAJAK').filter(r => inScope_(r, tenantId, clinicId) && String(r.tax_period || '').slice(0, 7) === period);
  const totalRevenue = sumByField_(revenues, 'net_amount');
  const receivable = sumByField_(revenues, 'receivable_amount');
  const cashIn = sumByField_(revenues, 'paid_amount') || totalRevenue - receivable;
  const medicineCogs = sumByField_(prescriptions, 'cogs_amount');
  const operatingExpenses = expenses.filter(r => String(r.expense_category || '').toLowerCase().indexOf('hpp') === -1 && String(r.cost_type || '').toLowerCase() !== 'cogs');
  const expenseTotal = sumByField_(operatingExpenses, 'amount');
  const totalCost = expenseTotal + medicineCogs;
  const grossProfit = totalRevenue - medicineCogs;
  const operatingProfit = grossProfit - expenseTotal;
  const taxRows = taxes.length ? taxes : buildEstimatedTaxRows_(tenantId, clinicId, period, totalRevenue, operatingProfit);
  const taxPayable = sumByField_(taxRows, 'tax_payable');
  const taxPaid = sumByField_(taxRows, 'tax_paid');
  const netProfitAfterTax = operatingProfit - taxPayable;
  const cashOut = sumByField_(expenses, 'amount') + taxPaid;
  const cashNet = cashIn - cashOut;
  const taxOutstanding = Math.max(0, taxPayable - taxPaid);
  return {
    tenantId, clinicId, period,
    reportBasis: 'management_report_poc',
    disclaimer: 'Laporan ini untuk monitoring manajemen. Final pajak/akuntansi tetap perlu validasi konsultan pajak/akuntan sesuai status badan usaha, PKP/non-PKP, dan regulasi terbaru.',
    labaRugi: [
      { label: 'Pendapatan Usaha', amount: totalRevenue, note: 'Total pendapatan bersih klinik' },
      { label: 'Harga Pokok / HPP Obat', amount: medicineCogs, note: 'Modal obat dari RESEP' },
      { label: 'Laba Kotor', amount: grossProfit, note: 'Pendapatan - HPP' },
      { label: 'Beban Operasional', amount: expenseTotal, note: 'Gaji, sewa, listrik, operasional, dll' },
      { label: 'Laba Sebelum Pajak', amount: operatingProfit, note: 'Laba kotor - beban operasional' },
      { label: 'Estimasi Pajak Terutang', amount: taxPayable, note: 'Dari input PAJAK atau estimasi POC' },
      { label: 'Laba Setelah Pajak', amount: netProfitAfterTax, note: 'Estimasi laba bersih setelah pajak' },
    ],
    arusKas: [
      { label: 'Kas Masuk dari Pasien/Penjamin', amount: cashIn, note: 'Paid amount dari PENDAPATAN' },
      { label: 'Kas Keluar Operasional', amount: sumByField_(expenses, 'amount'), note: 'Total BIAYA' },
      { label: 'Pajak Dibayar', amount: taxPaid, note: 'Tax paid dari PAJAK' },
      { label: 'Kenaikan/Penurunan Kas Bersih', amount: cashNet, note: 'Kas masuk - kas keluar' },
    ],
    posisiKeuangan: [
      { label: 'Kas Periode Berjalan (net movement)', amount: cashNet, note: 'Bukan saldo bank final; hanya mutasi bersih periode ini' },
      { label: 'Piutang Pasien/Penjamin', amount: receivable, note: 'Receivable amount dari PENDAPATAN' },
      { label: 'Utang Pajak', amount: taxOutstanding, note: 'Pajak terutang - pajak dibayar' },
      { label: 'Ekuitas/Laba Ditahan Estimasi', amount: netProfitAfterTax, note: 'Laba setelah pajak periode ini' },
    ],
    pajak: taxRows.map(normalizeTaxRowForClient_),
    breakdownBiaya: groupRowsForBreakdown_(expenses, 'expense_category', 'amount'),
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
  };
}

function getDefaultFinancialReportPayload(period) {
  const context = resolveRequestContext_({}, {}, 'owner');
  const resolvedPeriod = normalizeReportPeriod_(period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM'));
  return getFinancialReportPayload(context.tenantId, context.clinicId, resolvedPeriod);
}

function normalizeReportPeriod_(period) {
  const normalized = toPeriodString_(period);
  return normalized || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM');
}

function buildEstimatedTaxRows_(tenantId, clinicId, period, totalRevenue, taxableProfit) {
  const safeProfit = Math.max(0, asNumber_(taxableProfit, 0));
  const incomeTaxRate = 0.005;
  return [{
    tenant_id: tenantId,
    clinic_id: clinicId,
    tax_id: 'tax_est_pph_final_' + period,
    import_id: '',
    tax_period: period,
    tax_type: 'PPh Final UMKM Estimasi',
    taxable_revenue: totalRevenue,
    non_taxable_revenue: 0,
    tax_base_amount: totalRevenue,
    tax_rate: incomeTaxRate,
    tax_payable: totalRevenue * incomeTaxRate,
    tax_paid: 0,
    tax_outstanding: totalRevenue * incomeTaxRate,
    document_status: 'estimated',
    risk_flag: 'review_required',
    reconciliation_gap: 0,
    notes: 'Estimasi POC memakai PPh Final UMKM 0,5% omzet. Validasi status pajak klinik sebelum dipakai resmi.',
    created_at: new Date(),
    updated_at: new Date(),
  }];
}

function normalizeTaxRowForClient_(row) {
  return {
    taxPeriod: row.tax_period,
    taxType: row.tax_type,
    taxableRevenue: Number(row.taxable_revenue || 0),
    nonTaxableRevenue: Number(row.non_taxable_revenue || 0),
    taxBaseAmount: Number(row.tax_base_amount || 0),
    taxRate: row.tax_rate === '' || row.tax_rate === undefined ? null : Number(row.tax_rate),
    taxPayable: Number(row.tax_payable || 0),
    taxPaid: Number(row.tax_paid || 0),
    taxOutstanding: Number(row.tax_outstanding || 0),
    documentStatus: row.document_status || 'estimated',
    riskFlag: row.risk_flag || '',
    notes: row.notes || '',
  };
}
