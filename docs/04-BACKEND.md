# Backend, Hosting, dan Repo — Keputusan Idola One Web

**Versi dokumen:** 0.1 (draf)
**Tanggal:** 16 November 2026
**Menggantikan:** semua bagian di `01-PRD.md`, `02-APPFLOW.md`, dan `03-IMPLEMENTATION-PLAN.md` yang menyebut Supabase sebagai backend. Aturan bisnis, alur, dan fitur di dokumen itu tetap berlaku.

## 1. Keputusan owner (16 November 2026)

1. Backend **tidak lagi memakai layanan Supabase**. Data akan disimpan di **VPS atau mini server milik sendiri**.
2. Tahap awal: tampilan di-deploy dari GitHub untuk pengecekan. Setelah itu pindah ke VPS atau mini server di rumah.
3. Desain mengikuti referensi dashboard "Eduplex" (sidebar gelap, aksen hijau-limau, kartu pastel).
4. Satu aplikasi web untuk semua peran (tidak dipisah antara "web utama" dan "web admin").
5. Domain: ditunda.

## 2. Yang harus diperhatikan

Data produksi saat ini (1.091 pelanggan, 243 pesanan, 202 pembayaran, 214 transaksi kas, dan lainnya) **masih berada di Supabase**. Untuk sekarang itu satu-satunya salinan data. Karena itu:

- Jangan menutup atau menghapus project Supabase sebelum data **diekspor, dipulihkan di server sendiri, dan diverifikasi** (jumlah baris dan total uang sama).
- Supabase memakai PostgreSQL biasa, jadi data dan skema bisa dipindahkan dengan `pg_dump` dan dipulihkan ke PostgreSQL di server sendiri.
- Mengunduh data pelanggan ke laptop adalah tindakan yang perlu persetujuan eksplisit. Ekspor dilakukan nanti, bukan sekarang.
- Foto absensi dan file lain di Supabase Storage juga harus ikut dipindahkan.

## 3. Pilihan arsitektur backend

### Opsi A — API sendiri berbasis TypeScript (disarankan)

| Lapisan | Pilihan |
| --- | --- |
| Bahasa | **TypeScript** (sama dengan frontend, tipe dan validasi bisa dipakai bersama) |
| Runtime dan framework | **Node.js LTS** + **Fastify** |
| Database | **PostgreSQL** (lanjutan dari skema yang sudah ada) |
| Akses data | Kueri bertipe (Kysely atau Drizzle) dan SQL langsung untuk fungsi transaksi |
| Autentikasi | Username/password, hash **argon2**, sesi cookie `HttpOnly` |
| Realtime | Server-Sent Events atau WebSocket, dipicu `LISTEN/NOTIFY` PostgreSQL |
| File (selfie, logo) | Disk server atau MinIO, diakses lewat API |
| Proses | Docker Compose: API, PostgreSQL, reverse proxy (Caddy) |
| Cadangan | `pg_dump` terjadwal + salinan file, disimpan di luar server utama |

Yang dipertahankan dari sistem sekarang:

- tabel, constraint, trigger kas, trigger poin, dan fungsi transaksi (`create_laundry_order`, `record_order_payment`, dan lainnya) sebagai SQL biasa, supaya aturan bisnis tidak ditulis ulang dan tidak berubah;
- semua aturan di PRD bagian 9.

Yang harus dibangun ulang:

- autentikasi dan sesi (pengganti Supabase Auth);
- **otorisasi:** kebijakan RLS saat ini bergantung pada identitas pengguna dari Supabase Auth. Di API sendiri, peran dan toko diperiksa di lapisan API, dan identitas pengguna diteruskan ke transaksi database agar trigger audit tetap mencatat pelaku;
- realtime dan penyimpanan file;
- Edge Function pembuatan akun karyawan, menjadi endpoint API.

Kelebihan: ringan di mini server, satu bahasa, kendali penuh. Kekurangan: ada pekerjaan membangun auth dan otorisasi yang sebelumnya disediakan Supabase, jadi perlu uji keamanan yang teliti.

### Opsi B — Supabase self-hosted di server sendiri

Menjalankan perangkat lunak Supabase lewat Docker di mini server. Semua RPC, RLS, Auth, Realtime, dan Storage yang ada bisa dipakai **hampir tanpa ditulis ulang**.

Kelebihan: risiko paling kecil dan data/aturan langsung identik. Kekurangan: banyak komponen (belasan container), kebutuhan memori lebih besar (umumnya disarankan RAM 4 GB atau lebih), dan upgrade serta cadangan menjadi tanggung jawab sendiri.

### Rekomendasi

**Opsi A**, karena keputusan owner adalah tidak lagi memakai Supabase dan target server adalah mini server. Opsi B adalah jalur cadangan bila membangun otorisasi ternyata terlalu berisiko.

> **Perlu konfirmasi owner:** Opsi A atau Opsi B. Selama belum diputuskan, frontend memakai **data contoh** lewat lapisan data yang bisa diganti.

## 4. Hosting bertahap

| Tahap | Tempat | Isi | Catatan |
| --- | --- | --- | --- |
| 1. Pratinjau | GitHub (Pages) atau lokal | Hanya tampilan dengan **data contoh** | Tidak ada data nyata dan tidak ada kunci rahasia di repo |
| 2. Uji internal | VPS atau mini server | Frontend + API + PostgreSQL berisi **salinan** data | Hanya dapat diakses owner (VPN atau Tailscale) |
| 3. Produksi | VPS atau mini server | Dipakai karyawan menggantikan Android | Cadangan terjadwal dan pemantauan aktif |

Catatan tentang GitHub:

- GitHub hanya cocok untuk **menyajikan tampilan statis**. GitHub **bukan tempat menyimpan data** dan tidak menjalankan backend. Data operasional tidak boleh disimpan di repo.
- GitHub Pages pada repo **private** umumnya hanya tersedia di paket berbayar. Bila akun gratis, pratinjau cukup dijalankan lokal, atau memakai Cloudflare Pages yang mendukung repo private. Cek di Settings → Pages pada repo.
- Repo ini private. Jangan mengubahnya menjadi public selama dokumen masih memuat detail internal.

## 5. Struktur repo dan branch

**Satu repo, satu aplikasi, satu branch utama (`main`).**

- Web utama (kasir/karyawan) dan web admin (owner) **tidak dipisah** menjadi repo atau branch berbeda. Keduanya satu aplikasi. Perbedaan tampilan ditentukan **peran pengguna** (`owner`, `employee`, `pos`), bukan branch.
- Hak akses ditegakkan oleh **backend**, bukan oleh menu yang disembunyikan di UI.
- Branch hanya untuk pekerjaan yang sedang berjalan: `feature/nama-fitur` atau `fix/nama-masalah`, dibuat dari `main`, digabung lewat pull request, lalu dihapus. Tidak ada branch yang hidup lama.
- Alasan tidak memisah: dua kode untuk satu produk adalah masalah yang ingin diselesaikan proyek ini. Pemisahan baru masuk akal bila halaman admin perlu di-deploy di alamat berbeda atau diakses tim yang berbeda. Saat itu cukup dipisah dengan route dan konfigurasi deploy, tanpa memisah branch.

## 6. Printer thermal

Hasil pembacaan kode aplikasi Flutter:

- Memakai paket `print_bluetooth_thermal`: printer **dipasangkan (pair) lewat Bluetooth biasa** di HP, lalu data ESC/POS dikirim langsung.
- Lebar kertas bawaan 80 mm. Mendukung 58 mm (32 kolom) dan 80 mm (48 kolom).
- **Merek dan tipe printer tidak tertulis di kode.** Nama printer disimpan di HP owner/karyawan (halaman Printer di aplikasi). Perlu dicatat dari sana.

Dampak untuk versi web:

- Web Bluetooth di browser hanya mendukung perangkat **BLE**. Printer yang dipasangkan lewat pairing biasa (Bluetooth Classic) kemungkinan besar **tidak terlihat** oleh browser.
- Dengan server sendiri ada jalur yang lebih andal: **layanan cetak di server atau PC toko**. Web mengirim perintah cetak ke API, lalu API meneruskan ESC/POS ke printer yang terhubung lewat USB, jaringan (port 9100), atau Bluetooth.
- Jalur cadangan: cetak PDF/HTML 58/80 mm dari browser, atau aplikasi pencetak di Android (misal RawBT).

**Status (16 Nov 2026):** jalur cadangan sudah dibuat di web, yaitu dokumen cetak (nota, label, bukti pengambilan) lewat dialog cetak browser dan "Simpan sebagai PDF", dengan lebar 58 atau 80 mm. Belum diuji pada printer fisik, dan cetak langsung ke printer thermal belum ada.

Jalur akhir ditentukan setelah **nama/tipe printer** diketahui dan satu uji cetak dilakukan. Lokasi mini server (di toko atau di rumah) juga menentukan: layanan cetak hanya bisa memakai printer yang terhubung ke server atau jaringan yang sama.

## 7. Pertanyaan yang masih terbuka

| No | Pertanyaan | Dibutuhkan untuk |
| --- | --- | --- |
| B-01 | Opsi backend: A (API sendiri) atau B (Supabase self-hosted)? | Mulai Fase 0 sisi backend |
| B-02 | Nama/tipe printer thermal dan lokasi mini server (toko atau rumah)? | Memilih jalur cetak |
| B-03 | Spesifikasi mini server (RAM, penyimpanan, OS) dan apakah selalu menyala? | Ukuran dan cara deploy |
| B-04 | Akun GitHub gratis atau berbayar? | Pilihan pratinjau (Pages atau lokal) |
| B-05 | Kapan data Supabase boleh diekspor ke server sendiri? | Jadwal migrasi data |
