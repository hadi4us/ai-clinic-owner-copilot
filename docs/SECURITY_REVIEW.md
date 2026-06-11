# SECURITY_REVIEW.md

## Security Verdict

**Status: BELUM AMAN untuk pilot eksternal atau data klinik nyata.**

Alasan utama:

- Web app manifest mengizinkan `ANYONE_ANONYMOUS`.
- Web app berjalan sebagai `USER_DEPLOYING`.
- Endpoint seperti setup/compute/resetFixture/dashboardPayload dapat dipanggil via query action.
- Tenant/session/RBAC guardrail belum diterapkan konsisten di active deployable path.
- Dashboard memakai `innerHTML` dengan data dinamis.
- Upload file dari user langsung diproses dan ditulis ke warehouse tanpa auth boundary kuat.

Untuk demo internal dengan synthetic fixture, masih bisa diterima. Untuk pilot nyata, ini harus ditutup dulu.

## Security Scope yang Direview

- `appsscript.json`
- `gas/src/Api.js`
- `gas/src/Dashboard.html`
- `gas/src/ImportService.js`
- `gas/src/Utils.js`
- `src/Auth/SessionManager.gs`
- `src/Core/Security.gs`
- `src/Core/Logger.gs`
- `src/DataWarehouse/ValidationService.gs`
- `src/Finance/*`

## Critical Findings

### SEC-001 — Web app anonymous dengan privilege deployer

**Lokasi:** `appsscript.json`, `gas/src/appsscript.json`

Manifest:

- `webapp.executeAs: USER_DEPLOYING`
- `webapp.access: ANYONE_ANONYMOUS`

**Risiko:** Critical

Siapa pun yang memiliki URL web app berpotensi menjalankan script dengan akses deployer ke spreadsheet. Ini sangat berbahaya untuk data klinik dan laporan finansial.

**Dampak bisnis:**

- Kebocoran data finansial klinik.
- Reset fixture/setup/compute tidak sah.
- Import file tidak sah ke warehouse.
- Kehilangan trust pilot.

**Rekomendasi:**

- Untuk pilot nyata, ubah akses menjadi restricted domain/user, bukan anonymous.
- Hindari execute-as-deployer untuk flow user-sensitive jika belum ada auth token kuat.
- Semua endpoint wajib auth + authorization.
- Nonaktifkan action destructive dari GET.

---

### SEC-002 — Endpoint GET menjalankan aksi mutating/destructive

**Lokasi:** `gas/src/Api.js`

Action GET yang terlihat:

- `setup`
- `compute`
- `resetFixture`

**Risiko:** Critical/High

GET seharusnya aman/idempotent. `resetFixture` dan `setup` dapat mengubah data. Jika URL diketahui, aksi bisa dipicu dari browser, crawler, atau link accidental.

**Rekomendasi:**

- Pindahkan mutating action ke POST.
- Tambahkan CSRF/token/auth check.
- Hapus `resetFixture` dari deployed pilot build.
- Audit log actor/session wajib.

---

### SEC-003 — Tenant/clinic request parameter dipercaya langsung di active API

**Lokasi:** `gas/src/Api.js`

Contoh pola:

- `params.tenantId || APP_CONFIG.defaultTenantId`
- `params.clinicId || APP_CONFIG.defaultClinicId`

**Risiko:** High

Jika nanti ada lebih dari satu tenant/clinic dalam spreadsheet yang sama, user dapat mencoba mengganti query parameter untuk membaca tenant lain, kecuali semua downstream guardrail benar-benar enforce session. Saat ini active path belum punya session auth nyata.

**Rekomendasi:**

- Tenant/clinic harus berasal dari session/access table, bukan query parameter.
- Query parameter hanya boleh memilih clinic yang sudah allowed di session.
- Terapkan `requireClinicAccess_` di semua API dan dashboard calls.

---

### SEC-004 — Session MVP bukan authentication boundary

**Lokasi:** `src/Auth/SessionManager.gs`

Temuan:

- `getCurrentSession()` memakai default tenant/clinic dan role OWNER.
- `Session.getActiveUser().getEmail()` bisa kosong, terutama pada deployment anonymous/consumer contexts.
- Role selalu OWNER di MVP.

**Risiko:** High

Security layer terlihat ada, tapi secara efektif semua caller bisa menjadi owner jika entrypoint memakai helper ini tanpa auth eksternal.

**Rekomendasi:**

- Implement real user lookup ke `USER_ACCESS` berdasarkan verified identity.
- Jika ActiveUser email tidak reliable, gunakan signed token atau Google Workspace restricted access.
- Default role jangan OWNER.
- Unknown user harus rejected.

---

### SEC-005 — Dashboard XSS risk dari `innerHTML`

**Lokasi:** `gas/src/Dashboard.html`, `gas/src/Views/dashboard.html`

Temuan:

- `renderBreakdown` memasukkan `r.category` via template literal ke `innerHTML`.
- `renderAlerts` memasukkan `a.title`, `a.message`, `a.severity` ke `innerHTML`.
- `renderNotes` di views memasukkan data payload ke `innerHTML`.

**Risiko:** High

Data dari spreadsheet/import bisa berasal dari file SIM/vendor. Jika value mengandung HTML/script/event handler, dapat dieksekusi di browser user.

**Rekomendasi:**

- Gunakan `textContent` untuk semua string dinamis.
- Tambahkan escaping helper jika tetap render HTML.
- Sanitasi data import bukan pengganti output escaping.

---

### SEC-006 — Upload file belum dibatasi dan belum diikat ke auth/tenant kuat

**Lokasi:** `gas/src/ImportService.js`, `Dashboard.html`, `Api.js`

Temuan:

- File base64 diterima dari UI/POST.
- MIME/type bergantung input client.
- Excel dikonversi via Drive service.
- Tenant/clinic options dapat berasal dari request/options dengan fallback default.

**Risiko:** High

Attacker dapat mencoba upload file besar/berbahaya/berulang untuk menghabiskan quota, atau menulis data ke tenant default.

**Rekomendasi:**

- Batasi file size, row count, sheet count.
- Enforce auth sebelum decode/conversion.
- Tenant/clinic options harus override dari session, bukan client.
- Rate limit per user/session jika memungkinkan.

---

## High Findings

### SEC-007 — Sensitive patient data blocking belum end-to-end

**Lokasi:** `src/Core/Security.gs`, `src/DataWarehouse/ValidationService.gs`, import path.

Temuan positif:

- Ada `assertNoSensitivePatientFields_`.
- Ada `validateNoBlockedPatientData_` untuk blocked fields seperti `patient_name`, `patient_phone`, `nik`, `diagnosis`, `medical_record`, `clinical_note`.

Gap:

- Active import path POC memakai validation sendiri, belum jelas selalu memanggil `ValidationService` modular.
- RAW import menyimpan `raw_payload`; jika source file punya sensitive patient fields, payload mentah bisa tersimpan.

**Rekomendasi:**

- Jangan simpan raw payload yang mengandung patient-sensitive fields.
- Hash/pseudonymize patient identifiers sebelum write.
- Enforce sensitive field block di active import pipeline.

---

### SEC-008 — Audit log belum cukup untuk forensic pilot

**Lokasi:** `gas/src/Utils.js`, `src/Core/Logger.gs`

Temuan:

- Ada `writeAudit_` dan `auditLog_`.
- `writeAudit_` memakai default tenant dan actor fallback.
- Mutating endpoint belum semuanya memastikan actor/session valid.

**Risiko:** High

Jika terjadi data issue saat pilot, sulit membuktikan siapa melakukan import/reset/compute.

**Rekomendasi:**

- Audit setiap import/setup/compute/reset/export.
- Audit harus mencatat actor verified, tenant, clinic, action, before/after summary, request id.
- Jangan log PHI/PII/secrets.

---

### SEC-009 — OAuth scopes terlalu luas/belum justified

**Lokasi:** manifest

Scopes:

- spreadsheets
- drive.file
- script.external_request

Temuan:

- `drive.file` dipakai untuk Excel conversion temporary file.
- `external_request` tidak terlihat dibutuhkan di core reviewed path.

**Risiko:** Medium/High

Scope yang tidak perlu memperluas blast radius jika script disalahgunakan.

**Rekomendasi:**

- Hapus `script.external_request` jika belum dipakai.
- Dokumentasikan alasan setiap OAuth scope.
- Pisahkan import Excel conversion ke deployment khusus jika perlu.

---

### SEC-010 — Error messages bisa bocor detail internal

**Lokasi:** `Api.js`, dashboard failure handlers, service throws.

Temuan:

- Errors dilempar langsung dan dashboard menampilkan `err.message`.
- Stackdriver exception logging aktif.

**Risiko:** Medium

Error internal bisa mengungkap sheet names, schema, tenant ids, atau implementation details.

**Rekomendasi:**

- Return sanitized error code/message untuk user.
- Log detail internal hanya server-side dengan redaction.

## Positive Security Controls yang Sudah Ada

- Schema mayoritas punya `tenant_id` dan `clinic_id`.
- Helper `assertTenantScope_` mencegah query tanpa tenant/clinic di banyak service.
- `src/Core/Security.gs` punya role/session/clinic guardrail design.
- Logger modular punya redaction untuk sensitive keys.
- Validation modular memblokir beberapa patient-sensitive fields.
- Finance caveat sudah mulai membedakan complete/traceable vs estimate.

## Security Readiness Checklist Sebelum Pilot Nyata

Wajib selesai:

- [ ] Web app tidak anonymous untuk data nyata.
- [ ] Mutating actions bukan GET.
- [ ] Semua entrypoint melewati auth/session resolver.
- [ ] Tenant/clinic berasal dari verified session.
- [ ] Unknown user ditolak.
- [ ] Role bukan default OWNER.
- [ ] XSS output escaping diterapkan.
- [ ] Upload file dibatasi size/row/type dan auth required.
- [ ] RAW_IMPORT tidak menyimpan patient-sensitive raw payload.
- [ ] Audit log actor/session valid.
- [ ] OAuth scope minimal.

## Security Risk Register

| Priority | ID | Finding | Risk | Recommendation |
|---|---|---|---|---|
| P0 | SEC-001 | Anonymous execute-as-deployer | Critical | Restrict access/auth before pilot |
| P0 | SEC-002 | Mutating GET actions | Critical/High | Move to POST + token/auth |
| P0 | SEC-003 | Tenant query param trusted | High | Tenant from session only |
| P0 | SEC-004 | MVP session defaults to owner | High | Real user lookup/RBAC |
| P0 | SEC-005 | XSS via innerHTML | High | Escape/textContent |
| P0 | SEC-006 | Upload unauth/rate unbounded | High | File limits + auth |
| P1 | SEC-007 | Sensitive fields not end-to-end blocked | High | Enforce active pipeline |
| P1 | SEC-008 | Audit not forensic-grade | High | Verified actor audit |
| P1 | SEC-009 | OAuth scopes need minimization | Medium/High | Remove unused scopes |
| P2 | SEC-010 | Raw error exposure | Medium | Sanitized errors |
