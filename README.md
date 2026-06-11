# AI Clinic Owner Copilot

AI Clinic Owner Copilot adalah platform Business Intelligence dan AI Assistant untuk owner klinik yang bekerja di atas SIM Klinik yang sudah ada.

> Prinsip utama: **bukan SIM Klinik**, tidak menggantikan operasional klinik, tidak membuat double entry, dan menjadikan SIM Klinik sebagai source of truth.

## Status

Tahap saat ini: **Phase 1 implementation**.

Phase 1 Google Apps Script skeleton, spreadsheet warehouse setup, KPI engine, fixture smoke test, and mobile finance dashboard have been implemented.

## Konstitusi Proyek

- [`CLAW.md`](CLAW.md) adalah sumber kebenaran utama untuk seluruh agen OpenClaw yang bekerja pada proyek ini.
- Sebelum membuat, mengubah, atau menghapus kode, agen wajib membaca dan mematuhi `CLAW.md`.

## Dokumen Utama

Repository docs follow the requested `AI-Clinic-CFO-Copilot` structure:

1. [Vision](docs/00-VISION.md)
2. [Blueprint](docs/01-BLUEPRINT.md)
3. [Business Requirements](docs/02-BUSINESS-REQUIREMENTS.md)
4. [System Design](docs/03-SYSTEM-DESIGN.md)
5. [Data Architecture](docs/04-DATA-ARCHITECTURE.md)
6. [MCP](docs/05-MCP.md)
7. [Agents](docs/06-AGENTS.md)
8. [Database / Spreadsheet Warehouse](docs/07-DATABASE.md)
9. [Dashboard](docs/08-DASHBOARD.md)
10. [AI Insights](docs/09-AI-INSIGHTS.md)
11. [Roadmap](docs/10-ROADMAP.md)
12. [Security](docs/11-SECURITY.md)
13. [Multitenancy](docs/12-MULTITENANCY.md)
14. [COA](docs/13-COA.md)
15. [Tax Engine](docs/14-TAX-ENGINE.md)

Additional implementation docs are kept in `docs/` using the existing numbered lowercase filenames.

## Spreadsheet & Fixtures

- [Spreadsheet Schema](sheets/schema.md)
- [Phase 1 Sample Data](sheets/phase1-sample-data.md)
- [Default Phase 1 Mapping Template](sheets/mapping-templates/default_phase1_v1.md)
- [Phase 1 Expected KPI Fixture](tests/fixtures/phase1-expected-kpis.json)

## Reference Files

File pendukung dari MasBro disimpan di folder [`references`](references/).

## Architectural North Star

- Zero double entry.
- SIM Klinik tetap source of truth.
- Semua fitur harus menjawab pertanyaan owner klinik.
- Mobile-first dashboard dan notification.
- Multi-tenant dari awal.
- Sederhana untuk MVP, siap diskalakan sebagai SaaS.

## MVP V1 Implementation Status

MVP V1 focuses on the narrow finance foundation recommended by the architecture review:

- Finance Dashboard
- KPI Engine
- Spreadsheet Data Warehouse
- Data Quality
- Accounting Traceability

Implemented MVP V1 hardening:

- Added spreadsheet schema support for `cfg_coa`, `journal_entry`, `journal_line`, and `finance_trace_map`.
- Added trace fields to finance fact rows: `source_row_id`, `sync_id`, `journal_entry_id`, and `trace_status`.
- Added `trace_status` and `trace_summary_json` to monthly finance metrics.
- Finance Dashboard payload now exposes `traceStatus` alongside `dataStatus`.
- Smoke test now verifies expected finance KPIs, trace map rows, journal rows, and balanced debit/credit journal lines.

Important guardrail: finance numbers are reliable management metrics only when `data_status = complete` and `trace_status = traceable`. Otherwise, they must be treated as `estimated` or `incomplete`.

## Canonical Source Structure

The repository now includes the requested canonical `src/` module layout:

- `src/Core/`
- `src/Auth/`
- `src/DataWarehouse/`
- `src/Finance/`
- `src/Dashboard/`
- `src/API/`
- `src/MCP/`
- `src/Setup/`
- `src/Tests/`

Important deployment note: active Apps Script deployment still uses `gas/src` because `gas/.clasp.json` is configured with `rootDir: ./src` relative to `gas/`. Root `src/` is the clean architecture/canonical module layout and mirrors the implementation, but `gas/src` remains the deployable source until a deliberate clasp migration is tested.
