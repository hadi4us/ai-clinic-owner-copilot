/**
 * Creates/updates final spreadsheet tabs and headers.
 * Safe to rerun: does not delete existing sheets and only rewrites header rows.
 */
function setupPhase1Warehouse() {
  return setupFinalWarehouseSheets();
}

function seedPocConfig_() {
  const now = new Date();
  const tenantSheet = ensureSheet_('MASTER_TENANT');
  if (tenantSheet.getLastRow() < 2) {
    appendObjects_('MASTER_TENANT', [{ tenant_id: APP_CONFIG.defaultTenantId, tenant_name: 'Klinik Sehat Sentosa', owner_name: 'Owner', timezone: APP_CONFIG.timezone, currency: 'IDR', status: 'active', created_at: now, updated_at: now }]);
  }
  const clinicSheet = ensureSheet_('MASTER_KLINIK');
  if (clinicSheet.getLastRow() < 2) {
    appendObjects_('MASTER_KLINIK', [{ tenant_id: APP_CONFIG.defaultTenantId, clinic_id: APP_CONFIG.defaultClinicId, clinic_name: 'Klinik Sehat Sentosa', clinic_type: 'pratama', city: '', address_summary: '', timezone: APP_CONFIG.timezone, currency: 'IDR', status: 'active', created_at: now, updated_at: now }]);
  }
  seedPilotOwnerAccess_(now);
  seedDefaultClinicCoa_(now);
  const settingsSheet = ensureSheet_('SETTINGS');
  if (settingsSheet.getLastRow() < 2) {
    appendObjects_('SETTINGS', [
      { tenant_id: APP_CONFIG.defaultTenantId, clinic_id: APP_CONFIG.defaultClinicId, setting_key: 'poc_period_default', setting_value: 'auto', setting_type: 'string', category: 'dashboard', is_secret: false, updated_by: 'system', updated_at: now },
      { tenant_id: APP_CONFIG.defaultTenantId, clinic_id: APP_CONFIG.defaultClinicId, setting_key: 'ai_enabled', setting_value: 'false', setting_type: 'boolean', category: 'ai', is_secret: false, updated_by: 'system', updated_at: now },
    ]);
  }
}


function seedDefaultClinicCoa_(now) {
  const rows = getDefaultClinicCoaRows_(APP_CONFIG.defaultTenantId, now);
  const existingKeys = getRowsAsObjects_('MASTER_COA')
    .filter(row => String(row.tenant_id || '') === APP_CONFIG.defaultTenantId)
    .reduce((acc, row) => {
      if (row.account_id) acc[String(row.account_id)] = true;
      if (row.account_code) acc['code:' + String(row.account_code)] = true;
      return acc;
    }, {});
  const missing = rows.filter(row => !existingKeys[String(row.account_id)] && !existingKeys['code:' + String(row.account_code)]);
  if (missing.length) appendObjects_('MASTER_COA', missing);
}

function getDefaultClinicCoaRows_(tenantId, now) {
  const row = (account_id, account_code, account_name, account_type, parent_account_id) => ({
    tenant_id: tenantId,
    account_id,
    account_code,
    account_name,
    account_type,
    parent_account_id: parent_account_id || '',
    status: 'active',
    created_at: now,
    updated_at: now,
  });
  return [
    row('coa_assets', '1000', 'ASET', 'asset'),
    row('coa_cash', '1100', 'Kas & Setara Kas', 'asset', 'coa_assets'),
    row('coa_cash_on_hand', '1110', 'Kas Kecil / Kas Klinik', 'asset', 'coa_cash'),
    row('coa_bank', '1120', 'Bank Operasional', 'asset', 'coa_cash'),
    row('coa_qris_clearing', '1130', 'QRIS / EDC Clearing', 'asset', 'coa_cash'),
    row('coa_receivables', '1200', 'Piutang Usaha', 'asset', 'coa_assets'),
    row('coa_ar_patient', '1210', 'Piutang Pasien Umum', 'asset', 'coa_receivables'),
    row('coa_ar_bpjs', '1220', 'Piutang BPJS', 'asset', 'coa_receivables'),
    row('coa_ar_insurance', '1230', 'Piutang Asuransi / Perusahaan', 'asset', 'coa_receivables'),
    row('coa_inventory', '1300', 'Persediaan', 'asset', 'coa_assets'),
    row('coa_inventory_medicine', '1310', 'Persediaan Obat', 'asset', 'coa_inventory'),
    row('coa_inventory_bmhp', '1320', 'Persediaan BMHP / Alkes Habis Pakai', 'asset', 'coa_inventory'),
    row('coa_prepaid', '1400', 'Biaya Dibayar Dimuka', 'asset', 'coa_assets'),
    row('coa_prepaid_rent', '1410', 'Sewa Dibayar Dimuka', 'asset', 'coa_prepaid'),
    row('coa_fixed_assets', '1500', 'Aset Tetap', 'asset', 'coa_assets'),
    row('coa_medical_equipment', '1510', 'Peralatan Medis', 'asset', 'coa_fixed_assets'),
    row('coa_office_equipment', '1520', 'Peralatan Kantor & Komputer', 'asset', 'coa_fixed_assets'),
    row('coa_accum_depreciation', '1590', 'Akumulasi Penyusutan', 'asset', 'coa_fixed_assets'),

    row('coa_liabilities', '2000', 'LIABILITAS', 'liability'),
    row('coa_ap_supplier', '2100', 'Utang Supplier Obat/BMHP', 'liability', 'coa_liabilities'),
    row('coa_accrued_expense', '2200', 'Biaya Masih Harus Dibayar', 'liability', 'coa_liabilities'),
    row('coa_doctor_payable', '2210', 'Utang Jasa Dokter / Tenaga Medis', 'liability', 'coa_accrued_expense'),
    row('coa_salary_payable', '2220', 'Utang Gaji & Honor', 'liability', 'coa_accrued_expense'),
    row('coa_tax_payable', '2300', 'Utang Pajak', 'liability', 'coa_liabilities'),
    row('coa_vat_out', '2310', 'PPN Keluaran', 'liability', 'coa_tax_payable'),
    row('coa_pph21_payable', '2321', 'Utang PPh 21', 'liability', 'coa_tax_payable'),
    row('coa_pph23_payable', '2323', 'Utang PPh 23', 'liability', 'coa_tax_payable'),
    row('coa_pph_final_payable', '2325', 'Utang PPh Final UMKM', 'liability', 'coa_tax_payable'),
    row('coa_bpjs_payable', '2400', 'Utang BPJS Kesehatan/Ketenagakerjaan', 'liability', 'coa_liabilities'),
    row('coa_bank_loan', '2500', 'Pinjaman Bank / Pembiayaan', 'liability', 'coa_liabilities'),

    row('coa_equity', '3000', 'EKUITAS', 'equity'),
    row('coa_owner_capital', '3100', 'Modal Pemilik', 'equity', 'coa_equity'),
    row('coa_owner_draw', '3200', 'Prive / Penarikan Pemilik', 'equity', 'coa_equity'),
    row('coa_retained_earnings', '3300', 'Saldo Laba Ditahan', 'equity', 'coa_equity'),
    row('coa_current_profit', '3900', 'Laba Tahun Berjalan', 'equity', 'coa_equity'),

    row('coa_revenue', '4000', 'PENDAPATAN', 'revenue'),
    row('coa_revenue_consultation', '4110', 'Pendapatan Konsultasi / Pemeriksaan Dokter', 'revenue', 'coa_revenue'),
    row('coa_revenue_procedure', '4120', 'Pendapatan Tindakan Medis', 'revenue', 'coa_revenue'),
    row('coa_revenue_medicine', '4130', 'Pendapatan Obat / Farmasi', 'revenue', 'coa_revenue'),
    row('coa_revenue_lab', '4140', 'Pendapatan Laboratorium / Penunjang', 'revenue', 'coa_revenue'),
    row('coa_revenue_admin', '4150', 'Pendapatan Administrasi', 'revenue', 'coa_revenue'),
    row('coa_revenue_bpjs', '4210', 'Pendapatan Klaim BPJS', 'revenue', 'coa_revenue'),
    row('coa_revenue_insurance', '4220', 'Pendapatan Asuransi / Perusahaan', 'revenue', 'coa_revenue'),
    row('coa_revenue_other', '4900', 'Pendapatan Lain-lain', 'revenue', 'coa_revenue'),
    row('coa_sales_discount', '4990', 'Diskon / Penyesuaian Pendapatan', 'revenue', 'coa_revenue'),

    row('coa_direct_cost', '5000', 'HPP & BIAYA LANGSUNG LAYANAN', 'expense'),
    row('coa_cogs', '5110', 'HPP Obat / Farmasi', 'expense', 'coa_direct_cost'),
    row('coa_cogs_bmhp', '5120', 'HPP BMHP / Alkes Habis Pakai', 'expense', 'coa_direct_cost'),
    row('coa_lab_cost', '5130', 'Biaya Laboratorium / Penunjang Langsung', 'expense', 'coa_direct_cost'),
    row('coa_doctor_fee', '5210', 'Jasa Dokter / Fee Tenaga Medis', 'expense', 'coa_direct_cost'),
    row('coa_medical_staff_fee', '5220', 'Fee Perawat / Bidan / Terapis', 'expense', 'coa_direct_cost'),
    row('coa_referral_fee', '5230', 'Fee Rujukan / Kerja Sama Layanan', 'expense', 'coa_direct_cost'),
    row('coa_claim_adjustment', '5290', 'Koreksi Klaim / Selisih Penjamin', 'expense', 'coa_direct_cost'),

    row('coa_opex', '6000', 'BEBAN OPERASIONAL', 'expense'),
    row('coa_salary', '6110', 'Gaji Karyawan Non Medis', 'expense', 'coa_opex'),
    row('coa_overtime_bonus', '6120', 'Lembur, Bonus, THR', 'expense', 'coa_opex'),
    row('coa_employee_benefit', '6130', 'Tunjangan & Benefit Karyawan', 'expense', 'coa_opex'),
    row('coa_rent', '6210', 'Sewa Tempat', 'expense', 'coa_opex'),
    row('coa_utilities', '6220', 'Listrik, Air, Internet, Telepon', 'expense', 'coa_opex'),
    row('coa_cleaning_security', '6230', 'Kebersihan, Keamanan, Laundry', 'expense', 'coa_opex'),
    row('coa_maintenance', '6240', 'Maintenance Gedung & Peralatan', 'expense', 'coa_opex'),
    row('coa_license_permit', '6250', 'Perizinan, STR/SIP, Akreditasi', 'expense', 'coa_opex'),
    row('coa_office_supply', '6310', 'ATK & Perlengkapan Kantor', 'expense', 'coa_opex'),
    row('coa_software', '6320', 'Software, SIM Klinik, Hosting', 'expense', 'coa_opex'),
    row('coa_bank_fee', '6330', 'Biaya Bank, EDC, Payment Gateway', 'expense', 'coa_opex'),
    row('coa_marketing', '6410', 'Marketing & Promosi', 'expense', 'coa_opex'),
    row('coa_training', '6420', 'Training & Pengembangan SDM', 'expense', 'coa_opex'),
    row('coa_transport', '6430', 'Transportasi & Kurir', 'expense', 'coa_opex'),
    row('coa_professional_fee', '6510', 'Jasa Profesional: Akuntan, Pajak, Legal', 'expense', 'coa_opex'),
    row('coa_insurance_expense', '6520', 'Asuransi Operasional', 'expense', 'coa_opex'),
    row('coa_depreciation', '6610', 'Beban Penyusutan', 'expense', 'coa_opex'),
    row('coa_bad_debt', '6620', 'Cadangan / Penghapusan Piutang', 'expense', 'coa_opex'),
    row('coa_tax_expense', '6710', 'Beban Pajak', 'expense', 'coa_opex'),
    row('coa_opex_other', '6990', 'Beban Operasional Lainnya', 'expense', 'coa_opex'),

    row('coa_other_income', '7000', 'PENDAPATAN/BEBAN NON OPERASIONAL', 'revenue'),
    row('coa_interest_income', '7110', 'Pendapatan Bunga/Jasa Giro', 'revenue', 'coa_other_income'),
    row('coa_other_gain', '7190', 'Pendapatan Non Operasional Lainnya', 'revenue', 'coa_other_income'),
    row('coa_interest_expense', '8110', 'Beban Bunga / Administrasi Pinjaman', 'expense', 'coa_other_income'),
    row('coa_other_loss', '8190', 'Beban Non Operasional Lainnya', 'expense', 'coa_other_income'),
  ];
}


function seedPilotOwnerAccess_(now) {
  const ownerEmail = getScriptPropertySafe_('PILOT_OWNER_EMAIL', '');
  if (!ownerEmail) return;
  const sheet = ensureSheet_('USER_ACCESS');
  const existing = getRowsAsObjects_('USER_ACCESS').some(row => String(row.email || '').toLowerCase() === String(ownerEmail).toLowerCase());
  if (existing) return;
  appendObjects_('USER_ACCESS', [{
    tenant_id: APP_CONFIG.defaultTenantId,
    user_id: String(ownerEmail).toLowerCase(),
    user_name: 'Pilot Owner',
    email: String(ownerEmail).toLowerCase(),
    telegram_id: '',
    whatsapp_id: '',
    role: 'owner',
    clinic_scope: APP_CONFIG.defaultClinicId,
    status: 'active',
    last_login_at: '',
    created_at: now,
    updated_at: now,
  }]);
}

function getScriptPropertySafe_(key, fallbackValue) {
  try {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    return value === null || value === undefined || value === '' ? fallbackValue : value;
  } catch (err) {
    return fallbackValue;
  }
}

function resetPocFixtureData() {
  const context = resolveRequestContext_({}, {}, 'owner');
  return resetPocFixtureDataForContext_(context);
}

function resetPocFixtureDataForContext_(context) {
  assertContextScope_(context, context.tenantId, context.clinicId);
  return withTenantClinicLock_('reset_poc_fixture_data', context.tenantId, context.clinicId, function() {
    ensurePhase1WarehouseSheetsNoLock_();
    ['IMPORT_BATCH', 'IMPORT_FILE', 'VALIDATION_LOG', 'RAW_IMPORT', 'KUNJUNGAN', 'TINDAKAN', 'RESEP', 'PENDAPATAN', 'BIAYA', 'KPI_HARIAN', 'KPI_BULANAN', 'ALERT_LOG', 'SYNC_LOG'].forEach(clearSheetDataByName_);
    seedPocFixtureData_();
    const result = computePocKpisNoLock_(context.tenantId, context.clinicId, '2026-06');
    invalidateDashboardCache_(context.tenantId, context.clinicId, '2026-06');
    return result;
  });
}
