<!-- Canonical doc alias for requested repository structure. Source: docs/01-system-architecture.md -->

# 01. System Architecture

## Product Definition

AI Clinic Owner Copilot adalah **Business Intelligence Layer + AI Assistant** di atas SIM Klinik yang sudah ada.

Sistem ini bukan SIM Klinik dan tidak mengambil alih fungsi operasional seperti pendaftaran pasien, billing pasien, rekam medis, atau transaksi klinik harian.

## Mandatory Principles

1. **Zero double entry** — staff tidak menginput data ulang ke sistem ini.
2. **SIM Klinik is source of truth** — data klinik berasal dari SIM Klinik, file export, API, atau connector.
3. **Owner-first value** — semua modul harus membantu owner mengambil keputusan bisnis.
4. **Mobile-first** — dashboard dan insight harus nyaman dibaca dari HP.
5. **Multi-tenant from day one** — setiap data wajib memiliki konteks tenant/clinic.
6. **SaaS scalable** — desain harus bisa berkembang dari Google Sheet MVP ke warehouse yang lebih besar.

## High-Level Architecture

```text
┌─────────────────────────────┐
│ Existing SIM Klinik          │
│ - visits                     │
│ - billing                    │
│ - doctors                    │
│ - poli                       │
│ - pharmacy/inventory         │
│ - BPJS claims                │
└──────────────┬──────────────┘
               │
               │ Import / API / Connector / Scheduled Sync
               ▼
┌─────────────────────────────┐
│ Integration Layer            │
│ Google Apps Script           │
│ - file parser                │
│ - API fetcher                │
│ - validation                 │
│ - normalization              │
│ - sync log                   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Data Warehouse               │
│ Google Spreadsheet           │
│ - raw_* sheets               │
│ - dim_* sheets               │
│ - fact_* sheets              │
│ - metric_* sheets            │
│ - tenant_config              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Analytics & Business Logic   │
│ Google Apps Script           │
│ - KPI calculation            │
│ - profitability engine       │
│ - BPJS receivable engine     │
│ - inventory risk engine      │
│ - forecast engine            │
└───────┬──────────────┬──────┘
        │              │
        ▼              ▼
┌───────────────┐   ┌────────────────────┐
│ Web Dashboard │   │ Notification Layer  │
│ HTML Service  │   │ Telegram/WhatsApp   │
│ Tailwind CSS  │   │ Daily summary       │
│ Chart.js      │   │ Alerts              │
└───────────────┘   └────────────────────┘
        │              ▲
        ▼              │
┌─────────────────────────────┐
│ AI Layer                     │
│ OpenClaw + MCP Architecture  │
│ - read metrics               │
│ - answer owner questions     │
│ - generate summaries         │
│ - trigger notifications      │
└─────────────────────────────┘
```

## Core Modules

### 1. Integration Module

Responsible for pulling data from existing SIM Klinik without double entry.

Supported integration modes:

- **MVP:** manual/scheduled CSV or XLSX import from SIM Klinik export.
- **Phase 2:** API connector per SIM vendor.
- **Phase 3:** automated connector with mapping templates and health monitoring.

### 2. Data Warehouse Module

Google Spreadsheet is used as the initial warehouse.

Design rule:

- raw data is preserved.
- normalized facts/dimensions are generated from raw data.
- computed metrics are separated from source data.
- every row has `tenant_id`.

### 3. Analytics Module

Calculates owner-facing business metrics:

- revenue.
- COGS/HPP obat.
- operational expense.
- gross profit.
- net profit.
- doctor profitability.
- poli profitability.
- BPJS receivables.
- inventory expiry/slow-moving risk.
- growth trend.
- forecast.

### 4. Dashboard Module

Mobile-first dashboard using:

- Google Apps Script HTML Service.
- Tailwind CSS.
- Chart.js.

### 5. AI Copilot Module

AI interface through OpenClaw + MCP.

Role:

- interpret owner questions.
- call safe analytical tools.
- produce executive summaries.
- avoid hallucinating financial numbers.
- cite source periods/metrics used.

### 6. Notification Module

Supports:

- Telegram alert.
- WhatsApp alert.
- daily executive summary.
- anomaly/risk notification.

## SaaS Scalability Strategy

### MVP Constraints

Google Apps Script and Spreadsheet are not ideal for very large datasets, but acceptable for early MVP if:

- tenant size is small/medium.
- sync is batched.
- metrics are precomputed.
- dashboard reads summaries, not raw rows.

### Future Migration Path

```text
Google Spreadsheet Warehouse
        │
        ▼
BigQuery / Cloud SQL Warehouse
        │
        ▼
Dedicated SaaS Backend + API Gateway
```

Keep domain model and API contracts stable so migration does not rewrite the whole product.

## Key Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| Initial backend | Google Apps Script | Fast MVP, integrates naturally with Sheets and HTML Service |
| Initial warehouse | Google Spreadsheet | Simple, auditable, familiar, low setup cost |
| Frontend | HTML Service + Tailwind + Chart.js | Fits Apps Script, mobile-first dashboard possible |
| AI layer | OpenClaw + MCP | Tool-based AI interaction with controlled data access |
| Multi-tenant | tenant_id on every table/sheet | Prevents data mixing and enables SaaS growth |
| Integration | import/API/connector abstraction | Avoids double entry and supports multiple SIM vendors |

## Non-Goals

- No patient registration.
- No patient billing entry.
- No EMR/rekam medis.
- No replacement of SIM Klinik.
- No operational workflow that forces staff to work inside this system.

## Owner Questions Covered

| Owner Question | Architecture Component |
|---|---|
| Berapa laba saya? | Analytics profit engine + dashboard + AI |
| Mengapa laba turun? | Trend/anomaly engine + AI explanation |
| Dokter mana paling menguntungkan? | Doctor profitability metric |
| Poli mana paling menguntungkan? | Poli profitability metric |
| Berapa piutang BPJS saya? | BPJS receivable engine |
| Obat apa yang berpotensi rugi? | Inventory risk engine |
| Bagaimana tren pertumbuhan klinik? | Growth trend + forecast engine |
