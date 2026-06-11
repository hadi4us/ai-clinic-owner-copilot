# 11. Project Constitution Summary

This document summarizes `CLAW.md`, which is the project constitution and single source of truth for OpenClaw agents working on AI Clinic Owner Copilot.

## Non-Negotiable Rules

1. **No double entry.** Staff only inputs operational data in SIM Klinik.
2. **SIM Klinik is the primary source of truth.** Data comes from Excel export, CSV export, API, or automated sync.
3. **Owner-first design.** Every feature must answer at least one owner business question.
4. **Mobile-first.** Critical insights must work on smartphone, Telegram, or WhatsApp.
5. **Read-only connector.** Integration with SIM Klinik must not mutate SIM Klinik data.
6. **Tenant isolation.** Every query must be scoped by `tenant_id`; no exception.
7. **Minimum data storage.** Prioritize KPI, finance summary, operational summary, and aggregate data; avoid medical records, doctor notes, and sensitive diagnosis.

## Product Position

We are **not** building:

- SIM Klinik.
- Electronic Medical Record.
- Patient registration system.
- Billing system.
- Cashier system.

We are building:

- Virtual CFO.
- Virtual COO.
- Virtual Inventory Manager.
- Business Intelligence Assistant.

## Required Architecture

```text
SIM Klinik
↓
Data Connector
↓
Google Apps Script
↓
Google Spreadsheet Data Warehouse
↓
Analytics Engine
↓
OpenClaw Agent Layer
↓
Dashboard / Telegram / WhatsApp
```

## Required Owner Questions

The system must answer in less than 10 seconds:

1. Berapa laba klinik saya?
2. Mengapa laba naik atau turun?
3. Dokter mana paling menguntungkan?
4. Poli mana paling menguntungkan?
5. Berapa piutang BPJS yang belum cair?
6. Obat apa yang berpotensi menjadi kerugian?
7. Bagaimana tren pertumbuhan klinik?

## Agent Responsibilities

| Agent | Responsibility |
|---|---|
| Finance Agent | Revenue, cost, profit/loss, margin analysis |
| BPJS Agent | Claims, receivables, aging receivable |
| Pharmacy Agent | Stock, expiry, inventory analysis |
| Executive Agent | Daily, weekly, monthly executive summaries |

## Development Order

Per `CLAW.md`:

1. Data Warehouse, KPI Engine, Finance Dashboard.
2. BPJS Dashboard, Pharmacy Dashboard.
3. Telegram integration, AI Insight.
4. OpenClaw Agent, Business Intelligence Chat.
5. Multi Tenant SaaS, Billing, Subscription.

## Important Clarification

There are two meanings of “multi-tenant” in the project files:

1. **Tenant-safe data architecture from day one** — mandatory now. Every sheet, query, API, MCP tool, agent, dashboard, and report must use `tenant_id`.
2. **Full SaaS multi-tenant commercial platform** — roadmap phase later, including billing and subscription.

So implementation must include `tenant_id` from the first line of data model/code, even if full SaaS billing/onboarding is delivered later.

## Definition of Done

A feature is complete only if:

- code is complete.
- tests are complete.
- documentation is updated.
- dashboard is updated when relevant.
- agent prompt/tooling is updated when relevant.
- multi-tenant isolation is validated.
