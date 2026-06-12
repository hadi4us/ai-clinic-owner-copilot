/**
 * AI Clinic Owner Copilot - Phase 1 Config
 *
 * Constitution: see CLAW.md before changing application behavior.
 * Phase 1 only: Data Warehouse, KPI Engine, Finance Dashboard foundation.
 */
const APP_CONFIG = Object.freeze({
  spreadsheetId: '',
  defaultTenantId: 'klinik_001',
  defaultClinicId: 'clinic_001',
  appName: 'AI Clinic Owner Copilot',
  schemaVersion: 'phase1_v1',
  timezone: 'Asia/Jakarta',
});

const PHASE1_FIXTURE = Object.freeze({
  tenant: ['klinik_001', 'Klinik Sehat Sentosa', 'active', 'Asia/Jakarta', 'IDR'],
  clinic: ['klinik_001', 'clinic_001', 'Klinik Sehat Sentosa', 'pratama', 'active'],
});
