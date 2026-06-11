# 06. Agents

## Agent Principles

All agents must comply with [`../CLAW.md`](../CLAW.md).

## Phase Roadmap Agents

### Finance Agent

Responsible for revenue, cost, gross profit, net profit, margin, and owner-facing finance explanations.

### BPJS Agent

Responsible for BPJS receivable visibility, aging, delay risk, and payout trend. Phase 2+.

### Pharmacy / Inventory Agent

Responsible for stock risk, dead stock, expiry risk, and medicine profitability. Phase 2+.

### Operations Agent

Responsible for visits, doctor/poli productivity, growth, bottlenecks, and utilization.

### OpenClaw BI Chat Agent

Responsible for answering owner questions only through approved tenant-scoped APIs/MCP tools. It must not query unrestricted raw sheets.

## Non-Negotiables

- No double entry.
- No SIM Klinik replacement.
- `tenant_id` required in scoped operations.
- Owner-first insight only.
- Avoid sensitive medical/patient detail.
