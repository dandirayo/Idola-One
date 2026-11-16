# Product Requirements Document — Idola One Web

**Produk:** Idola One Web
**Versi dokumen:** 0.1 (draf)
**Tanggal:** 16 November 2026
**Status:** Draf untuk ditinjau owner
**Pengganti dari:** aplikasi Android Flutter `laundry_app_flutter` (2.1.15+31) dan dashboard owner `admin_dashboard_web`

> **Pembaruan keputusan (16 Nov 2026):** backend tidak lagi memakai layanan Supabase, tetapi server sendiri (VPS/mini server). Semua bagian dokumen ini yang menyebut Supabase, RLS, RPC, atau Edge Function sebagai backend dibaca sebagai **"backend sendiri"** sesuai [04-BACKEND.md](04-BACKEND.md). Fitur, aturan bisnis, dan prioritas tidak berubah. Desain visual diganti mengikuti referensi dashboard "Eduplex" (bagian 11).

---

## 1. Ringkasan

Idola One adalah aplikasi operasional dan kasir multi-usaha untuk Idola Laundry dan usaha kecil milik owner yang sama (saat ini booth Es Teh/minuman). Saat ini produk terbagi dua:

- **Aplikasi Android (Flutter)** untuk owner dan karyawan: pesanan, pembayaran, cetak nota, absensi, pengajuan, stok, kas, dan POS minuman.
- **Dashboard web (React + Vite)** khusus owner: ringkasan, koreksi data, laporan, dan audit. Cakupannya baru sebagian modul Laundry.

**Idola One Web** menyatukan keduanya menjadi **satu aplikasi berbasis web** yang dipakai owner dan karyawan dari ponsel, tablet, maupun komputer. Aplikasi ini memakai **database Supabase yang sudah berjalan** (project "Idola One"), sehingga data yang sudah ada tetap dipakai tanpa dipindahkan.

## 2. Latar belakang dan alasan pindah ke web

| Masalah saat ini | Dampak | Yang diharapkan dari versi web |
| --- | --- | --- |
| Dua kode terpisah (Flutter dan React) untuk satu produk | Fitur tidak sama di Android dan web, kerja dobel tiap perubahan | Satu basis kode, satu tampilan untuk semua peran |
| Rilis lewat APK dan cloud updater | Karyawan harus mengunduh dan memasang APK, ada risiko versi lama tetap dipakai | Pembaruan langsung saat halaman dimuat ulang, tanpa instal ulang |
| Dashboard web tertinggal dari Android (POS, absensi, payroll, notifikasi, poin belum ada) | Owner tetap bergantung pada ponsel | Owner punya semua fungsi di layar besar maupun ponsel |
| `App.tsx` web dan halaman Flutter yang besar | Sulit dirawat dan diuji | Struktur per fitur sejak awal |
| Hanya Android | iOS dan laptop tidak bisa dipakai karyawan | Berjalan di browser modern apa pun, dapat dipasang sebagai aplikasi (PWA) |

## 3. Tujuan dan bukan tujuan

### 3.1 Tujuan

1. Menyediakan **semua fungsi** yang ada di Android dan dashboard web sekarang dalam satu aplikasi web.
2. **Tidak ada data yang hilang atau berubah** karena pergantian aplikasi. Data produksi saat ini (per 16 Nov 2026) tetap menjadi sumber kebenaran, termasuk:
   - 1.091 pelanggan dan 243 pesanan;
   - 202 pembayaran dan 214 transaksi kas;
   - 194 layanan.
3. Dapat dipakai nyaman di ponsel karyawan (kasir di toko) dan di laptop owner.
4. Aturan bisnis (harga, pembulatan, pembayaran, kas, poin, stok) **identik** dengan sistem sekarang, karena dijalankan oleh fungsi database yang sama.
5. Masa transisi aman: Android dan web dapat berjalan bersamaan sampai web siap menggantikan sepenuhnya.

### 3.2 Bukan tujuan (versi pertama)

- Membangun ulang database atau memindahkan data ke layanan lain.
- Portal atau aplikasi untuk pelanggan, penukaran poin, dan pemesanan online oleh pelanggan.
- Fitur POS lanjutan: varian/topping, resep bahan, refund, tutup kas POS.
- Aplikasi native iOS/Android baru.

## 4. Pengguna dan peran

| Peran | Perangkat utama | Kebutuhan utama |
| --- | --- | --- |
| **Owner** | Laptop dan ponsel | Melihat semua usaha, mengatur harga, karyawan, dan akses. Menyetujui pengajuan, mengoreksi pembayaran, membaca laporan dan audit. |
| **Karyawan Laundry** | Ponsel/tablet di toko | Membuat dan memperbarui pesanan, menerima pembayaran, mencetak nota/label, absensi selfie, membuat pengajuan. |
| **Karyawan Minuman (POS)** | Ponsel | Buka/tutup jualan harian, kasir cepat, melihat omzet hari ini. Tidak melihat menu laundry. |

Hak akses mengikuti data yang sudah ada:

- peran diambil dari `profiles`;
- akses usaha diambil dari `businesses` dan `business_members`;
- data dibatasi oleh `shop_id` dan `business_id`.

**RLS di database tetap menjadi penjaga utama.** Menyembunyikan menu di UI bukan pengganti RLS.

## 5. Prinsip produk

1. **Satu backend bersama.** Web memakai Supabase project yang sama dengan Android. Tidak ada database kedua.
2. **Server yang menentukan angka.** Total, nomor nota, pembayaran, kas, poin, dan stok dihitung oleh RPC dan trigger yang sudah ada. Web tidak menghitung ulang dengan rumus sendiri.
3. **Perubahan database hanya menambah.** Skema baru wajib lewat migration baru, dilengkapi RLS dan audit. Dilarang mengubah ID, snapshot harga, pembayaran, atau tanggal transaksi historis.
4. **Ponsel dulu untuk karyawan, layar lebar untuk owner.** Tata letak responsif, bukan dua aplikasi berbeda.
5. **Status harus bermakna.** Pakai istilah yang sama dengan Android: Menunggu, Disetujui, Ditolak, Dilaksanakan, Diproses, Siap Diambil, Diambil, Belum Bayar, DP, Lunas.
6. **Gagal cetak tidak membatalkan transaksi.** Transaksi disimpan dulu, cetak menyusul dan bisa diulang.

## 6. Rekomendasi teknologi

Pertimbangan utama:

- aplikasi ini internal dan memerlukan login, jadi tidak butuh SEO maupun server rendering;
- backend sudah lengkap di Supabase (Auth, Postgres, RPC, Realtime, Storage);
- dashboard web sekarang sudah memakai React, TypeScript, Vite, dan supabase-js, sehingga pengetahuan dan sebagian kode bisa dilanjutkan.

| Lapisan | Rekomendasi | Alasan |
| --- | --- | --- |
| Bahasa | **TypeScript** (strict) | Tipe data dari skema Supabase dapat dibuat otomatis, sehingga kesalahan kolom terdeteksi sebelum rilis |
| Framework UI | **React** + **Vite** (Single Page App) | Sama dengan dashboard sekarang. Ringan, cepat, cocok untuk PWA, dan cukup di-hosting sebagai file statis. |
| Routing | **React Router** (terpasang di proyek) | Route per peran dan guard. TanStack Router tidak jadi dipakai karena React Router sudah cukup. |
| Data dan cache | **TanStack Query** + **supabase-js** | Cache, refetch saat fokus, dan invalidasi saat event Realtime. Pola ini sudah dipakai di Flutter dan dashboard. |
| Tampilan | **Tailwind CSS v4** + komponen sendiri (shadcn/ui dapat ditambahkan bila perlu) | Komponen aksesibel (dialog, sheet, tabel, form) yang bisa disesuaikan dengan token warna Idola |
| Form dan validasi | **React Hook Form** + **Zod** | Validasi form pesanan, pembayaran, dan pengajuan konsisten di satu tempat |
| Tabel dan grafik | **TanStack Table**, **Recharts** | Tabel dengan paginasi/filter server, grafik laporan |
| PWA dan offline | **vite-plugin-pwa** (Workbox), **Dexie** (IndexedDB) | Bisa dipasang di layar utama, cache tampilan, antrean aksi ringan saat jaringan putus |
| Notifikasi push | **Web Push** lewat service worker (FCM web atau VAPID) | Pengganti Firebase Messaging di Android |
| Backend | **Supabase** yang sudah ada | Data, RLS, RPC, trigger, Realtime, Storage, dan Edge Function tetap dipakai |
| Pengujian | **Vitest**, **Testing Library**, **Playwright** | Unit, komponen, dan uji alur kasir end-to-end |
| Kualitas kode | **oxlint**, **Vitest**, **npm** | oxlint sudah dipakai dashboard sekarang. npm dipilih karena sudah terpasang di komputer, tanpa memasang alat tambahan. |
| Hosting | Hosting statis (Cloudflare Pages atau VPS + Nginx) | Tidak perlu server aplikasi. Lihat keputusan terbuka K-03. |
| CI/CD | **GitHub Actions** | Lint, test, dan build di setiap PR, lalu deploy otomatis dari `main` |

Versi persis setiap paket ditentukan saat setup proyek dan dikunci di lockfile.

**Alternatif yang dipertimbangkan:**

- **Next.js.** Kuat, tetapi menambah lapisan server yang tidak dibutuhkan karena seluruh logika sudah ada di Supabase.
- **Flutter Web.** Memakai ulang kode Dart, tetapi ukuran unduhan besar, tampilan tabel dan form di browser kurang alami, dan cakupan PWA lebih terbatas.

## 7. Batasan platform web dan solusinya

Beberapa fitur Android memakai kemampuan perangkat yang **tidak sama** di browser. Bagian ini harus disepakati sebelum pengembangan.

| Fitur Android | Batasan di browser | Solusi yang diusulkan | Prioritas |
| --- | --- | --- | --- |
| **Printer thermal Bluetooth 58/80 mm (ESC/POS)** | Web Bluetooth hanya mendukung BLE, sedangkan banyak printer thermal murah (misal RPP02N) memakai Bluetooth Classic. iOS Safari tidak mendukung Web Bluetooth. | (1) Uji printer yang dipakai sekarang dengan Web Bluetooth. (2) Bila tidak didukung, kirim data ESC/POS ke aplikasi print service Android (misal RawBT) lewat intent/share. (3) Di laptop, pakai Web Serial atau cetak HTML berukuran 58/80 mm. (4) Selalu sediakan cadangan PDF dan bagikan ke WhatsApp. | P0, perlu uji perangkat |
| **Sinkron kontak Google** | Browser tidak bisa membaca atau menulis kontak otomatis. Contact Picker API hanya ada di Chrome Android, hanya baca, dan dipilih manual. | v1: tambah pelanggan manual dan Contact Picker (pilih kontak saat membuat pesanan). v2: integrasi Google People API dengan izin OAuth owner. | P1 |
| **Absensi selfie** | Kamera bisa diakses lewat `getUserMedia` atau `<input capture>` | Ambil foto di browser, unggah ke Supabase Storage, waktu dicatat server | P0 |
| **Notifikasi push (FCM)** | Web Push didukung Chrome/Edge/Firefox. Di iPhone hanya bila PWA dipasang ke layar utama (iOS 16.4+). | Web Push via service worker, notifikasi in-app Realtime tetap utama | P1 |
| **Update APK dari cloud** | Tidak diperlukan | Service worker mendeteksi versi baru dan menampilkan tombol "Muat ulang" | P0 |
| **Buka WhatsApp dengan template** | Didukung lewat tautan `wa.me` | Sama seperti sekarang | P0 |
| **PIN buka cepat** | Tidak ada keamanan tingkat perangkat seperti Android | v1: sesi Supabase dengan masa aktif dan kunci layar opsional. Pertimbangkan WebAuthn/passkey. | P2 |
| **Mode offline** | Service worker dan IndexedDB tersedia | Lihat bagian 10 (NFR-05) | P1 |

## 8. Ruang lingkup fitur

Prioritas:

- **P0:** wajib ada sebelum web menggantikan Android di toko.
- **P1:** wajib ada sebelum APK dihentikan sepenuhnya.
- **P2:** pengembangan sesudahnya.

### 8.1 Akun, peran, dan multi-usaha

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| AUTH-01 | Login email/username dan password via Supabase Auth. Akun nonaktif ditolak. | P0 |
| AUTH-02 | Setelah login, tampilkan usaha aktif yang boleh diakses. Pilihan usaha disimpan sebagai konteks sesi. | P0 |
| AUTH-03 | Shell navigasi berbeda untuk Owner Laundry, Karyawan Laundry, dan Anggota POS | P0 |
| AUTH-04 | Owner menambah usaha (jenis minuman) dan mengatur karyawan per usaha | P1 |
| AUTH-05 | Profil pengguna dan ganti password | P0 |
| AUTH-06 | Logout membersihkan sesi, cache data sensitif, dan langganan Realtime | P0 |

### 8.2 Pesanan Laundry

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| ORD-01 | Buat pesanan Kiloan, Satuan, atau Gabung. Pilih atau tambah pelanggan, layanan dan varian (sprei 160/180/200 terpisah), berat desimal per 0,1 kg (minimal 3 kg dengan pengecualian), jumlah item. Tambahkan penerima, petugas, tenggat, dan catatan. | P0 |
| ORD-02 | Simpan lewat RPC `create_laundry_order` secara atomik. Server membuat nomor nota (`IDL-YYYYMMDD-0001`), snapshot harga, dan pembulatan total ke atas kelipatan Rp1.000. | P0 |
| ORD-03 | Daftar pesanan dengan pencarian, filter status, filter periode, dan paginasi server. Karyawan melihat "Pesanan Saya". | P0 |
| ORD-04 | Detail pesanan: item, pelanggan, penerima, petugas, tenggat, catatan, riwayat pembayaran, sisa tagihan, poin | P0 |
| ORD-05 | Ubah status: Diterima → Diproses → Siap Diambil → Diambil, dan Batal. Mengikuti aturan transisi di server. | P0 |
| ORD-06 | Saat status menjadi **Siap Diambil**, buka WhatsApp dengan template berisi nama, nomor nota, dan sisa tagihan | P0 |
| ORD-07 | Pesanan boleh diambil walau belum lunas. Sisa tagihan tetap tercatat dan terlihat. | P0 |
| ORD-08 | Owner mengubah layanan kiloan lewat `update_order_kilo_services`. Server menghitung ulang total dan sisa. | P1 |
| ORD-09 | Insentif item satuan (sepatu/helm/tas: Rp0/10.000/15.000/20.000) dipilih saat membuat pesanan untuk karyawan yang ditugaskan | P1 |

### 8.3 Pembayaran dan Buku Kas

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| PAY-01 | Status bayar: Belum Bayar, DP, Lunas, atau nominal manual. Metode: Tunai, Transfer, QRIS. Pembayaran tunai dan transfer dalam satu nota ditandai Hybrid. | P0 |
| PAY-02 | Pembayaran tambahan wajib lewat RPC `record_order_payment` | P0 |
| PAY-03 | Setiap pembayaran otomatis tercatat di `cash_transactions` oleh trigger. Web tidak menulis kas pembayaran sendiri. | P0 |
| PAY-04 | Koreksi pembayaran (nominal, metode, tanggal) hanya oleh owner, lewat RPC, dan tercatat di audit | P0 |
| PAY-05 | Buku Kas owner: saldo akhir, masuk, keluar, rincian per metode, filter Hari ini/Kemarin/Minggu ini/Bulan ini/rentang tanggal, ekspor CSV | P0 |
| PAY-06 | Laporan Pembayaran karyawan: rincian per metode pada periode terpilih, lalu draf WhatsApp ke owner | P0 |
| PAY-07 | Kas manual (masuk/keluar) oleh owner | P1 |

### 8.4 Cetak dokumen

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| PRN-01 | Tiga dokumen terpisah, dicetak satu per satu: **Nota pelanggan**, **Label cucian** (huruf besar), dan **Bukti lunas/pengambilan** | P0 |
| PRN-02 | Mendukung lebar kertas 58 mm dan 80 mm, dengan logo toko | P0 |
| PRN-03 | Pengaturan printer dan cetak uji | P0 |
| PRN-04 | Cetak ulang dari detail pesanan. Cadangan PDF dan bagikan ke WhatsApp. | P0 |
| PRN-05 | Metode pengiriman ke printer mengikuti hasil uji perangkat (bagian 7) | P0 |

### 8.5 Pelanggan dan poin

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| CUS-01 | Cari, tambah, ubah, dan hapus lunak (soft delete) pelanggan. Normalisasi nomor Indonesia dan cegah duplikat per toko. | P0 |
| CUS-02 | Tambah cepat pelanggan dari form pesanan | P0 |
| CUS-03 | Detail pelanggan: riwayat pesanan, sisa tagihan, saldo poin, dan riwayat poin (hanya baca) | P1 |
| CUS-04 | Poin: 1 poin per Rp10.000 pada pesanan lunas, dihitung trigger `sync_customer_points`. Web tidak mengedit saldo. | P1 |
| CUS-05 | Pilih kontak dari ponsel (Contact Picker) bila browser mendukung | P1 |
| CUS-06 | Sinkron dua arah dengan Google Contacts | P2 |

### 8.6 Layanan dan harga

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| SVC-01 | Owner mengelola kategori dan layanan: unit (kg/pcs), harga, express, estimasi selesai, ukuran/material, aktif/nonaktif | P0 |
| SVC-02 | Perubahan harga tidak mengubah pesanan lama, karena harga tersimpan sebagai snapshot | P0 |

### 8.7 Stok dan pengeluaran

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| INV-01 | Live Stock: daftar barang, stok minimum, tanda stok menipis (gas, plastik per ukuran, sabun, pewangi) | P0 |
| INV-02 | Beli Stok lewat `record_inventory_purchase`: mutasi masuk, pengeluaran kategori Stok, dan kas tercatat dalam satu transaksi | P0 |
| INV-03 | Pakai Stok lewat `record_inventory_usage`: mutasi keluar dengan pemeriksaan sisa, tanpa pengeluaran kas kedua | P0 |
| INV-04 | Koreksi +/− (stok awal/opname) khusus owner | P1 |
| EXP-01 | Pengeluaran: deskripsi, kategori, nominal, metode. Masuk ke kas otomatis. Filter periode dengan jumlah dan total. | P0 |

### 8.8 Karyawan, jadwal, absensi, dan gaji

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| EMP-01 | Owner menambah akun karyawan (Edge Function yang ada), mengubah profil/posisi/gaji mingguan, dan mengaktifkan atau menonaktifkan | P0 |
| SHF-01 | Jadwal shift mingguan dan hari libur. Karyawan melihat "Jadwal Saya". | P1 |
| ATT-01 | Absen masuk/pulang dengan foto selfie ke Storage, waktu dicatat server, dicek terhadap jadwal (keterlambatan) | P0 |
| ATT-02 | Pengajuan "Lupa Absen" dengan alasan, disetujui owner | P1 |
| ATT-03 | Owner melihat absensi semua karyawan beserta foto | P1 |
| PAYR-01 | Penggajian dan histori pembayaran gaji, tercatat ke kas lewat trigger | P1 |
| PAYR-02 | Insentif per item: daftar hak karyawan, lalu owner membayar dan tercatat sebagai pengeluaran sekali | P1 |

### 8.9 Pengajuan karyawan

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| REQ-01 | Karyawan mengajukan dengan form sesuai jenis: Kebutuhan Stok, Lembur, Tukar Shift, Izin, Kasbon | P0 |
| REQ-02 | Pusat Pengajuan owner: filter status, Setujui atau Tolak dengan catatan, Bayar (untuk pengajuan uang), Tandai Dilaksanakan (non-uang) | P0 |
| REQ-03 | Label status: Menunggu, Disetujui, Ditolak, Dibayar, Dilaksanakan. Nilai `completed` di database tidak ditampilkan sebagai "Selesai". | P0 |
| REQ-04 | Pengajuan yang berdampak kas tercatat otomatis oleh trigger | P0 |

### 8.10 Notifikasi

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| NTF-01 | Kotak notifikasi in-app dengan badge, tandai dibaca, dan hapus. Diperbarui lewat Realtime. | P0 |
| NTF-02 | Tautan notifikasi hanya membuka route internal aplikasi | P0 |
| NTF-03 | Web Push untuk pengajuan baru, perubahan status, dan pengingat tagihan belum lunas | P1 |

### 8.11 Proyek laundry besar (B2B)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| PRJ-01 | Owner membuat proyek: pelanggan, target pcs, tarif per kg atau per pcs, catatan | P1 |
| PRJ-02 | Catat batch harian (pcs dan berat). Progres dihitung dari akumulasi pcs, tagihan berjalan dibulatkan ke ribuan. | P1 |
| PRJ-03 | Pembayaran termin proyek tercatat ke kas otomatis | P1 |
| PRJ-04 | Rekap laba/rugi per proyek | P2 |

### 8.12 POS Minuman

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| POS-01 | Tandai "hari ini berjualan" (satu per usaha per tanggal) dengan catatan | P1 |
| POS-02 | Katalog produk: tambah, ubah, urutkan, aktif/nonaktif (owner) | P1 |
| POS-03 | Kasir cepat: keranjang dan checkout Tunai/Transfer/QRIS lewat `create_pos_sale`. Nama dan harga tersalin ke item. | P1 |
| POS-04 | Ringkasan hari ini: omzet, jumlah transaksi, transaksi terbaru | P1 |
| POS-05 | Laporan POS dipisah dari Laundry berdasarkan `business_id` | P1 |
| POS-06 | Varian/topping, resep bahan, diskon, refund, struk POS, tutup kas POS | P2 |

### 8.13 Laporan, analitik, dan audit (owner)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| RPT-01 | Beranda owner: pesanan hari ini, pesanan baru, pelanggan, karyawan aktif, pemasukan bulan ini, stok menipis, pengajuan menunggu, pesanan terbaru | P0 |
| RPT-02 | Laporan Pesanan dan Keuangan: empat angka utama dan panel rincian (status, layanan, volume, metode, kategori) | P0 |
| RPT-03 | Angka laporan dihitung dengan aggregate/RPC di server, bukan dari data yang kebetulan termuat di browser | P0 |
| RPT-04 | Analitik: grafik pesanan masuk dan selesai per minggu (Senin–Minggu) atau bulan kalender, posisi pesanan, sisa tagihan | P1 |
| RPT-05 | Ekspor CSV untuk pesanan, kas, dan pelanggan | P1 |
| AUD-01 | Audit: garis waktu dengan pencarian, filter tabel, perbandingan data sebelum/sesudah, paginasi server. Tidak bisa diedit. | P1 |

### 8.14 Pengaturan

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| SET-01 | Pengaturan toko: nama, telepon, alamat, logo dan footer nota | P0 |
| SET-02 | Ekspor/backup data terstruktur (JSON/CSV) khusus owner | P2 |

## 9. Aturan bisnis yang wajib sama dengan sistem sekarang

1. **Status pesanan:** `received`, `processing`, `ready`, `picked_up`, `cancelled`. **Status bayar:** `unpaid`, `partial`, `paid`.
2. **Pembulatan:** total akhir selalu dibulatkan ke atas ke kelipatan Rp1.000 (server).
3. **Kiloan:** berat desimal per 0,1 kg, minimal 3 kg (ada pengecualian khusus).
4. **Sprei** 160, 180, dan 200 adalah layanan dengan harga terpisah.
5. **Pengambilan** boleh walau belum lunas. Sisa tetap ditagih.
6. **Kas:** `cash_transactions` adalah satu-satunya sumber pergerakan kas, diisi oleh trigger dari pembayaran, pengeluaran, gaji, pengajuan uang, pembayaran proyek, dan insentif.
7. **Hybrid:** nota dengan pembayaran tunai dan transfer. Nilainya sudah termasuk di masing-masing metode, jadi tidak dijumlahkan dua kali.
8. **Poin:** `floor(total_price / 10.000)`, satu event per pesanan, hanya untuk pesanan berpelanggan yang lunas.
9. **Snapshot:** nama pelanggan, layanan, produk, dan harga disalin ke transaksi agar histori tidak berubah.
10. **Periode:** "Minggu ini" berarti Senin–Minggu kalender. "Bulan ini" berarti tanggal 1 sampai akhir bulan. Zona waktu WIB (Asia/Jakarta).
11. **Mutasi data** harus mengembalikan baris yang berubah. Nol baris (misal ditolak RLS) dianggap gagal, bukan sukses.

## 10. Persyaratan non-fungsional

| ID | Area | Persyaratan |
| --- | --- | --- |
| NFR-01 | Keamanan | Hanya publishable/anon key dan JWT pengguna di browser. `service_role` tidak boleh masuk bundle. Semua tabel memakai RLS. Uji akses lintas toko dan lintas usaha wajib lulus. |
| NFR-02 | Integritas | Operasi uang dan stok hanya lewat RPC/trigger yang ada. Tidak ada transaksi setengah tersimpan. |
| NFR-03 | Kinerja | Halaman kasir siap dipakai kurang dari 3 detik di ponsel kelas menengah dengan 4G. Membuat pesanan sederhana selesai kurang dari 60 detik. Daftar panjang memakai paginasi server. |
| NFR-04 | Sinkronisasi | Perubahan dari perangkat lain terlihat ≤ 5 detik lewat Realtime. Ada refetch saat tab kembali fokus dan rekonsiliasi berkala (15 detik) saat koneksi Realtime putus. Event hanya memicu query ulang, bukan dipakai sebagai angka final. |
| NFR-05 | Offline | v1: tampilan dan data terakhir tetap dapat dibaca. Aksi keuangan (pesanan, pembayaran) membutuhkan koneksi dan menampilkan pesan jelas saat offline. Antrean offline untuk aksi tertentu dievaluasi di P2. |
| NFR-06 | Responsif | Bekerja di lebar 360 px (ponsel), tablet, dan desktop. Target sentuh minimal 44 px. |
| NFR-07 | Aksesibilitas | Navigasi keyboard, fokus terlihat, label form, kontras memadai. Status memakai teks, tidak hanya warna. |
| NFR-08 | Browser | Chrome/Edge versi terbaru di Android dan desktop (utama), Safari iOS 16.4+ (sekunder, tanpa Web Bluetooth) |
| NFR-09 | Bahasa dan format | Bahasa Indonesia. Rupiah dengan pemisah ribuan. Tanggal dan zona waktu WIB. |
| NFR-10 | Audit | Perubahan penting tercatat di `audit_logs` oleh trigger yang ada |
| NFR-11 | Navigasi | Tombol kembali mengarah ke halaman asal, termasuk saat masuk dari notifikasi |
| NFR-12 | Kualitas | Lint, type-check, unit test, dan build lulus di CI. Uji E2E alur kasir (buat pesanan → bayar → siap → diambil) lulus sebelum rilis. |

## 11. Desain dan tampilan

Mengikuti referensi dashboard "Eduplex" yang dipilih owner: sidebar gelap dengan menu aktif berwarna hijau-limau, kartu putih bersudut besar, ikon dalam kotak pastel, grafik batang dengan tooltip, kalender kecil, dan kartu promosi gelap di kolom kanan. Token yang dipakai di kode (`src/index.css`):

| Token | Nilai |
| --- | --- |
| Font | DM Sans 400–700 |
| Sidebar / teks gelap | `#1E1E2D` / `#1B1B28` |
| Aksen utama (lime) | `#D9F36B` |
| Latar halaman | `#F6F6F2` |
| Permukaan kartu | `#FFFFFF` |
| Pastel: peach / lilac / lime lembut / krem | `#FBE3D6` / `#E4E1F8` / `#EAF5C8` / `#FBEBD3` |
| Teks sekunder / garis | `#8A8A96` / `#ECECE6` |
| Sukses / peringatan / error | `#15803D` / `#D97706` / `#D92D20` |

Palet biru-emas Idola sebelumnya diganti. Logo dan warna merek final dapat disesuaikan kemudian tanpa mengubah struktur.

Navigasi:

- **Owner:** sidebar di desktop, dikelompokkan menjadi Ringkasan, Operasional, Tim, Keuangan, dan Kontrol. Di ponsel memakai navigasi bawah (Beranda, Pesanan, Pelanggan, Lainnya).
- **Karyawan Laundry:** navigasi bawah berisi Beranda, Pesanan Saya, Absensi, Lainnya. Beranda menampilkan aksi cepat Pesanan Baru dan Pelanggan.
- **POS:** navigasi bawah berisi Ringkasan, Kasir, Produk, Lainnya.

Dokumen desain rinci (wireframe tiap layar) dibuat terpisah sebagai `docs/03-UI-UX.md`.

## 12. Data dan backend

- **Project Supabase:** "Idola One" (`sqydcdhvsmmkvlpsjzgx`, region ap-south-1). Ada 35 tabel `public` dengan RLS aktif dan 38 migration sudah terpasang, yang terakhir `20261106073457_harden_security_definer_execution`.
- **Kelompok tabel utama:**
  - Tenant: `shops`, `businesses`, `business_members`, `profiles`, `employees`.
  - Laundry: `orders`, `order_items`, `services`, `service_categories`, `customers`.
  - Keuangan: `payments`, `cash_transactions`, `expenses`.
  - Stok: `inventory_items`, `inventory_movements`.
  - SDM: `attendance_records`, `weekly_shifts`, `employee_requests`, `payroll_payments`, `order_item_incentives`.
  - Proyek: `laundry_projects`, `laundry_project_batches`, `laundry_project_payments`.
  - POS: `pos_products`, `pos_sales`, `pos_sale_items`, `business_daily_operations`.
  - Lainnya: `notifications`, `audit_logs`, `customer_point_events`, `customer_point_balances`.
- **RPC yang dipakai ulang:** `create_laundry_order`, `record_order_payment`, `update_order_kilo_services`, `record_inventory_purchase`, `record_inventory_usage`, `adjust_inventory_stock`, `create_pos_sale`, `owner_correct_order_payment`, trigger `app_private.sync_customer_points`, serta Edge Function `create-employee-user` dan `join-employee-user`.
- **Tipe TypeScript** dibuat otomatis dari skema dengan `supabase gen types`.
- **Kebutuhan backend baru** (lewat migration baru, setelah diuji di staging):
  - RPC aggregate untuk metrik dashboard dan laporan (RPT-03);
  - tabel histori transisi status pesanan, append-only, untuk grafik "selesai" yang akurat;
  - tabel langganan Web Push (NTF-03);
  - menambahkan tabel POS ke publication Realtime, atau polling yang terdokumentasi.

## 13. Rencana rilis bertahap

| Fase | Isi | Kriteria selesai |
| --- | --- | --- |
| **0. Fondasi** | Setup repo, CI, tema, auth, pemilih usaha, shell per peran, tipe Supabase, lingkungan staging | Login owner dan karyawan berhasil di staging, CI hijau |
| **1. Kasir Laundry (P0)** | Pesanan, pembayaran, status, WhatsApp, cetak (setelah uji printer), pelanggan, layanan, notifikasi in-app | Uji E2E alur kasir lulus. Satu karyawan memakai web paralel dengan Android selama 1 minggu tanpa selisih data. |
| **2. Operasional dan owner (P0)** | Stok, pengeluaran, Buku Kas, laporan berbasis server, absensi selfie, pengajuan, karyawan, pengaturan | Laporan web sama dengan laporan Android untuk periode yang sama |
| **3. Paritas penuh (P1)** | Shift, payroll, insentif, proyek B2B, POS minuman, poin, audit, analitik, ekspor, Web Push | Semua fitur P1 tersedia. APK dibekukan (hanya perbaikan kritis). |
| **4. Pensiun aplikasi lama** | Hentikan APK dan dashboard lama, arsipkan repo `LaundryApp` | Semua karyawan sudah memakai web selama ≥ 2 minggu tanpa kembali ke APK |
| **5. Pengembangan (P2)** | Google Contacts, antrean offline, fitur POS lanjutan, portal pelanggan | Sesuai prioritas owner |

## 14. Indikator keberhasilan

- 100% pesanan, pembayaran, dan kas yang dibuat dari web konsisten dengan data yang dibuat Android pada masa paralel (tidak ada selisih rekonsiliasi).
- Waktu membuat pesanan laundry sederhana ≤ 60 detik. Transaksi POS ≤ 30 detik.
- Nol akses lintas toko atau lintas usaha pada pengujian RLS.
- Owner dapat menjalankan seluruh pekerjaan harian dari laptop maupun ponsel tanpa membuka APK.
- Pembaruan aplikasi sampai ke semua karyawan dalam satu hari tanpa instal manual.

## 15. Risiko

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Printer thermal tidak bisa diakses dari browser | Kasir tidak bisa mencetak nota/label | Uji printer di Fase 0. Siapkan jalur RawBT/intent, Web Serial, dan cadangan PDF. Pertimbangkan printer BLE bila perlu. |
| Web dan Android menulis ke database yang sama saat masa paralel | Data ganda atau tidak konsisten | Semua tulis lewat RPC yang sama. Masa paralel dibatasi dan direkonsiliasi harian. |
| Repo `LaundryApp` branch `main` belum memuat migration terakhir (`20261106073457`) yang sudah ada di database | Kode migration tidak mencerminkan database produksi | Satukan migration ke satu sumber sebelum Fase 0 (lihat K-02) |
| Sinkron kontak otomatis hilang | Input pelanggan lebih lambat | Contact Picker dan tambah cepat di form pesanan. Google People API di P2. |
| Koneksi internet toko tidak stabil | Transaksi tertunda | Indikator offline yang jelas. Data tetap dapat dibaca. Antrean offline dievaluasi. |
| Notifikasi push di iPhone terbatas | Owner pengguna iPhone tidak mendapat push | Notifikasi in-app Realtime dan anjuran memasang PWA |

## 16. Keputusan terbuka

Keputusan backend, hosting, printer, dan repo ada di [04-BACKEND.md](04-BACKEND.md). Ringkasan status:

| No | Pertanyaan | Status |
| --- | --- | --- |
| K-01 | Printer thermal | Aplikasi Android memakai Bluetooth biasa. Nama/tipe printer perlu dicatat dari halaman Printer di aplikasi. Jalur cetak web menunggu ini (04-BACKEND bagian 6). |
| K-02 | Lokasi folder migration database | Dipindahkan ke repo ini setelah arsitektur backend diputuskan (B-01) |
| K-03 | Hosting | Bertahap: pratinjau dari GitHub/lokal, lalu VPS atau mini server sendiri (04-BACKEND bagian 4) |
| K-04 | Domain | Ditunda |
| K-05 | Staging | Tidak lagi memakai Supabase. Server uji sendiri berisi salinan data, setelah B-01 dan B-05 |
| K-06 | Login karyawan | Username dan password dengan sesi panjang di perangkat toko |
| K-07 | Penghentian APK | Setelah Fase 4 terpenuhi |

## 17. Referensi

Sumber yang dipakai untuk menyusun dokumen ini (repo `LaundryApp`):

- `laundry_app_flutter/` (kode Android 2.1.15+31): routes, fitur, dan dependensi
- `admin_dashboard_web/` (dashboard owner React/Vite)
- `BLUEPRINT.md` (alur utama dan SOP)
- `Knowledge Core/product/01-PRD.md`, `02-TRD.md`, `03-UI-UX-DESIGN.md`, `04-APPFLOW.md`, `07-ADMIN-DASHBOARD-BLUEPRINT.md`, `10-UI-UX-SYSTEM-UPGRADE-2026-10-30.md`
- `Knowledge Core/flutter-app/FEATURE_MATRIX.md`, `ROUTES.md`
- Supabase project "Idola One": daftar tabel, jumlah baris, dan migration (dibaca 16 Nov 2026, hanya baca)
