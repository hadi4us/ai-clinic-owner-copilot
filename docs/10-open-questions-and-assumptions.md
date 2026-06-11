# 10. Open Questions & Assumptions

## Current Assumptions

These assumptions are used only for initial architecture. They must be validated before implementation.

1. Initial MVP will use Google Apps Script, Google Spreadsheet, HTML Service, Tailwind CSS, and Chart.js as requested.
2. SIM Klinik data can be obtained through export files or API.
3. Staff should not enter operational data into this system.
4. Owner needs aggregated business insight more than detailed operational workflow.
5. Initial users are Indonesian clinics using IDR.
6. BPJS receivable data exists in SIM export or can be imported from claim/payment reports.
7. Inventory data includes stock quantity, unit cost, and expiry date. If not, inventory risk quality will be limited.
8. Cost allocation rules may differ per clinic and need configuration.
9. One spreadsheet per tenant is preferred for MVP isolation.
10. AI should answer from precomputed metrics, not raw unrestricted sheets.

## Open Questions Before Coding

### Integration & Source Data

1. SIM Klinik apa yang akan jadi target pertama?
2. Data dari SIM tersedia dalam bentuk apa?
   - CSV export?
   - XLSX export?
   - API?
   - database access?
3. Apakah format export konsisten per hari/bulan?
4. Apakah ada sample export asli untuk:
   - kunjungan.
   - billing/revenue.
   - pembayaran.
   - dokter.
   - poli.
   - obat/stok.
   - BPJS claim/payment.
   - biaya operasional.
5. Apakah data biaya operasional ada di SIM Klinik atau dari sumber lain?

### Finance & Profitability

6. Definisi “laba” yang owner inginkan apa?
   - cash basis?
   - accrual basis?
   - gross profit?
   - net profit setelah biaya operasional?
7. Fee dokter dihitung sebagai cost atau profit sharing terpisah?
8. HPP obat tersedia langsung dari SIM atau perlu dihitung dari inventory?
9. Bagaimana alokasi biaya bersama ke dokter/poli?
   - berdasarkan revenue?
   - berdasarkan jumlah kunjungan?
   - manual rule?
10. Apakah BPJS dihitung sebagai revenue saat pelayanan, saat klaim disetujui, atau saat dibayar?

### Multi-Tenant & User Roles

11. Satu owner bisa punya banyak cabang klinik?
12. Apakah satu tenant = satu owner group atau satu klinik?
13. Role apa saja yang wajib di MVP?
   - owner saja?
   - owner + manager?
   - staff import?
14. Apakah manager boleh melihat profit/laba?

### Dashboard & AI

15. Dashboard pertama fokus ke mobile saja atau juga desktop?
16. Bahasa UI: Indonesia penuh?
17. Apakah AI chat akan tersedia di dashboard, Telegram/WhatsApp, atau keduanya?
18. Executive summary dikirim jam berapa?
19. Format summary yang disukai: singkat seperti WhatsApp, atau detail seperti laporan?

### Notification

20. Channel prioritas MVP: Telegram dulu atau WhatsApp dulu?
21. WhatsApp menggunakan provider apa?
22. Siapa saja recipient notifikasi per tenant?
23. Alert apa yang wajib dikirim real-time?
   - laba turun?
   - BPJS aging >60 hari?
   - stok expired?
   - revenue drop?

### Security & Compliance

24. Apakah data pasien boleh disimpan sama sekali, walau pseudonymous?
25. Apakah spreadsheet boleh diakses owner langsung atau hanya dashboard?
26. Apakah perlu audit trail untuk setiap AI question?
27. Apakah ada kebutuhan compliance khusus dari klinik/perusahaan?

## Recommended Next Decision

Sebelum coding, keputusan paling penting adalah:

1. **Target SIM Klinik pertama** dan contoh export datanya.
2. **Definisi laba** yang akan dipakai untuk MVP.
3. **MVP scope channel**: Telegram dulu atau dashboard AI chat dulu.
4. **Tenant model**: satu spreadsheet per tenant untuk pilot atau satu master multi-tenant.

## Recommended MVP Scope

Agar cepat jalan tapi tetap bernilai:

1. CSV/XLSX import dari SIM Klinik.
2. One spreadsheet per tenant.
3. Owner dashboard mobile.
4. Profit summary.
5. Doctor profitability.
6. BPJS receivable.
7. Inventory risk.
8. Telegram daily executive summary.
9. OpenClaw MCP tools untuk top owner questions.

## Explicit Non-MVP Items

Tunda dulu:

- full SIM vendor marketplace connector.
- complex accounting engine.
- patient-level analytics.
- multi-currency.
- custom dashboard builder.
- automated writeback ke SIM Klinik.
- advanced ML forecasting beyond simple trend/forecast baseline.
