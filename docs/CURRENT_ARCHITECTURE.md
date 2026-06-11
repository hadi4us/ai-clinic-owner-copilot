# CURRENT_ARCHITECTURE.md

## Scope Review

Project Health Check ini meninjau kode yang sudah ada untuk **AI Clinic Owner Copilot** tanpa menambah fitur baru. Fokus review:

- Google Apps Script runtime dan deployment manifest.
- Spreadsheet-backed data warehouse.
- Import pipeline Excel/CSV.
- KPI/finance/dashboard services.
- Multi-tenant guardrail.
- Security, quota, performance, dan maintainability risk.

## Ringkasan Arsitektur Saat Ini

Aplikasi saat ini adalah **Google Apps Script Web App + Google Sheets sebagai data warehouse**.

Alur utama:

1. User membuka Web App Apps Script.
2. `doGet(e)` melayani dashboard HTML atau endpoint JSON sederhana seperti health/setup/compute/dashboardPayload.
3. Dashboard HTML memakai `google.script.run` untuk load payload dan upload file.
4. Upload Excel/CSV masuk ke `ImportService`.
5. Data dinormalisasi ke sheet warehouse seperti `PENDAPATAN`, `BIAYA`, `KUNJUNGAN`, `TINDAKAN`, `RESEP`, `BPJS_KLAIM`, `PERSEDIAAN`, `PAJAK`.
6. `KpiEngine` membaca sheet warehouse, menghitung KPI bulanan/harian, lalu menulis ke `KPI_BULANAN`, `KPI_HARIAN`, dan `ALERT_LOG`.
7. Dashboard service membaca KPI dan breakdown dari spreadsheet.
8. Modul finance modular di `src/Finance` membaca journal/ledger/reporting sheet jika tersedia, tetapi sebagian masih belum menjadi implementasi aktif di deployable tree.

## Struktur Kode

Ada dua source tree paralel:

### 1. `gas/src`

Ini tampak sebagai tree deployable Apps Script aktif karena berisi manifest, API, dashboard, import service, KPI engine, schema, setup, test, dan utility.

Karakteristik:

- Lebih POC/MVP.
- Banyak fungsi langsung membaca/menulis SpreadsheetApp.
- Config hardcoded untuk spreadsheet default dan tenant default.
- `doGet` expose endpoint setup/compute/resetFixture/dashboardPayload.

### 2. `src`

Ini tampak sebagai tree modular/canonical target dengan folder `API`, `Auth`, `Core`, `Dashboard`, `DataWarehouse`, `Finance`, `MCP`, `Setup`, `Tests`, dan `Views`.

Karakteristik:

- Lebih rapi secara layering.
- Ada `SessionManager`, `Security`, `Logger`, `ValidationService`, finance services.
- Banyak file adalah duplikasi dari `gas/src`, sementara beberapa modul hanya placeholder.
- Belum jelas apakah `src` otomatis dibundling/deploy ke GAS atau hanya source canonical.

## Komponen Utama

### API Layer

File utama: `gas/src/Api.js`, `src/API/Api.gs`.

Endpoint/action yang terlihat: `health`, `setup`, `compute`, `dashboardPayload`, `resetFixture`, dan POST `upload`.

Catatan arsitektur:

- Endpoint menerima `tenantId`, `clinicId`, dan `period` dari query parameter dengan fallback ke default tenant/clinic.
- Tidak ada routing/auth middleware tunggal.
- Web app manifest mengatur `access: ANYONE_ANONYMOUS` dan `executeAs: USER_DEPLOYING`, sehingga API dan dashboard berjalan dengan privilege deployer.

### Config Layer

- `gas/src/Config.js` sederhana dan hardcoded: spreadsheet id, default tenant, default clinic, timezone.
- `src/Core/Config.gs` lebih lengkap dan sudah punya Script Properties helper.
- Namun deployable `gas/src/SpreadsheetService.js` tetap memakai `APP_CONFIG.spreadsheetId`, bukan config dari Script Properties.

### Data Warehouse / Spreadsheet Layer

Pola utama:

- `SpreadsheetApp.openById(...)`
- `getDataRange().getValues()` untuk membaca seluruh sheet.
- `setValues(...)` untuk append batch.
- `clearContent()` + append ulang untuk replace/upsert.
- Schema berupa array header per sheet.

Sheet utama mencakup master data, import/log, warehouse klinik, KPI, alert, user access, dan settings.

### Import Pipeline

Alur:

1. Decode base64 upload.
2. Buat batch import.
3. CSV diproses langsung.
4. Excel dikonversi via Advanced Drive Service `Drive.Files.insert(..., { convert: true })` ke temporary Google Sheet.
5. Data dibaca dengan `getDataRange().getValues()`.
6. Rows dipetakan ke canonical sheets.
7. Validation log ditulis untuk error.
8. KPI langsung dihitung ulang setelah import.

Catatan: import pipeline masih POC, belum ada preview/mapping approval, belum ada lock untuk concurrent imports, dan sangat tergantung quota Drive conversion.

### KPI / Finance Metrics

`computePocKpis(tenantId, clinicId, period)` membaca banyak sheet secara penuh, filter tenant/clinic/period di memory, lalu menulis ulang KPI dan alerts.

Data status dihitung sederhana dari revenue, expense count, dan trace status. Trace status dihitung dari `source_row_id`, `import_id`, dan `trace_status` row final.

### Finance Engine Modular

`src/Finance` sudah punya service untuk journal, ledger, profit/loss, balance sheet, cashflow, dan shared finance common. Namun beberapa modul penting masih placeholder: `AccountingTraceability.gs`, `DataQualityService.gs`, `COAService.gs`, dan beberapa MCP tools.

Beberapa service memberi `TRACEABLE` hanya karena rows/journal ada, belum membuktikan traceability penuh source-to-journal-to-report.

### Dashboard Layer

Dashboard POC menampilkan revenue, profit, cost, margin, breakdown, trend, alerts, dan upload Excel/CSV. Executive dashboard menyusun finance, BPJS, inventory risk, growth trend, dan caveat.

Risiko utama: HTML memakai `innerHTML` dengan data dinamis, ada beberapa view placeholder, dan dashboard/API source-of-truth masih bercabang.

### Auth / Session / Multi-Tenant

Ada guardrail helper seperti `assertTenantScope_`, `requireSession_`, `requireClinicAccess_`, `assertTenantScopedRow_`. Namun session MVP memakai default tenant/clinic dan role OWNER. Pada web app anonymous/execute-as-deployer, `Session.getActiveUser().getEmail()` tidak cukup sebagai auth boundary.

## Dependency dan Scope Manifest

Manifest Apps Script:

- Advanced Service: Drive v2.
- OAuth scopes: spreadsheets, drive.file, script.external_request.
- Webapp: `executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS`.

Risiko utama: `ANYONE_ANONYMOUS` + `USER_DEPLOYING` adalah kombinasi high-risk untuk data klinik jika endpoint action tidak diamankan.

## Status Kesiapan Arsitektur

### Kuat untuk POC internal

- Struktur sheet dan KPI dasar sudah jelas.
- Import CSV/Excel dasar sudah ada.
- Dashboard revenue/profit sudah runnable.
- Ada upaya pada tenant_id, trace_status, data_status, audit log, dan schema.

### Belum siap untuk pilot eksternal/multi-klinik aman

- Deployment anonymous dengan privilege deployer.
- Source tree duplikatif.
- Auth/RBAC belum enforcement nyata di active path.
- Spreadsheet access full-scan akan cepat bottleneck.
- No locking/caching/queueing untuk import dan recompute.
- Finance traceability/data quality belum menjadi gate menyeluruh.

## Architecture Risk Rating

| Area | Rating | Alasan |
|---|---:|---|
| POC dashboard | Medium | Cukup untuk demo internal, tapi XSS/auth risk perlu ditutup. |
| Spreadsheet warehouse | High | Full-scan, replace whole sheet, quota/runtime risk. |
| Multi-tenant | High | Schema ada, enforcement belum konsisten dan auth belum nyata. |
| Security | Critical | Anonymous web app execute-as-deployer. |
| Finance trustability | High | Traceability/data quality sebagian belum gate. |
| Maintainability | High | Dua source tree paralel + placeholder modules. |
| Scalability | High | GAS + Sheets masih cocok POC, belum cocok multi-tenant production. |
