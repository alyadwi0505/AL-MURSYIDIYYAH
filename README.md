# 🏫 SDIT AL-MURSYIDIYYAH
> **"Cendekia Beriman yang Berakhlak Mulia"**  
> Website Profil Sekolah Resmi & Sistem Informasi PPDB (Penerimaan Peserta Didik Baru) Online.  
> *Pembaruan Terakhir: 9 November 2026*

---

## 📋 Daftar Isi
1. [Tentang Proyek](#-tentang-proyek)
2. [Prasyarat & Cara Menjalankan](#-prasyarat--cara-menjalankan)
3. [Daftar Halaman Publik](#-daftar-halaman-publik)
4. [Portal Admin PPDB (Khusus Panitia)](#-portal-admin-ppdb-khusus-panitia)
5. [Arsitektur & Database](#-arsitektur--database)
6. [Struktur Direktori](#-struktur-direktori)
7. [Panduan Pemeliharaan & Troubleshooting](#-panduan-pemeliharaan--troubleshooting)

---

## 🌟 Tentang Proyek

Website **SDIT Al-Mursyidiyyah** adalah platform web profil lembaga pendidikan Islam terpadu yang dilengkapi dengan sistem pendaftaran peserta didik baru (PPDB) mandiri secara digital.

### Fitur Utama:
- **Desain Modern & Responsif:** Tampilan elegan bernuansa Islam modern dengan palet warna Emerald (`#07594F`), Emas/Gold (`#D4AF37`), dan Ivory (`#F7F5EB`).
- **Formulir PPDB Online:** Pendaftaran calon santri/siswa baru lengkap dengan validasi form dan upload dokumen (Akta Kelahiran, Kartu Keluarga, Pas Foto).
- **Dashboard Admin Terintegrasi:** Manajemen data pendaftar, ubah status pendaftaran (Menunggu / Diterima / Ditolak), dan ekspor data ke format CSV.
- **WhatsApp Floating Widget:** Interaksi instan orang tua/wali murid dengan admin sekolah via WhatsApp.
- **Ringan & Cepat:** Berjalan di atas Node.js murni dengan SQLite bawaan tanpa dependensi npm eksternal yang membengkak.

---

## 🚀 Prasyarat & Cara Menjalankan

### Prasyarat
- **Node.js** versi 18 atau lebih baru (disarankan Node.js v20+ atau v22+).

### Menjalankan Server Lokal
Buka terminal pada folder proyek ini, lalu jalankan:

```bash
node server.js
```

Jika server berhasil berjalan, terminal akan menampilkan pesan:
```text
=======================================================
  SDIT AL-MURSYIDIYYAH — FULL-STACK WEB SERVER RUNNING
  URL: http://localhost:3000
  Database: SQLite (native node:sqlite)
  Admin Dashboard: http://localhost:3000/admin.html
=======================================================
```

Buka browser dan akses:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🌐 Daftar Halaman Publik

Semua halaman publik dapat diakses melalui navigasi utama website:

| Halaman | URL Akses | Keterangan |
| :--- | :--- | :--- |
| **Beranda** | `http://localhost:3000/` atau `/index.html` | Sambutan, ringkasan profil, dan navigasi utama |
| **Profil Sekolah** | `http://localhost:3000/profil.html` | Sejarah singkat, visi & misi, nilai sekolah, struktur |
| **Program Unggulan** | `http://localhost:3000/program.html` | Kurikulum terpadu, tahfidz, bahasa Arab/Inggris |
| **Fasilitas** | `http://localhost:3000/fasilitas.html` | Gedung, ruang kelas ber-AC, lab, perpustakaan, masjid |
| **Guru & Staff** | `http://localhost:3000/guru.html` | Profil dewan pendidik dan staf profesional |
| **Berita & Kegiatan** | `http://localhost:3000/berita.html` | Artikel seputar aktivitas santri dan pengumuman |
| **Galeri Foto** | `http://localhost:3000/galeri.html` | Dokumentasi kegiatan belajar dan ekstrakurikuler |
| **Kontak & Lokasi** | `http://localhost:3000/kontak.html` | Alamat sekolah, Google Maps, form kontak, nomor WhatsApp |
| **Pendaftaran PPDB** | `http://localhost:3000/ppdb.html` | Formulir pendaftaran calon siswa baru |

---

## 🔐 Portal Admin PPDB (Khusus Panitia)

> **Catatan Keamanan:**  
> Tautan menu ke Portal Admin **sengaja disembunyikan dari halaman publik & footer website** agar tidak diakses sembarang pengunjung.  
> Panitia dan staf sekolah dapat mengakses portal admin secara langsung melalui URL khusus berikut:

### 🔗 URL Akses Portal Admin:
👉 **[http://localhost:3000/admin.html](http://localhost:3000/admin.html)**  
*(atau alias: `http://localhost:3000/admin`)*

### Fitur di Dalam Portal Admin:
1. **Statistik Pendaftaran Real-Time:**
   - Total Pendaftar Keseluruhan
   - Menunggu Konfirmasi (Pending)
   - Berkas/Pendaftar Diterima
   - Berkas/Pendaftar Ditolak
2. **Tabel Data Pendaftar:**
   - Pencarian berdasarkan Nama Siswa, Nomor WhatsApp, atau Jalur Pendaftaran.
   - Filter pendaftar berdasarkan status (*Semua, Menunggu, Diterima, Ditolak*).
3. **Modal Detail Lengkap Siswa:**
   - Data calon siswa (Nama lengkap, NIK, jenis kelamin, TTL, asal sekolah, jalur pendaftaran).
   - Data orang tua/wali (Nama ayah/ibu, pekerjaan, penghasilan, alamat, kontak aktif).
   - Tautan/pratinjau berkas yang diunggah (Akta Kelahiran, Kartu Keluarga, Pas Foto).
4. **Tindakan Panitia:**
   - Ubah status pendaftaran secara langsung (*Diterima / Ditolak / Menunggu*).
   - Hapus data pendaftar jika terjadi duplikasi atau pembatalan.
5. **Ekspor Data:**
   - Tombol **"Ekspor Data (CSV)"** untuk mendownload seluruh rekap pendaftar ke spreadsheet Microsoft Excel / Google Sheets.

---

## 🗄️ Arsitektur & Database

### Backend & API (`server.js`)
Server dibuat menggunakan modul bawaan native Node.js tanpa framework eksternal:
- **Server:** `node:http` murni
- **Database:** `node:sqlite` (SQLite bawaan Node.js v20+)
- **File Upload:** Native multipart parser yang menyimpan file langsung ke folder `uploads/`
- **Routing API:**
  - `GET /api/registrations` : Mengambil seluruh daftar pendaftar
  - `POST /api/register` : Menerima form submit pendaftaran PPDB + upload berkas
  - `PATCH /api/registrations/:id/status` : Mengupdate status pendaftaran (Menunggu/Diterima/Ditolak)
  - `DELETE /api/registrations/:id` : Menghapus pendaftar beserta berkasnya

### Penyimpanan Database
- File database tersimpan di:  
  📁 `data/database.sqlite`
- File dokumen yang diunggah pendaftar tersimpan di:  
  📁 `uploads/`

---

## 📁 Struktur Direktori

```text
AL-MURSYIDIYYAH/
├── README.md               # Dokumentasi lengkap proyek ini
├── server.js               # Backend server (Node.js HTTP + API + SQLite)
│
├── index.html              # Halaman Beranda (Home)
├── profil.html             # Halaman Profil Sekolah
├── program.html            # Halaman Program Unggulan
├── fasilitas.html          # Halaman Fasilitas Sekolah
├── guru.html               # Halaman Dewan Guru & Tenaga Kependidikan
├── berita.html             # Halaman Berita & Kegiatan
├── galeri.html             # Halaman Galeri Foto
├── kontak.html             # Halaman Kontak & Lokasi
├── ppdb.html               # Formulir Pendaftaran PPDB Online
├── admin.html              # Portal Manajemen Panitia PPDB
│
├── assets/                 # Aset Statis Website
│   ├── css/
│   │   └── style.css       # Stylesheet utama & desain responsif
│   ├── js/
│   │   ├── main.js         # Interaktivitas UI (Navbar, Mobile Menu, Animasi)
│   │   ├── ppdb.js         # Logika form PPDB & submission fetch API
│   │   └── wa-widget.js    # Widget floating WhatsApp
│   └── img/
│       ├── logo-transparent.png # Logo resmi SDIT Al-Mursyidiyyah
│       └── ...                  # Gambar & SVG pendukung
│
├── data/
│   └── database.sqlite     # Basis data SQLite pendaftar PPDB
│
└── uploads/                # Folder penyimpanan berkas pendaftar
```

---

## 🛠️ Panduan Pemeliharaan & Troubleshooting

### 1. Port 3000 Terpakai (EADDRINUSE)
Jika terminal melaporkan error port 3000 sudah terpakai saat menjalankan `node server.js`:
```bash
# Periksa proses yang menggunakan port 3000 di Mac:
lsof -i :3000

# Matikan proses tersebut:
kill -9 <PID>

# Jalankan ulang:
node server.js
```

### 2. Membuka Halaman Admin Melalui Browser
Pastikan selalu membuka halaman admin melalui URL server:
- ✅ **Buka via:** `http://localhost:3000/admin.html`
- ❌ **Jangan buka langsung dari Finder / file:** `file:///.../admin.html` (karena browser akan memblokir request API ke database jika dibuka dengan protokol `file://`).

---

## 📝 Catatan Pembaruan (6 November 2026)

Berikut rangkuman pembaruan dan penyempurnaan yang telah disimpan pada tanggal **6 November 2026**:

1. **Penyempurnaan Beranda (`index.html`):**
   * Menyederhanakan alur halaman Beranda dengan memusatkan fokus pada Sambutan (*Ahlan wa Sahlan*) dan Hero Section.
   * Menghilangkan badge kecil melayang *"Islam Terpadu - Berkarakter Qur'ani"* dari ilustrasi Hero.
   * Menghapus teks repetitif *"Selamat Datang di SDIT Al-Mursyidiyyah"* di bawah kaligrafi *Ahlan wa Sahlan*.
   * Mengintegrasikan tipografi motto sekolah **"Cendekia Beriman yang Berakhlak Mulia"** dengan warna emas (*Warm Gold*) asli plang sekolah, diratakan dan diposisikan simetris.

2. **Penyempurnaan Footer di Seluruh Halaman:**
   * Menghapus duplikasi logo dan teks sekolah di footer seluruh 9 halaman website.
   * Merapikan baris Alamat dan WhatsApp menjadi sejajar secara horizontal (*side-by-side*) di bagian tengah lengkap dengan ikon emas.
   * Menghapus tautan publik *"Portal Admin"* dari footer untuk menjaga kerahasiaan akses panitia (akses hanya via URL `http://localhost:3000/admin.html`).

3. **Penyempurnaan Galeri Foto (`galeri.html`):**
   * Mengorganisasi dokumentasi foto menjadi sistem **Per Angkatan** (*Semua Angkatan*, *Angkatan Pertama (I)*, *Angkatan Kedua (II)*, *Angkatan Ketiga (III)*).
   * Memasukkan foto dokumentasi asli santri & guru: **Peringatan Hari Sumpah Pemuda** (`assets/img/galeri-sumpah-pemuda.jpg`) ke dalam Angkatan Pertama dengan dukungan popup Lightbox layar penuh.

4. **Penyempurnaan Fasilitas (`fasilitas.html`):**
   * Menghapus teks deskripsi panjang pada kartu fasilitas sehingga tampilan menjadi ringkas, modern, dan simetris (*Gedung 3 Lantai*, *Ruangan Kelas Full AC*, *Lapangan Sekolah*, *Halaman Sekolah yang Nyaman*).

5. **Penyempurnaan Tenaga Pendidik (`guru.html`):**
   * Menghapus teks paragraf deskripsi pada kartu kualifikasi guru (*Kualifikasi Akademik S1/S2*, *Sertifikasi Guru Al-Qur'an*, *Pendekatan Ramah Anak*).

6. **Optimasi Server & Aset (`server.js` & `style.css`):**
   * Mengatur `Cache-Control: no-cache, no-store` pada server lokal agar perubahan kode langsung terlihat tanpa tertahan cache browser.
   * Menambahkan *cache buster* pada seluruh tautan stylesheet (`style.css?v=2.5`).
   * Menghapus bug sintaks CSS dan memastikan validasi 100% bebas error.

---

**SDIT AL-MURSYIDIYYAH**  
📍 Jl. Kapitan, RT.8/RW.4, Klender, Kec. Duren Sawit, Kota Jakarta Timur 13470  
💬 WhatsApp: [0813-8032-7256](https://wa.me/6281380327256)  
© 2026 SDIT Al-Mursyidiyyah. Seluruh Hak Cipta Dilindungi.

