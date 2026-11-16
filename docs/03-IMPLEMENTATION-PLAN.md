# Implementation Plan — Idola One Web

**Versi dokumen:** 0.1 (draf)
**Tanggal:** 16 November 2026
**Mengacu ke:** [01-PRD.md](01-PRD.md) (fase di bagian 13) dan [02-APPFLOW.md](02-APPFLOW.md)

Dokumen ini memecah fase PRD menjadi tugas. **Tidak ada estimasi tanggal**, karena kecepatan kerja belum diketahui. Urutan dan kriteria selesai yang mengikat. Estimasi bisa ditambahkan setelah Fase 0 selesai.

Penanda tugas:

- `[K-xx]` = bergantung pada keputusan terbuka di PRD bagian 16.
- `[DB]` = membutuhkan migration database baru. Wajib diuji di staging lebih dulu.
- Tugas bertanda **gerbang** harus lulus sebelum fase berikutnya dimulai.

---

## Prinsip pelaksanaan

1. **Database produksi tidak diubah saat pengembangan.** Pengembangan memakai staging Supabase. Produksi hanya menerima migration yang sudah lulus uji.
2. **Hanya menambah.** Tidak mengubah atau menghapus data, ID, snapshot harga, atau tanggal transaksi lama.
3. **Satu fitur selesai = kode, uji, dan alur terverifikasi** (bukan hanya tampilan jadi).
4. **Kunci versi dependency** di lockfile dan tidak menaikkan versi di tengah fase tanpa alasan.
5. **Masa paralel:** Android tetap berjalan sampai Fase 4. Web dan Android menulis ke database lewat RPC yang sama.

---

## Fase 0 — Fondasi

Tujuan: kerangka proyek, login, dan lingkungan uji siap. Belum ada fitur bisnis.

| No | Tugas | Hasil |
| --- | --- | --- |
| 0.1 | Putuskan K-01 s.d. K-06. Terutama **uji printer** dengan printer toko lewat Web Bluetooth, RawBT, dan Web Serial. | Catatan hasil uji dan jalur cetak terpilih |
| 0.2 | Buat repo GitHub `IdolaOne` dan rapikan konvensi (branch, commit, PR) | Repo siap |
| 0.3 | Setup proyek: Vite + React + TypeScript strict, pnpm, oxlint/ESLint, Prettier, Vitest, Playwright | `pnpm dev`, `lint`, `test`, `build` berjalan |
| 0.4 | Setup CI GitHub Actions: lint, type-check, test, build | CI hijau di setiap PR |
| 0.5 | Siapkan **staging Supabase** (K-05) dari skema produksi dan data contoh. Satukan folder migration ke repo ini (K-02). | Staging berjalan, migration terurut |
| 0.6 | Generate tipe TypeScript dari skema (`supabase gen types`) | Tipe database dalam repo |
| 0.7 | Tema: token warna, font DM Sans, komponen dasar (tombol, input, kartu, dialog, tabel, sheet, toast, state kosong/error/loading) | Pustaka komponen dasar |
| 0.8 | Router dengan guard per peran dan tata letak: sidebar (owner desktop), navigasi bawah (ponsel) | Shell Owner, Karyawan, POS kosong |
| 0.9 | Klien Supabase, penyimpanan sesi, TanStack Query, helper Realtime, penanganan error terpusat | Fondasi data |
| 0.10 | Auth: login, logout, pemulihan sesi, akun nonaktif ditolak, pilih usaha | AUTH-01, 02, 03, 06 |
| 0.11 | PWA dasar: manifest, service worker, banner "Versi baru, muat ulang" | Dapat dipasang di layar utama |
| 0.12 | Deploy staging otomatis dari `main` (K-03, K-04) | URL staging |

**Gerbang Fase 0:**

- Owner dan karyawan uji dapat login di staging dan melihat shell yang benar.
- CI hijau.
- Jalur cetak sudah dipilih (atau dicatat sebagai risiko dengan cadangan PDF).
- RLS lintas toko diuji dengan dua akun berbeda.

---

## Fase 1 — Kasir Laundry (P0)

Tujuan: karyawan dapat menjalankan alur harian dari web.

| No | Tugas | Kebutuhan |
| --- | --- | --- |
| 1.1 | Layanan dan harga: daftar, tambah, ubah, aktif/nonaktif (owner), baca (karyawan) | SVC-01, 02 |
| 1.2 | Pelanggan: daftar, cari, tambah, ubah, hapus lunak, normalisasi nomor, cegah duplikat, tambah cepat, Contact Picker | CUS-01, 02, 05 |
| 1.3 | Form pesanan baru: Kiloan, Satuan, Gabung, keranjang, perkiraan total, pembayaran awal | ORD-01 |
| 1.4 | Simpan lewat `create_laundry_order` dan tampilkan nomor nota/total dari server, dengan perlindungan klik ganda | ORD-02 |
| 1.5 | Daftar pesanan: cari, filter status dan periode, paginasi server. Karyawan melihat "Pesanan Saya". | ORD-03 |
| 1.6 | Detail pesanan: item, pelanggan, penerima, riwayat pembayaran, sisa tagihan | ORD-04 |
| 1.7 | Ubah status sesuai transisi server, termasuk pengambilan walau belum lunas | ORD-05, 07 |
| 1.8 | Template WhatsApp "Siap Diambil" | ORD-06 |
| 1.9 | Terima pembayaran lewat `record_order_payment`, metode Tunai/Transfer/QRIS | PAY-01, 02 |
| 1.10 | Cetak: nota, label cucian, bukti pengambilan, lebar 58/80 mm, cetak uji, cetak ulang, cadangan PDF | PRN-01 s.d. 05 |
| 1.11 | Notifikasi in-app: badge, daftar, baca, hapus, Realtime | NTF-01, 02 |
| 1.12 | Beranda karyawan dengan aksi cepat | AUTH-03 |
| 1.13 | Uji E2E Playwright: login → pesanan baru → bayar → siap → diambil | NFR-12 |
| 1.14 | **Masa paralel:** satu karyawan memakai web berdampingan dengan Android selama 1 minggu. Rekonsiliasi harian. | Indikator keberhasilan |

**Gerbang Fase 1:**

- Uji E2E lulus.
- Tidak ada selisih total, pembayaran, atau kas antara pesanan yang dibuat dari web dan Android pada masa paralel.
- Cetak nota dan label berhasil di printer toko, atau cadangan PDF disepakati owner.

---

## Fase 2 — Operasional dan owner (P0)

| No | Tugas | Kebutuhan |
| --- | --- | --- |
| 2.1 | Stok: Live Stock, Beli Stok, Pakai Stok | INV-01 s.d. 03 |
| 2.2 | Pengeluaran dengan filter periode, jumlah, dan total | EXP-01 |
| 2.3 | `[DB]` RPC aggregate untuk Beranda dan laporan | RPT-03 |
| 2.4 | Buku Kas: saldo, masuk, keluar, rincian metode, periode, ekspor CSV | PAY-05 |
| 2.5 | Beranda owner (KPI, pengajuan menunggu, pesanan terbaru) | RPT-01 |
| 2.6 | Laporan Pesanan dan Keuangan | RPT-02 |
| 2.7 | Laporan Pembayaran karyawan dan draf WhatsApp | PAY-06 |
| 2.8 | Koreksi pembayaran oleh owner | PAY-04 |
| 2.9 | Absensi selfie: kamera browser, unggah Storage, waktu server | ATT-01 |
| 2.10 | Pengajuan: form per jenis (karyawan) dan Pusat Pengajuan (owner), label status yang benar | REQ-01 s.d. 04 |
| 2.11 | Karyawan: tambah akun (Edge Function), ubah, aktif/nonaktif | EMP-01 |
| 2.12 | Pengaturan toko, profil, ganti password | SET-01, AUTH-05 |
| 2.13 | Uji RLS lintas toko dan lintas peran untuk semua tabel yang tersentuh | NFR-01 |
| 2.14 | Bandingkan laporan web dan Android untuk periode yang sama | Gerbang |

**Gerbang Fase 2:**

- Laporan web sama dengan laporan Android untuk periode yang sama.
- Pengajuan dan absensi diuji dua perangkat (karyawan dan owner) dengan data nyata.
- Semua fitur P0 di PRD tersedia.

---

## Fase 3 — Paritas penuh (P1)

| No | Tugas | Kebutuhan |
| --- | --- | --- |
| 3.1 | Kelola usaha dan assignment karyawan | AUTH-04 |
| 3.2 | Jadwal shift, jadwal saya, Lupa Absen, absensi semua karyawan | SHF-01, ATT-02, 03 |
| 3.3 | Payroll dan pembayaran insentif item | PAYR-01, 02, ORD-09 |
| 3.4 | Proyek B2B: proyek, batch, termin | PRJ-01 s.d. 03 |
| 3.5 | POS minuman: buka jualan, produk, kasir, ringkasan, laporan per usaha | POS-01 s.d. 05 |
| 3.6 | `[DB]` Tambahkan tabel POS ke publication Realtime atau polling terdokumentasi | NFR-04 |
| 3.7 | Poin pelanggan: saldo dan riwayat di detail pelanggan | CUS-03, 04 |
| 3.8 | Ubah layanan kiloan oleh owner | ORD-08 |
| 3.9 | Kas manual | PAY-07 |
| 3.10 | Stok: koreksi +/− oleh owner | INV-04 |
| 3.11 | `[DB]` Histori transisi status pesanan (append-only) dan Analitik | RPT-04 |
| 3.12 | Audit: garis waktu, filter, perbandingan data, paginasi server | AUD-01 |
| 3.13 | Ekspor CSV pesanan, kas, pelanggan | RPT-05 |
| 3.14 | `[DB]` Web Push (tabel langganan, pengirim) | NTF-03 |
| 3.15 | Uji E2E tambahan: POS, pengajuan, proyek | NFR-12 |

**Gerbang Fase 3:**

- Semua fitur P1 tersedia dan lulus uji.
- APK dibekukan (hanya perbaikan kritis).

---

## Fase 4 — Pensiun aplikasi lama

| No | Tugas |
| --- | --- |
| 4.1 | Semua karyawan dan owner pindah ke web |
| 4.2 | Pantau 2 minggu tanpa ada yang kembali ke APK |
| 4.3 | Hentikan cloud updater APK dan arsipkan repo `LaundryApp` (read-only) |
| 4.4 | Cadangkan dokumen `Knowledge Core` dan arsipkan |
| 4.5 | Retrospektif: apa yang perlu diperbaiki |

---

## Fase 5 — Pengembangan lanjutan (P2)

Berurutan menurut kebutuhan owner:

- Google Contacts (CUS-06)
- Antrean offline (NFR-05)
- POS lanjutan: varian, resep, diskon, refund, struk, tutup kas (POS-06)
- Laba/rugi per proyek (PRJ-04)
- Ekspor/backup owner (SET-02)
- Portal pelanggan dan penukaran poin
- Passkey/WebAuthn untuk login cepat

---

## Strategi pengujian

| Jenis | Alat | Cakupan |
| --- | --- | --- |
| Unit | Vitest | Format rupiah, periode, normalisasi nomor, pemetaan status |
| Komponen | Testing Library | Form pesanan, pembayaran, tabel |
| E2E | Playwright | Alur kasir, pengajuan, POS, login per peran |
| RLS | Skrip SQL dengan beberapa akun uji di staging | Akses lintas toko dan lintas usaha |
| Rekonsiliasi | Skrip perbandingan web vs Android | Total pesanan, pembayaran, dan kas per hari |
| Manual di perangkat | Ponsel toko dan printer asli | Cetak, kamera, PWA |

Uji **tidak** boleh membuat atau mengubah data di database produksi.

## Strategi migrasi data dan peralihan

1. Tidak ada pemindahan data. Web membaca dan menulis ke Supabase yang sama.
2. Migration baru hanya lewat staging terlebih dahulu, lalu produksi dengan jadwal dan cadangan sebelum menerapkan.
3. Sebelum Fase 1 dimulai pemakaian produksi, ambil cadangan (snapshot baca-saja) jumlah baris per tabel sebagai pembanding.
4. Peralihan per orang: satu karyawan lebih dulu (Fase 1), lalu semua (Fase 2 dan 3), lalu owner.
5. **Rollback:** Android tetap tersedia sampai Fase 4. Jika web bermasalah di toko, karyawan dapat kembali ke APK tanpa kehilangan data.

## Risiko pelaksanaan

| Risiko | Mitigasi |
| --- | --- |
| Hasil uji printer buruk | Selesaikan 0.1 lebih dulu. Siapkan cadangan PDF/WhatsApp. Pertimbangkan penggantian printer. |
| Migration di repo lama tidak sama dengan database | Selesaikan K-02 di Fase 0, bandingkan daftar migration repo vs database sebelum membuat staging |
| Fase 3 melebar | Fitur P1 bisa dipecah rilis. Prioritas ditetapkan owner. |
| Data staging berbeda dari produksi | Gunakan data contoh yang meniru bentuk produksi. Tidak menyalin data pelanggan nyata kecuali disetujui owner. |
| Ketergantungan pada satu orang | Dokumentasikan keputusan di `docs/` dan jaga CI tetap hijau |

## Dokumen berikutnya

- `docs/04-TRD.md`: arsitektur teknis rinci (struktur folder, pola data, keamanan)
- `docs/05-UI-UX.md`: wireframe tiap layar
- `docs/06-TEST-PLAN.md`: kasus uji rinci
