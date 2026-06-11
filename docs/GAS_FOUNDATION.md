# GAS Foundation Layer

## Purpose

Dokumen ini menjelaskan **Foundation Layer khusus Google Apps Script** untuk AI Clinic CFO Copilot / AI Clinic Owner Copilot.

Foundation Layer adalah lapisan paling dasar sebelum Dashboard, KPI detail, MCP tools, atau integrasi Telegram/WhatsApp dibangun.

Scope implementasi ini mengikuti `CLAW.md`:

- Tidak membuat SIM Klinik.
- Tidak membuat double entry.
- SIM Klinik tetap source of truth.
- Semua akses data wajib tenant-scoped.
- Hindari data medis/pasien sensitif.
- Finance metric harus punya `data_status` dan `trace_status`.
- Angka finance tidak boleh dianggap final tanpa accounting traceability.

---

## Files

Foundation Layer terdiri dari enam file utama:

```text
src/Core/Config.gs
src/Core/Constants.gs
src/Core/Logger.gs
src/Core/Security.gs
src/Core/Helpers.gs
src/Auth/SessionManager.gs
```

> Catatan deployment: active Apps Script deployment lama masih memakai `gas/src`. Struktur `src/` adalah canonical modular service layout. Dashboard tidak dibuat atau diubah dalam implementasi foundation ini.

---

## 1. Config.gs

### Responsibility

`Config.gs` menyimpan konfigurasi runtime dan policy aplikasi.

Isi utama:

- App identity.
- Runtime locale/timezone/currency.
- Spreadsheet warehouse ID.
- Default tenant/clinic untuk MVP.
- Security policy.
- Finance traceability policy.
- Logging policy.

### Design Rules

- Tidak menyimpan secret/token di file ini.
- Secret harus masuk `PropertiesService`.
- Menyediakan backward-compatible aliases agar modul MVP lama tetap bisa membaca:
  - `APP_CONFIG.defaultTenantId`
  - `APP_CONFIG.defaultClinicId`
  - `APP_CONFIG.spreadsheetId`
  - `APP_CONFIG.schemaVersion`
  - `APP_CONFIG.timezone`

### Key Functions

- `getAppConfig()`
- `getScriptProperty_(key, fallbackValue)`
- `getConfiguredSpreadsheetId_()`

---

## 2. Constants.gs

### Responsibility

`Constants.gs` menjadi pusat konstanta dan schema.

Isi utama:

- `ROLES`
- `DATA_STATUS`
- `TRACE_STATUS`
- `AUDIT_ACTION`
- `SHEET_NAME`
- `SENSITIVE_KEYS`
- `SHEET_SCHEMAS`

### Why This Matters

Google Apps Script project sering tumbuh menjadi file global yang saling bergantung. Dengan constants terpusat:

- typo nama sheet berkurang.
- role/status stabil.
- schema bisa divalidasi konsisten.
- tenant guardrail lebih mudah diterapkan.

### Key Functions

- `getPhase1SheetNames_()`
- `getSheetSchema_(sheetName)`

---

## 3. Logger.gs

### Responsibility

`Logger.gs` menyediakan structured logging yang aman untuk data klinik.

Functions:

- `logDebug_(message, metadata)`
- `logInfo_(message, metadata)`
- `logWarn_(message, metadata)`
- `logError_(message, metadata)`
- `auditLog_(session, action, resource, metadata)`

### Privacy Guardrail

Logger melakukan redaction pada key sensitif seperti:

- `patient_name`
- `patient_phone`
- `diagnosis`
- `medical_record`
- `clinical_note`
- `token`
- `secret`
- `password`

Prinsipnya: log boleh membantu debugging, tapi tidak boleh membocorkan data pasien atau credential.

---

## 4. Security.gs

### Responsibility

`Security.gs` menegakkan guardrail tenant, role, clinic scope, privacy, dan finance traceability.

Functions:

- `requireTenantScope_(tenantId, clinicId)`
- `requireSession_(session)`
- `requireRole_(session, allowedRoles)`
- `requireOwnerOrManager_(session)`
- `canAccessClinic_(session, clinicId)`
- `requireClinicAccess_(session, clinicId)`
- `assertTenantScopedRow_(row, session)`
- `assertNoSensitivePatientFields_(payload)`
- `assertFinanceTraceability_(metricRow)`
- `sanitizeOutput_(payload)`

### Critical Rules

- Tidak ada query tanpa `tenant_id`.
- Tidak ada akses clinic di luar session scope.
- Raw/sensitive patient fields harus diblokir dari output service.
- Finance metric final wajib:
  - `data_status = complete`
  - `trace_status = traceable`

---

## 5. Helpers.gs

### Responsibility

`Helpers.gs` berisi utility function reusable dan V8-compatible.

Groups:

- Tenant helpers.
- Number/date helpers.
- JSON helpers.
- ID normalization.
- Data status logic.
- Trace status logic.
- Finance breakdown helper.
- Audit helper wrapper.

Important functions:

- `assertTenantScope_()`
- `inScope_()`
- `asNumber_()`
- `sumAmount_()`
- `toIsoDateString_()`
- `toPeriodString_()`
- `isInPeriod_()`
- `safeJsonParse_()`
- `safeJsonStringify_()`
- `normalizeDoctorId_()`
- `normalizePoliId_()`
- `determineDataStatus_()`
- `determineTraceStatus_()`
- `combineTraceStatuses_()`
- `isFinanceRowTraceable_()`
- `getTraceSummary_()`

---

## 6. SessionManager.gs

### Responsibility

`SessionManager.gs` menyediakan tenant-aware session boundary.

MVP V1 masih menggunakan configured default tenant/clinic, tetapi service boundary sudah disiapkan untuk Google Login + RBAC.

Functions:

- `getCurrentSession()`
- `getDefaultTenantSession_()`
- `getActiveUserEmail_()`
- `resolveTenantContext_(request)`
- `withTenantSession_(callback)`

### Future Role

Di fase berikutnya, SessionManager bisa membaca mapping user → tenant/role dari sheet/config:

```text
Google account email
→ user profile
→ tenant_id
→ clinic scope
→ role
```

---

## Service Architecture

Foundation Layer mendukung pola service modular:

```text
SessionManager
    ↓
Security
    ↓
Service Layer
    ↓
Repository / Spreadsheet
    ↓
Metric / Audit Output
```

Setiap service harus menerima session/context atau melakukan resolve session di entrypoint.

Contoh pola:

```javascript
function serviceAction() {
  return withTenantSession_(function (session) {
    requireOwnerOrManager_(session);
    // service logic here
  });
}
```

---

## V8 Compatibility

Kode foundation kompatibel dengan Google Apps Script V8:

- Menggunakan `const` dan `let` secara aman.
- Menggunakan `Object.freeze` untuk constants.
- Menggunakan function declaration global agar Apps Script bisa resolve antar-file.
- Tidak menggunakan Node.js-only API.
- Tidak menggunakan import/export module syntax.
- Menggunakan Apps Script services:
  - `PropertiesService`
  - `SpreadsheetApp`
  - `Session`
  - `Utilities`

---

## Non-Scope

Foundation Layer ini belum membuat:

- Dashboard baru.
- UI HTML baru.
- SIM Klinik connector.
- Telegram/WhatsApp integration.
- MCP runtime implementation.
- Full user management.
- SaaS billing.

---

## Implementation Status

Implemented in canonical modular source layout:

- `src/Core/Config.gs`
- `src/Core/Constants.gs`
- `src/Core/Logger.gs`
- `src/Core/Security.gs`
- `src/Core/Helpers.gs`
- `src/Auth/SessionManager.gs`

No dashboard file was created as part of this foundation task.
