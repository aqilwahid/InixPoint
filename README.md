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

## 📦 Panduan Setup & Menjalankan

### ⚠️ Catatan Penting: PATH dengan Spasi

**JANGAN jalankan dari path Google Drive atau folder dengan spasi/karakter khusus** (misal: `G:\My Drive\DPPP\Edukasi\...`). npm tar extraction akan error.

**SOLUSI**: Clone/pindahkan ke path lokal tanpa spasi sebelum menjalankan:
```bash
# Contoh path yang aman:
C:\InixPoint
# atau
D:\Projects\InixPoint
```

### Prasyarat
* [Node.js](https://nodejs.org/) v22.5.0+ (Direkomendasikan v24.x)
* npm v10+
* Git

### 1. Clone & Pindahkan ke Path Lokal

```bash
# Clone dari GitHub
git clone https://github.com/aqilwahid/InixPoint.git

# Pindahkan ke path TANPA spasi/karakter khusus
# Contoh (Windows):
move InixPoint C:\InixPoint

# atau gunakan Command Prompt:
# xcopy InixPoint C:\InixPoint /E /I /Y
```

### 2. Instalasi Dependensi

Di root folder `InixPoint`:
```bash
npm install:all
```

Atau manual per folder:
```bash
cd server && npm install
cd ../client && npm install
cd ..
```

### 3. Menjalankan Mode Pengembangan (Development)

Buka **dua terminal** terpisah di root folder InixPoint:

**Terminal 1 - Backend Server:**
```bash
npm run dev:server
```
✅ Server Socket.io akan berjalan di: `http://localhost:4000`

**Terminal 2 - Frontend Client:**
```bash
npm run dev:client
```
✅ Aplikasi web akan berjalan di: `http://localhost:3000`

### 4. Testing Lokal (Same Machine)

1. Buka browser pertama: **`http://localhost:3000`** (sebagai Presenter)
2. Buka browser kedua / incognito: **`http://localhost:3000`** (sebagai Participant)
3. Klik "Buka Ruangan Baru" di browser 1 → catat kode PIN
4. Klik "Gabung ke Sesi" di browser 2 → masukkan PIN + nama
5. Test kuis: Multiple Choice, Word Cloud, Short Answer, Slide Drawing

### 5. Testing di Jaringan Lokal (Wi-Fi / LAN Training)

Jika ingin menghubungkan HP peserta di satu ruangan:

1. **Cari IP Address laptop presenter:**
   ```bash
   # Windows
   ipconfig
   
   # Cari "IPv4 Address" (misal: 192.168.1.15)
   ```

2. **Presenter:** Buka `http://localhost:3000` di browser laptop

3. **Peserta:** Di HP / perangkat lain dalam Wi-Fi yang sama, buka:
   ```
   http://192.168.1.15:3000
   ```
   (Ganti `192.168.1.15` dengan IP nyata presenter)

4. Peserta masukkan **Nama + PIN** yang ditampilkan presenter

---

## 🏗️ Struktur Folder

```
InixPoint/
├── shared/          # TypeScript types & contracts (Room, Question, Answer, etc)
├── server/          # Express + Socket.io backend
│   ├── src/
│   │   ├── index.ts          # Main server entry
│   │   ├── roomManager.ts    # State management (in-memory rooms)
│   │   └── db.ts             # SQLite persistence
│   └── package.json
├── client/          # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── main.tsx          # React entry
│   │   ├── App.tsx           # Landing page (dual join/create forms)
│   │   ├── components/
│   │   │   ├── Presenter.tsx # Kontrol ruangan & visualisasi jawaban
│   │   │   ├── Participant.tsx # UI peserta
│   │   │   └── DrawingCanvas.tsx # HTML5 canvas corat-coret
│   │   └── lib/socket.ts     # Socket.io client setup
│   └── package.json
├── package.json     # Root scripts
└── README.md
```

---

## 🛠️ Troubleshooting

| Problem | Solusi |
|---------|--------|
| `npm ERR! TAR_BAD_ARCHIVE` | Pindahkan folder ke path **tanpa spasi**. Google Drive path tidak aman untuk npm. |
| `Cannot find module '@inixpoint/shared'` | Pastikan `shared/src/index.ts` ada. Vite path alias sudah dikonfigurasi di `client/vite.config.ts`. |
| `ECONNREFUSED` di client | Pastikan server running di terminal 1. Check `http://localhost:4000/api/health`. |
| Port 3000 / 4000 sudah digunakan | Kill process: `netstat -ano \| findstr :3000` (Windows) → `taskkill /PID <PID> /F` |

---

## 📝 Lisensi
MIT License &bull; DPPP InixJogja
