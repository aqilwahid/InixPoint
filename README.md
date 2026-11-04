# InixPoint 🎯

**InixPoint** adalah platform presentasi interaktif dan kuis kelas berbasis browser secara *real-time* (*browser-to-browser*). Dirancang khusus untuk mempermudah instruktur/trainer dalam mengelola kuis, mengumpulkan ide, dan mendapatkan respons langsung dari peserta pelatihan tanpa ketergantungan pada add-in desktop Microsoft PowerPoint.

---

## 🚀 Fitur Utama

Berdasarkan inspirasi fitur interaktif kelas modern:

1. **Presenter & Peserta Terhubung Tanpa Instalasi (Web-only)**
   * Presenter membuka kontrol ruangan di browser (dapat dihubungkan ke proyektor / layar besar).
   * Peserta cukup memindai **QR Code** atau membuka link dan memasukkan **6-digit PIN** di ponsel / laptop masing-masing.
2. **Kuis Pilihan Ganda (Multiple Choice)**
   * Presenter dapat menetapkan opsi (A, B, C, D) serta kunci jawaban opsional untuk penilaian otomatis.
   * Diagram batang terisi secara langsung saat peserta memilih.
3. **Word Cloud Kolaboratif**
   * Mengumpulkan kata kunci atau respons singkat dari seluruh peserta.
   * Menampilkan kumpulan kata dinamis dengan ukuran otomatis berdasarkan frekuensi kemunculan.
4. **Jawaban Singkat (Short Answer)**
   * Audiens mengirimkan tanggapan dan ide dalam format teks langsung ke layar presenter.
5. **Slide Drawing (Kanvas Interaktif)**
   * Peserta dapat menggambar sketsa, diagram alir, atau mencoret jawaban di kanvas HTML5 ponsel dan mengirimkannya langsung ke galeri layar presenter.
6. **Laporan & Rekap Nilai**
   * Data sesi dan jawaban tersimpan secara otomatis di basis data lokal SQLite (`node:sqlite`).
   * Tersedia fitur ekspor laporan ke format **CSV**.
7. **Bisa Berjalan Offline / LAN (Jaringan Lokal)**
   * Sangat cocok untuk sesi *offline training* di mana trainer dan peserta berada dalam satu Wi-Fi lokal yang sama tanpa membutuhkan koneksi internet luar.

---

## 🛠️ Arsitektur & Teknologi

* **Monorepo**: Menggunakan npm workspaces (`shared`, `server`, `client`).
* **Frontend (`client`)**:
  * [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  * [Tailwind CSS](https://tailwindcss.com/)
  * [Socket.io Client](https://socket.io/)
  * [Lucide React](https://lucide.dev/) (Iconography)
  * [qrcode.react](https://github.com/zpao/qrcode.react) (QR Code Generator)
* **Backend (`server`)**:
  * [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) + [TypeScript](https://www.typescriptlang.org/)
  * [Socket.io](https://socket.io/) (Real-time bidirectional WebSocket transport)
  * `node:sqlite` (SQLite bawaan standard library Node.js 24 untuk penyimpanan laporan kuis tanpa dependensi eksternal berat)
* **Shared (`shared`)**:
  * Kontrak tipe data TypeScript untuk Room, Participant, Question, Answer, dan event Socket.io.

---

## 📦 Panduan Menjalankan

### Prasyarat
* [Node.js](https://nodejs.org/) v22.5.0+ (Direkomendasikan v24.x)
* npm v10+

### 1. Instalasi Dependensi
Jalankan di root repositori:
```bash
npm install
```

### 2. Menjalankan Mode Pengembangan (Development)

Buka dua terminal atau jalankan masing-masing:

**Terminal 1 (Backend Server):**
```bash
npm run dev:server
```
*Server akan berjalan di:* `http://localhost:4000`

**Terminal 2 (Frontend Client):**
```bash
npm run dev:client
```
*Aplikasi web akan berjalan di:* `http://localhost:3000`

### 3. Penggunaan di Jaringan Lokal (Wi-Fi Training)
Jika ingin menghubungkan HP peserta di satu ruangan:
1. Cari alamat IP laptop presenter (misal: `192.168.1.15`).
2. Peserta cukup membuka `http://192.168.1.15:3000` di browser ponsel mereka.
3. Masukkan kode PIN yang tampil di layar proyektor presenter.

---

## 📝 Lisensi
MIT License &bull; DPPP InixJogja
