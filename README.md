# PILAH

**Project Intelligence, Logic, Analysis & Handoffs** — lightweight, native-first code intelligence for Google Antigravity.

PILAH helps agents understand project symbols, inspect change impact, and organize verification test plans when native tools face ambiguity. PILAH never modifies code directly, runs arbitrary commands, or takes unguided actions.

[Documentation Index](docs/README.md) · [Architecture](docs/ARCHITECTURE.md) · [MIT License](LICENSE)

> **Status (v1.0.3):** Active development on branch `main` at [alifakbxr/pilah](https://github.com/alifakbxr/pilah). Source CI passed across 3/3 platforms (Ubuntu, macOS, Windows on Node 24). Formal external acceptance across scenarios F01–F18 remains unverified and independent. See [Build Status](BUILD_STATUS.md) and [Validation Backlog](docs/MAIN_VALIDATION_BACKLOG.md).

---

## Cara Instalasi / Installation Guide

### 1. Untuk Non-Developer (Pengguna Umum Google Antigravity)

Instalasi langsung melalui antarmuka Antigravity tanpa perlu build manual:

1. **Buka Google Antigravity**.
2. Masuk ke menu **Settings** (`Ctrl + ,` atau ikon gerigi) lalu pilih tab **Customizations** atau **Plugins**.
3. Klik tombol **Add Plugin** / **Install from Marketplace**.
4. Masukkan nama paket `@aliip/pilah` atau tautan repositori GitHub:
   ```text
   https://github.com/alifakbxr/pilah
   ```
5. Klik **Install**. Plugin PILAH dan server MCP `pilah` akan otomatis aktif di workspace Anda.

---

### 2. Untuk Developer / Kontributor (Manual Setup & CLI)

Bagi pengembang yang ingin menjalankan dari source, mengembangkan fitur, atau menjalankan tes:

#### Prasyarat
- **Node.js** `>=22.13.0` (menggunakan SQLite bawaan `node:sqlite`, tanpa dependensi external runtime).
- **Google Antigravity** atau CLI `agy`.

#### Langkah Instalasi
1. Clone repositori:
   ```bash
   git clone https://github.com/alifakbxr/pilah.git
   cd pilah
   ```
2. Jalankan pemeriksaan diagnostik dan pengujian:
   ```bash
   node scripts/pilah.mjs doctor
   node scripts/check-release.mjs
   npm test
   ```
3. Hubungkan ke Antigravity:
   - Jika menggunakan CLI `agy`:
     ```bash
     agy plugin install .
     agy plugin validate --strict .
     ```
   - Atau daftarkan ke direktori plugin konfigurasi lokal:
     ```bash
     mkdir -p ~/.gemini/config/plugins/pilah
     cp -r . ~/.gemini/config/plugins/pilah/
     ```
4. Jalankan validasi host:
   ```bash
   node scripts/pilah.mjs host-check
   ```

---

## MCP Tools

PILAH menyediakan 4 tool MCP lokal via stdio:

| Tool | Fungsi Utama | Batasan |
| --- | --- | --- |
| `pilah_context` | Kueri simbol, relasi file, dan dependensi terarah | Hanya menganalisis file relevan (tidak dump satu repo) |
| `pilah_impact` | Analisis dampak perubahan kode dan saran tes | Menghitung relasi statis, bukan eksekusi dinamis |
| `pilah_verify` | Perencanaan verifikasi terstruktur Given/When/Then | Membuat rencana uji, tidak menjalankan tes otomatis |
| `pilah_evidence` | Pelacakan bukti uji, checkpoint insiden, dan recovery | Tidak memalsukan atau mengubah hak akses |

Detail input-output selengkapnya tercantum di [MCP Contracts](docs/CONTRACTS.md).

---

## CLI Commands

CLI PILAH tersedia via `scripts/pilah.mjs`:

```bash
# Bantuan dan Diagnostik
node scripts/pilah.mjs help
node scripts/pilah.mjs doctor

# Mode Operasional
node scripts/pilah.mjs mode on-demand
node scripts/pilah.mjs mode always-on
node scripts/pilah.mjs toggle
node scripts/pilah.mjs compact on
node scripts/pilah.mjs autotrust active-only

# Manajemen Hak Akses Workspace
node scripts/pilah.mjs allow /path/to/project
node scripts/pilah.mjs revoke /path/to/project

# Analisis Kode & Dampak
node scripts/pilah.mjs inspect /path/to/project
node scripts/pilah.mjs impact /path/to/project src/index.js

# Diagnostik Token & Sesi
node scripts/pilah.mjs tokens --limit 5 --json
```

---

## Contoh Verifikasi Rencana Uji

Kirim parameter berikut ke tool `pilah_verify` dengan operasi `plan`:

```json
{
  "workspace": "/path/to/project",
  "operation": "plan",
  "criteria": [
    {
      "id": "prevent-duplicate-order",
      "given": "An order is already finalized",
      "when": "A duplicate payment request is received",
      "then": "Reject transaction with HTTP 409 and log idempotency conflict",
      "evidence_type": "integration",
      "negative": true
    }
  ]
}
```

Rencana uji berstatus `not_tested` sampai bukti pengujian riil dicatat via `pilah_evidence`. Pengujian aktual tetap dijalankan menggunakan test runner proyek Anda (seperti Vitest, Jest, PHPUnit, atau Pytest).

---

## Dokumentasi Lengkap

- [Indeks Dokumentasi](docs/README.md)
- [Arsitektur & Komponen](docs/ARCHITECTURE.md)
- [Metode Rekayasa & Prinsip Native-First](docs/ENGINEERING_METHOD.md)
- [Kontrak MCP & Skema Tool](docs/CONTRACTS.md)
- [Keamanan & Privasi Workspace](docs/SECURITY.md)
- [Kompatibilitas Runtime & Sistem](docs/COMPATIBILITY.md)
- [Efisiensi CI & Alokasi Runner](docs/CI_EFFICIENCY.md)
- [Proses Rilis & Gate Otomatisasi](docs/RELEASE.md)
- [Validasi Host Antigravity](docs/HOST_VALIDATION.md)
- [Runbook Pengujian Acceptance](docs/INDEPENDENT_ACCEPTANCE_RUNBOOK.md)
- [Validation Backlog](docs/MAIN_VALIDATION_BACKLOG.md)

---

## Lisensi

[MIT License](LICENSE) © 2026 Alif Akbar dan kontributor.
