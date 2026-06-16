function getFinancialReportPayload(tenantId, clinicId, period) {
  assertTenantScope_(tenantId, clinicId);
  period = normalizeReportPeriod_(period);
  ensurePhase1WarehouseSheetsNoLock_();
  const revenues = getScopedPeriodRows_('PENDAPATAN', tenantId, clinicId, 'transaction_date', period).filter(r => ['cancel', 'refund'].indexOf(String(r.status || '').toLowerCase()) === -1);
  const expenses = getScopedPeriodRows_('BIAYA', tenantId, clinicId, 'expense_date', period).filter(r => String(r.status || '').toLowerCase() !== 'cancel');
  const prescriptions = getScopedPeriodRows_('RESEP', tenantId, clinicId, 'prescription_date', period).filter(r => String(r.status || 'active').toLowerCase() !== 'cancelled');
  const taxes = getScopedPeriodRows_('PAJAK', tenantId, clinicId, ['tax_period', 'created_at'], period);
  const bpjsClaims = getScopedPeriodRows_('BPJS_KLAIM', tenantId, clinicId, ['service_month', 'claim_period', 'claim_date'], period);
  const inventoryRows = getScopedPeriodRows_('PERSEDIAAN', tenantId, clinicId, 'stock_date', period);
  const coaRows = getRowsAsObjects_('MASTER_COA').filter(r => String(r.tenant_id || '') === tenantId && String(r.status || 'active').toLowerCase() !== 'inactive');
  const totalRevenue = sumByField_(revenues, 'net_amount');
  const receivable = sumByField_(revenues, 'receivable_amount');
  const bpjsReceivable = sumByField_(bpjsClaims, 'outstanding_amount');
  const cashIn = sumByField_(revenues, 'paid_amount') || totalRevenue - receivable;
  const medicineCogs = sumByField_(prescriptions, 'cogs_amount');
  const operatingExpenses = expenses.filter(r => String(r.expense_category || '').toLowerCase().indexOf('hpp') === -1 && String(r.cost_type || '').toLowerCase() !== 'cogs');
  const cogsExpenses = expenses.filter(r => String(r.expense_category || '').toLowerCase().indexOf('hpp') !== -1 || String(r.cost_type || '').toLowerCase() === 'cogs');
  const expenseTotal = sumByField_(operatingExpenses, 'amount');
  const directCogs = medicineCogs + sumByField_(cogsExpenses, 'amount');
  const totalCost = expenseTotal + directCogs;
  const grossProfit = totalRevenue - directCogs;
  const operatingProfit = grossProfit - expenseTotal;
  const taxRows = taxes.length ? taxes : buildEstimatedTaxRows_(tenantId, clinicId, period, totalRevenue, operatingProfit);
  const taxPayable = sumByField_(taxRows, 'tax_payable');
  const taxPaid = sumByField_(taxRows, 'tax_paid');
  const netProfitAfterTax = operatingProfit - taxPayable;
  const cashOut = sumByField_(expenses, 'amount') + taxPaid;
  const cashNet = cashIn - cashOut;
  const taxOutstanding = Math.max(0, taxPayable - taxPaid);
  const inventoryValue = getLatestInventoryValue_(inventoryRows);
  const cashAndBank = cashNet;
  const totalReceivable = receivable + bpjsReceivable;
  const totalAssets = cashAndBank + totalReceivable + inventoryValue;
  const supplierPayable = sumByField_(expenses.filter(r => ['unpaid', 'payable', 'hutang', 'belum_bayar'].indexOf(String(r.status || '').toLowerCase()) !== -1), 'amount');
  const totalLiabilities = taxOutstanding + supplierPayable;
  const equityEstimate = totalAssets - totalLiabilities;
  const ebitdaEstimate = operatingProfit;
  const coaSummary = buildCoaSummary_(coaRows, revenues, expenses, taxRows, receivable, inventoryValue, taxOutstanding, supplierPayable, equityEstimate);
  return {
    tenantId, clinicId, period,
    reportBasis: 'management_accrual_clinic_poc',
    standardNote: 'Disusun sebagai laporan manajemen berbasis akrual sederhana untuk usaha klinik: pendapatan diakui dari transaksi, kas dari pembayaran, piutang dari outstanding, HPP dari obat/BMHP, dan pajak dari sheet PAJAK/estimasi.',
    disclaimer: 'Laporan ini untuk monitoring manajemen. Final pajak/akuntansi resmi tetap perlu validasi konsultan pajak/akuntan sesuai bentuk badan usaha, SAK yang dipakai, PKP/non-PKP, dan regulasi terbaru.',
    labaRugi: [
      { label: 'Pendapatan Usaha', amount: totalRevenue, note: 'Total pendapatan bersih klinik' },
      { label: 'Harga Pokok / HPP Obat & BMHP', amount: directCogs, note: 'Modal obat dari RESEP + biaya bertipe COGS/HPP' },
      { label: 'Laba Kotor', amount: grossProfit, note: 'Pendapatan - HPP' },
      { label: 'Beban Operasional', amount: expenseTotal, note: 'Gaji, sewa, listrik, operasional, dll' },
      { label: 'EBITDA / Laba Operasional Estimasi', amount: ebitdaEstimate, note: 'Sebelum penyusutan, bunga, dan koreksi akuntansi lain yang belum tersedia' },
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
    lra: [
      { label: 'Realisasi Pendapatan Klinik', amount: totalRevenue, note: 'Aktual pendapatan periode ini; target/budget belum dikonfigurasi' },
      { label: 'Realisasi Belanja/HPP', amount: directCogs, note: 'Aktual HPP obat/BMHP dan biaya langsung' },
      { label: 'Realisasi Beban Operasional', amount: expenseTotal, note: 'Aktual biaya operasional periode ini' },
      { label: 'Surplus/Defisit Operasional', amount: operatingProfit, note: 'Pendapatan - HPP - beban operasional' },
      { label: 'Realisasi Pajak Dibayar', amount: taxPaid, note: 'Pajak yang sudah dibayar menurut sheet PAJAK' },
      { label: 'Sisa Kewajiban Pajak', amount: taxOutstanding, note: 'Pajak terutang yang belum dibayar' },
    ],
    neraca: [
      { label: 'ASET — Kas & Bank Estimasi', amount: cashAndBank, note: 'Mutasi kas bersih periode ini; belum menggantikan saldo bank riil' },
      { label: 'ASET — Piutang Usaha', amount: receivable, note: 'Piutang pasien/asuransi dari PENDAPATAN' },
      { label: 'ASET — Piutang BPJS/Klaim', amount: bpjsReceivable, note: 'Outstanding BPJS_KLAIM bila tersedia' },
      { label: 'ASET — Persediaan Obat/BMHP', amount: inventoryValue, note: 'Stock value terakhir dari PERSEDIAAN periode ini bila tersedia' },
      { label: 'TOTAL ASET', amount: totalAssets, note: 'Kas + piutang + persediaan' },
      { label: 'LIABILITAS — Utang Pajak', amount: taxOutstanding, note: 'Pajak terutang - pajak dibayar' },
      { label: 'LIABILITAS — Utang Supplier/Operasional', amount: supplierPayable, note: 'BIAYA berstatus unpaid/payable/hutang/belum_bayar' },
      { label: 'TOTAL LIABILITAS', amount: totalLiabilities, note: 'Utang pajak + utang supplier/operasional' },
      { label: 'EKUITAS ESTIMASI', amount: equityEstimate, note: 'Total aset - total liabilitas; perlu saldo awal untuk neraca resmi' },
    ],
    posisiKeuangan: [
      { label: 'Kas & Bank Estimasi', amount: cashAndBank, note: 'Mutasi kas bersih periode ini; bukan saldo bank final' },
      { label: 'Total Piutang', amount: totalReceivable, note: 'Piutang pasien/penjamin + BPJS outstanding' },
      { label: 'Persediaan', amount: inventoryValue, note: 'Nilai stok bila sheet PERSEDIAAN tersedia' },
      { label: 'Total Aset', amount: totalAssets, note: 'Kas + piutang + persediaan' },
      { label: 'Total Liabilitas', amount: totalLiabilities, note: 'Utang pajak + utang operasional yang terdeteksi' },
      { label: 'Ekuitas Estimasi', amount: equityEstimate, note: 'Perlu saldo awal untuk laporan posisi keuangan resmi' },
    ],
    pajak: taxRows.map(normalizeTaxRowForClient_),
    piutang: buildReceivableReport_(revenues, bpjsClaims),
    utang: buildPayableReport_(taxRows, expenses),
    coaSummary: coaSummary,
    rasio: [
      { label: 'Gross Margin', amount: grossProfit, ratio: totalRevenue ? grossProfit / totalRevenue : null, note: 'Laba kotor / pendapatan' },
      { label: 'Net Margin Setelah Pajak', amount: netProfitAfterTax, ratio: totalRevenue ? netProfitAfterTax / totalRevenue : null, note: 'Laba setelah pajak / pendapatan' },
      { label: 'Rasio Beban Operasional', amount: expenseTotal, ratio: totalRevenue ? expenseTotal / totalRevenue : null, note: 'Beban operasional / pendapatan' },
      { label: 'Collection Rate', amount: cashIn, ratio: totalRevenue ? cashIn / totalRevenue : null, note: 'Kas diterima / pendapatan' },
    ],
    breakdownBiaya: groupRowsForBreakdown_(expenses, 'expense_category', 'amount'),
    generatedAt: Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'),
  };
}

function getLatestInventoryValue_(rows) {
  if (!rows || !rows.length) return 0;
  const sorted = rows.slice().sort((a, b) => String(a.stock_date || '').localeCompare(String(b.stock_date || '')));
  const latestDate = String(sorted[sorted.length - 1].stock_date || '');
  return sumByField_(sorted.filter(r => String(r.stock_date || '') === latestDate), 'stock_value');
}

function buildReceivableReport_(revenues, bpjsClaims) {
  const rows = [];
  const revenueReceivable = sumByField_(revenues, 'receivable_amount');
  if (revenueReceivable) rows.push({ label: 'Piutang Pasien/Penjamin', amount: revenueReceivable, note: 'Outstanding dari transaksi PENDAPATAN' });
  const byPayer = groupRowsForBreakdown_(revenues.filter(r => Number(r.receivable_amount || 0) > 0), 'payer_type', 'receivable_amount');
  byPayer.slice(0, 5).forEach(r => rows.push({ label: 'Piutang ' + (r.category || 'unknown'), amount: r.amount, note: 'Breakdown piutang berdasarkan penjamin/payer' }));
  const bpjsOutstanding = sumByField_(bpjsClaims, 'outstanding_amount');
  if (bpjsOutstanding) rows.push({ label: 'Piutang BPJS/Klaim', amount: bpjsOutstanding, note: 'Outstanding dari BPJS_KLAIM' });
  if (!rows.length) rows.push({ label: 'Piutang tercatat', amount: 0, note: 'Tidak ada piutang aktif pada periode ini atau data belum tersedia' });
  return rows;
}

function buildPayableReport_(taxRows, expenses) {
  const rows = [];
  const taxOutstanding = sumByField_(taxRows, 'tax_outstanding') || Math.max(0, sumByField_(taxRows, 'tax_payable') - sumByField_(taxRows, 'tax_paid'));
  rows.push({ label: 'Utang Pajak', amount: taxOutstanding, note: 'Pajak terutang dikurangi pajak dibayar' });
  const payables = expenses.filter(r => ['unpaid', 'payable', 'hutang', 'belum_bayar'].indexOf(String(r.status || '').toLowerCase()) !== -1);
  const supplierPayable = sumByField_(payables, 'amount');
  rows.push({ label: 'Utang Supplier/Operasional', amount: supplierPayable, note: 'Biaya berstatus unpaid/payable/hutang/belum_bayar' });
  groupRowsForBreakdown_(payables, 'vendor_name', 'amount').slice(0, 5).forEach(r => rows.push({ label: 'Utang ke ' + (r.category || 'vendor tidak tercatat'), amount: r.amount, note: 'Breakdown utang supplier/operasional' }));
  return rows;
}

function buildCoaSummary_(coaRows, revenues, expenses, taxRows, receivable, inventoryValue, taxOutstanding, supplierPayable, equityEstimate) {
  const byType = {};
  (coaRows || []).forEach(r => {
    const type = String(r.account_type || 'unmapped').toLowerCase();
    if (!byType[type]) byType[type] = { count: 0, names: [] };
    byType[type].count += 1;
    if (byType[type].names.length < 3) byType[type].names.push(r.account_name || r.account_code || r.account_id);
  });
  return [
    { label: 'Akun Pendapatan', amount: sumByField_(revenues, 'net_amount'), note: coaSummaryNote_(byType, 'revenue') },
    { label: 'Akun Beban/HPP', amount: sumByField_(expenses, 'amount'), note: coaSummaryNote_(byType, 'expense') },
    { label: 'Akun Aset', amount: receivable + inventoryValue, note: coaSummaryNote_(byType, 'asset') },
    { label: 'Akun Liabilitas', amount: taxOutstanding + supplierPayable, note: coaSummaryNote_(byType, 'liability') },
    { label: 'Akun Ekuitas', amount: equityEstimate, note: coaSummaryNote_(byType, 'equity') },
    { label: 'Pajak Terutang', amount: sumByField_(taxRows, 'tax_payable'), note: 'Dari sheet PAJAK atau estimasi POC' },
  ];
}

function coaSummaryNote_(byType, type) {
  const hit = byType[type] || { count: 0, names: [] };
  return hit.count ? (hit.count + ' akun COA terdaftar: ' + hit.names.join(', ')) : 'COA belum lengkap untuk tipe ' + type;
}

function getDefaultFinancialReportPayload(period) {
  const context = resolveRequestContext_({}, {}, 'finance');
  const resolvedPeriod = normalizeReportPeriod_(period || getLatestAvailablePeriodForContext_(context) || Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM'));
  const cached = getFinancialReportPayloadFromCache_(context.tenantId, context.clinicId, resolvedPeriod);
  if (cached) return cached;
  const payload = getFinancialReportPayload(context.tenantId, context.clinicId, resolvedPeriod);
  putFinancialReportPayloadCache_(context.tenantId, context.clinicId, resolvedPeriod, payload);
  return payload;
}

function getFinancialReportPayloadCacheKey_(tenantId, clinicId, period) {
  return ['financial_report_payload_v1', tenantId, clinicId, period || 'latest'].join(':');
}

function getFinancialReportPayloadFromCache_(tenantId, clinicId, period) {
  try {
    const raw = CacheService.getScriptCache().get(getFinancialReportPayloadCacheKey_(tenantId, clinicId, period));
    if (!raw) return null;
    const payload = JSON.parse(raw);
    payload.cache = { hit: true, ttlSeconds: APP_CONFIG.dashboardCacheTtlSeconds || 120 };
    return payload;
  } catch (err) {
    return null;
  }
}

function putFinancialReportPayloadCache_(tenantId, clinicId, period, payload) {
  try {
    const ttl = APP_CONFIG.dashboardCacheTtlSeconds || 120;
    const clone = JSON.parse(JSON.stringify(payload));
    clone.cache = { hit: false, ttlSeconds: ttl };
    CacheService.getScriptCache().put(getFinancialReportPayloadCacheKey_(tenantId, clinicId, period), JSON.stringify(clone), ttl);
  } catch (err) {
    // Cache is best-effort; reports can still be generated directly.
  }
}

function invalidateFinancialReportCache_(tenantId, clinicId, period) {
  try {
    const cache = CacheService.getScriptCache();
    const keys = [];
    if (period) keys.push(getFinancialReportPayloadCacheKey_(tenantId, clinicId, period));
    keys.push(getFinancialReportPayloadCacheKey_(tenantId, clinicId, Utilities.formatDate(new Date(), APP_CONFIG.timezone, 'yyyy-MM')));
    cache.removeAll(Array.from(new Set(keys)));
  } catch (err) {
    // Best-effort cache invalidation.
  }
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
