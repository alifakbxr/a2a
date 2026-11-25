# Dokumentasi PILAH

Indeks teknis untuk **PILAH** (*Project Intelligence, Logic, Analysis & Handoffs*) pada Google Antigravity.

Repositori resmi: [alifakbxr/pilah](https://github.com/alifakbxr/pilah).

---

## 1. Panduan Arsitektur & Rekayasa

- [Arsitektur Sistem & Komponen](ARCHITECTURE.md): Komponen internal, alur data scanner, dan batas integrasi IDE.
- [Metode Rekayasa & Prinsip Native-First](ENGINEERING_METHOD.md): Perbandingan dengan pola Claude Code, iterasi cepat, dan filosofi zero-call.
- [Kontrak Skema MCP](CONTRACTS.md): Definisi lengkap parameter, validasi tipe, dan output untuk 4 tool MCP.
- [Alur Kerja Native-First](NATIVE_FIRST_WORKFLOW.md): Kapan menggunakan kemampuan bawaan Antigravity versus memanggil PILAH.
- [Kompatibilitas Sistem](COMPATIBILITY.md): Dukungan versi Node.js, sistem operasi (Linux, macOS, Windows), dan lingkungan Antigravity.
- [Keamanan & Privasi Workspace](SECURITY.md): Model izin workspace, isolasi SQLite, dan proteksi file sensitif.

---

## 2. Pengujian, Efisiensi & Rilis

- [Validasi Host Antigravity](HOST_VALIDATION.md): Prosedur preflight lokal untuk memeriksa registrasi plugin pada CLI `agy`.
- [Efisiensi CI & Alokasi Runner](CI_EFFICIENCY.md): Konfigurasi runner GitHub Actions untuk pengujian cepat dan hemat resource.
- [Proses Rilis & Verifikasi Registry](RELEASE.md): Checklist sebelum rilis dan verifikasi publikasi paket.
- [Otorisasi Rilis](RELEASE_AUTHORIZATION.md): Kontrak verifikasi rilis independen dan integritas commit.
- [Validation Backlog](MAIN_VALIDATION_BACKLOG.md): Status pengujian fungsional dan hal-hal yang ditunda (*deferred/superseded*).
- [Efisiensi Token](TOKEN_EFFICIENCY.md): Pedoman optimasi prompt, diagnostik log, dan pencegahan token berlebih.

---

## Historical implementation audits and research — reference only

Arsip riset dan rekam jejak audit teknis disimpan dalam commit git riwayat repositori untuk melacak evolusi desain PILAH.
