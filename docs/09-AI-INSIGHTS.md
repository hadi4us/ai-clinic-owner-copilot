# 09. AI Insights

## Purpose

AI insights explain clinic business performance in owner-friendly language.

## Source of Truth

AI must answer from approved metrics and APIs, not unrestricted raw spreadsheet access.

## Phase 1 Insight Types

- Monthly revenue summary.
- Net profit and margin explanation.
- Cost pressure warning.
- Data quality warning.
- Growth AI companion: anonymized follow-up segments, dormant/high-value patients, campaign drafts, and owner next actions.

## Guardrails

- Always scoped by `tenant_id` and `clinic_id`.
- Do not expose sensitive patient or medical detail.
- If data status is `estimated` or `incomplete`, say so clearly.
- Growth recommendations are drafts only; human approval is required before contacting patients.
