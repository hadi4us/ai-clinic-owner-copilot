/**
 * Session/tenant guardrail for Phase 1 pilot.
 * Tenant and clinic context must come from verified USER_ACCESS rows, not arbitrary query params.
 */
function getCurrentActor_() {
  let email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (err) { email = ''; }
  let effectiveEmail = '';
  try { effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); } catch (err) { effectiveEmail = ''; }
  // Security note: never fall back to effectiveEmail as actor. For web apps executing as deployer,
  // effectiveEmail is the deployer and would turn every visitor into the deployer.
  return { userId: email, email, effectiveEmail, channel: 'gas_webapp' };
}

function resolveRequestContext_(params, payload, requiredRole) {
  const actor = getCurrentActor_();
  const requestedTenantId = (params && params.tenantId) || (payload && payload.tenantId) || '';
  const requestedClinicId = (params && params.clinicId) || (payload && payload.clinicId) || '';
  return requireClinicAccess_(actor, requestedTenantId, requestedClinicId, requiredRole || 'owner');
}

function requireClinicAccess_(actor, requestedTenantId, requestedClinicId, requiredRole) {
  const userId = actor && actor.userId ? String(actor.userId).trim().toLowerCase() : '';
  if (!userId) throw new Error('UNAUTHENTICATED: Google session tidak terdeteksi. Gunakan akses web app terbatas, bukan anonymous, untuk data pilot.');
  const accessRows = getRowsAsObjects_('USER_ACCESS').filter(row => userMatchesAccessRow_(userId, row) && String(row.status || 'active').toLowerCase() === 'active');
  if (!accessRows.length) throw new Error('FORBIDDEN: user belum terdaftar di USER_ACCESS.');
  const allowedRows = accessRows.filter(row => roleAllows_(row.role, requiredRole || 'owner'));
  if (!allowedRows.length) throw new Error('FORBIDDEN: role user tidak cukup untuk action ini.');
  const tenantId = requestedTenantId || allowedRows[0].tenant_id;
  if (!tenantId) throw new Error('FORBIDDEN: tenant context tidak tersedia.');
  const tenantRows = allowedRows.filter(row => row.tenant_id === tenantId);
  if (!tenantRows.length) throw new Error('FORBIDDEN: actor tidak boleh mengakses tenant ini.');
  const clinicId = requestedClinicId || resolveDefaultClinicForTenant_(tenantRows, tenantId);
  if (!clinicId) throw new Error('FORBIDDEN: clinic context tidak tersedia.');
  const clinicRows = tenantRows.filter(row => clinicScopeAllows_(row.clinic_scope, clinicId));
  if (!clinicRows.length) throw new Error('FORBIDDEN: actor tidak boleh mengakses clinic ini.');
  return {
    actorId: userId,
    role: normalizeRole_(clinicRows[0].role),
    tenantId,
    clinicId,
    source: 'USER_ACCESS',
  };
}

function userMatchesAccessRow_(userId, row) {
  return [row.user_id, row.email, row.telegram_id, row.whatsapp_id]
    .filter(Boolean)
    .map(value => String(value).trim().toLowerCase())
    .indexOf(userId) !== -1;
}

function roleAllows_(actualRole, requiredRole) {
  const rank = { staff: 1, finance: 2, manager: 3, owner: 4, admin: 5 };
  return (rank[normalizeRole_(actualRole)] || 0) >= (rank[normalizeRole_(requiredRole)] || 4);
}

function normalizeRole_(role) {
  return String(role || '').trim().toLowerCase();
}

function clinicScopeAllows_(clinicScope, clinicId) {
  const scope = String(clinicScope || '').trim();
  if (!scope || scope === '*') return true;
  return scope.split(',').map(item => item.trim()).indexOf(clinicId) !== -1;
}

function resolveDefaultClinicForTenant_(rows, tenantId) {
  const wildcard = (rows || []).find(row => clinicScopeAllows_(row.clinic_scope, APP_CONFIG.defaultClinicId) && row.tenant_id === tenantId);
  if (wildcard) return APP_CONFIG.defaultClinicId;
  const first = (rows || []).find(row => row.tenant_id === tenantId && String(row.clinic_scope || '').trim() && String(row.clinic_scope || '').trim() !== '*');
  return first ? String(first.clinic_scope).split(',')[0].trim() : '';
}

function assertContextScope_(context, tenantId, clinicId) {
  if (!context) throw new Error('Missing verified tenant context.');
  if (context.tenantId !== tenantId || context.clinicId !== clinicId) throw new Error('FORBIDDEN: request context scope mismatch.');
}
