<!-- Canonical doc alias for requested repository structure. Source: docs/06-dashboard-wireframe.md -->

# 06. Dashboard Wireframe

## Dashboard Principles

1. Mobile-first.
2. Owner-first.
3. Show business answer first, chart second.
4. Use plain language, not accounting jargon only.
5. Highlight action items and risks.
6. Do not overload the owner with raw operational data.

## Primary Mobile Layout

```text
┌─────────────────────────────────────┐
│ AI Clinic Owner Copilot             │
│ Klinik: [Semua Cabang ▼]            │
│ Periode: [Bulan Ini ▼]              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Executive Summary                   │
│ Laba bersih bulan ini Rp45 jt       │
│ Turun 27% dari bulan lalu.          │
│ Penyebab utama: HPP obat naik.      │
│ [Tanya AI: Kenapa laba turun?]      │
└─────────────────────────────────────┘

┌───────────────┐ ┌───────────────┐
│ Laba Bersih   │ │ Revenue       │
│ Rp45 jt       │ │ Rp125 jt      │
│ ↓ 27%         │ │ ↑ 8%          │
└───────────────┘ └───────────────┘

┌───────────────┐ ┌───────────────┐
│ Kunjungan     │ │ Margin        │
│ 2.100         │ │ 36%           │
│ ↑ 12%         │ │ ↓ 4%          │
└───────────────┘ └───────────────┘

┌─────────────────────────────────────┐
│ Alerts                              │
│ 🔴 HPP obat naik 18%                │
│ 🟠 BPJS outstanding Rp88 jt         │
│ 🟠 12 batch obat akan expired       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Tren Revenue vs Laba                │
│ [Chart.js line chart]               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Dokter Paling Menguntungkan         │
│ 1. dr. A — Rp23 jt                  │
│ 2. dr. B — Rp18 jt                  │
│ 3. dr. C — Rp12 jt                  │
│ [Lihat semua]                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Poli Paling Menguntungkan           │
│ 1. Poli Umum — Rp31 jt              │
│ 2. Poli Gigi — Rp20 jt              │
│ 3. Poli Anak — Rp8 jt               │
│ [Lihat semua]                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Piutang BPJS                        │
│ Total: Rp88 jt                      │
│ 0-30: Rp35 jt                       │
│ 31-60: Rp28 jt                      │
│ >60: Rp25 jt                        │
│ [Lihat aging]                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Risiko Obat                         │
│ Nilai risiko: Rp17,5 jt             │
│ 5 expired/near-expiry critical      │
│ [Lihat obat berisiko]               │
└─────────────────────────────────────┘
```

## Desktop Layout

Desktop may use 12-column responsive grid:

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: Product / Clinic Selector / Period / User           │
├─────────────────────────────────────────────────────────────┤
│ Executive Summary + Ask AI                                  │
├─────────────┬─────────────┬─────────────┬─────────────┤
│ Net Profit  │ Revenue     │ Visits      │ BPJS AR     │
├─────────────────────────────┬───────────────────────────────┤
│ Revenue/Profit Trend         │ Alerts & Recommendations      │
├─────────────────────────────┼───────────────────────────────┤
│ Doctor Profitability         │ Poli Profitability            │
├─────────────────────────────┼───────────────────────────────┤
│ BPJS Aging                   │ Inventory Risks               │
└─────────────────────────────┴───────────────────────────────┘
```

## Key Screens

### 1. Owner Home

Purpose: answer “how is my clinic doing?” in under 30 seconds.

Components:

- executive summary.
- KPI cards.
- alerts.
- trend chart.
- top doctors/poli.
- AI question input.

### 2. Profit Detail

Answers:

- Berapa laba saya?
- Mengapa laba turun?
- Komponen biaya mana yang naik?

Components:

- revenue breakdown.
- cost breakdown.
- margin trend.
- comparison with previous period.
- driver analysis.

### 3. Doctor Profitability

Answers:

- Dokter mana paling menguntungkan?
- Apakah dokter ramai selalu profitable?

Components:

- ranked doctor list.
- visit count vs profit.
- revenue/cost/profit columns.
- margin badge.

### 4. Poli Profitability

Answers:

- Poli mana paling menguntungkan?
- Poli mana butuh perhatian?

Components:

- ranked poli list.
- revenue/profit chart.
- margin comparison.

### 5. BPJS Receivables

Answers:

- Berapa piutang BPJS saya?
- Klaim mana yang aging terlalu lama?

Components:

- total outstanding.
- aging buckets.
- unpaid list.
- status distribution.

### 6. Inventory Risk

Answers:

- Obat apa yang berpotensi rugi?
- Berapa nilai risiko stok?

Components:

- risk value summary.
- expiring soon list.
- slow-moving list.
- overstock list.
- negative margin list.

### 7. AI Chat / Ask Owner Copilot

Input examples:

- “Kenapa laba bulan ini turun?”
- “Dokter mana yang paling menguntungkan bulan ini?”
- “Obat mana yang harus segera diprioritaskan?”
- “Berapa piutang BPJS yang sudah lebih dari 60 hari?”

AI response must include:

- answer.
- period.
- top drivers.
- recommended next action.
- caveat if data incomplete.

## Component Design

### KPI Card

```text
┌─────────────────┐
│ Label           │
│ Rp45 jt         │
│ ↓ 27% vs Mei    │
│ small note      │
└─────────────────┘
```

Fields:

- label.
- value.
- trend direction.
- trend percentage.
- severity color.
- tap action.

### Alert Card

```text
┌──────────────────────────────────┐
│ 🔴 High Risk                     │
│ HPP obat naik 18%                │
│ Dampak estimasi: -Rp9 jt         │
│ [Lihat detail] [Tanya AI]        │
└──────────────────────────────────┘
```

### Ask AI Box

```text
┌──────────────────────────────────┐
│ Tanya Owner Copilot              │
│ [ Kenapa laba turun?          ]  │
│ [Kirim]                          │
└──────────────────────────────────┘
```

## Mobile UX Notes

- KPI cards should be 2 columns on mobile.
- Charts must not require horizontal scrolling where possible.
- Tables become stacked cards on mobile.
- Use sticky period selector.
- Top answer always visible before charts.
- Use color carefully: red for urgent risk, orange for warning, green for positive.

## Chart.js Chart Types

| Insight | Chart Type |
|---|---|
| Revenue/profit trend | Line chart |
| BPJS aging | Bar chart |
| Doctor profitability | Horizontal bar |
| Poli profitability | Horizontal bar |
| Cost breakdown | Doughnut or stacked bar |
| Inventory risk | Bar/list hybrid |

## Tailwind Direction

Use simple utility-first components:

- `bg-white rounded-2xl shadow-sm p-4`
- `text-sm text-slate-500`
- `text-2xl font-bold text-slate-900`
- `grid grid-cols-2 gap-3 md:grid-cols-4`
- `text-red-600`, `text-amber-600`, `text-green-600`

## First MVP Dashboard Scope

Recommended MVP screens:

1. Owner Home.
2. Profit Detail.
3. Doctor Profitability.
4. BPJS Receivables.
5. Inventory Risk.
6. Ask AI.

Poli profitability and forecasting can be added once base data mapping is reliable.
