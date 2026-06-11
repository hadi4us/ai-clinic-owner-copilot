# 18 - Prompt Library

Dokumen ini berisi pustaka prompt untuk AI Clinic Owner Copilot.

Prompt Library dipakai agar agent menjawab pertanyaan owner klinik secara konsisten, berbasis data, dan langsung mengarah ke insight bisnis.

---

# Prinsip Prompt

1. Jawaban harus berbasis data yang tersedia.
2. Jika data belum lengkap, agent wajib menyebutkan keterbatasan data.
3. Agent tidak boleh mengarang angka.
4. Agent harus menjelaskan penyebab, dampak, dan rekomendasi.
5. Agent harus menggunakan bahasa owner, bukan bahasa teknis berlebihan.
6. Agent harus memprioritaskan actionable insight.
7. Untuk pertanyaan keuangan, agent wajib cek revenue, cost, profit, piutang, dan margin.
8. Untuk pertanyaan BPJS, agent wajib cek klaim, approval, payment, outstanding, dan aging.
9. Untuk pertanyaan farmasi, agent wajib cek revenue obat, HPP, stok, expired, dan dead stock.
10. Untuk pertanyaan pajak, agent wajib memberi disclaimer bahwa hasil adalah estimasi awal, bukan nasihat pajak final.

---

# Format Jawaban Standar

```text
Analisis:
1. Temuan utama
2. Penyebab yang paling mungkin
3. Dampak bisnis
4. Risiko jika dibiarkan
5. Rekomendasi tindakan

Data yang dicek:
- KPI / sheet / periode

Catatan:
- Keterbatasan data bila ada
```

---

# Prompt 001 - Mengapa laba turun?

## User

```text
Mengapa laba turun?
```

## Agent

```text
Analisis:
1. Pendapatan
2. Biaya
3. Dokter
4. Poli
5. BPJS

Saya akan bandingkan laba periode ini vs periode sebelumnya, lalu pecah penyebabnya dari sisi revenue, cost, dokter, poli, dan BPJS.

Berikan rekomendasi.
```

## Data yang Dicek

- Revenue
- Profit
- Cost Ratio
- Doctor Fee Ratio
- Poli Profit Margin
- BPJS Outstanding Amount

---

# Prompt 002 - Berapa omzet bulan ini?

## User

```text
Berapa omzet saya bulan ini?
```

## Agent

```text
Analisis:
1. Hitung total Revenue bulan berjalan.
2. Bandingkan dengan bulan sebelumnya.
3. Pisahkan revenue dari tindakan dan resep.
4. Tampilkan cabang/poli/dokter penyumbang terbesar.

Jawaban utama harus langsung menyebut total omzet dan perubahan dibanding periode sebelumnya.
```

## Data yang Dicek

- Revenue
- TINDAKAN
- RESEP
- Revenue Growth
- Revenue per Clinic

---

# Prompt 003 - Berapa laba saya?

## User

```text
Berapa laba saya?
```

## Agent

```text
Analisis:
1. Hitung Revenue.
2. Hitung Cost.
3. Hitung Profit = Revenue - Cost.
4. Hitung Net Profit Margin.
5. Jika data biaya belum lengkap, tandai hasil sebagai estimasi.

Berikan ringkasan laba dan faktor utama yang memengaruhi.
```

## Data yang Dicek

- Revenue
- Cost
- Profit
- Net Profit Margin
- Data Quality Status

---

# Prompt 004 - Kenapa omzet naik tapi laba turun?

## User

```text
Kenapa omzet naik tapi laba turun?
```

## Agent

```text
Analisis:
1. Cek kenaikan Revenue.
2. Cek kenaikan Cost.
3. Cek margin per poli.
4. Cek biaya dokter.
5. Cek HPP obat dan biaya persediaan.
6. Cek diskon/refund.

Cari apakah biaya naik lebih cepat daripada pendapatan.
```

## Data yang Dicek

- Revenue Growth
- Profit Growth
- Cost Ratio
- Doctor Fee Ratio
- COGS Ratio
- Discount Ratio

---

# Prompt 005 - Poli mana paling menguntungkan?

## User

```text
Poli mana yang paling menguntungkan?
```

## Agent

```text
Analisis:
1. Hitung revenue per poli.
2. Hitung biaya per poli jika tersedia.
3. Hitung profit dan margin per poli.
4. Bandingkan jumlah kunjungan dan average revenue per visit.
5. Tandai poli yang ramai tetapi margin rendah.

Berikan ranking poli terbaik dan rekomendasi peningkatan margin.
```

## Data yang Dicek

- Poli Revenue
- Poli Profit
- Poli Profit Margin
- Poli Visit Count
- Poli Average Revenue per Visit

---

# Prompt 006 - Dokter mana paling produktif?

## User

```text
Dokter mana yang paling produktif?
```

## Agent

```text
Analisis:
1. Hitung jumlah kunjungan per dokter.
2. Hitung revenue per dokter.
3. Hitung revenue per jam praktik jika data jam tersedia.
4. Hitung repeat patient rate jika data pasien tersedia.
5. Jangan hanya menilai dari jumlah pasien; cek juga nilai transaksi.

Berikan ranking dokter dan konteksnya.
```

## Data yang Dicek

- Doctor Visit Count
- Doctor Revenue
- Doctor Average Revenue per Visit
- Doctor Productivity per Hour
- Doctor Repeat Patient Rate

---

# Prompt 007 - BPJS saya aman tidak?

## User

```text
BPJS saya aman tidak?
```

## Agent

```text
Analisis:
1. Cek total klaim BPJS.
2. Cek klaim disetujui.
3. Cek klaim sudah dibayar.
4. Cek outstanding BPJS.
5. Cek aging klaim lebih dari 30/60/90 hari.
6. Cek rejection dan deduction.

Berikan status aman/waspada/berisiko dan tindakan yang perlu dilakukan.
```

## Data yang Dicek

- BPJS Claim Amount
- BPJS Approved Amount
- BPJS Paid Amount
- BPJS Outstanding Amount
- BPJS Average Aging Days
- BPJS Rejection Rate

---

# Prompt 008 - Klaim BPJS mana yang macet?

## User

```text
Klaim BPJS mana yang macet?
```

## Agent

```text
Analisis:
1. Filter klaim dengan outstanding_amount > 0.
2. Urutkan berdasarkan aging_days tertinggi.
3. Kelompokkan 30, 60, dan 90 hari.
4. Tampilkan nilai outstanding terbesar.
5. Berikan prioritas follow-up.

Fokus pada klaim yang paling berdampak ke cashflow.
```

## Data yang Dicek

- BPJS Outstanding Amount
- BPJS Claims Over 30 Days
- BPJS Claims Over 60 Days
- BPJS Claims Over 90 Days
- BPJS Claim Cycle Time

---

# Prompt 009 - Obat apa yang hampir expired?

## User

```text
Obat apa yang hampir expired?
```

## Agent

```text
Analisis:
1. Cari item dengan expiry_date dalam threshold near-expired.
2. Hitung nilai stok near-expired.
3. Urutkan berdasarkan nilai kerugian terbesar.
4. Cek kecepatan penjualan item tersebut.
5. Rekomendasikan diskon, bundling, redistribusi, atau stop pembelian.

Jangan hanya tampilkan daftar; prioritaskan tindakan.
```

## Data yang Dicek

- Near Expired Stock Value
- Near Expired Stock Ratio
- Stock Turnover
- Top Selling Medicines
- Dead Stock Value

---

# Prompt 010 - Obat apa yang paling menguntungkan?

## User

```text
Obat apa yang paling menguntungkan?
```

## Agent

```text
Analisis:
1. Hitung revenue obat per item.
2. Hitung HPP per item.
3. Hitung gross profit dan gross margin per item.
4. Urutkan berdasarkan profit, bukan hanya penjualan.
5. Tandai item yang margin tinggi tetapi volume rendah.

Berikan rekomendasi stok dan promosi.
```

## Data yang Dicek

- Pharmacy Revenue
- Pharmacy Gross Profit
- Pharmacy Gross Margin
- Top Selling Medicines
- Top Margin Medicines

---

# Prompt 011 - Kenapa stok obat sering kosong?

## User

```text
Kenapa stok obat sering kosong?
```

## Agent

```text
Analisis:
1. Cek stockout item count.
2. Cek item low stock.
3. Bandingkan dengan kecepatan penjualan.
4. Cek lead time supplier jika tersedia.
5. Cek pola pembelian dan reorder point.

Berikan daftar obat prioritas untuk reorder.
```

## Data yang Dicek

- Stockout Item Count
- Low Stock Item Count
- Stock Turnover
- Days Inventory Outstanding
- Top Selling Medicines

---

# Prompt 012 - Cabang mana paling bagus?

## User

```text
Cabang mana yang performanya paling bagus?
```

## Agent

```text
Analisis:
1. Bandingkan revenue per cabang.
2. Bandingkan profit per cabang.
3. Bandingkan kunjungan per cabang.
4. Bandingkan margin dan biaya.
5. Jangan hanya memilih cabang omzet tertinggi; cek profit dan efisiensi.

Berikan ranking cabang dengan alasan.
```

## Data yang Dicek

- Revenue per Clinic
- Branch Revenue Share
- Branch Visit Share
- Profit
- Cost Ratio

---

# Prompt 013 - Biaya apa yang paling membebani klinik?

## User

```text
Biaya apa yang paling membebani klinik?
```

## Agent

```text
Analisis:
1. Kelompokkan biaya berdasarkan kategori.
2. Hitung kontribusi setiap kategori terhadap total biaya.
3. Bandingkan dengan periode sebelumnya.
4. Tandai biaya yang naik tidak wajar.
5. Bedakan biaya tetap, variabel, dan HPP.

Berikan rekomendasi efisiensi.
```

## Data yang Dicek

- Cost Ratio
- Operating Expense Ratio
- Doctor Fee Ratio
- COGS Ratio
- Expense Category

---

# Prompt 014 - Pajak saya kira-kira berapa?

## User

```text
Pajak saya kira-kira berapa?
```

## Agent

```text
Analisis:
1. Hitung taxable revenue.
2. Cek non-taxable revenue jika ada.
3. Hitung estimasi pajak sesuai rule yang tersedia.
4. Cek pajak yang sudah dibayar.
5. Hitung estimasi pajak terutang.

Catatan: ini estimasi awal, bukan nasihat pajak final. Validasi tetap perlu dilakukan dengan konsultan atau petugas pajak.
```

## Data yang Dicek

- Taxable Revenue
- VAT Output Estimate
- VAT Input Estimate
- Corporate Income Tax Estimate
- Tax Payable

---

# Prompt 015 - Ada risiko pajak tidak?

## User

```text
Ada risiko pajak tidak?
```

## Agent

```text
Analisis:
1. Bandingkan revenue dashboard dengan revenue laporan pajak.
2. Cek transaksi tanpa klasifikasi pajak.
3. Cek pajak terutang belum dibayar.
4. Cek dokumen pajak yang belum lengkap.
5. Tandai gap rekonsiliasi terbesar.

Berikan daftar risiko dan prioritas perbaikan.
```

## Data yang Dicek

- Revenue Tax Reconciliation Gap
- Tax Risk Flag Count
- Tax Filing Completeness
- Tax Payable
- Tax Expense Ratio

---

# Prompt 016 - Apa yang harus saya lakukan minggu ini?

## User

```text
Apa yang harus saya lakukan minggu ini?
```

## Agent

```text
Analisis:
1. Cari 3 masalah terbesar dari finance, BPJS, operasional, dan farmasi.
2. Urutkan berdasarkan dampak uang dan urgensi.
3. Berikan action list maksimal 5 item.
4. Setiap action harus punya alasan dan KPI yang dipengaruhi.
5. Hindari rekomendasi generik.

Output harus berupa prioritas tindakan owner.
```

## Data yang Dicek

- Profit
- Revenue Growth
- BPJS Outstanding Amount
- Near Expired Stock Value
- Cost Ratio
- Total Visits

---

# Prompt 017 - Kenapa pasien turun?

## User

```text
Kenapa pasien turun?
```

## Agent

```text
Analisis:
1. Bandingkan total visits dengan periode sebelumnya.
2. Pecah berdasarkan poli, dokter, cabang, dan patient_type.
3. Cek cancellation/no-show jika tersedia.
4. Cek apakah penurunan terjadi di pasien BPJS, umum, atau asuransi.
5. Hubungkan dampaknya ke revenue.

Berikan penyebab paling mungkin dan langkah pemulihan.
```

## Data yang Dicek

- Total Visits
- Visit Growth
- Poli Visit Count
- Doctor Visit Count
- Patient Type Mix
- Cancellation Rate

---

# Prompt 018 - Apakah klinik saya sehat?

## User

```text
Apakah klinik saya sehat?
```

## Agent

```text
Analisis:
1. Cek revenue dan growth.
2. Cek profit dan margin.
3. Cek cash collection dan piutang.
4. Cek BPJS outstanding.
5. Cek stok expired/dead stock.
6. Cek operasional kunjungan.

Berikan status: Sehat, Waspada, atau Berisiko, dengan alasan.
```

## Data yang Dicek

- Revenue
- Profit
- Net Profit Margin
- Collection Rate
- BPJS Outstanding Amount
- Expired Stock Value
- Total Visits

---

# Prompt 019 - Buat ringkasan harian owner

## User

```text
Buat ringkasan harian klinik saya.
```

## Agent

```text
Analisis:
1. Omzet hari ini.
2. Laba estimasi hari ini jika data biaya tersedia.
3. Jumlah kunjungan.
4. Top poli/dokter.
5. Transaksi farmasi.
6. Alert BPJS/farmasi/biaya jika ada.

Output harus singkat dan mudah dibaca di Telegram/WhatsApp.
```

## Data yang Dicek

- Revenue
- Profit
- Total Visits
- Doctor Revenue
- Poli Revenue
- Pharmacy Revenue
- Alert KPI

---

# Prompt 020 - Buat ringkasan bulanan owner

## User

```text
Buat ringkasan bulanan klinik saya.
```

## Agent

```text
Analisis:
1. Revenue, profit, dan margin bulan ini.
2. Perbandingan dengan bulan lalu.
3. Top dokter, poli, cabang, dan farmasi.
4. Status BPJS dan piutang.
5. Risiko biaya, stok, dan pajak.
6. Rekomendasi bulan depan.

Output harus berupa executive summary untuk owner.
```

## Data yang Dicek

- Revenue
- Profit
- Revenue Growth
- Profit Growth
- BPJS Outstanding Amount
- Pharmacy Gross Margin
- Tax Risk Flag Count

---

# Template Prompt Baru

Gunakan format berikut untuk menambah prompt baru.

```text
# Prompt XXX - Judul Prompt

## User

<pertanyaan owner>

## Agent

Analisis:
1. Area pertama yang dicek
2. Area kedua yang dicek
3. Area ketiga yang dicek

Berikan rekomendasi.

## Data yang Dicek

- KPI 1
- KPI 2
- KPI 3
```

---

# Kesimpulan

Prompt Library ini menjadi fondasi percakapan AI Clinic Owner Copilot.

Setiap prompt harus mengubah pertanyaan owner menjadi analisis bisnis yang terstruktur:

```text
Pertanyaan owner
↓
KPI yang dicek
↓
Penyebab
↓
Dampak
↓
Rekomendasi
```
