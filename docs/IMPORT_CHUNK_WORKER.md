# Trigger-backed Import Chunk Worker

Large imports must avoid Apps Script execution timeouts and duplicate writes. This runbook describes the production-safe worker pattern for import parsing, row writes, and KPI compute.

## Goals

- Process large CSV/XLSX imports in resumable chunks.
- Keep `IMPORT_BATCH`, `IMPORT_FILE`, `SYNC_LOG`, and `AUDIT_LOG` truthful at every step.
- Avoid duplicate source-row writes when a trigger retries after timeout.
- Make failures visible in Upload Data import history.

## Worker State

Use server-side properties or a protected queue sheet for per-job state:

- `importId`
- `tenantId`
- `clinicId`
- `sourceSystem`
- `targetSheet`
- `nextRowOffset`
- `rowsRead`
- `rowsWritten`
- `rowsFailed`
- `status`: `queued`, `running`, `waiting`, `computing`, `completed`, `partial`, `failed`
- `leaseUntil`
- `triggerId`
- `lastError`
- `updatedAt`

For MVP, `IMPORT_BATCH.notes` can expose operator-facing progress while the durable state stays server-side.

## Flow

1. Upload validates file type, size, header, tenant scope, and checksum.
2. Create/import job with status `queued` and `data_status=partial`.
3. Store normalized parse state and create one time-based trigger.
4. Worker obtains tenant/clinic lock and validates lease ownership.
5. Worker processes at most `N` rows or until `maxRuntimeMs` budget is nearly exhausted.
6. Each row write remains idempotent using `tenant_id + clinic_id + import_id + source_row_id` and duplicate-source-row validation.
7. Worker updates offset, row counters, status note, and sync log heartbeat.
8. If rows remain, schedule/keep the next trigger and exit cleanly.
9. Once rows are complete, transition to `computing`, run KPI compute, invalidate caches, then finalize `completed` or `partial`.
10. On error, mark `failed` only for unrecoverable errors; otherwise keep `waiting` with retry metadata.

## Trigger Guardrails

- One active trigger per import job.
- Worker must delete stale duplicate triggers for the same job after taking the lock.
- Every trigger run writes start/end status into `SYNC_LOG`.
- If lease is active, a second worker exits without mutation.
- If retry count exceeds threshold, status becomes `failed` with visible `lastError`.

## Idempotency Rules

- Never append if a matching `tenant_id + clinic_id + import_id + source_row_id` row already exists in the target final sheet.
- Keep `RAW_IMPORT.payload_hash` for diagnostics.
- Compute-only retry must not re-run import chunks.
- Duplicate upload by checksum should stay visible as status `duplicate`.

## Operator Visibility

Upload Data should show:

- current state (`queued`, `running`, `waiting`, `computing`, final state)
- processed/total rows when known
- last worker timestamp
- last error
- retryability

## Rollback

- Failed chunked import can be marked failed and excluded from KPI recompute.
- If final rows were partially written, recovery should use import_id-scoped cleanup or backup restore depending on incident scope.
- Do not delete source job metadata until incident review is complete.
