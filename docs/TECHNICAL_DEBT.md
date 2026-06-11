# TECHNICAL_DEBT.md

## Ringkasan Eksekutif

Technical debt terbesar saat ini bukan kurang fitur, melainkan **ketidakjelasan source-of-truth, guardrail finance/security yang belum konsisten, dan pola SpreadsheetApp yang akan cepat mentok quota/performance**.

Prioritas debt berdasarkan dampak bisnis:

1. Amankan deployment dan tenant boundary.
2. Tetapkan satu source-of-truth kode.
3. Jadikan data quality + accounting traceability sebagai gate, bukan hanya label.
4. Refactor spreadsheet access agar tidak full-scan/whole-sheet rewrite.
5. Lengkapi test harness dan deployment discipline.

## P0 — Harus Diselesaikan Sebelum Pilot Eksternal

### TD-001 — Dua source tree paralel tanpa source-of-truth jelas

**Lokasi:** `gas/src/*`, `src/*`

**Temuan:**

- Banyak file punya versi ganda:
  - `gas/src/ImportService.js` dan `src/DataWarehouse/ImportService.gs`
  - `gas/src/KpiEngine.js` dan `src/Finance/KpiEngine.gs`
  - `gas/src/DashboardService.js` dan `src/Dashboard/DashboardService.gs`
  - `gas/src/SpreadsheetService.js` dan `src/DataWarehouse/SheetRepository.gs`
- `gas/src` tampak deployable, sementara `src` lebih modular.
- Beberapa file modular sudah punya security/session/logger lebih matang, tapi active path POC belum konsisten memakainya.

**Dampak bisnis:**

Bug/security fix bisa ditulis di tree yang salah lalu tidak ikut deploy. Ini berisiko tinggi saat pilot karena behavior production tidak sesuai review.

**Rekomendasi:**

- Tetapkan satu canonical source.
- Jika `src` canonical, buat build/deploy script ke `gas/src`.
- Jika `gas/src` canonical untuk POC, freeze `src` sebagai reference dan jangan edit dua-duanya manual.
- Tambahkan `docs/DEPLOYMENT_SOURCE_OF_TRUTH.md` atau update deployment doc.

---

### TD-002 — Deployment path aktif belum memakai security layer penuh

**Lokasi:** `gas/src/Api.js`, `gas/src/Utils.js`, `src/Core/Security.gs`, `src/Auth/SessionManager.gs`

**Temuan:**

- `src/Core/Security.gs` punya `requireSession_`, `requireRole_`, `requireClinicAccess_`, `assertNoSensitivePatientFields_`.
- Namun `gas/src/Api.js` langsung menerima action dan parameter tenant/clinic dengan fallback default.
- Active POC path lebih banyak memakai `assertTenantScope_`, bukan session/RBAC penuh.

**Dampak bisnis:**

Tenant isolation terlihat ada di schema, tapi belum menjadi enforcement end-to-end. Ini debt besar untuk aplikasi klinik karena data finansial dan operasional sensitif.

**Rekomendasi:**

- Semua entrypoint `doGet`, `doPost`, `google.script.run` harus resolve session dulu.
- Tenant/clinic dari request tidak boleh dipercaya langsung.
- Role dan clinic access harus divalidasi sebelum compute/import/read.

---

### TD-003 — Finance traceability belum menjadi execution gate menyeluruh

**Lokasi:** `gas/src/KpiEngine.js`, `src/Core/Security.gs`, `src/Finance/*`

**Temuan:**

- Ada helper `assertFinanceTraceability_` di `src/Core/Security.gs`.
- `computePocKpis` menghitung `trace_status` dari `source_row_id`, `import_id`, dan `trace_status` row final.
- Beberapa finance service modular memberi `trace_status: TRACEABLE` ketika rows/journal ada, bukan berdasarkan map lengkap dari source row ke journal line dan report line.
- Placeholder `src/Finance/AccountingTraceability.gs` menyatakan logic masih hidup di KpiEngine/future extraction.

**Dampak bisnis:**

Owner bisa menganggap angka final padahal belum dapat diaudit dari sumber. Ini langsung menyerang trust produk.

**Rekomendasi:**

- Definisikan traceability contract final:
  - source file/import id
  - source row id
  - normalized warehouse row id
  - journal entry id
  - journal line id
  - report/kpi id
- Final finance report hanya boleh `complete/traceable` jika semua link terpenuhi.
- Dashboard boleh menampilkan estimate, tapi label/caveat harus keras.

---

### TD-004 — Data Quality Service masih placeholder

**Lokasi:** `src/Finance/DataQualityService.gs`, `gas/src/ImportService.js`, `src/DataWarehouse/ValidationService.gs`

**Temuan:**

- `ValidationService` sudah ada untuk required field, tenant mismatch, unknown field, sensitive fields, numeric/date/period type.
- `ImportService` punya validation sederhana dan menulis `VALIDATION_LOG`.
- `DataQualityService.gs` masih placeholder.
- KPI computation tetap bisa berjalan setelah import meskipun data incomplete/estimated.

**Dampak bisnis:**

Dashboard bisa tampil “meyakinkan” meskipun input data tidak lengkap. Ini risiko churn pilot.

**Rekomendasi:**

- Data quality rule harus punya severity dan blocking behavior.
- P0 rules: missing revenue date/amount, missing expense date/amount, invalid tenant/clinic, sensitive patient fields, untraceable finance row.
- KPI final harus blocked/downgraded jika DQ critical open.

---

### TD-005 — Spreadsheet repository memakai full-sheet read dan whole-sheet rewrite

**Lokasi:** `gas/src/SpreadsheetService.js`, `src/DataWarehouse/SheetRepository.gs`, `gas/src/KpiEngine.js`

**Temuan:**

- `getRowsAsObjects_` membaca `sheet.getDataRange().getValues()` seluruh sheet.
- `replaceObjects_` clear data lalu append ulang.
- `upsertKpiBulanan_` membaca semua KPI, filter di memory, lalu rewrite semua.
- KPI harian juga rewrite subset plus concat existing rows.

**Dampak bisnis:**

Pada data pilot nyata, Apps Script bisa timeout atau kena quota. Import dan dashboard akan terasa lambat/gagal.

**Rekomendasi:**

- Tambah index/partition per period/tenant jika tetap di Sheets.
- Minimal: batasi range read by known last row/columns dan helper filtered reads.
- Hindari whole-sheet rewrite untuk upsert; gunakan key-index update row.
- Pertimbangkan sheet per tenant/period untuk POC jika dataset tumbuh.

---

## P1 — Penting Untuk Stabilitas Pilot

### TD-006 — Tidak ada locking untuk operasi write/import/compute

**Lokasi:** import dan KPI write path.

**Temuan:**

- Review grep tidak menemukan penggunaan `LockService`.
- Import bisa append dan recompute KPI bersamaan.
- `replaceObjects_` rentan race condition.

**Dampak bisnis:**

Dua upload/compute bersamaan bisa menghasilkan data hilang, KPI salah, atau duplicate rows.

**Rekomendasi:**

- Gunakan `LockService.getScriptLock()` atau tenant/clinic lock convention.
- Lock write path: setup, import, KPI recompute, reset fixture.
- Timeout lock harus ditangani dengan pesan user jelas.

---

### TD-007 — Tidak ada cache untuk dashboard read-heavy

**Lokasi:** `DashboardService`, `ExecutiveDashboardService`, spreadsheet reads.

**Temuan:**

- Review grep tidak menemukan `CacheService`.
- Dashboard membaca KPI, alerts, daily trend, breakdown dari spreadsheet setiap load.

**Dampak bisnis:**

Dashboard lambat dan quota cepat habis saat demo/pilot dengan beberapa user.

**Rekomendasi:**

- Cache dashboard payload per tenant/clinic/period 1–5 menit.
- Bust cache setelah import/recompute.
- Cache schema/header maps.

---

### TD-008 — Config hardcoded di deployable tree

**Lokasi:** `gas/src/Config.js`, `gas/src/SpreadsheetService.js`

**Temuan:**

- Spreadsheet ID hardcoded.
- Default tenant/clinic hardcoded.
- `src/Core/Config.gs` punya Script Properties helper, tapi active deployable tree belum memakainya.

**Dampak bisnis:**

Sulit memisahkan dev/staging/pilot data. Risiko salah deploy ke spreadsheet produksi/demo.

**Rekomendasi:**

- Semua environment-sensitive config pindah ke Script Properties.
- Manifest/deployment harus mendokumentasikan required properties.
- Jangan hardcode spreadsheet ID untuk pilot eksternal.

---

### TD-009 — Advanced Drive Excel conversion menambah quota dan reliability debt

**Lokasi:** `gas/src/ImportService.js`

**Temuan:**

- Excel dikonversi dengan `Drive.Files.insert(..., { convert: true })`.
- Temporary file di-trash setelah read.
- Jika conversion gagal/timeout, import gagal.

**Dampak bisnis:**

Pilot import bisa gagal untuk file besar/format aneh, sementara user menganggap produk tidak bisa membaca SIM export.

**Rekomendasi:**

- Batasi ukuran upload dan sheet count.
- Tambah preflight validation sebelum conversion.
- Catat conversion failure dengan pesan actionable.
- Untuk skala lanjut, pindahkan parsing Excel ke backend non-GAS.

---

### TD-010 — Test coverage masih smoke/minimal

**Lokasi:** `gas/src/Tests.js`, `src/Tests/SmokeTest.gs`, `tests/TestRunner.gs`

**Temuan:**

- Ada test runner dan smoke test.
- Belum terlihat test untuk multi-tenant isolation, DQ gate, traceability gate, import malformed file, quota-safe batching, XSS escaping.

**Dampak bisnis:**

Regresi pada angka finance/security bisa lolos sampai pilot.

**Rekomendasi:**

- Tambahkan unit test pure helper.
- Tambahkan integration test berbasis fixture spreadsheet.
- Wajib test P0 sebelum pilot.

---

## P2 — Maintainability / Scale Debt

### TD-011 — Banyak placeholder module membuat status implementasi bias

**Lokasi:** `src/Finance/COAService.gs`, `src/Finance/DataQualityService.gs`, `src/MCP/*`, `src/Views/*`

**Temuan:**

- Beberapa file 3–7 baris hanya comment placeholder.
- Ini membuat folder terlihat lebih matang daripada implementasi sebenarnya.

**Dampak bisnis:**

Planning sprint bisa salah estimasi karena modul dikira sudah ada.

**Rekomendasi:**

- Tandai placeholder dengan status `NOT_IMPLEMENTED` di backlog/docs.
- Pisahkan implemented vs planned modules.

---

### TD-012 — API contract belum distandardisasi

**Lokasi:** `Api.js`, dashboard services, finance services.

**Temuan:**

- Response shape bervariasi: `ok`, `summary`, `data`, `cards`, `caveat`, direct payload.
- Error handling masih throw/alert sederhana.

**Dampak bisnis:**

Frontend dan integrasi AI/MCP akan sulit stabil.

**Rekomendasi:**

- Standarkan `{ ok, data, error, meta }`.
- Semua errors harus punya code, message, severity, retryable.

---

### TD-013 — UI rendering belum punya escaping helper

**Lokasi:** `Dashboard.html`, `src/Views/dashboard.html`

**Temuan:**

- HTML memakai `innerHTML` dengan data dari spreadsheet/import.
- Tidak terlihat escaping helper untuk dynamic fields.

**Dampak bisnis:**

SIM export/vendor data bisa menyisipkan HTML/script yang tampil di dashboard.

**Rekomendasi:**

- Default pakai `textContent` untuk dynamic string.
- Jika butuh HTML, sanitize/escape semua data.

---

## Debt Register Prioritas

| Priority | ID | Debt | Business Impact | Fix Window |
|---|---|---|---|---|
| P0 | TD-001 | Source-of-truth ganda | Fix tidak ikut deploy | Sprint 1 |
| P0 | TD-002 | Security layer tidak end-to-end | Data leak/cross tenant | Sprint 1 |
| P0 | TD-003 | Traceability bukan gate | Owner trust runtuh | Sprint 1 |
| P0 | TD-004 | Data quality placeholder | Angka misleading | Sprint 1 |
| P0 | TD-005 | Full scan/rewrite Sheets | Timeout saat pilot | Sprint 1 |
| P1 | TD-006 | No LockService | Race condition write | Sprint 2 |
| P1 | TD-007 | No CacheService | Dashboard lambat/quota | Sprint 2 |
| P1 | TD-008 | Hardcoded config | Salah env/data | Sprint 2 |
| P1 | TD-009 | Drive conversion fragile | Import gagal | Sprint 2 |
| P1 | TD-010 | Test minimal | Regresi lolos | Sprint 2 |
| P2 | TD-011 | Placeholder modules | Salah estimasi | Sprint 3 |
| P2 | TD-012 | API shape bervariasi | Integrasi sulit | Sprint 3 |
| P2 | TD-013 | UI escaping belum standar | XSS | Sprint 3 |
