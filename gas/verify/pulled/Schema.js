/**
 * Spreadsheet schema for Phase 1.
 * Every tenant-owned sheet includes tenant_id as first column.
 */
const SHEET_SCHEMAS = Object.freeze({
  cfg_tenant: ['tenant_id', 'tenant_name', 'status', 'timezone', 'currency', 'created_at', 'updated_at'],
  cfg_clinic: ['tenant_id', 'clinic_id', 'clinic_name', 'clinic_type', 'status'],
  cfg_integration_source: ['tenant_id', 'source_id', 'source_type', 'sim_vendor', 'mapping_template_id', 'last_sync_at', 'status'],
  cfg_mapping_template: ['tenant_id', 'mapping_template_id', 'source_type', 'source_column', 'target_column', 'transform', 'required', 'default_value', 'active'],

  raw_visit: ['tenant_id', 'clinic_id', 'sync_id', 'source_id', 'source_row_id', 'source_period', 'raw_payload', 'imported_at'],
  raw_revenue: ['tenant_id', 'clinic_id', 'sync_id', 'source_id', 'source_row_id', 'source_period', 'raw_payload', 'imported_at'],
  raw_expense: ['tenant_id', 'clinic_id', 'sync_id', 'source_id', 'source_row_id', 'source_period', 'raw_payload', 'imported_at'],
  raw_payment: ['tenant_id', 'clinic_id', 'sync_id', 'source_id', 'source_row_id', 'source_period', 'raw_payload', 'imported_at'],

  stg_visit: ['tenant_id', 'clinic_id', 'sync_id', 'source_row_id', 'visit_date', 'source_visit_id', 'source_doctor_id', 'source_poli_id', 'patient_ref', 'visit_type', 'status', 'validation_status', 'validation_notes'],
  stg_revenue: ['tenant_id', 'clinic_id', 'sync_id', 'source_row_id', 'source_transaction_id', 'transaction_date', 'source_visit_id', 'source_doctor_id', 'source_poli_id', 'payer_type', 'revenue_category', 'amount', 'validation_status', 'validation_notes'],
  stg_expense: ['tenant_id', 'clinic_id', 'sync_id', 'source_row_id', 'source_expense_id', 'expense_date', 'expense_category', 'amount', 'allocation_target', 'validation_status', 'validation_notes'],
  stg_payment: ['tenant_id', 'clinic_id', 'sync_id', 'source_row_id', 'source_payment_id', 'payment_date', 'source_transaction_id', 'amount', 'payment_method', 'validation_status', 'validation_notes'],

  dim_doctor: ['tenant_id', 'doctor_id', 'source_doctor_id', 'doctor_name', 'specialty', 'status'],
  dim_poli: ['tenant_id', 'poli_id', 'source_poli_id', 'poli_name', 'status'],

  fact_visit: ['tenant_id', 'clinic_id', 'visit_id', 'source_visit_id', 'visit_date', 'doctor_id', 'poli_id', 'patient_ref', 'visit_type', 'status', 'sync_id', 'created_at'],
  fact_revenue: ['tenant_id', 'clinic_id', 'revenue_id', 'source_transaction_id', 'transaction_date', 'visit_id', 'doctor_id', 'poli_id', 'payer_type', 'revenue_category', 'amount', 'sync_id', 'created_at'],
  fact_cost: ['tenant_id', 'clinic_id', 'cost_id', 'cost_date', 'visit_id', 'doctor_id', 'poli_id', 'cost_category', 'amount', 'allocation_method', 'sync_id', 'created_at'],
  fact_expense: ['tenant_id', 'clinic_id', 'expense_id', 'expense_date', 'expense_category', 'amount', 'allocation_target', 'sync_id', 'created_at'],

  metric_daily_summary: ['tenant_id', 'clinic_id', 'date', 'total_visits', 'total_revenue', 'direct_cost', 'operating_expense', 'gross_profit', 'net_profit', 'profit_margin', 'data_status', 'computed_at'],
  metric_monthly_summary: ['tenant_id', 'clinic_id', 'period', 'total_visits', 'total_revenue', 'direct_cost', 'operating_expense', 'gross_profit', 'net_profit', 'profit_margin', 'data_status', 'computed_at'],
  metric_finance_breakdown: ['tenant_id', 'clinic_id', 'period', 'metric_type', 'category', 'amount', 'pct_of_total', 'computed_at'],
  metric_growth_trend: ['tenant_id', 'clinic_id', 'period', 'total_revenue', 'net_profit', 'total_visits', 'revenue_growth_pct', 'profit_growth_pct', 'visit_growth_pct', 'computed_at'],
  metric_profit_change_driver: ['tenant_id', 'clinic_id', 'current_period', 'comparison_period', 'driver_type', 'driver_label', 'impact_amount', 'explanation', 'severity', 'computed_at'],
  metric_data_quality: ['tenant_id', 'clinic_id', 'period', 'rule_id', 'severity', 'status', 'affected_sheet', 'affected_count', 'message', 'created_at'],

  log_sync: ['tenant_id', 'sync_id', 'source_id', 'source_type', 'started_at', 'finished_at', 'status', 'rows_imported', 'rows_rejected', 'rows_duplicated', 'error_message'],
  log_audit: ['tenant_id', 'audit_id', 'actor_id', 'role', 'action', 'resource', 'created_at', 'metadata'],
});

function getPhase1SheetNames_() {
  return Object.keys(SHEET_SCHEMAS);
}
