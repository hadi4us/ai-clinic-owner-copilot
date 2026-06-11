# PERFORMANCE_REVIEW.md

## Performance Verdict

**Status: cukup untuk POC kecil, berisiko tinggi untuk pilot data nyata dan multi-tenant.**

Bottleneck utama:

- Full-sheet reads dengan `getDataRange().getValues()`.
- Whole-sheet rewrite untuk upsert/replace.
- Import Excel memakai Drive conversion.
- Tidak ada LockService untuk write contention.
- Tidak ada CacheService untuk dashboard read-heavy.
- Compute KPI membaca banyak sheet sekaligus dan filter di memory.
- Google Apps Script runtime/quota tidak cocok untuk data besar/multi-tenant tanpa pembatasan.

## Google Apps Script Quota Risks

### PERF-001 — Runtime timeout saat import + recompute

**Lokasi:** `ImportService`, `KpiEngine`

Alur import saat ini:

1. Decode base64.
2. Convert Excel via Drive jika XLSX.
3. Read all sheet data.
4. Append normalized rows.
5. Compute KPI langsung.
6. Write KPI dan alerts.

**Risiko:** High

Satu action upload dapat melakukan banyak operasi berat. Jika file SIM besar, runtime Apps Script dapat timeout.

**Rekomendasi:**

- Tetapkan hard limit row/file size untuk pilot.
- Pisahkan import dan recompute menjadi step terpisah jika besar.
- Untuk GAS-only: gunakan batch chunks dan progress status sheet.
- Untuk jangka menengah: pindahkan parsing/ETL berat ke backend lain.

---

### PERF-002 — Drive conversion quota/reliability risk

**Lokasi:** `Drive.Files.insert(..., { convert: true })`

**Risiko:** High

Excel conversion memakai Advanced Drive Service. Risiko:

- Quota Drive conversion.
- Variasi format Excel/vendor.
- Temporary file cleanup failure.
- Latency tinggi.

**Rekomendasi:**

- Batasi file Excel untuk POC.
- Prefer CSV normalized export saat pilot.
- Tampilkan import preflight dan clear error.
- Track conversion duration/failure di `SYNC_LOG`.

---

### PERF-003 — Spreadsheet service calls berulang

**Lokasi:** `getWarehouseSpreadsheet_`, `ensureSheet_`, `getRowsAsObjects_`

**Temuan:**

- `SpreadsheetApp.openById` dipanggil lewat helper setiap read/write.
- `ensureSheet_` menulis ulang header dan formatting.
- Banyak service membaca sheet satu per satu.

**Risiko:** Medium/High

Apps Script service calls mahal. Banyak calls akan memperlambat dashboard/import dan mendekati quota.

**Rekomendasi:**

- Cache spreadsheet object dalam execution scope.
- Jangan set header/autoResize pada setiap append.
- Pisahkan setup schema dari runtime write.
- Hindari formatting operations di hot path.

## Spreadsheet Performance Risks

### PERF-004 — Full-sheet read untuk semua query

**Lokasi:** `SpreadsheetService.getRowsAsObjects_`, `ExecutiveDashboardService.readExecutiveSheetAsObjects_`

Pola:

- `sheet.getDataRange().getValues()`
- filter tenant/clinic/period di memory.

**Risiko:** High

Semakin banyak row, semua dashboard/API makin lambat. Multi-tenant memperparah karena setiap tenant query tetap membaca semua tenant.

**Rekomendasi:**

- Simpan KPI agregat per tenant/clinic/period dan dashboard baca agregat saja.
- Untuk raw data, partisi sheet per domain/periode/tenant jika tetap di Sheets.
- Gunakan key-index sheet untuk row lookup.
- Tambahkan row count guardrails.

---

### PERF-005 — Whole-sheet rewrite untuk upsert

**Lokasi:** `replaceObjects_`, `upsertKpiBulanan_`, `computePocDailyKpis_`, `writePocAlerts_`

Pola:

- Read all rows.
- Filter remove target.
- `clearContent()` all data.
- Append all rows kembali.

**Risiko:** High

Ini rentan timeout dan data race. Semakin besar sheet, satu KPI update menjadi O(n) rewrite.

**Rekomendasi:**

- Implement row-key index untuk update only matching row.
- Append-only event log + materialized KPI sheet lebih aman.
- Jika rewrite tetap perlu, lock dan limit sheet size.

---

### PERF-006 — KPI compute O(number of all rows across multiple sheets)

**Lokasi:** `computePocKpis`

Sheet yang dibaca:

- `KUNJUNGAN`
- `PENDAPATAN`
- `TINDAKAN`
- `RESEP`
- `BIAYA`
- `BPJS_KLAIM`
- `PERSEDIAAN`
- `PAJAK`
- `KPI_BULANAN`
- `KPI_HARIAN`
- `ALERT_LOG`

**Risiko:** High

Satu compute period membaca banyak sheet penuh. Pada pilot multi-bulan atau multi-tenant, compute akan lambat.

**Rekomendasi:**

- Compute hanya untuk import batch/period yang berubah.
- Materialize intermediate summaries saat import.
- Cache previous KPI.
- Batasi compute manual pada one tenant/one period.

---

### PERF-007 — Dashboard reads raw data untuk breakdown

**Lokasi:** `DashboardService.buildRevenueBreakdown_`, `buildCostBreakdown_`

**Temuan:**

- Breakdown membaca `PENDAPATAN` dan `BIAYA` raw rows.
- Filter in memory.

**Risiko:** Medium/High

Dashboard load akan ikut lambat seiring data raw tumbuh.

**Rekomendasi:**

- Precompute revenue/cost breakdown per period.
- Dashboard baca summary/breakdown materialized, bukan raw rows.

## Multi-Tenant Performance Risks

### PERF-008 — Shared spreadsheet untuk semua tenant akan degrade cepat

**Temuan:**

- Schema mendukung tenant_id, tapi storage masih satu spreadsheet default.
- Query filter tenant di memory setelah read.

**Risiko:** High

Jika tenant bertambah, semua tenant saling mempengaruhi performa dan quota.

**Rekomendasi:**

- Untuk pilot: satu spreadsheet per pilot tenant atau per clinic jika memungkinkan.
- Untuk SaaS: pertimbangkan database/backend, bukan Google Sheets shared multi-tenant.
- Minimal: partition sheet names by tenant for data-heavy tables.

---

### PERF-009 — No LockService untuk concurrent writes

**Temuan:**

- Tidak terlihat `LockService`.

**Risiko:** High

Concurrent upload/compute bisa saling overwrite terutama karena `replaceObjects_`.

**Rekomendasi:**

- Tambahkan lock per script/tenant/clinic untuk write path.
- Gunakan retry/backoff singkat.
- Surface “import sedang berjalan” ke user.

---

### PERF-010 — No CacheService untuk read-heavy dashboard

**Temuan:**

- Tidak terlihat `CacheService`.

**Risiko:** Medium/High

Dashboard refresh berulang akan memukul spreadsheet langsung.

**Rekomendasi:**

- Cache dashboard payload per tenant/clinic/period.
- TTL 60–300 detik.
- Invalidate setelah import/compute.

## Maintainability-Performance Coupling

Beberapa performance debt muncul karena maintainability debt:

- Dua source tree membuat optimasi bisa diterapkan di tree yang salah.
- Placeholder DataQuality/Traceability membuat compute status belum final.
- Tidak ada abstraction yang membedakan hot path vs setup path.
- Tests belum mengukur row-count/time budget.

## Pilot Performance Guardrails

Sebelum pilot, tetapkan batas eksplisit:

- Max file size upload.
- Max rows per import.
- Max sheets per Excel.
- Max tenants per spreadsheet.
- Max months of raw data loaded.
- Dashboard payload target latency.
- Import target latency.
- Fallback manual if import exceeds limit.

Recommended pilot limits awal:

- 1 tenant/clinic per spreadsheet.
- 1–3 bulan data awal.
- Prefer CSV over XLSX.
- Import batch maksimal beberapa ribu rows sampai diuji.
- Dashboard hanya baca KPI/materialized summary.

## Performance Risk Register

| Priority | ID | Finding | Risk | Recommendation |
|---|---|---|---|---|
| P0 | PERF-001 | Import + recompute in one runtime | Timeout | Limit/chunk/decouple |
| P0 | PERF-004 | Full-sheet reads | Slow/quota | Filtered/materialized reads |
| P0 | PERF-005 | Whole-sheet rewrite | Timeout/data race | Row-key update + lock |
| P0 | PERF-006 | KPI reads many full sheets | Slow compute | Incremental summaries |
| P1 | PERF-002 | Drive conversion quota | Import failure | Prefer CSV/limits/logging |
| P1 | PERF-008 | Shared spreadsheet multi-tenant | Cross-tenant perf impact | Per tenant sheet/spreadsheet |
| P1 | PERF-009 | No LockService | Race condition | Lock write path |
| P1 | PERF-010 | No CacheService | Slow dashboard | Cache payload |
| P2 | PERF-003 | Repeated service calls/header formatting | Latency | Cache/open once/setup only |
| P2 | PERF-007 | Dashboard raw breakdown reads | Slow UI | Precompute breakdown |
