# 15 - Integration Strategy

## Target SIM Klinik V1

1. Khanza
2. SmartClinic
3. Vmedis
4. Medify
5. Export Excel Generic

---

## Pola Import Data Bertahap

AI Clinic Owner Copilot memakai 3 pola import data yang akan digunakan secara bertahap. Semua pola tetap mengikuti prinsip utama: **SIM Klinik adalah source of truth** dan **tidak ada double entry**.

| Pola | Nama | Fase | Fungsi | Cocok Untuk |
|---|---|---|---|---|
| Pola A | Upload Data | V1 / Pilot awal | Owner/staff upload export Excel/CSV dari SIM Klinik | Validasi cepat dengan klinik nyata |
| Pola B | Google Drive Sync | V2 / Pilot stabil | File export SIM ditaruh di folder Google Drive lalu disinkronkan otomatis/terjadwal | Klinik yang rutin export laporan |
| Pola C | API SIM Klinik | V3 / Scale-up | Sistem menarik data langsung dari API SIM Klinik/vendor | SaaS readiness dan integrasi jangka panjang |

---

## Pola A — Upload Data

### Tujuan

Memulai pilot secepat mungkin dengan data riil tanpa menunggu integrasi vendor.

### Alur

```text
Export Excel/CSV dari SIM Klinik
→ Upload ke AI Clinic Owner Copilot
→ Mapping ke RAW_* sheet
→ Normalisasi ke DW_* sheet
→ Hitung KPI
→ Dashboard/AI summary
```

### Karakteristik

- Manual tapi cepat untuk validasi awal.
- Cocok untuk 1 klinik pratama, 1 klinik gigi, dan 1 klinik perusahaan pada fase pilot.
- Wajib menyimpan `source_file`, `source_row_id`, `sync_id`, dan `import_pattern = upload`.
- Tidak boleh meminta staff input ulang transaksi satu per satu.

### Risiko

- Format file tidak konsisten.
- Human error saat memilih file.
- Perlu validasi duplicate import.

---

## Pola B — Google Drive Sync

### Tujuan

Mengurangi pekerjaan manual setelah format export klinik mulai stabil.

### Alur

```text
SIM Klinik export ke folder Google Drive
→ Folder dipantau/sinkron berkala
→ File baru diproses sebagai sync batch
→ Mapping ke RAW_* sheet
→ Normalisasi dan hitung KPI
```

### Karakteristik

- Semi otomatis.
- Cocok untuk klinik yang belum punya API tetapi bisa export rutin.
- Wajib menyimpan `drive_file_id`, `drive_folder_id`, `source_file`, `sync_id`, dan `import_pattern = drive_sync`.
- Perlu aturan file naming dan archive agar tidak duplicate.

### Risiko

- File terlambat diupload.
- Nama file tidak standar.
- File lama berubah setelah pernah diproses.

---

## Pola C — API SIM Klinik

### Tujuan

Mendukung integrasi jangka panjang dan kesiapan SaaS.

### Alur

```text
API SIM Klinik
→ Connector/API sync
→ RAW_* sheet
→ DW_* sheet
→ KPI/dashboard/AI
```

### Karakteristik

- Paling otomatis.
- Cocok setelah value pilot terbukti.
- Wajib menyimpan `api_endpoint`, `api_request_id`, `source_system`, `source_row_id`, `sync_id`, dan `import_pattern = api`.
- Perlu kontrak field, pagination, retry, rate limit, dan audit log.

### Risiko

- API tiap vendor berbeda.
- Butuh credential dan approval vendor/klinik.
- Perlu handling partial sync dan retry.

---

## Roadmap Integrasi

### V1 — Pilot Awal

- Pola A: Upload Excel.
- Pola A: Upload CSV.
- Fokus pada mapping data riil dan validasi 5 pertanyaan owner.

### V2 — Pilot Stabil

- Pola B: Google Drive Sync.
- Folder per klinik/source.
- Deteksi file baru dan duplicate import.
- Archive file setelah sukses diproses.

### V3 — Scale-up / SaaS Readiness

- Pola C: API Connector.
- Connector per vendor SIM Klinik.
- Sync terjadwal dan incremental.
- Monitoring error dan retry.

---

## Field Traceability Import

Setiap row `RAW_*` minimal menyimpan:

| Field | Wajib | Keterangan |
|---|---:|---|
| `import_pattern` | Ya | `upload`, `drive_sync`, atau `api` |
| `source_system` | Ya | Nama SIM/vendor/source |
| `source_file` | Wajib untuk upload/drive | Nama file sumber |
| `source_row_id` | Ya jika tersedia | ID/nomor baris dari source |
| `sync_id` | Ya | ID batch sync/import |
| `uploaded_by` | Untuk upload | User yang upload file |
| `drive_file_id` | Untuk drive_sync | ID file Google Drive |
| `drive_folder_id` | Untuk drive_sync | ID folder Google Drive |
| `api_endpoint` | Untuk API | Endpoint sumber data |
| `api_request_id` | Untuk API | ID request/correlation ID |
| `imported_at` | Ya | Timestamp import |

---

## Guardrail

1. Jangan membangun flow input transaksi baru.
2. Upload/Drive/API hanya cara mengambil data dari SIM Klinik/source yang sudah ada.
3. Jika data belum lengkap, dashboard wajib menampilkan `estimated` atau `incomplete`.
4. Setiap pola import harus bisa menghasilkan `sync_id` agar audit dan rollback batch memungkinkan.
