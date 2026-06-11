# NEXT_SPRINT_PLAN.md

## Sprint Objective

**Stop feature development dan fokus ke Project Health Stabilization.**

Tujuan sprint berikutnya bukan menambah fitur, melainkan membuat fondasi aman untuk pilot:

1. Deployment aman.
2. Source-of-truth kode jelas.
3. Tenant/auth guardrail aktif di entrypoint.
4. Spreadsheet hot path tidak rawan timeout/race.
5. Finance data quality/traceability tidak misleading.

## Prinsip Sprint

- Tidak menulis fitur baru.
- Tidak memperluas AI/MCP/Telegram dulu.
- Semua pekerjaan adalah hardening, cleanup, documentation, dan test.
- Jika ada tradeoff, pilih **trust + safety + auditability** daripada speed demo.

## Definition of Done Sprint

Sprint dianggap selesai jika:

- Deployed source-of-truth terdokumentasi.
- Anonymous/deployer-risk ditutup atau pilot deployment diberi explicit “synthetic demo only”.
- Mutating endpoint tidak tersedia via public GET.
- Tenant/clinic tidak lagi dipercaya dari request tanpa session validation.
- Write path import/compute punya locking plan/implementation.
- Dashboard finance tidak menampilkan angka sebagai final kecuali complete + traceable.
- Minimal tests untuk tenant isolation, data quality, traceability, dan KPI fixture tersedia.
- Health check docs ini tetap menjadi baseline.

## Sprint 1 — Health Stabilization Backlog

### P0-1 — Freeze dan tetapkan source-of-truth kode

**Business impact:** Critical — mencegah fix salah tree dan deployment drift.

**Tasks:**

- Putuskan canonical source: `gas/src` atau `src`.
- Dokumentasikan deploy path.
- Tandai tree non-canonical sebagai reference/generated.
- Buat checklist sebelum deploy: files included, manifest checked, tests run.

**Acceptance criteria:**

- Ada dokumen source-of-truth/deployment flow.
- Developer tahu file mana yang boleh diedit.
- Tidak ada perubahan manual ganda tanpa sync rule.

---

### P0-2 — Lock down Apps Script web app security posture

**Business impact:** Critical — mencegah akses tidak sah ke data pilot.

**Tasks:**

- Review manifest `webapp.access` dan `executeAs`.
- Untuk data nyata, nonaktifkan `ANYONE_ANONYMOUS`.
- Hapus/disable public GET untuk `setup` dan `resetFixture` dari pilot build.
- Mutating actions pindah ke authenticated POST.
- Remove unused OAuth scope jika tidak dibutuhkan.

**Acceptance criteria:**

- Pilot deployment tidak anonymous untuk data nyata.
- Tidak ada destructive/mutating GET public.
- Scope manifest terdokumentasi dan minimal.

---

### P0-3 — Enforce session-based tenant/clinic resolution di entrypoint

**Business impact:** Critical — menjaga multi-tenant isolation.

**Tasks:**

- Semua API/dashboard/import resolve tenant dari verified session.
- `tenantId`/`clinicId` dari query hanya boleh dipakai setelah `requireClinicAccess_`.
- Unknown user/session ditolak.
- Default OWNER role tidak boleh menjadi auth fallback untuk pilot nyata.

**Acceptance criteria:**

- Test cross-tenant request gagal.
- Test unknown user gagal.
- Semua action memakai tenant context server-side.

---

### P0-4 — Finance trust gate: data_status + trace_status

**Business impact:** Critical — mencegah owner melihat angka misleading.

**Tasks:**

- Audit semua finance/dashboard response yang menampilkan profit/revenue.
- Pastikan final finance hanya jika `data_status=complete` dan `trace_status=traceable`.
- Jika belum final, tampilkan label `estimated/incomplete/untraceable`.
- Jangan set `TRACEABLE` hanya karena rows ada.

**Acceptance criteria:**

- Test KPI incomplete expense menghasilkan estimated/incomplete.
- Test missing source_row/import menghasilkan not/partially traceable.
- Dashboard hero profit tidak menyebut final jika gate gagal.

---

### P0-5 — Spreadsheet write safety: LockService dan no whole-sheet rewrite di hot path plan

**Business impact:** High — mencegah data corrupt saat pilot.

**Tasks:**

- Tambah lock policy untuk setup/import/compute/reset.
- Identifikasi semua `replaceObjects_` yang dipakai hot path.
- Minimal sprint ini: protect whole-sheet rewrite dengan lock.
- Buat plan refactor row-key update untuk sprint berikutnya.

**Acceptance criteria:**

- Concurrent import/compute tidak berjalan bersamaan untuk same tenant/clinic.
- Jika lock busy, user mendapat pesan jelas.
- Semua hot write path terdokumentasi.

---

### P0-6 — XSS hardening dashboard

**Business impact:** High — dashboard aman dari data import berbahaya.

**Tasks:**

- Ganti dynamic `innerHTML` menjadi `textContent`/DOM creation untuk data spreadsheet.
- Jika butuh HTML, escape semua dynamic values.
- Review `renderBreakdown`, `renderAlerts`, `renderNotes`.

**Acceptance criteria:**

- Test string `<img onerror=...>` tampil sebagai teks, bukan HTML aktif.
- Tidak ada dynamic spreadsheet value masuk `innerHTML` tanpa escape.

## Sprint 2 — Pilot Reliability Backlog

### P1-1 — Cache dashboard payload

**Business impact:** High — dashboard lebih cepat dan hemat quota.

**Tasks:**

- Cache per tenant/clinic/period.
- TTL 60–300 detik.
- Invalidate setelah import/compute.

**Acceptance criteria:**

- Refresh dashboard kedua tidak membaca raw sheet penuh.
- Cache bust setelah import.

---

### P1-2 — Import guardrails

**Business impact:** High — mengurangi gagal import saat pilot.

**Tasks:**

- Limit file size, row count, sheet count.
- Validasi MIME/extension dan reject unsupported.
- Log import duration, rows read/written/failed.
- Prefer CSV mode untuk pilot.

**Acceptance criteria:**

- File over limit ditolak sebelum conversion.
- Error import actionable.
- SYNC_LOG lengkap.

---

### P1-3 — Data Quality rules as blocking gate

**Business impact:** High — angka lebih dipercaya.

**Tasks:**

- Pindahkan rule penting ke active path.
- Critical validation blocks final KPI.
- Dashboard menampilkan reason per metric.

**Acceptance criteria:**

- Missing amount/date critical.
- Sensitive patient fields blocked.
- KPI marked incomplete jika DQ critical open.

---

### P1-4 — Test suite minimum untuk pilot

**Business impact:** High — mengurangi regresi.

**Tasks:**

- Test tenant isolation.
- Test import validation.
- Test finance data/trace status.
- Test journal debit/credit tolerance.
- Test dashboard escaping.

**Acceptance criteria:**

- `runAllTests` punya suite selain assertion utility/smoke.
- Test result terdokumentasi sebelum deploy.

## Sprint 3 — Maintainability Cleanup

### P2-1 — Extract active DataQualityService dan AccountingTraceabilityService

**Business impact:** Medium/High — maintainability dan trust.

**Tasks:**

- Ubah placeholder menjadi service nyata.
- Pindahkan logic dari KpiEngine jika sudah stabil.
- Keep API behavior same; no new feature.

**Acceptance criteria:**

- KpiEngine lebih kecil.
- Traceability/DQ bisa ditest isolated.

---

### P2-2 — Standardize API response shape

**Business impact:** Medium — memudahkan UI/MCP/AI nanti.

**Tasks:**

- Format `{ ok, data, error, meta }`.
- Error code standardized.
- Dashboard handles sanitized errors.

**Acceptance criteria:**

- Semua API actions konsisten.
- User-facing error tidak bocor stack/detail internal.

---

### P2-3 — Performance budget and row-count benchmarks

**Business impact:** Medium — tahu batas GAS sebelum pilot besar.

**Tasks:**

- Buat fixture benchmark 1k/5k/10k rows.
- Ukur import, compute, dashboard load.
- Tetapkan pilot limit dari data, bukan asumsi.

**Acceptance criteria:**

- Ada performance baseline.
- Ada documented max supported rows untuk pilot.

## Urutan Eksekusi Direkomendasikan

1. Source-of-truth freeze.
2. Security manifest/API lockdown.
3. Tenant/session enforcement.
4. Finance trust gate audit.
5. LockService for write path.
6. XSS hardening.
7. Cache/dashboard performance.
8. Import guardrails.
9. DQ blocking gate.
10. Tests.

## Yang Tidak Dikerjakan Sprint Ini

- Tidak menambah AI insight baru.
- Tidak menambah Telegram/WhatsApp/MCP capability.
- Tidak menambah dashboard BPJS/pharmacy baru.
- Tidak membuat analytics baru.
- Tidak mengoptimasi premature di luar hot path pilot.

## Sprint Risk

| Risk | Impact | Mitigation |
|---|---|---|
| Fix security mematahkan demo anonymous | Medium | Buat mode synthetic demo terpisah dari pilot data nyata |
| Source-of-truth decision memerlukan reorganisasi | High | Freeze dulu, refactor bertahap |
| GAS limit tetap sempit | High | Batasi pilot row count dan prefer CSV |
| Tenant auth sulit di consumer Google context | High | Gunakan restricted deployment atau signed token sementara |
| Hardening dianggap tidak terlihat sebagai fitur | Medium | Report before/after risk reduction ke stakeholder |

## Sprint Output

Dokumen/artefak yang harus ada di akhir sprint:

- Deployment/source-of-truth note.
- Security checklist result.
- Tenant isolation test result.
- Performance baseline kecil.
- Updated risk register.
- Test run summary.
