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

## Guardrails

- Always scoped by `tenant_id` and `clinic_id`.
- Do not expose sensitive patient or medical detail.
- If data status is `estimated` or `incomplete`, say so clearly.
