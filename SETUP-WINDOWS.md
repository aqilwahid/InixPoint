# 🪟 Setup InixPoint untuk Windows

Panduan spesifik untuk pengguna Windows (CMD/PowerShell).

---

## ⚠️ Persyaratan Mutlak

### 1. Pindahkan Folder dari Google Drive

**Google Drive path = BAD** (tar extraction gagal):
```
❌ G:\My Drive\DPPP\Edukasi\KPI\Inovasi & Riset\InixPoint
```

**Path lokal = GOOD** (npm install lancar):
```
✅ C:\InixPoint
✅ D:\Projects\InixPoint
✅ %USERPROFILE%\Desktop\InixPoint
```

**Cara Pindahkan:**

**Via Windows Explorer:**
1. Clone repo: `git clone https://github.com/aqilwahid/InixPoint.git`
2. Cut folder hasil clone
3. Paste ke `C:\InixPoint` (atau path pilihan)

**Via Command Prompt:**
```batch
cd /d C:\
git clone https://github.com/aqilwahid/InixPoint.git
cd InixPoint
```

---

## 🔧 Instalasi Langkah Demi Langkah

### Step 1: Verifikasi Node.js & npm

```batch
node --version
npm --version
```

**Harus v22.5.0+ untuk Node dan v10+ untuk npm**

Jika belum install: https://nodejs.org/ → download LTS terbaru

### Step 2: Buka Command Prompt di Folder InixPoint

```batch
cd /d C:\InixPoint
```

### Step 3: Install Dependencies

```batch
npm install:all
```

**Output yang benar:**
```
added XXX packages in YYYs
audited XXX packages
found 0 vulnerabilities
```

**Jika error:**
- Pastikan path **TIDAK** dari Google Drive
- Coba: `npm cache clean --force` → `npm install:all` lagi
- Atau manual per folder:
  ```batch
  cd server && npm install && cd ..
  cd client && npm install && cd ..
  ```

### Step 4: Buka 2 Command Prompt Tab/Window

**Tab 1 - Backend Server:**
```batch
cd /d C:\InixPoint
npm run dev:server
```

Tunggu output:
```
🚀 InixPoint Server running on http://localhost:4000
```

**Tab 2 - Frontend Client:**
```batch
cd /d C:\InixPoint
npm run dev:client
```

Tunggu output:
```
Port 3000 is in use, trying 3001
Local:   http://localhost:3000
```

---

## 🧪 Testing Lokal (Dual Browser)

1. **Browser 1** → buka `http://localhost:3000`
2. Klik **"Buka Ruangan Baru"** → catat 6-digit PIN
3. **Browser 2 / Incognito** → `http://localhost:3000`
4. Klik **"Gabung ke Sesi"** → masukkan PIN + nama
5. Di Browser 1: Pilih tipe kuis (Multiple Choice, Word Cloud, dll)
6. Ketik pertanyaan → klik **"Mulai Kuis Ke Peserta"**
7. Di Browser 2: Peserta bisa pilih jawaban → lihat real-time di Browser 1

---

## 📱 Testing di Jaringan Lokal (Wi-Fi Training)

### Setup:

1. **Laptop Presenter + HP Peserta** di **satu Wi-Fi yang sama**

2. **Cari IP Address Laptop Presenter:**

   **PowerShell / Command Prompt:**
   ```batch
   ipconfig
   ```

   Cari baris:
   ```
   IPv4 Address . . . . . . . . . . . : 192.168.1.15
   ```

3. **Presenter:** Buka `http://localhost:3000` di browser laptop

4. **Peserta:** Di HP/tablet dalam Wi-Fi yang sama, buka:
   ```
   http://192.168.1.15:3000
   ```
   (Ganti `192.168.1.15` dengan IP nyata Anda)

5. Peserta masukkan **Nama + PIN** yang ditampilkan di proyektor

---

## 🚨 Troubleshooting Windows

| Error | Penyebab | Solusi |
|-------|---------|--------|
| `npm ERR! TAR_BAD_ARCHIVE` | Path berisi spasi (Google Drive) | Pindahkan ke `C:\InixPoint` |
| `EADDRINUSE :::3000` | Port 3000 sudah digunakan | Ganti vite.config `port: 3001` atau kill process lain |
| `Cannot find module 'socket.io'` | Dependencies belum install | Jalankan `npm install:all` |
| `ECONNREFUSED` saat load website | Server tidak running | Pastikan `npm run dev:server` jalan di Tab 1 |
| Halaman blank / error di console | Browser cache | Ctrl+Shift+Del → clear cache & reload |

**Untuk kill process yang pakai port:**
```batch
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📋 Checklist Pre-Production

- [ ] Node.js v22.5+ terinstall
- [ ] Folder di `C:\InixPoint` (tidak di Google Drive)
- [ ] `npm install:all` berhasil (0 vulnerabilities)
- [ ] Server running: `npm run dev:server` ✅
- [ ] Client running: `npm run dev:client` ✅
- [ ] Bisa akses `http://localhost:3000` di browser
- [ ] Test: Create room → Join room → Submit answer ✅
- [ ] Test: Multiple Choice tally terlihat real-time ✅
- [ ] IP address presenter terbaca dengan `ipconfig` ✅

---

## 📖 Dokumentasi Lebih Lanjut

- [README.md](./README.md) — Overview & fitur lengkap
- [GitHub Issues](https://github.com/aqilwahid/InixPoint/issues) — Report bug

---

**Selamat! InixPoint siap digunakan. 🎉**
