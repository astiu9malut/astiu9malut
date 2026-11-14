# ASTI U9 Maluku Utara: Website

Website resmi Akademi Sepakbola ASTI U9 Maluku Utara.

- **Frontend:** HTML, CSS, dan JavaScript murni, di-hosting di GitHub Pages
- **Backend:** Google Apps Script (REST API JSON) dengan Google Sheets dan Google Drive

## Struktur
```
index.html          Halaman utama (publik dan dashboard admin)
css/style.css       Seluruh tampilan
js/config.js        GAS_URL (alamat backend /exec) dan daftar logo
js/app.js           Logika aplikasi dan pemanggil API (fetch)
assets/             Logo dan ikon
```

## Konfigurasi
Isi `GAS_URL` di `js/config.js` dengan URL Web App Apps Script yang diakhiri `/exec`.

Panduan lengkap ada di **PANDUAN-INSTALASI.md**.
