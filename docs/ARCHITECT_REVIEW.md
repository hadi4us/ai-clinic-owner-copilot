# Architect Review — AI Clinic CFO Copilot

## Status Review

- Project: **AI Clinic CFO Copilot / AI Clinic Owner Copilot**
- Review date: 2026-06-09
- Scope: architecture and documentation review only.
- Coding status for this request: **no new code created**.
- Primary source of truth reviewed:
  - `CLAW.md`
  - `docs/00-VISION.md`
  - `docs/01-BLUEPRINT.md`
  - `docs/03-SYSTEM-DESIGN.md`
  - `docs/05-MCP.md`
  - `docs/07-DATABASE.md`
- Supporting documents also reviewed:
  - `README.md`
  - `docs/02-BUSINESS-REQUIREMENTS.md`
  - `docs/04-DATA-ARCHITECTURE.md`
  - `docs/06-AGENTS.md`
  - `docs/08-DASHBOARD.md`
  - `docs/09-AI-INSIGHTS.md`
  - `docs/10-ROADMAP.md`
  - `docs/11-SECURITY.md`
  - `docs/12-MULTITENANCY.md`
  - `docs/13-COA.md`
  - `docs/14-TAX-ENGINE.md`
  - implementation/detail docs under `docs/`
  - spreadsheet schema and mapping docs under `sheets/`
  - fixture expectations under `tests/fixtures/`

---

## 1. Ringkasan Pemahaman Proyek

AI Clinic CFO Copilot adalah **SaaS Business Intelligence dan AI Assistant untuk owner klinik** yang bekerja di atas data SIM Klinik existing. Produk ini bukan pengganti SIM Klinik, bukan EMR, bukan sistem pendaftaran pasien, bukan billing system, dan bukan kasir.

Produk diposisikan sebagai lapisan analitik dan assistant bisnis yang membantu owner menjawab pertanyaan seperti:

1. Berapa laba klinik saya?
2. Mengapa laba naik atau turun?
3. Dokter mana paling menguntungkan?
4. Poli mana paling menguntungkan?
5. Berapa piutang BPJS yang belum cair?
6. Obat apa yang berpotensi menjadi kerugian?
7. Bagaimana tren pertumbuhan klinik?

### Prinsip Non-Negotiable

Berdasarkan `CLAW.md`, prinsip utama proyek adalah:

- **Zero double entry**: staff tetap input data operasional hanya di SIM Klinik.
- **SIM Klinik sebagai source of truth**: data berasal dari export, API, atau sync read-only.
- **Read-only connector**: sistem tidak boleh melakukan writeback ke SIM Klinik.
- **Owner-first**: semua fitur harus menjawab kebutuhan bisnis owner.
- **Mobile-first**: insight penting harus nyaman di smartphone, Telegram, atau WhatsApp.
- **Tenant-safe from day one**: semua sheet, query, API, MCP tool, dashboard, agent, dan report wajib scoped dengan `tenant_id`.
- **Minimize sensitive data**: hindari penyimpanan rekam medis, diagnosis, catatan dokter, dan detail pasien sensitif.
- **Accounting traceability**: seluruh laporan keuangan harus dapat diturunkan dari jurnal akuntansi valid; dashboard tidak boleh menampilkan angka finansial yang tidak bisa ditelusuri ke jurnal/source valid.

### Arsitektur yang Dipahami

Arsitektur target mengikuti alur:

```text
SIM Klinik / Export / API
        ↓
Read-only Integration Layer
        ↓
Google Apps Script
        ↓
Google Spreadsheet Data Warehouse
        ↓
KPI Engine / Analytics Engine
        ↓
metric_* sheets / approved APIs
        ↓
Dashboard / MCP Tools / OpenClaw Agent / Telegram / WhatsApp
```

Phase 1 menggunakan stack ringan:

- Backend: Google Apps Script.
- Data Warehouse: Google Spreadsheet.
- Frontend: HTML Service, Tailwind/vanilla CSS, Chart.js.
- AI Layer: OpenClaw + MCP architecture.
- Integrasi future: Telegram dan WhatsApp.

### Data Model yang Dipahami

Layer data utama:

```text
cfg_*       configuration
raw_*       raw imported source rows
stg_*       cleaned/mapped staging rows
fact_*      normalized business facts
dim_*       dimensions/master data
metric_*    dashboard-ready precomputed metrics
log_*       sync/audit/error logs
```

Prinsip penting:

- Raw source rows harus dipertahankan untuk auditability.
- Dashboard dan AI tidak membaca raw unrestricted data.
- KPI dihitung dari `fact_*` atau `metric_*`.
- `metric_*` dipakai untuk performa dashboard dan MCP response.
- Setiap angka finance harus memiliki trace minimal ke `tenant_id`, `clinic_id`, `period`, `sync_id`, dan source/journal reference.

### MVP Saat Ini yang Sudah Terarah

Dokumentasi menunjukkan Phase 1 diarahkan ke:

1. Spreadsheet Data Warehouse.
2. KPI Engine.
3. Finance Dashboard.

KPI Phase 1 berfokus pada:

- total visits.
- total revenue.
- direct cost.
- operating expense.
- gross profit.
- net profit.
- profit margin.
- growth trend.
- finance breakdown.
- data quality status.

Formula default:

```text
net_profit = total_revenue - direct_cost - operating_expense
gross_profit = total_revenue - direct_cost
profit_margin = net_profit / total_revenue
```

Jika data belum lengkap atau belum auditable, status harus menjadi `estimated` atau `incomplete`, bukan ditampilkan sebagai angka final.

---

## 2. Identifikasi Risiko Arsitektur

### R-001 — Spreadsheet sebagai warehouse akan punya batas skalabilitas

**Risiko:** Google Spreadsheet cocok untuk MVP/pilot, tetapi berisiko saat jumlah tenant, row, dan metric history membesar. Apps Script juga memiliki execution limits.

**Dampak:** dashboard lambat, metric calculation timeout, sync gagal, atau spreadsheet sulit di-maintain.

**Mitigasi:**

- Tetapkan batas MVP row/tenant secara eksplisit.
- Gunakan precomputed `metric_*` untuk dashboard dan AI.
- Gunakan one spreadsheet per tenant pada MVP.
- Dokumentasikan migration path ke BigQuery/Cloud SQL sejak awal.
- Hindari query raw besar saat dashboard load.

### R-002 — Multi-tenant isolation belum cukup jika hanya mengandalkan `tenant_id`

**Risiko:** Semua data punya `tenant_id`, tetapi jika auth/session resolver belum matang, user bisa mencoba request tenant lain lewat parameter.

**Dampak:** kebocoran data lintas klinik.

**Mitigasi:**

- `tenant_id` tidak boleh berasal dari query arbitrary user.
- Buat `TenantContext` resolver dari login/session/config.
- Semua API, dashboard, MCP tools menerima context terverifikasi.
- Tambahkan security tests untuk cross-tenant access denial.
- One spreadsheet per tenant untuk pilot agar blast radius kecil.

### R-003 — Accounting traceability belum cukup kuat di schema Phase 1

**Risiko:** Dokumen sudah menambahkan aturan akuntansi, tetapi schema saat ini masih lebih banyak berbasis fact/metric operasional. Journal-level trace belum lengkap.

**Dampak:** dashboard bisa menghasilkan net profit yang tidak sepenuhnya dapat diturunkan dari jurnal valid.

**Mitigasi:**

- Tambahkan layer `journal_entry` dan `journal_line`, atau minimal `finance_trace_map` untuk Phase 1.
- Tambahkan kolom trace pada `fact_revenue`, `fact_cost`, `fact_expense`, dan `metric_*`.
- Definisikan `data_status` berdasarkan journal/source completeness.
- Tambahkan data quality rule untuk missing journal/source trace.

### R-004 — Definisi laba bisa berbeda antar klinik

**Risiko:** Owner bisa mengharapkan cash-basis, accrual-basis, atau management P&L. BPJS juga bisa dihitung saat pelayanan, claim approved, atau paid.

**Dampak:** angka laba dianggap salah meski formula teknis benar.

**Mitigasi:**

- Tetapkan `profit_basis` pada tenant config.
- Untuk MVP, gunakan satu definisi eksplisit: management P&L accrual-like dari billing export.
- Tampilkan basis perhitungan di dashboard.
- Semua AI answer harus menyebut period dan basis.

### R-005 — Source data SIM Klinik kemungkinan tidak standar

**Risiko:** Format export SIM Klinik tiap vendor/klinik bisa berbeda, tidak konsisten, atau tidak punya field biaya lengkap.

**Dampak:** import gagal, mapping kompleks, metric tidak lengkap.

**Mitigasi:**

- Buat mapping template versioned.
- Prioritaskan satu target SIM/export untuk pilot.
- Buat validation report sebelum metric calculation.
- Raw rows harus selalu disimpan untuk debugging.

### R-006 — Cost allocation bisa menjadi sumber dispute

**Risiko:** Profitability dokter/poli membutuhkan alokasi biaya bersama. Jika aturan tidak transparan, ranking bisa misleading.

**Dampak:** owner salah mengambil keputusan terhadap dokter/poli.

**Mitigasi:**

- MVP V1 jangan memaksa doctor/poli profitability lengkap jika cost allocation belum disepakati.
- Pisahkan direct attribution vs allocated cost.
- Simpan `allocation_method` dan `allocation_rule_id`.
- Tampilkan caveat bila allocation masih estimated.

### R-007 — AI hallucination dan raw data leakage

**Risiko:** AI bisa memberi jawaban finansial tanpa grounding atau mencoba membaca raw sheets.

**Dampak:** jawaban salah, kebocoran data, owner salah keputusan.

**Mitigasi:**

- MCP tools hanya expose approved metrics.
- AI tidak diberi unrestricted spreadsheet access.
- Response AI wajib menyertakan period, tenant/clinic context, data status, dan caveat.
- Audit log untuk setiap AI tool call.

### R-008 — Google Apps Script auth dan deployment complexity

**Risiko:** Deployment Web App, Apps Script authorization, OAuth scopes, dan clasp executable API bisa menjadi friction.

**Dampak:** setup tenant tidak repeatable, deployment error, manual work berulang.

**Mitigasi:**

- Buat deployment runbook final.
- Pisahkan dev/staging/prod script IDs.
- Dokumentasikan manual authorization steps.
- Buat smoke test wajib setelah deploy.

### R-009 — Data privacy pasien

**Risiko:** Meski target aggregate, raw export SIM Klinik bisa mengandung nama pasien, diagnosis, atau info medis.

**Dampak:** compliance/privacy risk.

**Mitigasi:**

- Raw import harus melakukan minimization/pseudonymization bila memungkinkan.
- Jangan expose patient-level data ke dashboard/AI.
- Audit sharing spreadsheet.
- Definisikan field yang dilarang masuk warehouse.

### R-010 — Phase roadmap bisa terlalu cepat melebar

**Risiko:** BPJS, pharmacy, Telegram, AI chat, SaaS billing, connector marketplace, tax engine semuanya menarik tetapi bisa membuat MVP kehilangan fokus.

**Dampak:** delivery lambat, architecture overbuilt, core finance dashboard belum reliable.

**Mitigasi:**

- MVP V1 hanya Finance Dashboard + Data Quality + Traceability.
- BPJS/pharmacy masuk setelah finance pipeline stabil.
- AI insight masuk setelah metric API benar-benar grounded.

---

## 3. Identifikasi Gap Dokumentasi

### G-001 — Accounting journal schema belum lengkap

`CLAW.md` sudah mewajibkan accounting traceability, tetapi `docs/07-DATABASE.md`, `docs/04-DATA-ARCHITECTURE.md`, dan `sheets/schema.md` belum sepenuhnya mendefinisikan:

- `journal_entry`.
- `journal_line`.
- COA account mapping.
- source-to-journal trace.
- metric-to-journal trace.

**Rekomendasi:** tambahkan dokumen khusus atau section baru: `Accounting Traceability Model`.

### G-002 — Auth/session model belum cukup operasional

Dokumen security menyebut Google Login dan Role Based Access, tetapi belum cukup detail tentang:

- bagaimana actor dipetakan ke tenant.
- bagaimana role disimpan.
- bagaimana Apps Script Web App membatasi akses.
- apakah owner bisa langsung akses spreadsheet.
- bagaimana MCP endpoint melakukan authentication.

**Rekomendasi:** detailkan `cfg_user`, `cfg_user_tenant_role`, session resolver, dan access control matrix.

### G-003 — Tenant registry belum masuk schema detail

Deployment plan merekomendasikan master SaaS registry, tetapi schema belum mendefinisikan registry secara final.

**Rekomendasi:** tambahkan `registry_tenant`, `registry_deployment`, dan `registry_integration` untuk SaaS control plane.

### G-004 — Import pipeline belum punya file handling spec detail

Dokumen menyebut CSV/XLSX/Drive file, tetapi belum mendefinisikan:

- file naming convention.
- import folder structure.
- dedupe strategy per file.
- retry strategy.
- partial failure handling.
- schema drift detection.

**Rekomendasi:** buat `docs/15-INTEGRATION-IMPORT.md`.

### G-005 — Data Quality rules belum cukup formal

Sudah ada `metric_data_quality`, tetapi belum ada catalog lengkap rule severity dan pengaruhnya ke `data_status`.

**Rekomendasi:** tambahkan data quality rule catalog:

- missing revenue.
- missing direct cost.
- missing operating expense.
- missing journal trace.
- duplicate source rows.
- negative amount without adjustment type.
- unmapped COA category.
- invalid date.
- cross-tenant row.

### G-006 — KPI lineage belum terdokumentasi detail

KPI formula sudah ada, tetapi lineage dari source row → staging → fact → journal → metric belum lengkap.

**Rekomendasi:** setiap KPI perlu field:

- input sheets.
- required columns.
- trace fields.
- failure mode.
- data quality status rules.

### G-007 — API spec masih conceptual, belum Apps Script-specific

Dokumen API memakai style REST endpoint, padahal Apps Script HTML Service sering memakai `google.script.run` dan `doGet/doPost`.

**Rekomendasi:** bedakan:

- public Web App routes.
- internal HTML Service functions.
- MCP `doPost` endpoint.
- admin/test functions.

### G-008 — MCP security belum punya tool contract final

MCP doc sudah benar secara prinsip, tetapi belum cukup detail untuk implementation:

- input schema per tool.
- output schema per tool.
- allowed roles.
- audit requirements.
- timeout/caching behavior.
- data quality caveat format.

**Rekomendasi:** buat `docs/15-MCP-TOOL-CONTRACTS.md` atau perluas `docs/05-MCP.md`.

### G-009 — Dashboard state dan UX belum punya acceptance criteria detail

Wireframe ada, tetapi perlu detail:

- loading state.
- empty state.
- incomplete/estimated badge.
- mobile breakpoints.
- error handling.
- role-based visibility.

**Rekomendasi:** perluas `docs/08-DASHBOARD.md` dengan component behavior.

### G-010 — Backup, migration, dan retention belum cukup detail

Deployment plan menyebut backup, tetapi belum ada policy:

- backup frequency per tenant.
- retention period.
- export format.
- restore test.
- deletion/offboarding.

**Rekomendasi:** buat `docs/16-OPERATIONS.md`.

---

## 4. Rekomendasi Struktur Folder Final

Struktur yang MasBro berikan sudah tepat sebagai canonical documentation structure. Rekomendasi final adalah mempertahankan struktur tersebut, sambil menambahkan folder operasional untuk GAS, spreadsheet schema, tests, fixtures, dan deployment notes.

```text
AI-Clinic-CFO-Copilot/
├── CLAW.md
├── README.md
├── docs/
│   ├── 00-VISION.md
│   ├── 01-BLUEPRINT.md
│   ├── 02-BUSINESS-REQUIREMENTS.md
│   ├── 03-SYSTEM-DESIGN.md
│   ├── 04-DATA-ARCHITECTURE.md
│   ├── 05-MCP.md
│   ├── 06-AGENTS.md
│   ├── 07-DATABASE.md
│   ├── 08-DASHBOARD.md
│   ├── 09-AI-INSIGHTS.md
│   ├── 10-ROADMAP.md
│   ├── 11-SECURITY.md
│   ├── 12-MULTITENANCY.md
│   ├── 13-COA.md
│   ├── 14-TAX-ENGINE.md
│   ├── ARCHITECT_REVIEW.md
│   ├── 15-INTEGRATION-IMPORT.md              # recommended new doc
│   ├── 16-MCP-TOOL-CONTRACTS.md             # recommended new doc
│   ├── 17-DATA-QUALITY-RULES.md             # recommended new doc
│   ├── 18-ACCOUNTING-TRACEABILITY.md        # recommended new doc
│   └── 19-OPERATIONS.md                     # recommended new doc
├── src/
│   └── README.md                            # logical app source placeholder
├── gas/
│   ├── .clasp.json
│   └── src/
│       ├── appsscript.json
│       ├── Config.js
│       ├── Schema.js
│       ├── SpreadsheetService.js
│       ├── Setup.js
│       ├── Fixture.js
│       ├── KpiEngine.js
│       ├── DashboardService.js
│       ├── Dashboard.html
│       ├── Api.js
│       ├── Tests.js
│       ├── Utils.js
│       └── Kode.js
├── sheets/
│   ├── schema.md
│   ├── phase1-sample-data.md
│   └── mapping-templates/
│       └── default_phase1_v1.md
├── tests/
│   └── fixtures/
│       └── phase1-expected-kpis.json
├── references/
│   ├── 00-VISION.md
│   ├── 01-BLUEPRINT.md
│   ├── 02-BUSINESS-REQUIREMENTS.md
│   ├── 10-ROADMAP.md
│   ├── 11-SECURITY.md
│   └── 12-MULTITENANCY.md
└── deployment/
    ├── dev.md                               # recommended
    ├── staging.md                           # recommended
    └── production.md                        # recommended
```

### Catatan Penting Struktur

- `docs/00-*` sampai `docs/14-*` menjadi canonical docs.
- `gas/src/` tetap menjadi active Apps Script source karena `clasp` memakai `rootDir: ./src` di dalam folder `gas/`.
- Root `src/` boleh menjadi logical source placeholder untuk future non-GAS implementation, tetapi jangan memindahkan file GAS aktif ke root `src/` tanpa update deployment.
- Detail docs lama seperti `docs/12-phase-1-implementation-blueprint.md` tetap berguna sebagai implementation supplement.

---

## 5. Rekomendasi MVP V1

### MVP V1 Objective

MVP V1 harus menjawab satu pertanyaan owner paling penting dengan reliable:

> “Berapa performa keuangan klinik saya bulan ini, dan apakah angka ini bisa dipercaya?”

### MVP V1 Scope yang Direkomendasikan

#### A. Data Warehouse MVP

- One spreadsheet per tenant.
- Standard tabs:
  - `cfg_tenant`
  - `cfg_clinic`
  - `cfg_integration_source`
  - `cfg_mapping_template`
  - `raw_visit`
  - `raw_revenue`
  - `raw_expense`
  - `stg_visit`
  - `stg_revenue`
  - `stg_expense`
  - `fact_visit`
  - `fact_revenue`
  - `fact_cost`
  - `fact_expense`
  - `metric_monthly_summary`
  - `metric_finance_breakdown`
  - `metric_growth_trend`
  - `metric_data_quality`
  - `log_sync`
  - `log_audit`

#### B. Accounting Traceability MVP

Tambahkan minimal:

- `journal_entry`
- `journal_line`
- `cfg_coa`
- `finance_source_trace` atau equivalent trace fields.

Jika full journal belum tersedia dari SIM/export, sistem harus:

- tetap bisa menampilkan management estimate.
- memberi label `estimated` atau `incomplete`.
- tidak menyebut angka sebagai laporan keuangan final.

#### C. KPI Engine MVP

KPI wajib:

- total visits.
- total revenue.
- direct cost.
- operating expense.
- gross profit.
- net profit.
- profit margin.
- revenue growth.
- profit growth.
- visit growth.
- finance breakdown.
- data quality status.

#### D. Dashboard MVP

Mobile-first Finance Dashboard:

- KPI cards:
  - Revenue.
  - Gross Profit.
  - Net Profit.
  - Cost.
  - Margin.
  - Visits.
- Finance Breakdown.
- Revenue vs Net Profit trend.
- Data Quality Status.
- Badge untuk `complete`, `estimated`, `incomplete`.
- Copy menggunakan Bahasa Indonesia + English familiar terms.

#### E. Import MVP

- CSV/XLSX import dari SIM Klinik export atau prepared source file.
- Mapping template versioned.
- Dedupe by `tenant_id + source_id + source_row_id + sync_id/source_period`.
- Sync log.
- Invalid row logging.

#### F. Security MVP

- Google Login.
- Owner role minimum.
- Tenant scoped dashboard.
- Audit log untuk view dashboard dan metric access.
- No raw patient/medical detail in dashboard or AI.

#### G. Test MVP

- Fixture smoke test.
- KPI formula test.
- Data quality test.
- Tenant isolation test.
- Dashboard smoke test on mobile.
- Traceability test:
  - every finance metric either has journal/source trace or is marked `estimated`/`incomplete`.

### MVP V1 Acceptance Criteria

MVP V1 dianggap selesai jika:

1. Owner bisa buka dashboard mobile dan melihat monthly finance summary.
2. Semua angka finance punya period, tenant, clinic, and data status.
3. Net Profit tidak tampil sebagai final jika source belum auditable.
4. Fixture KPI sesuai expected values.
5. Cross-tenant access ditolak.
6. Dashboard tidak membaca raw SIM Klinik data langsung.
7. Dokumentasi schema, KPI, deployment, dan data quality updated.

---

## 6. Rekomendasi Modul yang Harus Ditunda

Modul berikut sebaiknya **ditunda dari MVP V1** agar core finance foundation tidak melebar terlalu cepat.

### Tunda ke Phase 2

1. **BPJS Dashboard**
   - Alasan: membutuhkan definisi claim basis, aging, approved vs paid handling.
   - Bisa dimulai setelah finance dashboard stabil.

2. **Pharmacy Dashboard / Inventory Risk**
   - Alasan: butuh stock movement, expiry, unit cost, slow-moving logic.
   - Risiko salah tinggi jika inventory source tidak lengkap.

3. **Doctor Profitability lengkap**
   - Alasan: butuh cost allocation rule yang bisa diperdebatkan.
   - MVP boleh menyiapkan dimension dan revenue attribution saja.

4. **Poli Profitability lengkap**
   - Alasan sama seperti doctor profitability.

### Tunda ke Phase 3

5. **Telegram Bot / WhatsApp Integration**
   - Alasan: notification recipient security dan message audit perlu matang.
   - Daily summary bisa dirancang dulu, implement setelah dashboard metric reliable.

6. **AI Insights / Executive Briefing otomatis**
   - Alasan: AI harus grounded ke metric yang sudah stabil.

### Tunda ke Phase 4

7. **OpenClaw Agent dan Business Intelligence Chat penuh**
   - Alasan: MCP tool contracts, auth, audit, dan response grounding harus matang.

8. **Multi-agent architecture lengkap**
   - Finance/BPJS/Pharmacy/Executive agents sebaiknya dimulai sebagai design dulu.

### Tunda ke Phase 5

9. **Full SaaS billing/subscription**
   - Alasan: bukan blocker untuk pilot tenant.

10. **Commercial tenant onboarding automation**
    - Manual setup masih acceptable untuk pilot.

### Tunda ke Phase 6

11. **SIM vendor marketplace connectors**
    - Alasan: setiap vendor punya schema dan auth berbeda.

12. **Forecasting Engine advanced**
    - Alasan: baseline trend cukup dulu; ML forecasting butuh historical data berkualitas.

13. **Tax Engine**
    - Alasan: future roadmap, butuh accounting basis kuat dan disclaimers.

14. **Custom dashboard builder**
    - Alasan: tidak perlu untuk validate owner value.

15. **Patient-level analytics**
    - Alasan: privacy risk dan tidak sesuai owner-first financial MVP.

16. **Writeback ke SIM Klinik**
    - Alasan: melanggar read-only connector rule.

---

## 7. Rencana Implementasi 90 Hari

Rencana ini menjaga urutan: **foundation → reliable finance metrics → dashboard → controlled pilot → AI/MCP preparation**.

### Hari 1–15 — Architecture Hardening & Traceability Design

**Tujuan:** mengunci rule agar implementasi tidak menyimpang.

Deliverables:

1. Finalisasi `docs/18-ACCOUNTING-TRACEABILITY.md`.
2. Update `docs/04-DATA-ARCHITECTURE.md` dan `docs/07-DATABASE.md` dengan:
   - `journal_entry`.
   - `journal_line`.
   - `cfg_coa`.
   - finance trace fields.
3. Update `sheets/schema.md` untuk accounting traceability.
4. Buat `docs/17-DATA-QUALITY-RULES.md`.
5. Finalisasi MVP profit basis:
   - accrual-like billing basis, cash basis, atau management P&L.
6. Finalisasi auth/session model:
   - user → tenant → role → clinic scope.
7. Tentukan pilot import source:
   - CSV/XLSX pertama yang akan dipakai.

Exit criteria:

- Semua financial metric punya lineage rule.
- Semua incomplete/estimated condition terdokumentasi.
- Tidak ada coding besar sebelum schema traceability disetujui.

### Hari 16–30 — Spreadsheet Warehouse & Import Pipeline V1

**Tujuan:** warehouse tenant-safe dan import source bisa masuk tanpa double entry.

Deliverables:

1. Schema spreadsheet final untuk Phase 1.
2. Setup sheets untuk:
   - config.
   - raw.
   - staging.
   - facts.
   - journal/trace.
   - metrics.
   - logs.
3. Import controller untuk CSV/XLSX/Drive file MVP.
4. Mapping template versioning.
5. Validation rules:
   - required columns.
   - amount parsing.
   - date parsing.
   - duplicate source row.
   - missing tenant/clinic.
6. Sync log dan audit log.

Exit criteria:

- Fixture import berhasil.
- Duplicate import tidak double-count.
- Raw rows preserved.
- Invalid rows logged.

### Hari 31–45 — KPI Engine & Data Quality V1

**Tujuan:** Finance KPIs benar, traceable, dan tidak misleading.

Deliverables:

1. KPI calculation untuk:
   - total visits.
   - total revenue.
   - direct cost.
   - operating expense.
   - gross profit.
   - net profit.
   - profit margin.
   - growth trend.
2. Finance breakdown.
3. Data quality engine.
4. `data_status` rules:
   - `complete`.
   - `estimated`.
   - `incomplete`.
5. Traceability check:
   - finance metric must link to journal/source trace.
6. Smoke tests and fixture tests.

Exit criteria:

- KPI fixture matches expected values.
- Missing expense/direct cost changes data status correctly.
- Missing journal/source trace creates warning.
- Dashboard metrics come only from `metric_*`.

### Hari 46–60 — Mobile Finance Dashboard V1

**Tujuan:** owner bisa memahami performa klinik dalam <30 detik di mobile.

Deliverables:

1. Dashboard Keuangan mobile-first.
2. KPI cards:
   - Revenue.
   - Gross Profit.
   - Net Profit.
   - Cost.
   - Margin.
   - Visits.
3. Finance Breakdown chart/list.
4. Revenue vs Net Profit trend.
5. Data Quality Status section.
6. Complete/estimated/incomplete badges.
7. Empty/loading/error states.
8. Role-based visibility minimum.

Exit criteria:

- Dashboard loads from metric tables only.
- Mobile smoke test passed.
- Estimated/incomplete warning visible and understandable.
- Period and clinic context visible.

### Hari 61–75 — Security, Deployment, and Pilot Readiness

**Tujuan:** MVP siap diuji owner tanpa risiko dasar.

Deliverables:

1. Google Login + role mapping minimum.
2. Tenant context resolver.
3. Cross-tenant denial test.
4. Apps Script deployment runbook.
5. Spreadsheet sharing/protection checklist.
6. Backup/restore procedure MVP.
7. Monitoring via log sheets and Apps Script execution logs.
8. Pilot tenant setup checklist.

Exit criteria:

- Tenant A cannot access Tenant B data.
- Staff cannot access owner finance unless allowed.
- Release checklist documented.
- Rollback version identified.

### Hari 76–90 — Pilot Validation & AI/MCP Preparation

**Tujuan:** validasi value owner dan siapkan AI layer tanpa buru-buru expose chat penuh.

Deliverables:

1. Pilot with one real clinic dataset/export.
2. Manual reconciliation with owner/accounting source.
3. Adjust mapping template for pilot SIM export.
4. Prepare MCP tool contracts for top finance questions:
   - `get_profit_summary`.
   - `get_growth_trend`.
   - `explain_profit_change`.
5. AI response policy:
   - answer.
   - period.
   - basis.
   - data quality caveat.
   - recommended next action.
6. Optional read-only AI insight prototype from metrics only.

Exit criteria:

- Owner can validate dashboard value.
- Finance numbers reconciled or explicitly marked estimated/incomplete.
- MCP tools documented and ready for implementation.
- Decision made whether next phase is BPJS, Pharmacy, or AI Insight.

---

## Recommended Immediate Next Actions

1. Add `docs/18-ACCOUNTING-TRACEABILITY.md` before expanding finance features.
2. Update spreadsheet schema with journal/source trace fields.
3. Add data quality rule catalog.
4. Lock MVP V1 as Finance Dashboard + traceability + data quality.
5. Do not start BPJS, Pharmacy, Telegram, or AI chat until finance numbers are reliable.

---

## Final Architect Verdict

Architecture direction is sound for a design-first MVP:

- It respects SIM Klinik as source of truth.
- It avoids double entry.
- It is owner-first and mobile-first.
- It uses Google Apps Script and Spreadsheet appropriately for Phase 1.
- It correctly separates raw/staging/fact/metric layers.
- It has strong MCP guardrails conceptually.

The biggest architectural issue to resolve before serious production use is **accounting traceability**. The constitution now requires every finance number to be derivable from valid journals/source rows, so schema, KPI engine, data quality rules, and dashboard labels must all enforce that rule.

Recommended MVP V1 should stay narrow:

> Finance Dashboard + KPI Engine + Spreadsheet Warehouse + Data Quality + Accounting Traceability.

Everything else should wait until this foundation is trusted.
