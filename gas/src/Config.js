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
  lockWaitMs: 30000,
  maxUploadBytes: 5 * 1024 * 1024,
  maxImportRows: 5000,
  maxImportSheets: 8,
  dashboardCacheTtlSeconds: 120,
});

const PHASE1_FIXTURE = Object.freeze({
  tenant: ['klinik_001', 'Klinik Sehat Sentosa', 'active', 'Asia/Jakarta', 'IDR'],
  clinic: ['klinik_001', 'clinic_001', 'Klinik Sehat Sentosa', 'pratama', 'active'],
});


function getScriptProperty_(key, fallbackValue) {
  try {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    return value === null || value === undefined || value === '' ? fallbackValue : value;
  } catch (err) {
    return fallbackValue;
  }
}

function getConfiguredSpreadsheetId_(tenantId) {
  const resolvedTenantId = String(tenantId || getActiveTenantId_() || APP_CONFIG.defaultTenantId).trim();
  const registryEntry = getTenantRegistryEntry_(resolvedTenantId);
  if (registryEntry && registryEntry.warehouseSpreadsheetId) return registryEntry.warehouseSpreadsheetId;
  if (resolvedTenantId === APP_CONFIG.defaultTenantId) return getScriptProperty_('WAREHOUSE_SPREADSHEET_ID', APP_CONFIG.spreadsheetId);
  return '';
}

function getTenantRegistry_() {
  const raw = getScriptProperty_('TENANT_REGISTRY_JSON', '');
  let parsed = {};
  if (raw) {
    try { parsed = JSON.parse(raw) || {}; } catch (err) { parsed = {}; }
  }
  const tenants = parsed.tenants || parsed;
  const fallbackSpreadsheetId = getScriptProperty_('WAREHOUSE_SPREADSHEET_ID', APP_CONFIG.spreadsheetId);
  if (!tenants[APP_CONFIG.defaultTenantId] && fallbackSpreadsheetId) {
    tenants[APP_CONFIG.defaultTenantId] = {
      tenantId: APP_CONFIG.defaultTenantId,
      tenantName: 'Pilot Tenant',
      status: 'active',
      plan: 'pilot',
      ownerEmail: getScriptProperty_('PILOT_OWNER_EMAIL', ''),
      warehouseSpreadsheetId: fallbackSpreadsheetId,
      defaultClinicId: APP_CONFIG.defaultClinicId,
    };
  }
  return tenants;
}

function getTenantRegistryEntry_(tenantId) {
  const key = String(tenantId || APP_CONFIG.defaultTenantId).trim();
  const tenants = getTenantRegistry_();
  const entry = tenants[key] || null;
  if (!entry) return null;
  return {
    tenantId: entry.tenantId || key,
    tenantName: entry.tenantName || entry.tenant_name || key,
    status: String(entry.status || 'active').toLowerCase(),
    plan: entry.plan || 'pilot',
    ownerEmail: entry.ownerEmail || entry.owner_email || '',
    warehouseSpreadsheetId: entry.warehouseSpreadsheetId || entry.warehouse_spreadsheet_id || entry.spreadsheetId || entry.spreadsheet_id || '',
    defaultClinicId: entry.defaultClinicId || entry.default_clinic_id || APP_CONFIG.defaultClinicId,
  };
}

function assertTenantRegistryAllows_(tenantId) {
  const entry = getTenantRegistryEntry_(tenantId);
  if (!entry) throw new Error('TENANT_NOT_REGISTERED: tenant belum ada di TENANT_REGISTRY_JSON.');
  if (entry.status !== 'active' && entry.status !== 'trial') throw new Error('TENANT_INACTIVE: tenant tidak aktif.');
  if (!entry.warehouseSpreadsheetId) throw new Error('TENANT_WAREHOUSE_MISSING: tenant belum punya warehouse spreadsheet id.');
  return entry;
}

function getTenantRegistrySummary_() {
  const tenants = getTenantRegistry_();
  return Object.keys(tenants).sort().map(function(tenantId) {
    const entry = getTenantRegistryEntry_(tenantId);
    return {
      tenantId: entry.tenantId,
      tenantName: entry.tenantName,
      status: entry.status,
      plan: entry.plan,
      defaultClinicId: entry.defaultClinicId,
      warehouseConfigured: !!entry.warehouseSpreadsheetId,
    };
  });
}

function saveTenantRegistry_(tenants) {
  PropertiesService.getScriptProperties().setProperty('TENANT_REGISTRY_JSON', JSON.stringify({ tenants: tenants || {} }));
}

function upsertTenantRegistryEntry_(entry) {
  const tenants = getTenantRegistry_();
  const tenantId = String(entry && entry.tenantId || '').trim();
  if (!tenantId) throw new Error('tenantId wajib diisi untuk registry.');
  tenants[tenantId] = Object.assign({}, tenants[tenantId] || {}, entry, {
    tenantId: tenantId,
    updatedAt: new Date().toISOString(),
  });
  if (!tenants[tenantId].createdAt) tenants[tenantId].createdAt = tenants[tenantId].updatedAt;
  saveTenantRegistry_(tenants);
  return getTenantRegistryEntry_(tenantId);
}
