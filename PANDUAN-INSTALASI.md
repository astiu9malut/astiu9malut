# Panduan Instalasi: ASTI U9 Maluku Utara
### Backend Google Apps Script (REST API) + Frontend GitHub Pages

Arsitektur baru:

```
Pengunjung ──► GitHub Pages (index.html, css/, js/, assets/)
                   │  fetch() JSON
                   ▼
              Google Apps Script /exec  (Kode.gs)
                   │
                   ▼
              Google Sheets + Google Drive (data & file lama tetap dipakai)
```

---

## BAGIAN A: Backend (Google Apps Script)

Backend dipasang di **project Apps Script yang sama** dengan yang sekarang, yaitu project yang terhubung ke spreadsheet ASTI U9. Semua data, file Drive, akun admin, dan pengaturan reCAPTCHA tetap terpakai.

1. Buka spreadsheet ASTI U9, lalu pilih **Ekstensi › Apps Script**.
2. Buka file **Code.gs**, hapus seluruh isinya, lalu tempel seluruh isi **Kode.gs**. Simpan dengan Ctrl+S.
   - Boleh juga rename `Code.gs` menjadi `Kode.gs`. Isinya yang penting.
3. Hapus file **Index**, **Style**, dan **Script** dari project. Klik titik tiga di samping nama file, lalu pilih Hapus.
   - Ketiga file itu sudah pindah ke GitHub dan tidak dipakai lagi oleh backend.
4. Pilih fungsi **`setupAppEnvironment`** di dropdown, lalu klik **▶ Jalankan**. Izinkan akses jika diminta.
   - Fungsi ini **aman dijalankan ulang**. Ia hanya melengkapi yang belum ada dan tidak menghapus data.
   - Hasilnya: sheet baru **AppConfig** berisi ID spreadsheet dan folder Drive, dan ID-nya tersimpan di Script Properties.
5. Jalankan **`ujiSistem`**, lalu buka **Eksekusi**. Semua baris harus **LULUS**, termasuk `API doGet publik`.
6. Deploy ulang:
   - Pilih **Deploy › Kelola deployment**, klik ikon pensil, pilih **Versi: Versi baru**, lalu **Deploy**.
   - Pastikan **Execute as: Me** dan **Who has access: Anyone**.
   - **Salin URL Web App** yang diakhiri `/exec`. URL ini tetap sama dengan URL lama.
7. Uji di browser. Buka `URL_EXEC?action=ping`. Kalau muncul teks JSON `{"ok":true,...}`, backend sudah siap.

> Setelah migrasi, membuka URL `/exec` langsung hanya menampilkan JSON, bukan website. Website sekarang dibuka dari alamat GitHub Pages.

---

## BAGIAN B: Isi alamat backend di frontend

1. Ekstrak **asti-u9.zip** ke misalnya `Documents\asti-u9`.
2. Buka file **`js\config.js`** dengan Notepad.
3. Ganti baris ini:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/XXXX/exec';
   ```
   dengan URL `/exec` dari langkah A6. Simpan.

---

## BAGIAN C: Upload frontend ke GitHub Pages

> ⚠️ **Folder kerja = folder `asti-u9` hasil ekstraksi**, yaitu folder yang **langsung** berisi `index.html`. Semua perintah di bawah dijalankan di folder ini. Jangan naik ke folder induknya.
>
> Gunakan terminal. **Jangan** pakai tombol "Upload files" di web GitHub, karena struktur folder `css/`, `js/`, dan `assets/` bisa rusak.

### C1. Install Git (sekali saja)
- Windows: unduh dari https://git-scm.com/download/win, install dengan pilihan default.
- Cek di PowerShell:
  ```
  git --version
  ```

### C2. Atur identitas Git (sekali saja)
```
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

### C3. Buat repository di GitHub
1. Buka https://github.com, klik **+**, lalu **New repository**.
2. Nama repository: **`asti-u9`**, dan pilih **Public**.
3. **Jangan** centang README, .gitignore, atau license. Klik **Create repository**.

### C4. Buka PowerShell di folder `asti-u9`
Buka folder `asti-u9` di File Explorer, klik address bar, ketik `powershell`, lalu tekan Enter. Kemudian cek isinya:
```
dir
```
Yang harus terlihat: `index.html`, `css`, `js`, `assets`, dan `README.md`. **Kalau `index.html` tidak terlihat, berhenti dulu.** Berarti Anda berada di folder yang salah.

### C5. Kirim ke GitHub (jalankan satu per satu)
```
git init
git add .
git commit -m "Upload pertama ASTI U9"
git branch -M main
git remote add origin https://github.com/USERNAME/asti-u9.git
git push -u origin main
```
- Ganti `USERNAME` dengan username GitHub Anda.
- Saat diminta **Password**, tempel **Personal Access Token**, bukan password akun.
  - Cara membuat token: https://github.com/settings/tokens, pilih **Generate new token (classic)**, centang **repo**, lalu Generate. Salin token `ghp_...`.
  - Saat token ditempel, layar memang terlihat kosong. Itu normal; tekan Enter.

### C6. Aktifkan GitHub Pages
Di halaman repository, buka **Settings › Pages**:
- Source: **Deploy from a branch**
- Branch: **main** dengan folder **/ (root)**, lalu **Save**
- Centang **Enforce HTTPS**

Tunggu 1–2 menit. Website tampil di: **`https://USERNAME.github.io/asti-u9/`**

---

## BAGIAN D: reCAPTCHA (jika dipakai)

Buka https://www.google.com/recaptcha/admin, pilih kunci v2 yang dipakai, lalu buka **Domains** dan tambahkan:
```
USERNAME.github.io
```
Simpan. Site Key dan Secret Key **tidak perlu diubah**; keduanya tetap tersimpan di backend.

---

## BAGIAN E: Update di kemudian hari

**Ubah tampilan (frontend):** edit file di folder `asti-u9`, lalu dari PowerShell di folder itu jalankan:
```
git add .
git commit -m "Update tampilan"
git push
```

**Ubah backend:** edit `Kode.gs` di Apps Script, lalu pilih **Deploy › Kelola deployment › Edit › Versi baru**. URL tetap sama, jadi `config.js` tidak perlu diubah.

Kalau perubahan belum terlihat, tekan **Ctrl+Shift+R** atau buka di jendela Incognito.

---

## Uji akhir

1. Buka `https://USERNAME.github.io/asti-u9/`. Beranda, Jadwal, Tim, Galeri, dan Prestasi harus tampil berisi data.
2. Kirim pesan di **Kontak Kami**, lalu cek sheet `PesanKontak`.
3. Login admin, lalu tambah dan hapus satu data uji di menu mana pun.
4. Tekan **F12** dan buka tab **Console**. Tidak boleh ada error merah bertuliskan "CORS".

## Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| "Alamat server belum diatur" | `GAS_URL` masih `XXXX` | Isi `js/config.js` (Bagian B), lalu push ulang |
| "Respons server tidak valid" | Web App belum di-deploy ulang atau akses bukan "Anyone" | Ulangi langkah A6 |
| Data kosong, "Action tidak dikenal" | Kode lama masih ter-deploy | Deploy **Versi baru** |
| Halaman 404 di GitHub Pages | `index.html` tidak di root repository | Push ulang dari folder yang langsung berisi `index.html` |
| Tampilan tanpa warna atau logo | Struktur folder rusak | Pastikan repository berisi folder `css/`, `js/`, dan `assets/` |
| reCAPTCHA "domain tidak valid" | Domain github.io belum didaftarkan | Lihat Bagian D |
