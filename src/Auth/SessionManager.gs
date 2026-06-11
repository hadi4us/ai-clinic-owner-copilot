/**
 * SessionManager.gs
 *
 * Tenant-aware session context for Google Apps Script V8.
 * MVP V1 uses configured defaults, while preserving a clean service boundary for future RBAC.
 */
function getCurrentSession() {
  const email = getActiveUserEmail_();
  const session = {
    actorId: email || 'system',
    email: email,
    tenantId: APP_CONFIG.tenancy.defaultTenantId,
    clinicId: APP_CONFIG.tenancy.defaultClinicId,
    clinicIds: [APP_CONFIG.tenancy.defaultClinicId],
    role: ROLES.OWNER,
    timezone: APP_CONFIG.runtime.timezone,
    currency: APP_CONFIG.runtime.currency,
    issuedAt: nowIso_(),
  };
  requireSession_(session);
  return session;
}

function getDefaultTenantSession_() {
  return getCurrentSession();
}

function getActiveUserEmail_() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (err) {
    return '';
  }
}

function resolveTenantContext_(request) {
  const session = getCurrentSession();
  const params = request && request.parameter ? request.parameter : {};
  const requestedClinicId = params.clinic_id || params.clinicId || session.clinicId;
  requireClinicAccess_(session, requestedClinicId);
  return {
    actorId: session.actorId,
    email: session.email,
    tenantId: session.tenantId,
    clinicId: requestedClinicId,
    clinicIds: session.clinicIds.slice(),
    role: session.role,
    timezone: session.timezone,
    currency: session.currency,
    issuedAt: session.issuedAt,
  };
}

function withTenantSession_(callback) {
  if (typeof callback !== 'function') throw new Error('callback is required.');
  const session = getCurrentSession();
  return callback(session);
}
