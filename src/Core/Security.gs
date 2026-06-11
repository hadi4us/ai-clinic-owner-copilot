/**
 * Security.gs
 *
 * Tenant, role, and data-access guardrails for MVP V1.
 * This layer enforces CLAW.md principles: no unscoped tenant query, no raw patient data exposure,
 * no final finance answer without accounting traceability.
 */
function requireTenantScope_(tenantId, clinicId) {
  if (!tenantId) throw new Error('tenant_id is required. No unscoped query is allowed.');
  if (!clinicId) throw new Error('clinic_id is required. No unscoped clinic query is allowed.');
  return true;
}

function requireSession_(session) {
  if (!session || !session.tenantId || !session.clinicId || !session.role) {
    throw new Error('Valid tenant session is required.');
  }
  requireTenantScope_(session.tenantId, session.clinicId);
  return session;
}

function requireRole_(session, allowedRoles) {
  requireSession_(session);
  const roles = allowedRoles || [];
  if (roles.indexOf(session.role) === -1) {
    throw new Error('Unauthorized role for this action: ' + session.role);
  }
  return true;
}

function requireOwnerOrManager_(session) {
  return requireRole_(session, [ROLES.OWNER, ROLES.MANAGER]);
}

function canAccessClinic_(session, clinicId) {
  requireSession_(session);
  if (!clinicId) return false;
  if (session.clinicIds && session.clinicIds.length) {
    return session.clinicIds.indexOf(clinicId) !== -1;
  }
  return session.clinicId === clinicId;
}

function requireClinicAccess_(session, clinicId) {
  if (!canAccessClinic_(session, clinicId)) {
    throw new Error('Clinic is outside current session scope.');
  }
  return true;
}

function assertTenantScopedRow_(row, session) {
  requireSession_(session);
  if (!row || row.tenant_id !== session.tenantId) {
    throw new Error('Cross-tenant row access denied.');
  }
  if (row.clinic_id && !canAccessClinic_(session, row.clinic_id)) {
    throw new Error('Cross-clinic row access denied.');
  }
  return true;
}

function assertNoSensitivePatientFields_(payload) {
  const text = JSON.stringify(payload || {}).toLowerCase();
  const blocked = ['diagnosis', 'medical_record', 'clinical_note', 'patient_name', 'patient_phone', 'nik'];
  blocked.forEach(function (key) {
    if (text.indexOf(key) !== -1) {
      throw new Error('Payload contains blocked patient-sensitive field: ' + key);
    }
  });
  return true;
}

function assertFinanceTraceability_(metricRow) {
  if (!metricRow) throw new Error('Finance metric row is required.');
  const dataStatus = metricRow.data_status || metricRow.dataStatus;
  const traceStatus = metricRow.trace_status || metricRow.traceStatus;
  if (dataStatus !== DATA_STATUS.COMPLETE || traceStatus !== TRACE_STATUS.TRACEABLE) {
    throw new Error('Finance metric is not final. data_status=' + dataStatus + ', trace_status=' + traceStatus);
  }
  return true;
}

function sanitizeOutput_(payload) {
  return sanitizeForLog_(payload);
}
