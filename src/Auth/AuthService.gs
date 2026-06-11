/**
 * AuthService placeholder for Google Login + role-based access.
 * MVP V1 still relies on Apps Script/Web App deployment access.
 */
function getCurrentUserContext() {
  const email = Session.getActiveUser().getEmail();
  return {
    actorId: email || 'anonymous',
    email,
    tenantId: APP_CONFIG.defaultTenantId,
    clinicId: APP_CONFIG.defaultClinicId,
    role: 'owner',
  };
}
