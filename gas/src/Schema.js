/**
 * Spreadsheet schema for POC / Final DW subset.
 * Active deployable GAS source. See docs/SPREADSHEET_SCHEMA_FINAL.md.
 * Every tenant-owned sheet includes tenant_id.
 */
const SHEET_SCHEMAS = Object.freeze({
  MASTER_TENANT: ['tenant_id', 'tenant_name', 'owner_name', 'timezone', 'currency', 'status', 'created_at', 'updated_at'],
  MASTER_KLINIK: ['tenant_id', 'clinic_id', 'clinic_name', 'clinic_type', 'city', 'address_summary', 'timezone', 'currency', 'status', 'created_at', 'updated_at'],
  MASTER_DOKTER: ['tenant_id', 'clinic_id', 'doctor_id', 'source_doctor_id', 'doctor_name', 'specialty', 'status', 'created_at', 'updated_at'],
  MASTER_POLI: ['tenant_id', 'clinic_id', 'poli_id', 'source_poli_id', 'poli_name', 'status', 'created_at', 'updated_at'],
  MASTER_OBAT: ['tenant_id', 'clinic_id', 'medicine_id', 'source_medicine_id', 'medicine_name', 'medicine_category', 'unit', 'status', 'created_at', 'updated_at'],
  MASTER_COA: ['tenant_id', 'account_id', 'account_code', 'account_name', 'account_type', 'parent_account_id', 'status', 'created_at', 'updated_at'],
  PASIEN_REF: ['tenant_id', 'clinic_id', 'patient_ref', 'source_patient_id_hash', 'gender', 'age_bucket', 'first_visit_date', 'last_visit_date', 'status', 'created_at', 'updated_at'],

  IMPORT_BATCH: ['tenant_id', 'clinic_id', 'import_id', 'source_system', 'import_method', 'period_start', 'period_end', 'status', 'data_status', 'started_at', 'completed_at', 'created_by', 'notes'],
  IMPORT_FILE: ['tenant_id', 'clinic_id', 'import_id', 'file_id', 'file_name', 'file_type', 'source_report_name', 'checksum', 'row_count', 'uploaded_at', 'uploaded_by', 'status'],
  MAPPING_SUMBER: ['mapping_id', 'tenant_id', 'clinic_id', 'source_system', 'source_report_name', 'source_sheet_name', 'source_column', 'target_sheet', 'target_column', 'transform_rule', 'required', 'default_value', 'status', 'created_at', 'updated_at'],
  COA_MAPPING_RULE: ['tenant_id', 'clinic_id', 'rule_id', 'transaction_type', 'match_text', 'suggested_account_id', 'suggested_category', 'cost_type', 'confidence', 'priority', 'status', 'created_at', 'updated_at'],
  AI_COA_SUGGESTION: ['tenant_id', 'clinic_id', 'suggestion_id', 'source_type', 'source_id', 'transaction_type', 'transaction_date', 'description', 'amount', 'suggested_account_id', 'suggested_account_code', 'suggested_account_name', 'suggested_category', 'cost_type', 'confidence', 'rationale', 'review_status', 'approved_account_id', 'approved_by', 'approved_at', 'created_at'],
  VALIDATION_LOG: ['validation_id', 'tenant_id', 'clinic_id', 'import_id', 'file_id', 'target_sheet', 'row_number', 'column_name', 'severity', 'issue_type', 'message', 'source_value', 'normalized_value', 'resolved', 'created_at'],
  RAW_IMPORT: ['tenant_id', 'clinic_id', 'import_id', 'file_id', 'raw_id', 'source_system', 'source_report_name', 'source_sheet_name', 'source_row_id', 'raw_payload', 'payload_hash', 'imported_at'],

  KUNJUNGAN: ['tenant_id', 'clinic_id', 'visit_id', 'source_visit_id', 'import_id', 'source_row_id', 'visit_date', 'registration_time', 'patient_ref', 'patient_type', 'payer_type', 'doctor_id', 'poli_id', 'service_category', 'service_name', 'status', 'data_status', 'created_at', 'updated_at'],
  TINDAKAN: ['tenant_id', 'clinic_id', 'procedure_id', 'source_procedure_id', 'import_id', 'source_row_id', 'visit_id', 'doctor_id', 'poli_id', 'procedure_date', 'procedure_category', 'procedure_name', 'quantity', 'unit_price', 'gross_amount', 'discount_amount', 'net_amount', 'status', 'created_at'],
  RESEP: ['tenant_id', 'clinic_id', 'prescription_id', 'source_prescription_id', 'import_id', 'source_row_id', 'visit_id', 'medicine_id', 'prescription_date', 'item_name', 'quantity', 'unit', 'unit_price', 'gross_amount', 'discount_amount', 'net_amount', 'cogs_amount', 'batch_no', 'status', 'created_at'],
  PENDAPATAN: ['tenant_id', 'clinic_id', 'revenue_id', 'transaction_id', 'import_id', 'source_row_id', 'visit_id', 'doctor_id', 'poli_id', 'transaction_date', 'revenue_type', 'item_code', 'item_name', 'quantity', 'unit_price', 'gross_amount', 'discount_amount', 'net_amount', 'paid_amount', 'receivable_amount', 'payment_method', 'payer_type', 'cashier', 'status', 'trace_status', 'created_at'],
  BIAYA: ['tenant_id', 'clinic_id', 'expense_id', 'import_id', 'source_row_id', 'expense_date', 'expense_category', 'expense_name', 'account_id', 'amount', 'payment_method', 'vendor_name', 'related_visit_id', 'related_item_code', 'cost_type', 'allocation_target', 'allocation_id', 'status', 'trace_status', 'created_at'],
  PERSEDIAAN: ['tenant_id', 'clinic_id', 'inventory_id', 'import_id', 'source_row_id', 'medicine_id', 'item_code', 'item_name', 'item_category', 'unit', 'batch_no', 'expiry_date', 'stock_date', 'opening_stock', 'stock_in', 'stock_out', 'closing_stock', 'purchase_price', 'selling_price', 'stock_value', 'supplier_name', 'movement_type', 'status', 'created_at'],
  BPJS_KLAIM: ['tenant_id', 'clinic_id', 'claim_id', 'claim_ref', 'import_id', 'source_row_id', 'visit_id', 'claim_period', 'claim_date', 'service_month', 'claim_type', 'claim_amount', 'approved_amount', 'paid_amount', 'outstanding_amount', 'deduction_amount', 'submitted_at', 'payment_date', 'claim_status', 'aging_days', 'notes', 'created_at'],
  PAJAK: ['tenant_id', 'clinic_id', 'tax_id', 'import_id', 'tax_period', 'tax_type', 'taxable_revenue', 'non_taxable_revenue', 'tax_base_amount', 'tax_rate', 'tax_payable', 'tax_paid', 'tax_outstanding', 'document_status', 'risk_flag', 'reconciliation_gap', 'notes', 'created_at', 'updated_at'],

  KPI_HARIAN: ['tenant_id', 'clinic_id', 'kpi_date', 'total_visits', 'total_revenue', 'procedure_revenue', 'medicine_revenue', 'total_cost', 'gross_profit', 'net_profit', 'profit_margin', 'bpjs_claim_amount', 'bpjs_outstanding_amount', 'inventory_value', 'expired_stock_value', 'tax_payable', 'data_status', 'trace_status', 'computed_at'],
  KPI_BULANAN: ['tenant_id', 'clinic_id', 'period', 'total_visits', 'total_revenue', 'procedure_revenue', 'medicine_revenue', 'total_cost', 'gross_profit', 'net_profit', 'profit_margin', 'revenue_growth', 'profit_growth', 'bpjs_claim_amount', 'bpjs_paid_amount', 'bpjs_outstanding_amount', 'pharmacy_gross_margin', 'inventory_value', 'expired_stock_value', 'tax_payable', 'data_status', 'trace_status', 'computed_at'],
  AI_INSIGHT_LOG: ['tenant_id', 'clinic_id', 'insight_id', 'insight_type', 'period_start', 'period_end', 'title', 'summary', 'severity', 'kpi_refs', 'source_refs', 'recommendation', 'data_status', 'created_at'],
  AI_CHAT_LOG: ['tenant_id', 'clinic_id', 'chat_id', 'message_id', 'user_id', 'role', 'message_text', 'prompt_type', 'kpi_refs', 'source_refs', 'data_status', 'created_at'],
  ALERT_LOG: ['tenant_id', 'clinic_id', 'alert_id', 'alert_type', 'severity', 'title', 'message', 'kpi_ref', 'source_ref', 'status', 'sent_channel', 'sent_at', 'resolved_at', 'created_at'],

  SYNC_LOG: ['tenant_id', 'clinic_id', 'sync_id', 'job_type', 'source_system', 'import_id', 'status', 'started_at', 'finished_at', 'rows_read', 'rows_written', 'rows_failed', 'error_message'],
  AUDIT_LOG: ['tenant_id', 'audit_id', 'user_id', 'action', 'target_sheet', 'target_id', 'before_json', 'after_json', 'ip_or_channel', 'created_at'],
  USER_ACCESS: ['tenant_id', 'user_id', 'user_name', 'email', 'telegram_id', 'whatsapp_id', 'role', 'clinic_scope', 'status', 'last_login_at', 'created_at', 'updated_at', 'password_hash', 'login_password_hash', 'password', 'login_password'],
  SETTINGS: ['tenant_id', 'clinic_id', 'setting_key', 'setting_value', 'setting_type', 'category', 'is_secret', 'updated_by', 'updated_at'],
});

const POC_SHEET_NAMES = Object.freeze([
  'MASTER_TENANT', 'MASTER_KLINIK', 'IMPORT_BATCH', 'IMPORT_FILE', 'VALIDATION_LOG', 'RAW_IMPORT',
  'KUNJUNGAN', 'TINDAKAN', 'RESEP', 'PENDAPATAN', 'BIAYA', 'KPI_HARIAN', 'KPI_BULANAN',
  'SYNC_LOG', 'AUDIT_LOG', 'SETTINGS'
]);

const SENSITIVE_SOURCE_KEYS = Object.freeze(['patient_name', 'nama_pasien', 'nik', 'ktp', 'phone', 'no_hp', 'alamat', 'address', 'diagnosis', 'diagnosa', 'medical_record', 'rekam_medis', 'clinical_note', 'catatan_medis']);

function getPhase1SheetNames_() {
  return Object.keys(SHEET_SCHEMAS);
}

function getPocSheetNames_() {
  return POC_SHEET_NAMES.slice();
}

function getSheetSchema_(sheetName) {
  if (!SHEET_SCHEMAS[sheetName]) throw new Error('Unknown sheet schema: ' + sheetName);
  return SHEET_SCHEMAS[sheetName].slice();
}
