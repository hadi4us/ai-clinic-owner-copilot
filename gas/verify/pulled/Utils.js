function assertTenantScope_(tenantId, clinicId) {
  if (!tenantId) throw new Error('tenant_id is required. No unscoped query is allowed.');
  if (!clinicId) throw new Error('clinic_id is required. Use ALL explicitly for aggregate later.');
}

function inScope_(row, tenantId, clinicId) {
  return row.tenant_id === tenantId && row.clinic_id === clinicId;
}

function sumAmount_(rows) {
  return rows.reduce((total, row) => total + Number(row.amount || 0), 0);
}

function determineDataStatus_(totalRevenue, costCount, expenseCount) {
  if (totalRevenue === 0) return 'incomplete';
  if (costCount === 0 || expenseCount === 0) return 'incomplete';
  return 'complete';
}

function addBreakdownRows_(targetRows, tenantId, clinicId, period, metricType, sourceRows, categoryKey, now) {
  const total = sumAmount_(sourceRows);
  const grouped = sourceRows.reduce((acc, row) => {
    const category = row[categoryKey] || 'unknown';
    acc[category] = (acc[category] || 0) + Number(row.amount || 0);
    return acc;
  }, {});
  Object.keys(grouped).forEach(category => {
    targetRows.push([tenantId, clinicId, period, metricType, category, grouped[category], total === 0 ? null : grouped[category] / total, now]);
  });
}

function normalizeDoctorId_(sourceDoctorId) {
  if (!sourceDoctorId) return '';
  return `doc_${String(sourceDoctorId).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
}

function normalizePoliId_(sourcePoliId) {
  if (!sourcePoliId) return '';
  return `poli_${String(sourcePoliId).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
}

function lookupVisitId_(sourceVisitId) {
  if (!sourceVisitId) return '';
  const visits = getRowsAsObjects_('fact_visit');
  const found = visits.find(row => row.source_visit_id === sourceVisitId);
  return found ? found.visit_id : '';
}

function writeAudit_(actorId, role, action, resource, metadata) {
  const sheet = getWarehouseSpreadsheet_().getSheetByName('log_audit');
  if (!sheet) return;
  appendRows_(sheet, [[APP_CONFIG.defaultTenantId, Utilities.getUuid(), actorId, role, action, resource, new Date(), JSON.stringify(metadata || {})]]);
}
