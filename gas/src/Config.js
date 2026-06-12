/**
 * AI Clinic Owner Copilot - Phase 1 Config
 *
 * Constitution: see CLAW.md before changing application behavior.
 * Phase 1 only: Data Warehouse, KPI Engine, Finance Dashboard foundation.
 */
const APP_CONFIG = Object.freeze({
  spreadsheetId: '1XujOwLJprl1LjdEWoSAuhDEABsul3__zXQicfFy5bB4',
  defaultTenantId: 'klinik_001',
  defaultClinicId: 'clinic_001',
  appName: 'AI Clinic Owner Copilot',
  schemaVersion: 'phase1_v1',
  timezone: 'Asia/Jakarta',
  lockWaitMs: 30000,
  maxUploadBytes: 5 * 1024 * 1024,
  maxImportRows: 5000,
  maxImportSheets: 8,
});

const PHASE1_FIXTURE = Object.freeze({
  tenant: ['klinik_001', 'Klinik Sehat Sentosa', 'active', 'Asia/Jakarta', 'IDR'],
  clinic: ['klinik_001', 'clinic_001', 'Klinik Sehat Sentosa', 'pratama', 'active'],
});
