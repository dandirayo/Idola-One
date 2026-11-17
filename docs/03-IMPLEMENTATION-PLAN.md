# Implementation Plan — Idola One Web

**Versi dokumen:** 0.1 (draf)
**Tanggal:** 16 November 2026
**Mengacu ke:** [01-PRD.md](01-PRD.md) (fase di bagian 13) dan [02-APPFLOW.md](02-APPFLOW.md)

> **Pembaruan (16 Nov 2026):** backend memakai server sendiri, bukan Supabase. Istilah Supabase, RLS, RPC, dan Edge Function di dokumen ini dibaca sebagai "backend sendiri" sesuai [04-BACKEND.md](04-BACKEND.md). Alur dan aturan bisnis tidak berubah.

Dokumen ini memecah fase PRD menjadi tugas. **Tidak ada estimasi tanggal**, karena kecepatan kerja belum diketahui. Urutan dan kriteria selesai yang mengikat. Estimasi bisa ditambahkan setelah Fase 0 selesai.

Penanda tugas:

- `[K-xx]` = bergantung pada keputusan terbuka di PRD bagian 16.
- `[DB]` = membutuhkan migration database baru. Wajib diuji di staging lebih dulu.
- Tugas bertanda **gerbang** harus lulus sebelum fase berikutnya dimulai.

## Status pekerjaan (diperbarui 17 November 2026)

**Posisi sekarang:** Fase 2 baru dimulai, **hanya di sisi tampilan**. Fase 0 dan Fase 1 belum bisa ditutup karena gerbangnya membutuhkan backend, login sungguhan, dan uji di perangkat.

Arti kolom Status pada tabel di bawah:

- **Selesai:** kode jadi, diuji, dan tidak bergantung pada backend.
- **Tampilan saja:** halaman dan aturan hitung sudah jadi dan diuji dengan **data contoh di memori** (`src/data/store.ts`). Belum tersambung ke server, jadi belum memenuhi arti "satu fitur selesai" di prinsip nomor 3.
- **Sebagian:** ada sebagian yang jadi, sisanya belum. Contoh yang belum ada: login sungguhan (0.10), Realtime pada notifikasi (1.11), unggah foto ke Storage dan uji kamera sungguhan (2.9), paginasi server pada Audit (3.12), Contact Picker (1.2), filter periode, paginasi server, dan "Pesanan Saya" (1.5), kolom penerima (1.6), kolom khusus per jenis pengajuan (2.10), dan akun login karyawan (2.11). Status "Tampilan saja" hanya dipakai bila semua bagian yang tertulis pada tugas sudah ada.
- **Belum:** belum dikerjakan.

Ringkasan dari 61 tugas (Fase 0 sampai 3): 4 Selesai, 25 Tampilan saja, 17 Sebagian, 15 Belum. Enam tugas baru (3.16 sampai 3.21) ditambahkan pada 17 November 2026.

---

## Prinsip pelaksanaan

1. **Database produksi tidak diubah saat pengembangan.** Pengembangan memakai server uji dengan salinan data. Produksi hanya menerima migration yang sudah lulus uji.
2. **Hanya menambah pada migration.** Migration tidak mengubah atau menghapus data, ID, snapshot harga, atau tanggal transaksi lama. Penghapusan oleh owner di aplikasi (tugas 3.16) berbeda: selalu dikonfirmasi, data uang wajib beralasan, kas dibalik, dan salinannya tersimpan di Audit.
3. **Satu fitur selesai = kode, uji, dan alur terverifikasi** (bukan hanya tampilan jadi).
4. **Kunci versi dependency** di lockfile dan tidak menaikkan versi di tengah fase tanpa alasan.
5. **Masa paralel:** Android tetap berjalan sampai Fase 4. Web dan Android menulis ke database lewat RPC yang sama.

---

## Fase 0 — Fondasi

Tujuan: kerangka proyek, login, dan lingkungan uji siap. Belum ada fitur bisnis.

| No | Tugas | Hasil | Status |
| --- | --- | --- | --- |
| 0.1 | Putuskan B-01 s.d. B-05 di `04-BACKEND.md`. Catat nama/tipe printer, lalu **uji cetak** pada jalur yang dipilih (server cetak, RawBT, atau PDF). | Catatan keputusan dan hasil uji cetak | Belum |
| 0.2 | Repo GitHub `Idola-One` dibuat (private) dan konvensi branch: satu `main` + branch pendek `feature/*`/`fix/*` lewat PR | Repo siap (selesai) | Selesai |
| 0.3 | Setup proyek: Vite + React + TypeScript strict, npm, oxlint, Vitest. Playwright menyusul. | `npm run dev`, `lint`, `test`, `build` berjalan (selesai) | Selesai |
| 0.4 | Setup CI GitHub Actions: lint, type-check, test, build | CI hijau di setiap PR | Sebagian |
| 0.5 | Siapkan **server uji sendiri** (PostgreSQL + API) dari skema yang ada dan data contoh. Satukan migration ke repo ini (K-02). | Server uji berjalan, migration terurut | Belum |
| 0.6 | Buat tipe TypeScript bersama dari skema database (pembuat tipe sesuai opsi backend) | Tipe database dalam repo | Belum |
| 0.7 | Tema gaya Eduplex: token warna, font DM Sans, komponen dasar (kartu, chip, grafik, kalender selesai; dialog, tabel, sheet, toast menyusul) | Pustaka komponen dasar (sebagian selesai) | Sebagian |
| 0.8 | Router dengan guard per peran dan tata letak: sidebar (desktop), menu geser (ponsel). Tiga shell (Owner, Karyawan, POS) dengan penjaga akses di tampilan, serta pilih usaha. | Tiga shell per peran dan usaha | Tampilan saja |
| 0.9 | Lapisan data yang bisa diganti (data contoh atau API), penyimpanan sesi, TanStack Query, helper realtime, penanganan error terpusat | Fondasi data | Sebagian |
| 0.10 | Auth: halaman login (selesai, mode pratinjau), lalu login sungguhan ke backend, pemulihan sesi, akun nonaktif ditolak, pilih usaha | AUTH-01, 02, 03, 06 | Sebagian |
| 0.11 | PWA dasar: manifest, service worker, banner "Versi baru, muat ulang" | Dapat dipasang di layar utama | Belum |
| 0.12 | Pratinjau otomatis dari `main` (GitHub atau lokal), lalu deploy ke server sendiri | URL pratinjau | Belum |

**Gerbang Fase 0:**

- Owner dan karyawan uji dapat login di staging dan melihat shell yang benar.
- CI hijau.
- Jalur cetak sudah dipilih (atau dicatat sebagai risiko dengan cadangan PDF).
- RLS lintas toko diuji dengan dua akun berbeda.

---

## Fase 1 — Kasir Laundry (P0)

Tujuan: karyawan dapat menjalankan alur harian dari web.

| No | Tugas | Kebutuhan | Status |
| --- | --- | --- | --- |
| 1.1 | Layanan dan harga: daftar, tambah, ubah, aktif/nonaktif (owner), baca (karyawan) | SVC-01, 02 | Tampilan saja |
| 1.2 | Pelanggan: daftar, cari, tambah, ubah, hapus lunak, normalisasi nomor, cegah duplikat, tambah cepat, Contact Picker | CUS-01, 02, 05 | Sebagian |
| 1.3 | Form pesanan baru: Kiloan, Satuan, Gabung, keranjang, perkiraan total, pembayaran awal | ORD-01 | Tampilan saja |
| 1.4 | Simpan lewat `create_laundry_order` dan tampilkan nomor nota/total dari server, dengan perlindungan klik ganda | ORD-02 | Belum |
| 1.5 | Daftar pesanan: cari, filter status dan periode, paginasi server. Karyawan melihat "Pesanan Saya". | ORD-03 | Sebagian |
| 1.6 | Detail pesanan: item, pelanggan, penerima, riwayat pembayaran, sisa tagihan | ORD-04 | Sebagian |
| 1.7 | Ubah status sesuai transisi server, termasuk pengambilan walau belum lunas | ORD-05, 07 | Tampilan saja |
| 1.8 | Template WhatsApp "Siap Diambil" | ORD-06 | Tampilan saja |
| 1.9 | Terima pembayaran lewat `record_order_payment`, metode Tunai/Transfer/QRIS | PAY-01, 02 | Tampilan saja |
| 1.10 | Cetak: nota, label cucian, bukti pengambilan, lebar 58/80 mm, cetak uji, cetak ulang, cadangan PDF | PRN-01 s.d. 05 | Sebagian |
| 1.11 | Notifikasi in-app: badge, daftar, baca, hapus, Realtime | NTF-01, 02 | Sebagian |
| 1.12 | Beranda karyawan dengan aksi cepat | AUTH-03 | Tampilan saja |
| 1.13 | Uji E2E Playwright: login → pesanan baru → bayar → siap → diambil | NFR-12 | Belum |
| 1.14 | **Masa paralel:** satu karyawan memakai web berdampingan dengan Android selama 1 minggu. Rekonsiliasi harian. | Indikator keberhasilan | Belum |

**Gerbang Fase 1:**

- Uji E2E lulus.
- Tidak ada selisih total, pembayaran, atau kas antara pesanan yang dibuat dari web dan Android pada masa paralel.
- Cetak nota dan label berhasil di printer toko, atau cadangan PDF disepakati owner.

---

## Fase 2 — Operasional dan owner (P0)

| No | Tugas | Kebutuhan | Status |
| --- | --- | --- | --- |
| 2.1 | Stok: Live Stock, Beli Stok, Pakai Stok | INV-01 s.d. 03 | Tampilan saja |
| 2.2 | Pengeluaran dengan filter periode, jumlah, dan total | EXP-01 | Sebagian |
| 2.3 | `[DB]` RPC aggregate untuk Beranda dan laporan | RPT-03 | Belum |
| 2.4 | Buku Kas: saldo, masuk, keluar, rincian metode, periode, ekspor CSV | PAY-05 | Sebagian |
| 2.5 | Beranda owner (KPI, pengajuan menunggu, pesanan terbaru) | RPT-01 | Tampilan saja |
| 2.6 | Laporan Pesanan dan Keuangan | RPT-02 | Tampilan saja |
| 2.7 | Laporan Pembayaran karyawan dan draf WhatsApp | PAY-06 | Tampilan saja |
| 2.8 | Koreksi pembayaran oleh owner | PAY-04 | Tampilan saja |
| 2.9 | Absensi selfie: kamera browser, unggah Storage, waktu server | ATT-01 | Sebagian |
| 2.10 | Pengajuan: form per jenis (karyawan) dan Pusat Pengajuan (owner), label status yang benar | REQ-01 s.d. 04 | Sebagian |
| 2.11 | Karyawan: tambah akun (Edge Function), ubah, aktif/nonaktif | EMP-01 | Sebagian |
| 2.12 | Pengaturan toko, profil, ganti password | SET-01, AUTH-05 | Sebagian |
| 2.13 | Uji RLS lintas toko dan lintas peran untuk semua tabel yang tersentuh | NFR-01 | Belum |
| 2.14 | Bandingkan laporan web dan Android untuk periode yang sama | Gerbang | Belum |

**Gerbang Fase 2:**

- Laporan web sama dengan laporan Android untuk periode yang sama.
- Pengajuan dan absensi diuji dua perangkat (karyawan dan owner) dengan data nyata.
- Semua fitur P0 di PRD tersedia.

---

## Fase 3 — Paritas penuh (P1)

| No | Tugas | Kebutuhan | Status |
| --- | --- | --- | --- |
| 3.1 | Kelola usaha dan assignment karyawan | AUTH-04 | Tampilan saja |
| 3.2 | Jadwal shift, jadwal saya, Lupa Absen, absensi semua karyawan | SHF-01, ATT-02, 03 | Tampilan saja |
| 3.3 | Payroll dan pembayaran insentif item | PAYR-01, 02, ORD-09 | Tampilan saja |
| 3.4 | Proyek B2B: proyek, batch, termin | PRJ-01 s.d. 03 | Tampilan saja |
| 3.5 | POS minuman: buka jualan, produk, kasir, ringkasan, laporan per usaha | POS-01 s.d. 05 | Tampilan saja |
| 3.6 | `[DB]` Tambahkan tabel POS ke publication Realtime atau polling terdokumentasi | NFR-04 | Belum |
| 3.7 | Poin pelanggan: saldo dan riwayat di detail pelanggan | CUS-03, 04 | Tampilan saja |
| 3.8 | Ubah layanan kiloan oleh owner | ORD-08 | Tampilan saja |
| 3.9 | Kas manual | PAY-07 | Tampilan saja |
| 3.10 | Stok: koreksi +/− oleh owner | INV-04 | Tampilan saja |
| 3.11 | `[DB]` Histori transisi status pesanan (append-only) dan Analitik | RPT-04 | Belum |
| 3.12 | Audit: garis waktu, filter, perbandingan data, paginasi server | AUD-01 | Sebagian |
| 3.13 | Ekspor CSV pesanan, kas, pelanggan | RPT-05 | Sebagian |
| 3.14 | `[DB]` Web Push (tabel langganan, pengirim) | NTF-03 | Belum |
| 3.15 | Uji E2E tambahan: POS, pengajuan, proyek | NFR-12 | Belum |
| 3.16 | Ubah dan hapus oleh owner (admin): hapus data master, pesanan, pembayaran, kas, gaji, insentif, proyek, absensi, pengajuan, dengan dialog konfirmasi, alasan wajib untuk uang, kas dibalik, dan jejak Audit. Rincian di [06-ADMIN-CRUD.md](06-ADMIN-CRUD.md). | UI-03 | Tampilan saja |
| 3.18 | Sampah (recycle bin): hapus dan batal masuk Sampah, bisa dipulihkan lengkap dengan kas dan insentif, atau dihapus permanen. Halaman `/trash` khusus owner. | UI-03 | Tampilan saja |
| 3.19 | Penyimpanan sementara di browser (localStorage) dan mode tampilan daftar (Normal, Tabel, List kecil, Grid detail). Jembatan sampai backend ada. | UI-04 | Tampilan saja |
| 3.20 | Tampilan HP: skala sentuh, bilah navigasi bawah, layar karyawan besar (Absensi, Beranda, Pesanan baru, Kasir), dialog lembar bawah. Rincian di [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md). | NFR-UI | Selesai |
| 3.21 | Katalog layanan asli (161 layanan aktif dari sistem lama) sebagai data contoh, dikelompokkan per kategori, dengan satuan baru pasang, set, meter, dan m². Sumber: `src/data/seed-services.ts`. | SVC-01, 02 | Tampilan saja |
| 3.17 | Sistem desain dan audit visual: kelas tombol, field, kartu, dan menu seragam, peta ikon, logo, bilah mode pratinjau, skrip foto dan ukur. Rincian di [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md). | NFR-UI | Selesai |

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
| --- | --- | --- | --- |
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

## Catatan keputusan dan batasan (16 November 2026)

Keputusan kecil yang diambil saat membangun versi tampilan. Semuanya perlu dicek ulang saat backend ada.

| Topik | Yang dilakukan sekarang | Yang perlu diputuskan atau diperbaiki |
| --- | --- | --- |
| Data | Semua data contoh di memori dan hilang saat halaman dimuat ulang. Layanan, harga, dan pelanggan adalah karangan, bukan katalog Idola. | Ganti dengan klien API backend (store di `src/data/store.ts` dibuat agar mudah diganti) |
| Total pesanan | Total di layar hanya perkiraan: minimal 3 kg lalu dibulatkan ke atas ke kelipatan Rp1.000 (`src/lib/orders.ts`) | Total final, nomor nota, dan status harus dari server. Aturan minimal 3 kg per pesanan perlu dicocokkan dengan aturan sistem lama. |
| Pelanggan dan layanan | Dinonaktifkan, tidak dihapus. Nomor ganda ditolak walau beda format (+62 atau 08). | Selaraskan dengan aturan `customers` di database lama |
| Harga layanan | Perubahan harga tidak mengubah pesanan lama (harga disalin ke item saat pesanan dibuat) | Pertahankan di backend |
| Kas | Kas masuk dan keluar terisi otomatis oleh aksi di store, meniru trigger database. Saldo awal contoh Rp 500.000 hanya karangan agar saldo tidak negatif. | Sistem lama belum punya alur saldo pembuka per metode. Putuskan saat data asli dipindahkan. |
| Periode laporan | Memakai zona waktu perangkat. "Minggu ini" Senin sampai Minggu, "Bulan ini" tanggal 1 sampai akhir bulan. | PRD menetapkan WIB. Angka laporan harus dihitung server. |
| Stok | Beli Stok mencatat mutasi, pengeluaran kategori Stok, dan kas keluar sekaligus. Pakai Stok tidak membuat kas. | Di backend, harus satu transaksi database |
| Login | Mode pratinjau, isian apa pun diterima | Ganti dengan autentikasi backend. Mode pratinjau tidak boleh ikut ke produksi. |
| Dashboard beranda | KPI, grafik mingguan, dan daftar dihitung di browser dari data di store (`src/lib/dashboard.ts`). Grafik hanya memuat pesanan yang ada di memori. | Ganti dengan agregat server (RPT-03). Angka tidak boleh dihitung dari daftar yang termuat saja. |
| Pengujian | Halaman diuji di browser lewat teks dan struktur halaman, bukan tangkapan layar (kecuali Beranda awal dan pratinjau nota). Alur yang dijalankan ujung ke ujung di browser: login per peran, pilih usaha, penjagaan akses, absensi (foto contoh), POS, pesanan dengan insentif sampai pembayaran insentif, Audit, poin. **Kamera sungguhan tidak bisa diuji** (diblokir di panel pengujian), begitu juga cetak ke printer dan unduhan CSV. Tata letak visual halaman baru belum dilihat. | Periksa visual di ponsel dan desktop, uji kamera di ponsel karyawan, uji cetak di printer toko, dan uji unduhan CSV |
| Saldo pembuka | Entri kategori "Saldo Awal" dihitung dalam saldo akhir, tetapi **tidak** dihitung sebagai pemasukan periode atau KPI pemasukan (`OPENING_CATEGORY` di `src/lib/finance.ts`). | Konfirmasi dengan owner. Sistem lama belum punya alur saldo pembuka. |
| Pengajuan | Hanya kasbon yang berdampak uang: setelah disetujui tombolnya "Bayar" dan menghasilkan kas keluar. Jenis lain memakai "Tandai Dilaksanakan" tanpa kas. Menolak wajib disertai alasan. Status `completed` tampil sebagai "Dilaksanakan". | Dokumen lama berbeda: aplikasi Android menampilkan `completed` sebagai "Disetujui", sedangkan dokumen upgrade UI/UX 30 Okt memakai "Dilaksanakan". Perlu diputuskan satu istilah. Pengajuan stok juga belum otomatis menambah stok dan kas seperti di BLUEPRINT lama. |
| Peran | Belum ada pemisahan peran. Semua halaman terbuka untuk sesi pratinjau (owner). Form pengajuan memakai isian nama pengaju. | Karyawan membuat pengajuan dari akunnya sendiri, hanya owner yang memutuskan (ditegakkan backend) |
| Cetak | Nota, label cucian, dan bukti pengambilan disusun sebagai baris teks monospace (`src/lib/receipt.ts`) selebar 32 kolom (58 mm) atau 48 kolom (80 mm), sesuai aplikasi Android. Dicetak lewat dialog cetak browser (`window.print()`), yang juga memungkinkan "Simpan sebagai PDF". Pratinjau nota diperiksa di browser. | **Belum diuji pada printer fisik** dan dialog cetak belum dibuka dalam pengujian. Cetak langsung ke printer thermal Bluetooth menunggu keputusan jalur di 04-BACKEND bagian 6. Baris yang sama dapat dipakai ulang sebagai ESC/POS. Aturan "Minimal 3 kg" di nota mengikuti perkiraan di layar, bukan server. |
| Tim dan Pengaturan | Tim: tambah, ubah, nonaktifkan (bukan hapus) dengan gaji mingguan. Pengaturan: nama, telepon, alamat, pesan nota, lebar kertas, dan cetak uji. | Akun login karyawan, jadwal, absensi, dan gaji belum ada. Profil dan ganti password belum ada. Nomor telepon dan alamat toko di data contoh adalah karangan. |
| Laporan | Laporan Pesanan (jumlah, nilai, volume, sisa, per status, per layanan) dan Keuangan (masuk, keluar, bersih, per metode, per kategori) dihitung di browser (`src/lib/reports.ts`). Pesanan dihitung menurut **tanggal dibuat**, bukan tanggal selesai. Pesanan batal tidak dihitung ke nilai dan volume tetapi tampil di rincian status. Saldo awal tidak dihitung sebagai pemasukan. | Angka harus dari agregat server (RPT-03). Laporan "pesanan selesai" yang akurat butuh histori transisi status (3.11). |
| Ekspor CSV | Pesanan dan kas dapat diekspor dari halaman Laporan. Sel teks berawalan `= + - @` diberi apostrof agar tidak dijalankan sebagai rumus, dan sel dikutip sesuai standar CSV (diuji). | Tombol unduh belum dijalankan di browser (butuh izin unduhan). Ekspor pelanggan belum ada. Ekspor Buku Kas langsung dari halaman Buku Kas belum ada. |
| Laporan Pembayaran | Merangkum pembayaran pelanggan per metode. Hybrid hanya keterangan (nota bertunai dan transfer) dan tidak dijumlahkan lagi. Draf WhatsApp bisa diubah sebelum dikirim. | Nomor tujuan sementara memakai telepon toko, pengganti nomor owner di profil. Dasar waktu memakai zona waktu perangkat, bukan WIB. |
| Koreksi pembayaran | Hanya untuk sesi owner. Nominal, metode, dan tanggal dapat diubah. Jumlah semua pembayaran tidak boleh melebihi tagihan, tanggal masa depan ditolak, dan koreksi tanpa perubahan ditolak. Pembayaran, total dibayar, baris kas, dan catatan audit diperbarui sekaligus. Status bayar mengikuti (bisa turun dari Lunas ke DP). | Halaman Audit belum ada (3.12), catatan audit baru tampil di detail pesanan dan hilang saat dimuat ulang. Di backend harus satu transaksi database. Belum diputuskan apakah pesanan yang sudah Diambil boleh dikoreksi, dan efeknya pada poin pelanggan (poin belum dibuat). |
| Uang dan desimal | Semua hitungan uang memakai **bilangan bulat** (jumlah per 0,1 kg dikali harga, lihat `src/lib/orders.ts`). Pada 16 Nov ditemukan bug: perhitungan desimal sempat menagih lebih Rp1.000 pada kombinasi tertentu (contoh: 34,2 kg x Rp 12.500 menghasilkan 427500.00000000006 lalu dibulatkan ke atas). Sudah diperbaiki dan dijaga uji properti 20.000 pesanan acak. | Backend wajib memakai aritmetika bilangan bulat atau tipe desimal tetap untuk uang, tidak boleh float. |
| Nomor nota | Di data contoh dihitung dari urutan tertinggi pada tanggal lokal hari itu, dan tidak pernah kembar (diuji). | Di backend harus dibuat atomik di server (misalnya sequence per tanggal), tidak boleh dihitung di browser. Zona waktu tanggal nota perlu diputuskan (WIB). |
| Data contoh | Tanggal data contoh relatif terhadap hari ini, jadi Beranda dan Laporan selalu terlihat terisi. | Hanya untuk pratinjau |
| Header | Kolom cari di header membuka halaman Pesanan dengan kata kunci. Ikon lonceng menuju Pusat Pengajuan dan bertitik merah hanya bila ada pengajuan menunggu. | Notifikasi sungguhan (1.11) belum ada. Kartu "Segera: pasang di layar utama HP" menunggu PWA (0.11). |
| Font | DM Sans dimuat dari Google Fonts lewat `index.html`. | Untuk server sendiri atau jaringan toko yang terbatas, font sebaiknya dihosting sendiri. Itu butuh menambah paket (mis. `@fontsource/dm-sans`) dan perlu persetujuan. |
| CI | Workflow `.github/workflows/ci.yml` ada, tetapi hasilnya belum pernah terlihat. Repo private dan saya tidak punya akses masuk ke GitHub. | Periksa tab Actions di repo |
| Peran dan usaha | Masuk pratinjau dengan memilih orang (Owner, atau karyawan). Setelah masuk memilih usaha (dilewati bila hanya satu). Menu dan akses halaman mengikuti peran dan jenis usaha (`src/lib/access.ts`, diuji). Halaman khusus karyawan ditutup untuk owner. Karyawan boleh melihat Layanan & Harga tetapi tidak mengubahnya. | Hanya penjaga tampilan. Hak akses sebenarnya harus ditegakkan backend. Tanpa password, jadi bukan autentikasi. Di pratinjau owner tetap boleh membuka form Buat Pengajuan, padahal peta alur menyatakan hanya karyawan. |
| POS dan Buku Kas | Penjualan POS memakai catatan sendiri dan **tidak** masuk Buku Kas atau laporan laundry. Checkout butuh hari berjualan dibuka. Harga diambil dari katalog dan disalin ke item. Nomor `POS-YYYYMMDD-0001` berurutan. | Perlu diputuskan apakah omzet POS dan pengeluaran POS punya Buku Kas sendiri. Tutup kas, varian, refund, dan struk POS belum ada (P2). |
| Absensi dan shift | Shift mingguan berulang per karyawan (Libur, Pagi 08–16, Siang 13–21, atau jam khusus). Masuk lebih dari 10 menit setelah jam mulai dihitung terlambat penuh dari jam mulai. Absen di hari libur diizinkan dan diberi catatan. Satu absen masuk per hari, foto wajib, waktu dari sistem. Lupa Absen: pengajuan dengan tanggal dan jam, disetujui owner, lalu "Tandai Dilaksanakan" membuat absensi manual. | Foto hanya di memori (data URL kecil), bukan Storage. Kamera sungguhan belum terbukti. Tombol "foto contoh" ada khusus pratinjau dan harus dihapus di produksi. Belum ada validasi bentrok antar karyawan atau batas jam lembur. |
| Gaji dan insentif | Gaji mingguan dibayar sekali per karyawan per minggu (Senin–Minggu), menjadi pengeluaran Gaji dan kas keluar. Insentif item satuan (sepatu, helm, tas) bernilai Rp0, 10.000, 15.000, atau 20.000 per pcs untuk karyawan tertentu. Hak insentif tercatat saat pesanan Siap Diambil walau pelanggan belum membayar, dibayar owner sekali, dan baru saat itu mengurangi kas. | Rumus gaji hanya nominal tetap mingguan (belum lembur, potongan kasbon, atau hari hadir). Pembatalan setelah Siap Diambil tidak diizinkan oleh transisi status saat ini, jadi insentif tidak perlu dibatalkan. |
| Proyek B2B | Tagihan dihitung dari batch (pcs atau kg) dengan hitungan bilangan bulat, dibulatkan ke atas ke Rp1.000. Kemajuan dari akumulasi pcs terhadap target. Pembayaran termin menjadi kas masuk dan **tidak boleh melebihi tagihan berjalan**. | Pembayaran di muka (DP sebelum ada batch) saat ini ditolak. Perlu diputuskan. Laba/rugi per proyek belum ada (P2). |
| Poin pelanggan | Diturunkan dari pesanan: 1 poin per Rp10.000 pada pesanan lunas yang tidak batal. Bila pesanan tidak lagi lunas (misalnya setelah koreksi), poinnya ikut hilang. Hanya bisa dibaca. | Belum ada penukaran poin. Perilaku saat poin sudah dipakai lalu pesanan dikoreksi perlu diputuskan sebelum penukaran dibuat. |
| Ubah layanan kiloan | Khusus owner, hanya saat Diterima atau Diproses. Harga dihitung ulang dari katalog saat ini, item satuan tidak berubah, dan total baru tidak boleh lebih kecil dari yang sudah dibayar. Tercatat di Audit. | Aturan sistem lama (migration `owner_edit_kilo_order_service`) belum dibandingkan. Perlu dicek apakah boleh pada status lain. |
| Kas manual dan Audit | Kas manual (masuk atau keluar) ditandai "manual" dan kategori "Saldo Awal" dicadangkan. Audit menjadi jejak umum (pesanan, kas, layanan, gaji dan insentif, proyek, akses usaha, pembayaran kasbon) dengan nama pelaku. | Audit hanya di memori sesi dan belum paginasi server. Perubahan status pesanan biasa dan pembelian stok belum diaudit. |
| Notifikasi | Dalam aplikasi: pengajuan baru (ke owner), keputusan pengajuan (ke pengaju), pesanan Siap Diambil, stok melewati batas minimum, insentif dibayar. Tautan hanya ke route internal (diuji). | Push ke ponsel (Web Push) dan Realtime lintas perangkat belum ada. |
| Hapus oleh owner | Owner boleh menghapus pesanan apa pun, termasuk yang sudah Diambil dan lunas. Pembayarannya dibatalkan dan kas dibalik, hak insentif yang belum dibayar ikut hilang, salinan pesanan disimpan di Audit. Pengeluaran otomatis (stok, gaji, insentif, kasbon) hanya bisa dibatalkan dari sumbernya. | Di backend harus satu transaksi database. Prinsip "hanya menambah" di atas dibaca sebagai aturan migration. Perlu dicek apakah backend memakai hapus lunak. ID sekarang dari `uid()` (bukan jam) agar tidak kembar. |
| Penyimpanan browser | Data pratinjau disimpan di `localStorage` (`idola-one:data:v1`, `src/data/persist.ts`) agar bertahan saat refresh. Hanya satu browser, bukan database bersama. Tidak aktif di Vitest dan saat URL memakai `?as=` (audit visual). Ada tombol Reset data contoh di Pengaturan. | Dibuang saat klien API backend menggantikan store. Hosting statis (GitHub Pages) tidak menyediakan database. |
| Sampah | Setiap hapus atau batal menyimpan selisih state (baris hilang dan baris berubah) ke `State.trash` lewat `applyWithTrash` (`src/data/trash.ts`). Pulihkan ditolak bila ID bentrok, data sudah berubah, atau induk hilang. Notifikasi dan Audit tidak masuk Sampah. Tanpa penghapusan otomatis. | Di backend: kolom `deleted_at` (hapus lunak) dan penghapusan terjadwal, serta kebijakan siapa yang boleh memulihkan. |
| Katalog layanan | Data contoh kini 161 layanan aktif dari sistem lama (nama, satuan, harga, kategori). Satuan lama dipetakan: piece dan item menjadi pcs, pair menjadi pasang, m2 menjadi m². Kategori kiloan tampil lebih dulu. 33 layanan nonaktif di sistem lama tidak diimpor. Penerima insentif hanya Sepatu, Helm, dan Tas Ransel (tebakan dari data contoh sebelumnya). | Cocokkan satuan dan kategori dengan skema backend; periksa daftar insentif dengan owner. Harga ikut sistem lama pada 17 Nov 2026 dan bisa berubah. |
| Paket | Memakai npm (bukan pnpm) dan React Router (bukan TanStack Router). TypeScript 7 dan React Router 8 sesuai versi terbaru saat setup. | Kunci versi tetap lewat `package-lock.json` |

## Dokumen berikutnya

- [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md): sistem desain (sudah ada)
- [06-ADMIN-CRUD.md](06-ADMIN-CRUD.md): ubah dan hapus oleh owner (sudah ada)
- `docs/07-TRD.md`: arsitektur teknis rinci (struktur folder, pola data, keamanan)
- `docs/08-TEST-PLAN.md`: kasus uji rinci
