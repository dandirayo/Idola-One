# Sinkron Pelanggan ke Google Contacts

Pengganti fitur sinkron kontak di aplikasi Android. Di Android, pelanggan ditulis langsung ke kontak Google di HP. Browser tidak bisa menulis ke kontak HP, jadi web memakai **Google People API** dengan login Google di browser.

## Cara kerja

- Owner menekan **Hubungkan Google** di halaman **Pelanggan**, lalu login dan memberi izin di jendela Google. Token hanya disimpan di memori tab. Setelah tab ditutup atau sekitar 1 jam, owner perlu menekan Hubungkan lagi.
- **Sinkron sekarang** menjalankan tiga langkah:
  1. Mengimpor kontak Google yang nomornya belum ada di aplikasi. Akhiran " CS" dibuang.
  2. Membuat kontak Google untuk pelanggan yang nomornya belum ada di Google, dengan nama "Nama CS".
  3. Menyamakan nama kontak yang nomornya sudah ada di Google.
- Selama terhubung, pelanggan baru dari halaman Pelanggan atau dari tambah cepat di Pesanan Baru langsung dikirim ke Google.
- Setiap kali halaman Pelanggan dibuka, sinkron otomatis berjalan paling sering sekali per 2 menit. Sinkron otomatis hanya membuat kontak yang belum ada.
- Pelanggan yang dianggap sama ditentukan dari nomor HP yang dinormalkan (0812, 62812, dan +62812 sama), jadi sinkron berulang tidak membuat kontak ganda.
- **Pelanggan contoh bawaan pratinjau tidak pernah dikirim** ke Google.
- Belum ada di web: "Reset kontak" dan "Hapus Selain CS" dari aplikasi Android, karena keduanya menghapus data.

Kode: `src/lib/contact-sync.ts` (aturan, ada tes), `src/lib/google-contacts.ts` (login dan People API), `src/components/GoogleContactsCard.tsx` (tampilan).

## Membuat Client ID (sekali, oleh owner)

1. Buka [Google Cloud Console](https://console.cloud.google.com/), lalu buat project baru, misalnya "Idola One".
2. Buka **APIs & Services → Library**, cari **Google People API**, lalu tekan **Enable**.
3. Buka **APIs & Services → OAuth consent screen**:
   - pilih **External**;
   - isi nama aplikasi dan email;
   - biarkan statusnya **Testing**;
   - di **Test users**, tambahkan akun Google toko yang akan dipakai.
4. Buka **APIs & Services → Credentials**, pilih **Create credentials → OAuth client ID**, lalu isi:
   - tipe: **Web application**;
   - **Authorized JavaScript origins**: `http://localhost:5173`, `http://127.0.0.1:5173`, dan `https://dandirayo.github.io`;
   - redirect URI tidak perlu diisi.
5. Salin **Client ID**. Bentuknya `xxxxx.apps.googleusercontent.com`. Client ID ini bukan rahasia.
6. Pasang Client ID:
   - **Lokal:** buat file `.env.local` di folder proyek, isinya `VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com`. File ini tidak ikut ter-commit. Jalankan ulang `npm run dev` setelahnya.
   - **GitHub Pages:** buka repo, lalu **Settings → Secrets and variables → Actions → Variables**, buat **New repository variable** dengan nama `VITE_GOOGLE_CLIENT_ID` dan isi Client ID. Deploy berikutnya akan memakainya.

Selama status consent screen masih **Testing**, hanya akun yang terdaftar sebagai test user yang bisa login, dan Google menampilkan peringatan "aplikasi belum diverifikasi". Untuk pemakaian sendiri itu wajar: tekan **Lanjutkan**.

## Batasan

- Data pelanggan di web masih tersimpan di browser (localStorage). Kontak yang diimpor dari Google juga hanya tersimpan di browser itu sampai backend tersedia.
- Hak akses yang diminta adalah `contacts` (baca dan tulis kontak) dan email akun untuk menampilkan nama akun.
