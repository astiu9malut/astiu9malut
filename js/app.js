/* ASTI U9 Maluku Utara - app.js (frontend GitHub Pages, backend Google Apps Script REST API) */
// ===== BLOK: SCRIPT_CORE =====
const S = {
  token: bacaSesi(),
  hash: 'beranda',
  pengguna: null,
  pilihan: null,
  maksMB: 5,
  publik: null,
  publikKotor: false,
  memuatPublik: null,
  data: {},
  dashboard: null,
  dashboardKotor: false,
  galeriTipe: 'Photo',
  galeriBatas: 6,
  heroIndex: 0,
  heroTimer: null,
  profilId: '',
  dokProfil: {},
  dokAktif: null,
  grafik: {},
  janjiChart: null,
  urlViewer: '',
  captchaId: '',
  wajibGantiPw: false,
  modalTerbuka: []
};

const POSISI = ['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards'];
// Coach & Officials: disimpan di data Pemain dengan Posisi ini, tampil di halaman Tim tanpa halaman profil.
const POSISI_OFFICIAL = 'Coach & Officials';
const JABATAN = ['Team Manager', 'Head Coach', 'Assistant Coach', 'Analyst', 'Physical Coach', 'GK Coach', 'Team Secretary', 'Media Officer', 'Photographer & Videographer'];
function isOfficial(p) { return !!p && p.Posisi === POSISI_OFFICIAL; }
function urutPosisi(p) { const i = POSISI.indexOf(p.Posisi); return i === -1 ? POSISI.length : i; }
function urutJabatan(p) { const i = JABATAN.indexOf(p.Jabatan); return i === -1 ? JABATAN.length : i; }
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLN3 = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const FUNGSI_PUBLIK = ['muatPublik', 'kirimPesan', 'buatCaptcha', 'login', 'unduhWallpaper'];
const URL_CHART = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

function bacaSesi() {
  try { return sessionStorage.getItem('astiToken') || ''; } catch (e) { return ''; }
}
function simpanSesi(t) {
  try { if (t) sessionStorage.setItem('astiToken', t); else sessionStorage.removeItem('astiToken'); } catch (e) { /* penyimpanan tidak tersedia */ }
}

function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function urlAman(u) { return /^https?:\/\/[^\s<>"']+$/i.test(String(u || '')) ? String(u) : ''; }
function cssUrl(u) { return encodeURI(u).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29'); }
function ikon(id, kelas) { return '<svg class="' + (kelas || 'ikon-kecil') + '"><use href="#' + id + '"/></svg>'; }
function gambar(url, alt, kelas, grup) {
  const u = urlAman(url);
  if (u) return '<img src="' + esc(u) + '" alt="' + esc(alt || '') + '" loading="lazy"' + (kelas ? ' class="' + kelas + '"' : '') +
    (grup ? ' data-lightbox="' + esc(grup) + '" data-judul="' + esc(alt || '') + '"' : '') + '>';
  return '<div class="gambar-kosong">' + ikon('i-gambar', 'ikon') + '</div>';
}

// Pemanggil API Google Apps Script (fetch). Data publik lewat GET, aksi lain lewat POST
// dengan header text/plain (application/json memicu CORS preflight yang ditolak Apps Script).
const AKSI_GET = { muatPublik: 'publik', buatCaptcha: 'captcha' };

async function kirimKeApi(fungsi, args) {
  if (!GAS_URL || GAS_URL.indexOf('XXXX') !== -1) throw new Error('Alamat server belum diatur. Isi GAS_URL di js/config.js.');
  const kendali = new AbortController();
  const batas = setTimeout(function () { kendali.abort(); }, 90000);
  let res;
  try {
    if (AKSI_GET[fungsi]) {
      res = await fetch(GAS_URL + '?action=' + AKSI_GET[fungsi] + '&_=' + Date.now(), { signal: kendali.signal });
    } else {
      res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: fungsi, args: args }),
        signal: kendali.signal
      });
    }
  } catch (err) {
    throw new Error(err.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
  } finally {
    clearTimeout(batas);
  }
  let hasil;
  try { hasil = await res.json(); } catch (e) { throw new Error('Respons server tidak valid. Pastikan Web App sudah di-deploy dengan akses "Anyone".'); }
  return hasil;
}

async function panggil(fungsi) {
  const args = Array.prototype.slice.call(arguments, 1);
  if (FUNGSI_PUBLIK.indexOf(fungsi) === -1) args.unshift(S.token);
  const res = await kirimKeApi(fungsi, args);
  if (res && res.ok) return res.data;
  const pesan = (res && res.pesan) || 'Terjadi kesalahan di server.';
  if (/Sesi berakhir|Akun tidak aktif/.test(pesan)) sesiHabis(pesan);
  throw new Error(pesan);
}

function toast(pesan, jenis) {
  const el = document.createElement('div');
  el.className = 'toast toast-' + (jenis || 'info');
  el.setAttribute('role', 'status');
  el.innerHTML = ikon(jenis === 'sukses' ? 'i-cek' : jenis === 'gagal' ? 'i-x' : 'i-info') + '<span>' + esc(pesan) + '</span>';
  $('#toast-wadah').appendChild(el);
  setTimeout(function () { el.classList.add('hilang'); setTimeout(function () { el.remove(); }, 220); }, jenis === 'gagal' ? 5200 : 3200);
}
function gagal(e) { toast(e && e.message ? e.message : String(e), 'gagal'); }

function tombolMemuat(btn, aktif) {
  if (!btn) return;
  btn.disabled = aktif;
  btn.classList.toggle('memuat', aktif);
}

function jeda(fn, ms) {
  let t = null;
  return function () { const a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms || 250); };
}

function bukaModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.hidden = false;
  if (S.modalTerbuka.indexOf(id) === -1) S.modalTerbuka.push(id);
  document.body.classList.add('modal-terbuka');
}
function tutupModal(id) {
  if (id === 'modal-gantipw' && S.wajibGantiPw) return;
  if (id === 'modal-konfirmasi' && $('#btn-konfirmasi-batal').onclick) { $('#btn-konfirmasi-batal').onclick(); return; }
  const m = document.getElementById(id);
  if (!m) return;
  m.hidden = true;
  S.modalTerbuka = S.modalTerbuka.filter(function (x) { return x !== id; });
  if (!S.modalTerbuka.length) document.body.classList.remove('modal-terbuka');
  // Batal / X: buang isian yang belum disimpan.
  $$('form', m).forEach(function (f) { f.reset(); $$('.salah', f).forEach(function (el) { el.classList.remove('salah'); }); });
  if (id === 'modal-dokumen') { $('#dok-file').value = ''; $('#dok-catatan').value = ''; }
  if (id === 'video-modal') $('#video-isi').innerHTML = '';
  if (id === 'lightbox') $('#lb-img').removeAttribute('src');
  if (id === 'modal-viewer') {
    if (S.urlViewer) URL.revokeObjectURL(S.urlViewer);
    S.urlViewer = '';
    $('#viewer-isi').innerHTML = '';
  }
}

function konfirmasi(teks, labelYa) {
  return new Promise(function (resolve) {
    $('#konfirmasi-teks').textContent = teks;
    $('#btn-konfirmasi-ya').textContent = labelYa || 'Ya, Hapus';
    const selesai = function (hasil) {
      $('#btn-konfirmasi-ya').onclick = null;
      $('#btn-konfirmasi-batal').onclick = null;
      tutupModal('modal-konfirmasi');
      resolve(hasil);
    };
    $('#btn-konfirmasi-ya').onclick = function () { selesai(true); };
    $('#btn-konfirmasi-batal').onclick = function () { selesai(false); };
    bukaModal('modal-konfirmasi');
  });
}

function pecahTgl(t) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t || '');
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}
function tglPanjang(t) {
  const p = pecahTgl(t); if (!p) return '-';
  const dt = new Date(Date.UTC(p.y, p.m - 1, p.d));
  return HARI[dt.getUTCDay()] + ', ' + p.d + ' ' + BULAN[p.m - 1] + ' ' + p.y;
}
function tglSingkat(t) { const p = pecahTgl(t); return p ? p.d + ' ' + BULAN[p.m - 1].slice(0, 3) + ' ' + p.y : '-'; }
function tglBio(t) { const p = pecahTgl(t); return p ? p.d + ' ' + BULAN[p.m - 1].toUpperCase() + ' ' + p.y : '-'; }
function namaBulan(kunci) { const p = kunci.split('-'); return BULAN[+p[1] - 1] + ' ' + p[0]; }
function posisiTunggal(p) { return String(p || '').replace(/s$/, ''); }

const pengamat = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entri) {
  entri.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('terlihat'); pengamat.unobserve(e.target); } });
}, { threshold: 0.12 }) : null;
function amati(root) {
  $$('.animasi-muncul:not(.terlihat)', root).forEach(function (el) {
    if (pengamat) pengamat.observe(el); else el.classList.add('terlihat');
  });
}

function sesiHabis(pesan) {
  if (!S.token) return;
  S.token = ''; S.pengguna = null; S.wajibGantiPw = false;
  simpanSesi('');
  document.body.classList.remove('peran-pengurus');
  perbaruiNavLogin();
  toast(pesan || 'Sesi berakhir. Silakan login kembali.', 'info');
  pergi('login', true);
}
// ===== AKHIR BLOK: SCRIPT_CORE =====


// ===== BLOK: NAVIGASI =====
// Navigasi berbasis hash (#beranda, #pemain/PMN-001, #admin/m3) tanpa memuat ulang halaman.
function pergi(tujuan, ganti) {
  const h = String(tujuan || 'beranda').replace(/^#/, '') || 'beranda';
  if (h === S.hash && !ganti) { rute(); return; }
  S.hash = h;
  if (location.hash.slice(1) !== h) {
    if (ganti) history.replaceState(null, '', '#' + h);
    else history.pushState(null, '', '#' + h);
  }
  rute();
}

function klikTautan(e) {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  e.preventDefault();
  pergi(a.getAttribute('href'));
}

function rute() {
  const h = S.hash || 'beranda';
  const bagian = h.split('/');
  if (bagian[0] === 'admin') { masukAdmin(bagian[1] || 'm1'); return; }
  if (bagian[0] === 'login' && S.token) { pergi('admin/m1', true); return; }
  tampilSitus();
  const peta = { beranda: 'beranda', jadwal: 'jadwal', tim: 'tim', pemain: 'profil', galeri: 'galeri', prestasi: 'prestasi', kontak: 'kontak', login: 'login' };
  const hal = peta[bagian[0]] || 'beranda';
  S.profilId = hal === 'profil' ? decodeURIComponent(bagian[1] || '') : '';
  tampilHal(hal);
}

function tampilSitus() {
  document.documentElement.classList.remove('mode-admin');
  $('#area-admin').hidden = true;
  $('#situs').hidden = false;
  if (S.publikKotor) { S.publikKotor = false; muatDataPublik(); }
}

function tampilHal(hal) {
  $$('.hal').forEach(function (s) { s.hidden = s.id !== 'hal-' + hal; });
  const navAktif = hal === 'profil' ? 'tim' : hal;
  $$('.nav-link[data-hal]').forEach(function (a) { a.classList.toggle('aktif', a.dataset.hal === navAktif); });
  $('#situs-header').classList.toggle('header-profil', hal === 'profil');
  tutupBurger();
  window.scrollTo(0, 0);
  if (hal === 'login') muatCaptcha();
  renderHal(hal);
}

function renderHal(hal) {
  if (!S.publik) return;
  if (hal === 'beranda') renderBeranda();
  else if (hal === 'jadwal') renderJadwal();
  else if (hal === 'tim') renderTim();
  else if (hal === 'profil') renderProfil();
  else if (hal === 'galeri') renderGaleri();
  else if (hal === 'prestasi') renderPrestasi();
  else if (hal === 'kontak') siapkanCaptchaKontak();
  amati();
}

function halSekarang() {
  const s = $$('.hal').find(function (x) { return !x.hidden; });
  return s ? s.id.replace('hal-', '') : 'beranda';
}

function tutupBurger() {
  $('#situs-header').classList.remove('nav-terbuka');
  $('#btn-burger').setAttribute('aria-expanded', 'false');
}

function perbaruiNavLogin() {
  const a = $('#nav-login');
  if (S.token) { a.href = '#admin/m1'; $('#nav-login-teks').textContent = 'Dashboard'; }
  else { a.href = '#login'; $('#nav-login-teks').textContent = 'Login'; }
}
// ===== AKHIR BLOK: NAVIGASI =====


// ===== BLOK: PUBLIK_DATA =====
function muatDataPublik() {
  if (S.memuatPublik) return S.memuatPublik;
  S.memuatPublik = panggil('muatPublik').then(function (d) {
    S.publik = d;
    pasangPengaturan(d.pengaturan || {});
    if (!$('#situs').hidden) renderHal(halSekarang());
  }).catch(function (e) {
    $$('#hal-beranda .teks-memuat, #daftar-jadwal .teks-memuat, #daftar-tim .teks-memuat, #galeri-grid .teks-memuat, #prestasi-grid .teks-memuat')
      .forEach(function (el) { el.className = 'teks-gagal'; el.textContent = 'Gagal memuat data: ' + e.message; });
    gagal(e);
  }).finally(function () { S.memuatPublik = null; });
  return S.memuatPublik;
}

function pasangAset(aset) {
  $$('img[data-aset]').forEach(function (img) {
    const u = aset[img.dataset.aset];
    if (!u) return;
    img.onload = function () { img.classList.add('termuat'); };
    if (img.getAttribute('src') !== u) img.src = u; else img.classList.add('termuat');
  });
}

function pasangPengaturan(p) {
  const email = $('#footer-email');
  email.textContent = p.Email || '';
  if (p.Email) { email.href = 'mailto:' + p.Email; email.target = '_blank'; email.rel = 'noopener'; } else email.removeAttribute('href');
  $('#footer-copy').textContent = p.TeksCopyright || '';
  [['sos-fb', 'FacebookURL'], ['sos-ig', 'InstagramURL'], ['sos-tiktok', 'TiktokURL'], ['sos-yt', 'YoutubeURL']].forEach(function (x) {
    const a = document.getElementById(x[0]);
    const u = urlAman(p[x[1]]);
    if (u) a.href = u; else a.removeAttribute('href');
  });
  $('#kontak-email').textContent = p.Email || '-';
  $('#kontak-telepon').textContent = p.Telepon || '-';
  $('#kontak-alamat').textContent = p.AlamatMarkas || '-';
}
// ===== AKHIR BLOK: PUBLIK_DATA =====


// ===== BLOK: H1_BERANDA =====
function renderBeranda() {
  const d = S.publik;
  renderHero(d.slider);

  const mendatang = d.jadwal.filter(function (j) { return j.Status === 'Akan Datang' && j.Tanggal >= d.hariIni; });
  const logo = ASET.logoPutih;
  $('#beranda-jadwal').innerHTML = mendatang.length ? mendatang.map(function (j) {
    const p = pecahTgl(j.Tanggal);
    return '<article class="kartu-jadwal">' +
      (logo ? '<img class="kartu-jadwal-logo" src="' + esc(logo) + '" alt="">' : '') +
      '<div class="kartu-jadwal-info"><div>' + esc(tglPanjang(j.Tanggal)) + '</div><div>Waktu : ' + esc(j.Waktu) + ' WIT</div><div>' + esc(j.Lokasi) + '</div></div>' +
      '<div class="kartu-jadwal-tanggal">' + (p ? p.d + ' ' + BLN3[p.m - 1] : '') + '</div>' +
      '<h3 class="kartu-jadwal-nama">' + esc(j.NamaTurnamen) + '</h3></article>';
  }).join('') : '<p class="teks-kosong">Belum ada jadwal pertandingan mendatang</p>';

  const s = d.sorotan;
  $('#totm-gambar').innerHTML = s && urlAman(s.GambarTeamOfTheMatch)
    ? gambar(s.GambarTeamOfTheMatch, 'Team of the Match ' + s.NamaTurnamen, 'totm-img', 'totm')
    : '<p class="teks-kosong">Belum ada data</p>';
  $('#turnamen-judul').textContent = s ? s.NamaTurnamen : 'Sorotan Pertandingan';
  $('#penghargaan-grid').innerHTML = d.penghargaan.length ? d.penghargaan.map(function (x, i) {
    return '<a class="kartu-penghargaan" href="#pemain/' + encodeURIComponent(x.PemainID) + '">' +
      '<div class="kp-foto">' + gambar(x.Foto, x.NamaPemain + ' - ' + x.Gelar, '', 'penghargaan') + '</div>' +
      '<span class="kp-penanda">' + ikon('i-penanda') + '</span>' +
      '<div class="kp-badan"><span class="kp-nomor">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<p class="kp-kategori">' + esc(x.Kategori) + '</p>' +
      '<p class="kp-gelar">' + esc(x.Gelar) + '</p>' +
      '<p class="kp-sub">' + esc(x.Subjudul) + '</p>' +
      '<p class="kp-pemain">' + esc(x.NamaPemain) + '</p>' +
      (x.Penilaian ? '<p class="kp-nilai-label">Penilaian:</p><p class="kp-nilai">' + esc(x.Penilaian) + '</p>' : '') +
      '</div></a>';
  }).join('') : '<p class="teks-kosong">Belum ada data</p>';
  $('#keterangan-nilai').hidden = !(s && s.KeteranganPenilaian);
  $('#keterangan-teks').textContent = s ? s.KeteranganPenilaian : '';

  const foto = d.galeri.filter(function (g) { return g.Tipe === 'Photo'; }).slice(0, 3);
  const video = d.galeri.filter(function (g) { return g.Tipe === 'Video'; }).slice(0, 3);
  $('#beranda-foto').innerHTML = foto.length ? foto.map(kartuGaleri).join('') : '<p class="teks-kosong">Belum ada foto</p>';
  $('#beranda-video').innerHTML = video.length ? video.map(kartuGaleri).join('') : '<p class="teks-kosong">Belum ada video</p>';

  const utama = d.pemain.filter(function (p) { return p.TimUtama === 'Ya' && !isOfficial(p); });
  $('#beranda-tim').innerHTML = utama.length ? utama.map(function (p) {
    return '<a class="kartu-tim" href="#pemain/' + encodeURIComponent(p.ID) + '">' +
      '<div class="kt-foto">' + gambar(p.FotoKartu || p.FotoProfil, p.NamaLengkap) + '</div>' +
      '<span class="kt-badge">#' + esc(p.NomorPunggung) + ' | ' + esc(p.Posisi) + '</span>' +
      '<div class="kt-teks"><p class="kt-panggil">' + esc(p.NamaPanggilan) + '</p><h3 class="kt-nama">' + esc(p.NamaLengkap) + '</h3></div></a>';
  }).join('') : '<p class="teks-kosong">Belum ada pemain tim utama</p>';

  $('#beranda-sponsor').innerHTML = d.sponsor.map(function (sp) {
    const isi = urlAman(sp.Logo)
      ? '<img src="' + esc(urlAman(sp.Logo)) + '" alt="' + esc(sp.NamaSponsor) + '" loading="lazy">'
      : '<span class="sponsor-teks">' + esc(sp.NamaSponsor) + '</span>';
    const link = urlAman(sp.LinkURL);
    return link ? '<a class="sponsor-item" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer" title="' + esc(sp.NamaSponsor) + '">' + isi + '</a>'
      : '<div class="sponsor-item" title="' + esc(sp.NamaSponsor) + '">' + isi + '</div>';
  }).join('');
  $('.blok-sponsor').hidden = !d.sponsor.length;
}

function renderHero(slider) {
  clearInterval(S.heroTimer);
  S.heroIndex = 0;
  const wadah = $('#hero-slides');
  if (!slider.length) {
    wadah.innerHTML = '<div class="hero-slide hero-kosong aktif"><div class="wadah hero-konten"><p class="teks-kosong">Belum ada berita</p></div></div>';
    $('#hero-prev').hidden = true; $('#hero-next').hidden = true;
    return;
  }
  wadah.innerHTML = slider.map(function (s, i) {
    const img = urlAman(s.Gambar);
    const link = urlAman(s.LinkTombol);
    return '<div class="hero-slide' + (img ? '' : ' hero-kosong') + (i === 0 ? ' aktif' : '') + '">' +
      (img ? '<div class="hero-latar" style="background-image:url(\'' + esc(cssUrl(img)) + '\')"></div><div class="hero-overlay"></div>' : '') +
      '<div class="wadah hero-konten">' +
      (s.LabelKategori ? '<span class="badge-merah">' + esc(s.LabelKategori) + '</span>' : '<span></span>') +
      '<h1 class="hero-judul">' + esc(s.Judul) + '</h1>' +
      (link ? '<a class="tombol-merah" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Discover More ' + ikon('i-panah-serong') + '</a>' : '') +
      '</div></div>';
  }).join('');
  const banyak = slider.length > 1;
  $('#hero-prev').hidden = !banyak; $('#hero-next').hidden = !banyak;
  if (banyak) S.heroTimer = setInterval(function () { geserHero(1); }, 6500);
}

function geserHero(arah, manual) {
  const slides = $$('#hero-slides .hero-slide');
  if (slides.length < 2) return;
  slides[S.heroIndex].classList.remove('aktif');
  S.heroIndex = (S.heroIndex + arah + slides.length) % slides.length;
  slides[S.heroIndex].classList.add('aktif');
  if (manual) { clearInterval(S.heroTimer); S.heroTimer = setInterval(function () { geserHero(1); }, 6500); }
}

function geserCarousel(id, arah) {
  const el = document.getElementById(id);
  const kartu = el.firstElementChild;
  const lebar = kartu ? kartu.getBoundingClientRect().width + 14 : el.clientWidth;
  el.scrollBy({ left: arah * lebar, behavior: 'smooth' });
}

function kartuGaleri(g) {
  const video = g.Tipe === 'Video';
  const wallpaper = g.Tipe === 'Wallpaper';
  const label = g.LabelKategori || (video ? 'Video Gallery' : wallpaper ? 'Wallpaper' : 'Academy Gallery');
  const thumb = urlAman(g.Thumbnail) || (video ? thumbYoutube(g.LinkURL) : '');
  return '<article class="kartu-galeri animasi-muncul' + (video ? ' kg-video' : '') + '">' +
    '<div class="kg-media">' + gambar(thumb, g.Judul, '', video ? '' : 'galeri-' + g.Tipe) +
    '<span class="kg-badge-kiri">' + esc(label) + '</span>' +
    (video ? '<button class="kg-putar" type="button" data-video="' + esc(g.ID) + '" aria-label="Putar video ' + esc(g.Judul) + '">' + ikon('i-putar', 'ikon') + '</button>' : '') +
    '<span class="kg-bawah-kiri">' + ikon(video ? 'i-putar' : 'i-kamera') + (video ? 'Official Video' : wallpaper ? 'Wallpaper' : 'Official Photo Set') + '</span>' +
    (video ? '' : '<span class="kg-bawah-kanan">Collection</span>') + '</div>' +
    '<div class="kg-badan"><p class="kg-kategori">' + esc(label) + '</p><h3 class="kg-judul">' + esc(g.Judul) + '</h3></div>' +
    '<div class="kg-kaki"><span class="kg-tanggal">' + ikon('i-kalender') + (g.TanggalKegiatan ? esc(tglSingkat(g.TanggalKegiatan)) : 'Recent') + '</span>' +
    (wallpaper ? '<button class="kg-unduh' + (g.BisaUnduh ? '' : ' tidak-tersedia') + '" type="button" data-unduh="' + esc(g.ID) + '" aria-label="Download ' + esc(g.Judul) + '">' + ikon('i-unduh') + 'Download</button>' : '') +
    '</div></article>';
}
// ===== AKHIR BLOK: H1_BERANDA =====


// ===== BLOK: LIGHTBOX_VIDEO =====
function gambarBesar(url) {
  const m = /^(https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+)/.exec(url || '');
  return m ? m[1] + '=w2400' : url;
}

function bukaLightbox(img) {
  const grup = img.dataset.lightbox;
  S.lb = $$('img[data-lightbox="' + grup + '"]').filter(function (el) { return el.offsetParent !== null || el === img; });
  S.lbIndex = Math.max(0, S.lb.indexOf(img));
  tampilLightbox();
  bukaModal('lightbox');
}

function tampilLightbox() {
  const img = S.lb[S.lbIndex];
  const besar = $('#lb-img');
  besar.style.animation = 'none';
  void besar.offsetWidth;
  besar.style.animation = '';
  besar.src = gambarBesar(img.getAttribute('src'));
  besar.alt = img.alt;
  $('#lb-judul').textContent = img.dataset.judul || img.alt || '';
  const banyak = S.lb.length > 1;
  $('#lb-hitung').textContent = banyak ? (S.lbIndex + 1) + ' / ' + S.lb.length : '';
  $('#lb-prev').hidden = !banyak;
  $('#lb-next').hidden = !banyak;
}

function geserLightbox(arah) {
  if (!S.lb || S.lb.length < 2) return;
  S.lbIndex = (S.lbIndex + arah + S.lb.length) % S.lb.length;
  tampilLightbox();
}

function idYoutube(url) {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i.exec(url || '');
  return m ? m[1] : '';
}
function thumbYoutube(url) { const id = idYoutube(url); return id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : ''; }

function embedVideo(url) {
  const yt = idYoutube(url);
  if (yt) return { jenis: 'iframe', src: 'https://www.youtube.com/embed/' + yt + '?autoplay=1&rel=0&modestbranding=1&playsinline=1' };
  const dr = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})/i.exec(url || '');
  if (dr) return { jenis: 'iframe', src: 'https://drive.google.com/file/d/' + dr[1] + '/preview' };
  if (urlAman(url) && /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { jenis: 'video', src: url };
  return null;
}

async function unduhWallpaper(btn) {
  const g = (S.publik ? S.publik.galeri : []).find(function (x) { return x.ID === btn.dataset.unduh; });
  if (!g || !g.BisaUnduh) { toast('File wallpaper belum tersedia. Silakan coba lagi nanti.', 'gagal'); return; }
  tombolMemuat(btn, true);
  try {
    const f = await panggil('unduhWallpaper', g.ID);
    const biner = atob(f.base64);
    const bytes = new Uint8Array(biner.length);
    for (let i = 0; i < biner.length; i++) bytes[i] = biner.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = f.nama;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast('Wallpaper diunduh: ' + f.nama, 'sukses');
  } catch (err) { gagal(err); }
  finally { tombolMemuat(btn, false); }
}

function bukaVideo(id) {
  const g = (S.publik ? S.publik.galeri : []).find(function (x) { return x.ID === id; });
  if (!g) return;
  const v = embedVideo(g.LinkURL);
  if (!v) { toast('Link video belum diisi atau formatnya tidak didukung.', 'gagal'); return; }
  $('#video-isi').innerHTML = v.jenis === 'iframe'
    ? '<iframe src="' + esc(v.src) + '" title="' + esc(g.Judul) + '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>'
    : '<video src="' + esc(v.src) + '" controls autoplay playsinline></video>';
  $('#video-judul').textContent = g.Judul;
  bukaModal('video-modal');
}
// ===== AKHIR BLOK: LIGHTBOX_VIDEO =====


// ===== BLOK: H2_JADWAL =====
function renderJadwal() {
  const semua = S.publik.jadwal.slice().sort(function (a, b) { return (b.Tanggal + b.Waktu).localeCompare(a.Tanggal + a.Waktu); });
  const bulan = [];
  semua.forEach(function (j) { const k = j.Tanggal.slice(0, 7); if (k && bulan.indexOf(k) === -1) bulan.push(k); });
  const sel = $('#filter-bulan');
  const nilai = sel.value;
  sel.innerHTML = '<option value="">Pilih Bulan</option>' + bulan.map(function (k) { return '<option value="' + k + '">' + esc(namaBulan(k)) + '</option>'; }).join('');
  sel.value = bulan.indexOf(nilai) !== -1 ? nilai : '';
  sinkronPilihBulan();

  const pilih = sel.value;
  const tampil = bulan.filter(function (k) { return !pilih || k === pilih; });
  const logo = ASET.logoPutih;
  $('#daftar-jadwal').innerHTML = tampil.length ? tampil.map(function (k) {
    const isi = semua.filter(function (j) { return j.Tanggal.slice(0, 7) === k; });
    return '<div class="grup-bulan"><h2 class="bulan-judul">' + esc(namaBulan(k)) + '</h2>' + isi.map(function (j) {
      return '<article class="jadwal-baris animasi-muncul' + (j.Status === 'Selesai' ? ' jb-selesai' : '') + '">' +
        (logo ? '<img class="jb-logo" src="' + esc(logo) + '" alt="">' : '') +
        '<div class="jb-info"><span>' + esc(j.Lokasi) + '</span><span>' + esc(tglPanjang(j.Tanggal)) + '</span></div>' +
        '<span class="jb-waktu">' + esc(j.Waktu) + ' WIT</span>' +
        '<h3 class="jb-nama">' + esc(j.NamaTurnamen) + '</h3></article>';
    }).join('') + '</div>';
  }).join('') : '<p class="teks-kosong">Belum ada jadwal</p>';
  amati($('#daftar-jadwal'));
}
// ===== AKHIR BLOK: H2_JADWAL =====


// ===== BLOK: PILIH_BULAN =====
// Dropdown kustom di atas <select id="filter-bulan"> (select tetap jadi sumber nilai & event "change").
function sinkronPilihBulan() {
  const sel = $('#filter-bulan');
  const opsi = Array.prototype.slice.call(sel.options);
  const aktif = opsi[sel.selectedIndex] || opsi[0];
  $('#pb-label').textContent = aktif ? aktif.textContent : 'Pilih Bulan';
  $('#pb-daftar').innerHTML = opsi.map(function (o, i) {
    return '<li class="pb-opsi" role="option" id="pb-opsi-' + i + '" data-nilai="' + esc(o.value) + '" aria-selected="' + (o.value === sel.value ? 'true' : 'false') + '">' +
      '<span>' + esc(o.textContent) + '</span>' + ikon('i-cek') + '</li>';
  }).join('');
}

function bukaPilihBulan(buka) {
  const daftar = $('#pb-daftar');
  daftar.hidden = !buka;
  $('#pb-tombol').setAttribute('aria-expanded', buka ? 'true' : 'false');
  if (buka) {
    const terpilih = $('.pb-opsi[aria-selected="true"]', daftar) || $('.pb-opsi', daftar);
    sorotPilihBulan(terpilih);
  }
}

function sorotPilihBulan(el) {
  $$('#pb-daftar .pb-opsi').forEach(function (o) { o.classList.toggle('fokus', o === el); });
  if (el) { el.scrollIntoView({ block: 'nearest' }); $('#pb-tombol').setAttribute('aria-activedescendant', el.id); }
}

function pilihBulan(nilai) {
  const sel = $('#filter-bulan');
  bukaPilihBulan(false);
  $('#pb-tombol').focus();
  if (sel.value === nilai) return;
  sel.value = nilai;
  sel.dispatchEvent(new Event('change'));
}

function pasangPilihBulan() {
  const tombol = $('#pb-tombol');
  tombol.addEventListener('click', function () { bukaPilihBulan($('#pb-daftar').hidden); });
  $('#pb-daftar').addEventListener('click', function (e) {
    const o = e.target.closest('.pb-opsi');
    if (o) pilihBulan(o.dataset.nilai);
  });
  tombol.addEventListener('keydown', function (e) {
    const daftar = $('#pb-daftar');
    const semua = $$('.pb-opsi', daftar);
    const kini = $('.pb-opsi.fokus', daftar);
    const i = semua.indexOf(kini);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (daftar.hidden) { bukaPilihBulan(true); return; }
      const n = e.key === 'ArrowDown' ? Math.min(semua.length - 1, i + 1) : Math.max(0, i - 1);
      sorotPilihBulan(semua[n]);
    } else if ((e.key === 'Enter' || e.key === ' ') && !daftar.hidden && kini) {
      e.preventDefault();
      pilihBulan(kini.dataset.nilai);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      bukaPilihBulan(false);
    }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#pilih-bulan')) bukaPilihBulan(false);
  });
}
// ===== AKHIR BLOK: PILIH_BULAN =====


// ===== BLOK: H3_TIM =====
function renderTim() {
  const html = POSISI.map(function (pos) {
    const isi = S.publik.pemain.filter(function (p) { return p.Posisi === pos; });
    if (!isi.length) return '';
    return '<section class="grup-posisi"><div class="kepala-section garis-bawah"><h2 class="judul-section">' + esc(pos) + '</h2>' +
      '<span class="jumlah-pemain">' + isi.length + ' Pemain</span></div><div class="grid-4">' + isi.map(function (p) {
        return '<a class="kartu-pemain animasi-muncul" href="#pemain/' + encodeURIComponent(p.ID) + '">' +
          '<div class="pemain-foto">' + gambar(p.FotoKartu || p.FotoProfil, p.NamaLengkap) + '</div>' +
          '<div class="pemain-info"><div class="pemain-baris"><span class="pemain-nomor">' + esc(p.NomorPunggung) + '</span>' +
          '<div><p class="pemain-panggil">' + esc(p.NamaPanggilan) + '</p><h3 class="pemain-nama">' + esc(p.NamaLengkap) + '</h3></div></div>' +
          '<p class="pemain-meta">' + esc(posisiTunggal(p.Posisi)) + (p.Umur ? ' • ' + esc(p.Umur) + ' Thn' : '') + '</p>' +
          '<span class="pemain-tombol">Player Profile ' + ikon('i-kanan') + '</span></div></a>';
      }).join('') + '</div></section>';
  }).join('') + renderOfficial();
  $('#daftar-tim').innerHTML = html || '<p class="teks-kosong">Belum ada data pemain</p>';
  amati($('#daftar-tim'));
}

// Coach & Officials: kartu bukan tautan (tidak membuka halaman profil).
function renderOfficial() {
  const isi = S.publik.pemain.filter(isOfficial).sort(function (a, b) { return urutJabatan(a) - urutJabatan(b); });
  if (!isi.length) return '';
  return '<section class="grup-posisi grup-official"><div class="kepala-section garis-bawah"><h2 class="judul-section">' + esc(POSISI_OFFICIAL) + '</h2>' +
    '<span class="jumlah-pemain">' + isi.length + ' Orang</span></div><div class="grid-4">' + isi.map(function (p) {
      return '<div class="kartu-pemain kartu-official animasi-muncul">' +
        '<div class="pemain-foto">' + gambar(p.FotoKartu, p.NamaLengkap) + '</div>' +
        '<div class="pemain-info"><div class="pemain-baris">' +
        '<div><p class="pemain-panggil">' + esc(p.NamaPanggilan) + '</p><h3 class="pemain-nama">' + esc(p.NamaLengkap) + '</h3></div></div>' +
        '<p class="pemain-meta official-jabatan">' + esc(p.Jabatan || POSISI_OFFICIAL) + '</p></div></div>';
    }).join('') + '</div></section>';
}
// ===== AKHIR BLOK: H3_TIM =====


// ===== BLOK: H3_PROFIL_PEMAIN =====
function renderProfil() {
  const p = S.publik.pemain.find(function (x) { return x.ID === S.profilId; });
  if (!p || isOfficial(p)) { toast('Pemain tidak ditemukan.', 'gagal'); pergi('tim', true); return; }
  $('#profil-posisi').textContent = p.Posisi;
  $('#profil-label').textContent = p.LabelAkademi || '';
  $('#profil-label').hidden = !p.LabelAkademi;
  $('#profil-nama').textContent = p.NamaLengkap;
  $('#profil-nomor').textContent = '#' + p.NomorPunggung;

  const foto = $('#profil-foto');
  const u = urlAman(p.FotoProfil || p.FotoKartu);
  foto.hidden = !u;
  if (u) { foto.src = u; foto.alt = p.NamaLengkap; foto.dataset.lightbox = 'profil'; foto.dataset.judul = p.NamaLengkap; }
  else { foto.removeAttribute('src'); delete foto.dataset.lightbox; }

  $('#bio-tempat').textContent = p.TempatLahir ? p.TempatLahir.toUpperCase() : '-';
  $('#bio-tanggal').textContent = tglBio(p.TanggalLahir);
  $('#bio-tinggi').textContent = p.TinggiBadan ? p.TinggiBadan + ' CM' : '-';
  $('#bio-berat').textContent = p.BeratBadan ? p.BeratBadan + ' KG' : '-';

  S.dokProfil = {};
  const logo = ASET.logoPutih;
  $('#profil-dokumen').innerHTML = S.publik.jenisDokumen.map(function (j) {
    return '<button class="kartu-dokumen" type="button" data-jenis="' + esc(j.ID) + '">' +
      '<span class="kd-kunci">' + ikon('i-gembok') + 'Dokumen Privat</span>' +
      (logo ? '<img class="kd-logo" src="' + esc(logo) + '" alt="">' : '') +
      '<h3 class="kd-judul">' + esc(j.NamaDokumen) + '</h3>' +
      '<p class="kd-nama">' + esc(p.NamaLengkap) + '</p></button>';
  }).join('');
  if (S.token) muatStatusDokumenProfil(p.ID);

  const tautan = $('#profil-tautan');
  const link = urlAman(p.LinkProfilEksternal);
  $('#profil-tautan-nama').textContent = p.NamaLengkap;
  if (link) {
    tautan.href = link;
    tautan.classList.remove('tautan-nonaktif');
    tautan.removeAttribute('aria-disabled');
    tautan.title = 'Buka profil ' + p.NamaLengkap;
  } else {
    tautan.removeAttribute('href');
    tautan.classList.add('tautan-nonaktif');
    tautan.setAttribute('aria-disabled', 'true');
    tautan.removeAttribute('title');
  }
}

function muatStatusDokumenProfil(pemainId) {
  panggil('dokumenPemain', pemainId).then(function (daftar) {
    if (S.profilId !== pemainId) return;
    daftar.forEach(function (x) {
      S.dokProfil[x.JenisDokumenID] = x.dokumen;
      const kartu = $('.kartu-dokumen[data-jenis="' + x.JenisDokumenID + '"]');
      if (!kartu) return;
      const st = x.dokumen ? x.dokumen.StatusVerifikasi : 'Belum Ada';
      kartu.insertAdjacentHTML('afterbegin', '<span class="kd-status status-dok ' + kelasStatusDok(st) + '">' + esc(st) + '</span>');
    });
  }).catch(function () { /* pengguna tanpa izin dokumen: kartu tetap terkunci */ });
}

function klikKartuDokumen(jenisId) {
  if (!S.token) {
    $('#info-teks').textContent = 'Dokumen ini privat, silakan login sebagai Admin/Pengurus.';
    bukaModal('modal-info');
    return;
  }
  const dok = S.dokProfil[jenisId];
  if (dok) bukaViewer(dok.ID);
  else toast('Dokumen belum diunggah. Kelola di menu Dokumen Pemain.', 'info');
}
// ===== AKHIR BLOK: H3_PROFIL_PEMAIN =====


// ===== BLOK: H4_GALERI =====
function renderGaleri() {
  $$('.tab-link').forEach(function (b) {
    const aktif = b.dataset.tipe === S.galeriTipe;
    b.classList.toggle('aktif', aktif);
    b.setAttribute('aria-selected', aktif ? 'true' : 'false');
  });
  const isi = S.publik.galeri.filter(function (g) { return g.Tipe === S.galeriTipe; });
  $('#galeri-grid').innerHTML = isi.length ? isi.slice(0, S.galeriBatas).map(kartuGaleri).join('') : '<p class="teks-kosong">Belum ada data</p>';
  $('#btn-muat-galeri').hidden = isi.length <= S.galeriBatas;
  amati($('#galeri-grid'));
}
// ===== AKHIR BLOK: H4_GALERI =====


// ===== BLOK: H5_PRESTASI =====
function renderPrestasi() {
  const d = S.publik.prestasi;
  $('#prestasi-grid').innerHTML = d.length ? d.map(function (p) {
    return '<article class="kartu-prestasi animasi-muncul"><h3 class="kpr-peringkat">' + esc(p.Peringkat) + '</h3>' +
      '<div class="kpr-gambar">' + gambar(p.GambarTrofi, p.Peringkat + ' - ' + p.NamaKejuaraan, '', 'prestasi') + '</div>' +
      '<p class="kpr-nama">' + esc(p.NamaKejuaraan) + '</p>' + (p.Tahun ? '<p class="kpr-tahun">' + esc(p.Tahun) + '</p>' : '') + '</article>';
  }).join('') : '<p class="teks-kosong">Belum ada data prestasi</p>';
  amati($('#prestasi-grid'));
}
// ===== AKHIR BLOK: H5_PRESTASI =====


// ===== BLOK: H6_KONTAK =====
// Google reCAPTCHA v2 dipakai bila Admin sudah mengisi Site Key + Secret Key;
// selain itu memakai captcha bawaan (kode dari server).
function siapkanCaptchaKontak() {
  const site = S.publik && S.publik.recaptchaSiteKey;
  $('#recaptcha-wadah').hidden = !site;
  $('#captcha-bawaan').hidden = !!site;
  if (!site) { muatCaptchaKontak(); return; }
  if (S.recaptchaWidget !== undefined && S.recaptchaKey === site) { window.grecaptcha.reset(S.recaptchaWidget); return; }
  muatRecaptcha().then(function () {
    if (S.recaptchaWidget !== undefined && S.recaptchaKey === site) return;
    $('#recaptcha-wadah').innerHTML = '';
    S.recaptchaKey = site;
    S.recaptchaWidget = window.grecaptcha.render('recaptcha-wadah', {
      sitekey: site,
      'expired-callback': function () { toast('Verifikasi CAPTCHA kedaluwarsa. Silakan centang ulang.', 'info'); }
    });
  }).catch(function (err) {
    gagal(err);
    $('#recaptcha-wadah').hidden = true;
  });
}

function muatRecaptcha() {
  if (window.grecaptcha && window.grecaptcha.render) return Promise.resolve();
  if (S.janjiRecaptcha) return S.janjiRecaptcha;
  S.janjiRecaptcha = new Promise(function (resolve, reject) {
    window.recaptchaSiap = function () { resolve(); };
    const sc = document.createElement('script');
    sc.src = 'https://www.google.com/recaptcha/api.js?onload=recaptchaSiap&render=explicit&hl=id';
    sc.async = true;
    sc.onerror = function () { S.janjiRecaptcha = null; reject(new Error('Google reCAPTCHA gagal dimuat. Periksa koneksi internet.')); };
    document.head.appendChild(sc);
  });
  return S.janjiRecaptcha;
}

function muatCaptchaKontak() {
  const kotak = $('#kontak-captcha-gambar');
  kotak.innerHTML = '<span class="teks-memuat">Memuat...</span>';
  $('#kontak-captcha-kode').value = '';
  panggil('buatCaptcha').then(function (c) {
    S.kontakCaptchaId = c.id;
    kotak.innerHTML = c.svg;
  }).catch(function (err) { kotak.innerHTML = '<span class="teks-gagal">Gagal</span>'; gagal(err); });
}

function resetCaptchaKontak() {
  if (S.publik && S.publik.recaptchaSiteKey) { if (window.grecaptcha && S.recaptchaWidget !== undefined) window.grecaptcha.reset(S.recaptchaWidget); }
  else muatCaptchaKontak();
}

function kirimKontak(e) {
  e.preventDefault();
  const form = e.target;
  if (!cekWajib(form)) return;
  const data = Object.fromEntries(new FormData(form));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)) { form.Email.classList.add('salah'); toast('Alamat email tidak valid.', 'gagal'); return; }
  if (S.publik && S.publik.recaptchaSiteKey) {
    data.captchaToken = (window.grecaptcha && S.recaptchaWidget !== undefined) ? window.grecaptcha.getResponse(S.recaptchaWidget) : '';
    if (!data.captchaToken) { toast('Silakan centang "I\'m not a robot" terlebih dahulu.', 'gagal'); return; }
  } else {
    data.captchaId = S.kontakCaptchaId || '';
    data.captchaKode = $('#kontak-captcha-kode').value.trim();
    if (!data.captchaKode) { $('#kontak-captcha-kode').classList.add('salah'); toast('Kode captcha wajib diisi.', 'gagal'); return; }
  }
  const btn = $('#btn-kirim-pesan');
  tombolMemuat(btn, true);
  panggil('kirimPesan', data).then(function () {
    form.reset();
    toast('Pesan terkirim. Terima kasih!', 'sukses');
  }).catch(gagal).finally(function () { tombolMemuat(btn, false); resetCaptchaKontak(); });
}
// ===== AKHIR BLOK: H6_KONTAK =====


// ===== BLOK: LOGIN =====
function muatCaptcha() {
  const kotak = $('#captcha-gambar');
  kotak.innerHTML = '<span class="teks-memuat">Memuat...</span>';
  $('#login-captcha').value = '';
  panggil('buatCaptcha').then(function (c) {
    S.captchaId = c.id;
    kotak.innerHTML = c.svg;
  }).catch(function (e) { kotak.innerHTML = '<span class="teks-gagal">Gagal</span>'; gagal(e); });
}

function kirimLogin(e) {
  e.preventDefault();
  const u = $('#login-username').value.trim();
  const p = $('#login-password').value;
  const c = $('#login-captcha').value.trim();
  if (!u || !p || !c) { toast('Username, password, dan kode captcha wajib diisi.', 'gagal'); return; }
  const btn = $('#btn-login');
  tombolMemuat(btn, true);
  panggil('login', u, p, S.captchaId, c).then(function (hasil) {
    S.token = hasil.token;
    S.pengguna = hasil.pengguna;
    simpanSesi(hasil.token);
    $('#form-login').reset();
    perbaruiNavLogin();
    toast('Selamat datang, ' + hasil.pengguna.NamaLengkap + '.', 'sukses');
    pergi('admin/m1');
  }).catch(function (err) { gagal(err); muatCaptcha(); })
    .finally(function () { tombolMemuat(btn, false); });
}

function lihatPassword() {
  const inp = $('#login-password');
  const tampil = inp.type === 'password';
  inp.type = tampil ? 'text' : 'password';
  $('#btn-lihat-pw use').setAttribute('href', tampil ? '#i-mata' : '#i-mata-tutup');
  $('#btn-lihat-pw').setAttribute('aria-label', tampil ? 'Sembunyikan password' : 'Tampilkan password');
}
// ===== AKHIR BLOK: LOGIN =====


// ===== BLOK: ADMIN_CORE =====
const INFO_TABEL = {
  SliderBerita: { form: 'slider', hapus: 'hapusSlider', menu: 'm2', label: 'slide' },
  Jadwal: { form: 'jadwal', hapus: 'hapusJadwal', menu: 'm3', label: 'jadwal' },
  Pemain: { form: 'pemain', hapus: 'hapusPemain', menu: 'm4', label: 'pemain', ekstra: ' Dokumen privat dan penghargaan pemain ini juga akan dihapus.' },
  JenisDokumen: { form: 'jenis', hapus: 'hapusJenisDokumen', menu: 'm5', label: 'jenis dokumen' },
  SorotanPertandingan: { form: 'sorotan', hapus: 'hapusSorotan', menu: 'm6', label: 'sorotan', ekstra: ' Semua penghargaan di sorotan ini juga akan dihapus.' },
  PenghargaanPemain: { form: 'penghargaan', hapus: 'hapusPenghargaan', menu: 'm6', label: 'penghargaan' },
  Galeri: { form: 'galeri', hapus: 'hapusGaleri', menu: 'm7', label: 'item galeri' },
  Prestasi: { form: 'prestasi', hapus: 'hapusPrestasi', menu: 'm8', label: 'prestasi' },
  Sponsor: { form: 'sponsor', hapus: 'hapusSponsor', menu: 'm9', label: 'sponsor' },
  PesanKontak: { hapus: 'hapusPesan', menu: 'm10', label: 'pesan' },
  Pengguna: { form: 'pengguna', menu: 'm12', label: 'akun' }
};

const JUDUL_FORM = {
  slider: 'Slide', jadwal: 'Jadwal', pemain: 'Pemain', jenis: 'Jenis Dokumen', sorotan: 'Sorotan',
  penghargaan: 'Penghargaan', galeri: 'Item Galeri', prestasi: 'Prestasi', sponsor: 'Sponsor', pengguna: 'Akun'
};

const BAWAAN_FORM = {
  slider: { Aktif: 'Ya' }, jadwal: { Status: 'Akan Datang' },
  pemain: { LabelAkademi: 'ASTI AKADEMI MALUT', TimUtama: 'Tidak', Status: 'Aktif', Posisi: 'Goalkeepers' },
  jenis: { Aktif: 'Ya' }, sorotan: { Aktif: 'Ya' }, galeri: { Aktif: 'Ya', Tipe: 'Photo' },
  sponsor: { Aktif: 'Ya' }, prestasi: { Peringkat: 'Juara 1' }, pengguna: { Role: 'Pengurus', Status: 'Aktif' }
};

function masukAdmin(menu) {
  if (!S.token) { pergi('login', true); return; }
  $('#situs').hidden = true;
  $('#area-admin').hidden = false;
  document.documentElement.classList.add('mode-admin');
  if (S.pengguna && S.pilihan) { tampilMenu(menu); return; }
  panggil('muatAwal').then(function (d) {
    S.pengguna = d.pengguna;
    S.pilihan = d.pilihan;
    S.maksMB = d.maksFileMB || 5;
    S.dashboard = d.dashboard;
    isiPilihan();
    terapkanPeran();
    if (d.pengguna.harusGantiPassword) bukaGantiPw(true);
    tampilMenu(menu);
  }).catch(gagal);
}

function isiPilihan() {
  $$('select[data-pilihan]').forEach(function (sel) {
    const opsi = S.pilihan[sel.dataset.pilihan] || [];
    const semua = sel.dataset.semua ? '<option value="">' + esc(sel.dataset.semua) + '</option>' : '';
    sel.innerHTML = semua + opsi.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('');
  });
}

function terapkanPeran() {
  const p = S.pengguna;
  document.body.classList.toggle('peran-pengurus', p.Role !== 'Admin');
  $$('.admin-link[data-role]').forEach(function (a) { a.hidden = a.dataset.role !== p.Role; });
  $('#admin-nama').textContent = p.NamaLengkap;
  $('#admin-role').textContent = p.Role;
}

function bolehMenu(menu) {
  const a = $('.admin-link[data-menu="' + menu + '"]');
  return !!a && !a.hidden;
}

function tampilMenu(menu) {
  if (!bolehMenu(menu)) menu = 'm1';
  if (S.wajibGantiPw) return;
  $$('.menu').forEach(function (s) { s.hidden = s.id !== menu; });
  $$('.admin-link').forEach(function (a) { a.classList.toggle('aktif', a.dataset.menu === menu); });
  const sec = document.getElementById(menu);
  $('#admin-judul').textContent = sec.dataset.judul || '';
  window.scrollTo(0, 0);
  muatMenu(menu, false);
}

function barisMemuat(id, kolom) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '<tr><td colspan="' + kolom + '"><p class="teks-memuat">Memuat...</p></td></tr>';
}

function muatTabel(tabel, paksa) {
  if (S.data[tabel] && !paksa) return Promise.resolve(S.data[tabel]);
  return panggil('ambilData', tabel).then(function (rows) { S.data[tabel] = rows; return rows; });
}

function muatMenu(menu, paksa) {
  const render = RENDER_MENU[menu];
  let janji;
  if (menu === 'm1') janji = muatDashboard(paksa);
  else if (menu === 'm2') { if (paksa || !S.data.SliderBerita) barisMemuat('tabel-m2', 6); janji = muatTabel('SliderBerita', paksa); }
  else if (menu === 'm3') { if (paksa || !S.data.Jadwal) barisMemuat('tabel-m3', 6); janji = muatTabel('Jadwal', paksa); }
  else if (menu === 'm4') { if (paksa || !S.data.Pemain) barisMemuat('tabel-m4', 9); janji = muatTabel('Pemain', paksa); }
  else if (menu === 'm5') {
    if (paksa || !S.data.matriks) { barisMemuat('tabel-jenis', 4); barisMemuat('matriks-badan', 2); }
    janji = (S.data.matriks && !paksa) ? Promise.resolve() : panggil('matriksDokumen').then(function (d) { S.data.matriks = d; });
  }
  else if (menu === 'm6') {
    if (paksa || !S.data.SorotanPertandingan) { barisMemuat('tabel-sorotan', 4); barisMemuat('tabel-penghargaan', 6); }
    janji = Promise.all([muatTabel('SorotanPertandingan', paksa), muatTabel('PenghargaanPemain', paksa), muatTabel('Pemain', paksa)]);
  }
  else if (menu === 'm7') { if (paksa || !S.data.Galeri) barisMemuat('tabel-m7', 6); janji = muatTabel('Galeri', paksa); }
  else if (menu === 'm8') { if (paksa || !S.data.Prestasi) barisMemuat('tabel-m8', 6); janji = muatTabel('Prestasi', paksa); }
  else if (menu === 'm9') { if (paksa || !S.data.Sponsor) barisMemuat('tabel-m9', 6); janji = muatTabel('Sponsor', paksa); }
  else if (menu === 'm10') { if (paksa || !S.data.PesanKontak) barisMemuat('tabel-m10', 6); janji = muatTabel('PesanKontak', paksa); }
  else if (menu === 'm11') janji = (S.data.pengaturan && !paksa) ? Promise.resolve() : panggil('ambilPengaturan').then(function (d) { S.data.pengaturan = d; });
  else if (menu === 'm12') {
    if (paksa || !S.data.Pengguna) barisMemuat('tabel-m12', 5);
    janji = (S.data.Pengguna && !paksa) ? Promise.resolve() : panggil('daftarPengguna').then(function (d) { S.data.Pengguna = d; });
  }
  return Promise.resolve(janji).then(function () { if (render) render(); }).catch(function (e) {
    $$('#' + menu + ' .teks-memuat').forEach(function (el) { el.className = 'teks-gagal'; el.textContent = 'Gagal memuat: ' + e.message; });
    gagal(e);
  });
}

function sel(label, isi, kelas) { return '<td data-label="' + esc(label) + '"' + (kelas ? ' class="' + kelas + '"' : '') + '>' + isi + '</td>'; }
function tdKosong(kolom, teks) { return '<tr><td colspan="' + kolom + '"><p class="teks-kosong">' + esc(teks || 'Belum ada data') + '</p></td></tr>'; }
function thumb(url) { const u = urlAman(url); return u ? '<img class="thumb" src="' + esc(u) + '" alt="" loading="lazy">' : '<span class="thumb-kosong">' + ikon('i-gambar') + '</span>'; }
function badgeYa(v) { return '<span class="badge-status ' + (v === 'Ya' || v === 'Aktif' ? 'badge-ya' : 'badge-tidak') + '">' + esc(v || '-') + '</span>'; }
function tombolAksi(tabel, id, opsi) {
  opsi = opsi || {};
  const kelas = opsi.adminSaja ? ' admin-saja' : '';
  let h = '<div class="aksi-tabel' + kelas + '">';
  (opsi.ekstra || []).forEach(function (x) { h += '<button class="tombol-ikon-kecil" type="button" data-aksi="' + x.aksi + '" data-tabel="' + tabel + '" data-id="' + esc(id) + '" title="' + esc(x.judul) + '" aria-label="' + esc(x.judul) + '">' + ikon(x.ikon) + '</button>'; });
  if (!opsi.tanpaUbah) h += '<button class="tombol-ikon-kecil" type="button" data-aksi="ubah" data-tabel="' + tabel + '" data-id="' + esc(id) + '" title="Ubah" aria-label="Ubah">' + ikon('i-ubah') + '</button>';
  if (!opsi.tanpaHapus) h += '<button class="tombol-ikon-kecil bahaya" type="button" data-aksi="hapus" data-tabel="' + tabel + '" data-id="' + esc(id) + '" title="Hapus" aria-label="Hapus">' + ikon('i-hapus') + '</button>';
  return h + '</div>';
}
function cocokCari(teks, q) { return !q || String(teks).toLowerCase().indexOf(q.toLowerCase()) !== -1; }
function tandaiKotor() { S.publikKotor = true; S.dashboardKotor = true; }
// ===== AKHIR BLOK: ADMIN_CORE =====


// ===== BLOK: FORM_ADMIN =====
function cekWajib(form) {
  let ok = true;
  $$('[required]', form).forEach(function (el) {
    const kosong = !String(el.value || '').trim();
    el.classList.toggle('salah', kosong);
    if (kosong && ok) {
      ok = false;
      const label = el.closest('.field') ? el.closest('.field').querySelector('.field-label') : null;
      toast((label ? label.textContent.replace(/\*.*$/, '').trim() : 'Kolom') + ' wajib diisi.', 'gagal');
      el.focus();
    }
  });
  return ok;
}

function bukaForm(nama, baris) {
  const form = document.getElementById('form-' + nama);
  $$('#modal-form .form-admin').forEach(function (f) { f.hidden = f !== form; });
  form.reset();
  $$('.salah', form).forEach(function (el) { el.classList.remove('salah'); });
  if (nama === 'penghargaan') isiPilihanPenghargaan();
  const nilai = Object.assign({}, baris ? {} : (BAWAAN_FORM[nama] || {}), baris || {});
  if (nama === 'penghargaan' && !baris) nilai.SorotanID = $('#filter-sorotan').value;
  $$('[name]', form).forEach(function (el) { el.value = nilai[el.name] !== undefined ? nilai[el.name] : ''; });
  $$('.field-gambar', form).forEach(function (f) { pratinjau(f, nilai[f.dataset.kolom]); });
  if (nama === 'galeri') aturFieldVideo();
  if (nama === 'pengguna') {
    $('#field-password-baru').hidden = !!baris;
    form.Password.required = !baris;
    form.Username.readOnly = false;
  }
  $('#modal-form-judul').textContent = (baris ? 'Ubah ' : 'Tambah ') + (JUDUL_FORM[nama] || '');
  if (nama === 'pemain') aturFieldOfficial();
  bukaModal('modal-form');
}

// Form Pemain: Posisi "Coach & Officials" menyederhanakan isian menjadi
// Nama Lengkap, Nama Panggilan, Jabatan, dan Upload Foto.
function aturFieldOfficial() {
  const form = $('#form-pemain');
  const official = form.Posisi.value === POSISI_OFFICIAL;
  form.classList.toggle('mode-official', official);
  $$('.khusus-pemain', form).forEach(function (el) { el.hidden = official; });
  $$('.khusus-official', form).forEach(function (el) { el.hidden = !official; });
  form.NomorPunggung.required = !official;
  form.Jabatan.required = official;
  $('#label-foto-pemain').textContent = official ? 'Upload Foto' : 'Foto Kartu (halaman Tim)';
  $('#modal-form-judul').textContent = $('#modal-form-judul').textContent.replace(/(Pemain|Coach & Official)$/, official ? 'Coach & Official' : 'Pemain');
}

function aturFieldVideo() {
  const form = $('#form-galeri');
  const tipe = form.Tipe.value;
  const video = tipe === 'Video', wallpaper = tipe === 'Wallpaper';
  $('#field-link-video').hidden = !(video || wallpaper);
  $('#input-link-video').required = video;
  $('#label-link-galeri').textContent = video
    ? 'Link Video * (YouTube, Google Drive, atau file .mp4)'
    : 'URL Download (link file JPG di Google Drive)';
  $('#input-link-video').placeholder = video ? 'https://www.youtube.com/watch?v=...' : 'https://drive.google.com/file/d/.../view';
  $('#label-thumbnail-galeri').textContent = wallpaper ? 'Upload Wallpaper (JPG)' : 'Thumbnail';
  $('#file-thumbnail-galeri').accept = wallpaper ? 'image/jpeg' : 'image/png,image/jpeg,image/webp';
  if (!video && !wallpaper) $('#input-link-video').value = '';
}

function pratinjau(field, url) {
  const img = $('.pratinjau-gambar img', field);
  const u = urlAman(url) || (String(url || '').indexOf('blob:') === 0 ? url : '');
  img.hidden = !u;
  if (u) img.src = u; else img.removeAttribute('src');
}

function bacaFile(file) {
  return new Promise(function (resolve, reject) {
    if (file.size > S.maksMB * 1024 * 1024) { reject(new Error('Ukuran file maksimal ' + S.maksMB + ' MB.')); return; }
    const r = new FileReader();
    r.onload = function () { resolve({ nama: file.name, mime: file.type, base64: String(r.result).split(',')[1] || '' }); };
    r.onerror = function () { reject(new Error('File gagal dibaca.')); };
    r.readAsDataURL(file);
  });
}

function upsert(tabel, baris) {
  const arr = S.data[tabel] || (S.data[tabel] = []);
  const i = arr.findIndex(function (r) { return r.ID === baris.ID; });
  if (i >= 0) arr[i] = Object.assign({}, arr[i], baris); else arr.push(baris);
}

async function simpanForm(e) {
  e.preventDefault();
  const form = e.target;
  if (!cekWajib(form)) return;
  const btn = $('button[type="submit"]', form);
  tombolMemuat(btn, true);
  try {
    if (form.id === 'form-pengguna') await simpanPenggunaForm(form);
    else if (form.id === 'form-reset') await simpanResetForm(form);
    else {
      const tabel = form.dataset.tabel;
      const data = Object.fromEntries(new FormData(form));
      if (tabel === 'Galeri' && data.Tipe !== 'Video' && data.Tipe !== 'Wallpaper') data.LinkURL = '';
      if (tabel === 'Galeri' && data.Tipe === 'Wallpaper') {
        const fw = $('#file-thumbnail-galeri').files[0];
        if (fw && fw.type !== 'image/jpeg') throw new Error('Upload Wallpaper harus berupa file JPG.');
        if (!fw && !data.Thumbnail && !data.LinkURL) throw new Error('Isi Upload Wallpaper (JPG) atau URL Download.');
      }
      if (tabel === 'Galeri' && data.Tipe === 'Video' && !embedVideo(data.LinkURL)) throw new Error('Link Video harus link YouTube, Google Drive, atau file .mp4/.webm.');
      const files = {};
      for (const inp of $$('.input-file[data-file]', form)) {
        if (inp.files && inp.files[0]) files[inp.dataset.file] = await bacaFile(inp.files[0]);
      }
      const hasil = await panggil(form.dataset.fungsi, data, Object.keys(files).length ? files : null);
      if (tabel === 'JenisDokumen') S.data.matriks = null;
      else if (tabel === 'SorotanPertandingan' && hasil.Aktif === 'Ya') {
        (S.data.SorotanPertandingan || []).forEach(function (s) { if (s.ID !== hasil.ID) s.Aktif = 'Tidak'; });
        upsert(tabel, hasil);
      } else upsert(tabel, hasil);
      if (tabel === 'Pemain') S.data.matriks = null;
      tandaiKotor();
      tutupModal('modal-form');
      toast('Data berhasil disimpan.', 'sukses');
      muatMenu(form.dataset.menu, false);
    }
  } catch (err) { gagal(err); }
  finally { tombolMemuat(btn, false); }
}

async function hapusData(tabel, id) {
  const info = INFO_TABEL[tabel];
  const ok = await konfirmasi('Hapus ' + info.label + ' ini?' + (info.ekstra || '') + ' Tindakan ini tidak bisa dibatalkan.');
  if (!ok) return;
  try {
    await panggil(info.hapus, id);
    S.data[tabel] = (S.data[tabel] || []).filter(function (r) { return r.ID !== id; });
    if (tabel === 'Pemain') { S.data.matriks = null; S.data.PenghargaanPemain = null; }
    if (tabel === 'SorotanPertandingan') S.data.PenghargaanPemain = (S.data.PenghargaanPemain || []).filter(function (x) { return x.SorotanID !== id; });
    if (tabel === 'JenisDokumen') S.data.matriks = null;
    tandaiKotor();
    toast('Data berhasil dihapus.', 'sukses');
    muatMenu(info.menu, false);
  } catch (err) { gagal(err); }
}

function cariBaris(tabel, id) {
  if (tabel === 'JenisDokumen') return (S.data.matriks ? S.data.matriks.jenis : []).find(function (r) { return r.ID === id; });
  return (S.data[tabel] || []).find(function (r) { return r.ID === id; });
}

function klikAksi(e) {
  const b = e.target.closest('[data-aksi]');
  if (!b) return;
  const aksi = b.dataset.aksi, tabel = b.dataset.tabel, id = b.dataset.id;
  if (aksi === 'ubah') { const r = cariBaris(tabel, id); if (r) bukaForm(INFO_TABEL[tabel].form, r); }
  else if (aksi === 'hapus') hapusData(tabel, id);
  else if (aksi === 'baca') bacaPesan(id);
  else if (aksi === 'tandai') tandaiPesan(id, b.dataset.status);
  else if (aksi === 'reset') bukaReset(id);
  else if (aksi === 'dok') bukaModalDokumen(b.dataset.pemain, b.dataset.jenis);
}
// ===== AKHIR BLOK: FORM_ADMIN =====


// ===== BLOK: M1_DASHBOARD =====
function muatDashboard(paksa) {
  if (S.dashboard && !paksa && !S.dashboardKotor) return Promise.resolve();
  return panggil('dashboard').then(function (d) { S.dashboard = d; S.dashboardKotor = false; });
}

function muatChart() {
  if (window.Chart) return Promise.resolve();
  if (S.janjiChart) return S.janjiChart;
  S.janjiChart = new Promise(function (resolve, reject) {
    const s = document.createElement('script');
    s.src = URL_CHART;
    s.onload = resolve;
    s.onerror = function () { S.janjiChart = null; reject(new Error('Grafik gagal dimuat. Periksa koneksi internet.')); };
    document.head.appendChild(s);
  });
  return S.janjiChart;
}

function renderM1() {
  const d = S.dashboard;
  if (!d) return;
  $('#d-pemain').textContent = d.kartu.pemainAktif;
  $('#d-jadwal').textContent = d.kartu.jadwalMendatang;
  $('#d-dokumen').textContent = d.kartu.dokumenBelumVerifikasi;
  $('#d-pesan').textContent = d.kartu.pesanBaru;
  $('#d-belum-total').textContent = d.dokumenBelumLengkap.total;
  $('#d-tanpalink-total').textContent = d.tanpaLink.total;
  $('#d-belum').innerHTML = d.dokumenBelumLengkap.daftar.length ? d.dokumenBelumLengkap.daftar.map(function (p) {
    return '<li><span class="dr-utama">#' + esc(p.NomorPunggung) + ' ' + esc(p.NamaLengkap) + '</span><span class="dr-sub">Belum ada: ' + esc(p.Kurang) + '</span></li>';
  }).join('') : '<li><span class="dr-sub">Semua dokumen lengkap</span></li>';
  $('#d-tanpalink').innerHTML = d.tanpaLink.daftar.length ? d.tanpaLink.daftar.map(function (p) {
    return '<li><span class="dr-utama">#' + esc(p.NomorPunggung) + ' ' + esc(p.NamaLengkap) + '</span></li>';
  }).join('') : '<li><span class="dr-sub">Semua pemain sudah punya link</span></li>';
  $('#d-jadwal-dekat').innerHTML = d.jadwalTerdekat.length ? d.jadwalTerdekat.map(function (j) {
    return '<li><span class="dr-utama">' + esc(j.NamaTurnamen) + '</span><span class="dr-sub">' + esc(tglPanjang(j.Tanggal)) + ' • ' + esc(j.Waktu) + ' WIT • ' + esc(j.Lokasi) + '</span></li>';
  }).join('') : '<li><span class="dr-sub">Belum ada jadwal mendatang</span></li>';

  muatChart().then(function () {
    gambarGrafik('posisi', 'bar', d.grafikPosisi, ['#E879B9', '#F4A9D3', '#DB5AA2', '#F9D5E8']);
    gambarGrafik('dokumen', 'doughnut', d.grafikDokumen, ['#1E9E5A', '#D98A00', '#C62828', '#BDB7C4']);
  }).catch(gagal);
}

function gambarGrafik(kunci, jenis, data, warna) {
  if (S.grafik[kunci]) S.grafik[kunci].destroy();
  const cs = getComputedStyle(document.documentElement);
  const warnaTeks = cs.getPropertyValue('--text-redup').trim() || '#6E6878';
  const warnaGaris = cs.getPropertyValue('--garis').trim() || '#ECE7F1';
  const warnaPermukaan = cs.getPropertyValue('--surface').trim() || '#FFFFFF';
  S.grafik[kunci] = new Chart(document.getElementById('grafik-' + kunci), {
    type: jenis,
    data: { labels: data.label, datasets: [{ data: data.nilai, backgroundColor: warna, borderRadius: jenis === 'bar' ? 6 : 0, borderWidth: jenis === 'bar' ? 0 : 3, borderColor: warnaPermukaan }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: jenis !== 'bar', position: 'bottom', labels: { color: warnaTeks, usePointStyle: true, padding: 16, font: { family: 'Montserrat' } } } },
      scales: jenis === 'bar' ? { y: { beginAtZero: true, ticks: { precision: 0, color: warnaTeks }, grid: { color: warnaGaris }, border: { display: false } }, x: { ticks: { color: warnaTeks }, grid: { display: false } } } : {}
    }
  });
}
// ===== AKHIR BLOK: M1_DASHBOARD =====


// ===== BLOK: M2_SLIDER_BERITA =====
function renderM2() {
  const d = S.data.SliderBerita || [];
  $('#tabel-m2').innerHTML = d.length ? d.map(function (r) {
    return '<tr>' + sel('Gambar', thumb(r.Gambar)) + sel('Label', esc(r.LabelKategori || '-')) + sel('Judul', esc(r.Judul)) +
      sel('Urutan', esc(r.Urutan || '-')) + sel('Aktif', badgeYa(r.Aktif)) + sel('', tombolAksi('SliderBerita', r.ID), 'kolom-aksi') + '</tr>';
  }).join('') : tdKosong(6);
}
// ===== AKHIR BLOK: M2_SLIDER_BERITA =====


// ===== BLOK: M3_JADWAL =====
function renderM3() {
  const d = S.data.Jadwal || [];
  const bulan = [];
  d.forEach(function (j) { const k = String(j.Tanggal).slice(0, 7); if (k && bulan.indexOf(k) === -1) bulan.push(k); });
  bulan.sort().reverse();
  const fb = $('#filter-m3-bulan');
  const pilihBulan = fb.value;
  fb.innerHTML = '<option value="">Semua Bulan</option>' + bulan.map(function (k) { return '<option value="' + k + '">' + esc(namaBulan(k)) + '</option>'; }).join('');
  fb.value = bulan.indexOf(pilihBulan) !== -1 ? pilihBulan : '';

  const q = $('#cari-m3').value.trim(), st = $('#filter-m3-status').value, bl = fb.value;
  const isi = d.filter(function (j) {
    return cocokCari(j.NamaTurnamen + ' ' + j.Lokasi, q) && (!st || j.Status === st) && (!bl || String(j.Tanggal).slice(0, 7) === bl);
  }).sort(function (a, b) { return (b.Tanggal + b.Waktu).localeCompare(a.Tanggal + a.Waktu); });
  const kelas = { 'Akan Datang': 'badge-info', 'Selesai': 'badge-ya', 'Ditunda': 'badge-peringatan' };
  $('#tabel-m3').innerHTML = isi.length ? isi.map(function (r) {
    return '<tr>' + sel('Tanggal', esc(tglPanjang(r.Tanggal))) + sel('Waktu', esc(r.Waktu) + ' WIT') + sel('Turnamen', esc(r.NamaTurnamen)) +
      sel('Lokasi', esc(r.Lokasi)) + sel('Status', '<span class="badge-status ' + (kelas[r.Status] || '') + '">' + esc(r.Status) + '</span>') +
      sel('', tombolAksi('Jadwal', r.ID), 'kolom-aksi') + '</tr>';
  }).join('') : tdKosong(6, d.length ? 'Tidak ada jadwal yang cocok' : 'Belum ada data');
}
// ===== AKHIR BLOK: M3_JADWAL =====


// ===== BLOK: M4_PEMAIN =====
function renderM4() {
  const d = S.data.Pemain || [];
  const q = $('#cari-m4').value.trim(), pos = $('#filter-m4-posisi').value, st = $('#filter-m4-status').value;
  const isi = d.filter(function (p) {
    return cocokCari(p.NamaLengkap + ' ' + p.NamaPanggilan + ' ' + p.NomorPunggung, q) && (!pos || p.Posisi === pos) && (!st || p.Status === st);
  }).sort(function (a, b) { return urutPosisi(a) - urutPosisi(b) || (isOfficial(a) ? urutJabatan(a) - urutJabatan(b) : 0) || (Number(a.Urutan) || 0) - (Number(b.Urutan) || 0); });
  $('#tabel-m4').innerHTML = isi.length ? isi.map(function (p) {
    if (isOfficial(p)) {
      return '<tr class="baris-official">' + sel('Foto', thumb(p.FotoKartu)) + sel('No', '-') +
        sel('Nama', esc(p.NamaLengkap)) + sel('Posisi', esc(p.Jabatan || '-') + '<small class="sub-official">' + esc(POSISI_OFFICIAL) + '</small>') +
        sel('Umur', '-') + sel('Tim Utama', '-') + sel('Link Profil', '-') +
        sel('Status', badgeYa(p.Status)) + sel('', tombolAksi('Pemain', p.ID, { adminSaja: true }), 'kolom-aksi') + '</tr>';
    }
    const link = urlAman(p.LinkProfilEksternal);
    return '<tr>' + sel('Foto', thumb(p.FotoKartu || p.FotoProfil)) + sel('No', '<strong>' + esc(p.NomorPunggung) + '</strong>') +
      sel('Nama', esc(p.NamaLengkap)) + sel('Posisi', esc(p.Posisi)) + sel('Umur', p.Umur ? esc(p.Umur) + ' thn' : '-') +
      sel('Tim Utama', badgeYa(p.TimUtama)) +
      sel('Link Profil', link ? '<a class="link-status link-ada" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + ikon('i-tautan') + 'Terisi</a>' : '<span class="link-status link-kosong">Belum diisi</span>') +
      sel('Status', badgeYa(p.Status)) + sel('', tombolAksi('Pemain', p.ID, { adminSaja: true }), 'kolom-aksi') + '</tr>';
  }).join('') : tdKosong(9, d.length ? 'Tidak ada pemain yang cocok' : 'Belum ada data');
}

function ujiLink() {
  const u = urlAman($('#input-link-profil').value.trim());
  if (!u) { toast('Isi URL yang diawali http:// atau https:// terlebih dahulu.', 'gagal'); return; }
  window.open(u, '_blank', 'noopener');
}
// ===== AKHIR BLOK: M4_PEMAIN =====


// ===== BLOK: M5_DOKUMEN_PEMAIN =====
function kelasStatusDok(st) {
  return { 'Terverifikasi': 'status-ok', 'Belum Diverifikasi': 'status-menunggu', 'Ditolak': 'status-tolak' }[st] || 'status-belum-ada';
}

function renderM5() {
  const m = S.data.matriks;
  if (!m) return;
  $('#tabel-jenis').innerHTML = m.jenis.length ? m.jenis.map(function (j) {
    return '<tr>' + sel('Nama Dokumen', esc(j.NamaDokumen)) + sel('Urutan', esc(j.Urutan || '-')) + sel('Aktif', badgeYa(j.Aktif)) +
      sel('', tombolAksi('JenisDokumen', j.ID), 'kolom-aksi admin-saja') + '</tr>';
  }).join('') : tdKosong(4);

  const jenis = m.jenis.filter(function (j) { return j.Aktif === 'Ya'; });
  $('#matriks-kepala').innerHTML = '<tr><th>Pemain</th>' + jenis.map(function (j) { return '<th>' + esc(j.NamaDokumen) + '</th>'; }).join('') + '</tr>';
  const peta = {};
  m.dokumen.forEach(function (d) { peta[d.PemainID + '|' + d.JenisDokumenID] = d; });
  const pemain = m.pemain.filter(function (p) { return p.Status === 'Aktif'; });
  $('#matriks-badan').innerHTML = pemain.length && jenis.length ? pemain.map(function (p) {
    return '<tr>' + sel('Pemain', '<span class="matriks-nama">#' + esc(p.NomorPunggung) + ' ' + esc(p.NamaLengkap) + '<small>' + esc(p.Posisi) + '</small></span>') +
      jenis.map(function (j) {
        const d = peta[p.ID + '|' + j.ID];
        const st = d ? d.StatusVerifikasi : 'Belum Ada';
        return sel(j.NamaDokumen, '<button class="sel-matriks" type="button" data-aksi="dok" data-pemain="' + esc(p.ID) + '" data-jenis="' + esc(j.ID) + '"><span class="status-dok ' + kelasStatusDok(st) + '">' + esc(st) + '</span></button>');
      }).join('') + '</tr>';
  }).join('') : tdKosong(jenis.length + 1, 'Belum ada pemain aktif atau jenis dokumen aktif');
}

function bukaModalDokumen(pemainId, jenisId) {
  const m = S.data.matriks;
  const p = m.pemain.find(function (x) { return x.ID === pemainId; });
  const j = m.jenis.find(function (x) { return x.ID === jenisId; });
  if (!p || !j) return;
  S.dokAktif = { pemainId: pemainId, jenisId: jenisId };
  isiModalDokumen();
  bukaModal('modal-dokumen');
}

function isiModalDokumen() {
  const a = S.dokAktif, m = S.data.matriks;
  const p = m.pemain.find(function (x) { return x.ID === a.pemainId; });
  const j = m.jenis.find(function (x) { return x.ID === a.jenisId; });
  const d = m.dokumen.find(function (x) { return x.PemainID === a.pemainId && x.JenisDokumenID === a.jenisId; });
  a.dok = d || null;
  $('#dok-judul').textContent = j.NamaDokumen;
  $('#dok-sub').textContent = '#' + p.NomorPunggung + ' ' + p.NamaLengkap + ' • ' + p.Posisi;
  const baris = function (l, v) { return '<div class="info-baris"><span>' + esc(l) + '</span><span>' + esc(v || '-') + '</span></div>'; };
  $('#dok-info').innerHTML = d
    ? baris('Status', d.StatusVerifikasi) + baris('Nama File', d.NamaFile) + baris('Tipe / Ukuran', d.TipeFile + ' • ' + d.UkuranKB + ' KB') +
      baris('Diunggah oleh', d.DiunggahOleh) + baris('Diperbarui', d.DiperbaruiPada) + baris('Diverifikasi oleh', d.DiverifikasiOleh) +
      baris('Tanggal Verifikasi', d.TanggalVerifikasi) + baris('Catatan', d.CatatanVerifikasi)
    : baris('Status', 'Belum Ada');
  $('#btn-dok-lihat').hidden = !d;
  $('#dok-verifikasi').hidden = !d;
  $('#btn-dok-hapus').hidden = !d;
  $('#btn-dok-unggah').innerHTML = ikon('i-unggah') + (d ? ' Ganti File' : ' Unggah');
  $('#dok-catatan').value = d ? (d.CatatanVerifikasi || '') : '';
  $('#dok-file').value = '';
}

function perbaruiDokumen(baru, hapusId) {
  const m = S.data.matriks;
  m.dokumen = m.dokumen.filter(function (x) { return x.ID !== hapusId && !(baru && x.PemainID === baru.PemainID && x.JenisDokumenID === baru.JenisDokumenID); });
  if (baru) m.dokumen.push(baru);
  tandaiKotor();
  renderM5();
  isiModalDokumen();
}

async function unggahDokumen() {
  const inp = $('#dok-file');
  if (!inp.files || !inp.files[0]) { toast('Pilih file dokumen terlebih dahulu.', 'gagal'); return; }
  const btn = $('#btn-dok-unggah');
  tombolMemuat(btn, true);
  try {
    const file = await bacaFile(inp.files[0]);
    const hasil = await panggil('unggahDokumen', S.dokAktif.pemainId, S.dokAktif.jenisId, file);
    perbaruiDokumen(hasil);
    toast('Dokumen berhasil diunggah.', 'sukses');
  } catch (err) { gagal(err); }
  finally { tombolMemuat(btn, false); }
}

async function verifikasiDokumen(status) {
  const d = S.dokAktif && S.dokAktif.dok;
  if (!d) return;
  const catatan = $('#dok-catatan').value.trim();
  if (status === 'Ditolak' && !catatan) { $('#dok-catatan').classList.add('salah'); toast('Catatan wajib diisi saat dokumen ditolak.', 'gagal'); return; }
  $('#dok-catatan').classList.remove('salah');
  const btn = status === 'Ditolak' ? $('#btn-dok-tolak') : $('#btn-dok-setujui');
  tombolMemuat(btn, true);
  try {
    const hasil = await panggil('verifikasiDokumen', d.ID, status, catatan);
    perbaruiDokumen(hasil);
    toast(status === 'Ditolak' ? 'Dokumen ditandai ditolak.' : 'Dokumen terverifikasi.', 'sukses');
  } catch (err) { gagal(err); }
  finally { tombolMemuat(btn, false); }
}

async function hapusDokumen() {
  const d = S.dokAktif && S.dokAktif.dok;
  if (!d) return;
  if (!await konfirmasi('Hapus file dokumen ini secara permanen?')) return;
  try {
    await panggil('hapusDokumen', d.ID);
    perbaruiDokumen(null, d.ID);
    toast('Dokumen dihapus.', 'sukses');
  } catch (err) { gagal(err); }
}

async function bukaViewer(dokId) {
  toast('Membuka dokumen...', 'info');
  try {
    const f = await panggil('bukaDokumen', dokId);
    const biner = atob(f.base64);
    const bytes = new Uint8Array(biner.length);
    for (let i = 0; i < biner.length; i++) bytes[i] = biner.charCodeAt(i);
    if (S.urlViewer) URL.revokeObjectURL(S.urlViewer);
    S.urlViewer = URL.createObjectURL(new Blob([bytes], { type: f.mime }));
    $('#viewer-judul').textContent = f.NamaFile;
    const unduh = $('#viewer-unduh');
    unduh.href = S.urlViewer;
    unduh.setAttribute('download', f.NamaFile);
    $('#viewer-isi').innerHTML = f.mime === 'application/pdf'
      ? '<iframe class="viewer-frame" src="' + esc(S.urlViewer) + '" title="' + esc(f.NamaFile) + '"></iframe>'
      : '<img class="viewer-img" src="' + esc(S.urlViewer) + '" alt="' + esc(f.NamaFile) + '">';
    bukaModal('modal-viewer');
  } catch (err) { gagal(err); }
}
// ===== AKHIR BLOK: M5_DOKUMEN_PEMAIN =====


// ===== BLOK: M6_SOROTAN_PERTANDINGAN =====
function renderM6() {
  const s = S.data.SorotanPertandingan || [];
  $('#tabel-sorotan').innerHTML = s.length ? s.map(function (r) {
    return '<tr>' + sel('Gambar', thumb(r.GambarTeamOfTheMatch)) + sel('Nama Turnamen', esc(r.NamaTurnamen)) + sel('Aktif', badgeYa(r.Aktif)) +
      sel('', tombolAksi('SorotanPertandingan', r.ID), 'kolom-aksi') + '</tr>';
  }).join('') : tdKosong(4);

  const fs = $('#filter-sorotan');
  const pilih = fs.value;
  fs.innerHTML = s.length ? s.map(function (r) { return '<option value="' + esc(r.ID) + '">' + esc(r.NamaTurnamen) + (r.Aktif === 'Ya' ? ' (aktif)' : '') + '</option>'; }).join('') : '<option value="">Belum ada sorotan</option>';
  const aktif = s.find(function (r) { return r.Aktif === 'Ya'; });
  fs.value = s.some(function (r) { return r.ID === pilih; }) ? pilih : (aktif ? aktif.ID : (s[0] ? s[0].ID : ''));
  $('#btn-tambah-penghargaan').disabled = !s.length;
  renderPenghargaan();
}

function renderPenghargaan() {
  const id = $('#filter-sorotan').value;
  const nama = {};
  (S.data.Pemain || []).forEach(function (p) { nama[p.ID] = p.NamaLengkap; });
  const d = (S.data.PenghargaanPemain || []).filter(function (x) { return x.SorotanID === id; })
    .sort(function (a, b) { return (Number(a.Urutan) || 0) - (Number(b.Urutan) || 0); });
  $('#tabel-penghargaan').innerHTML = d.length ? d.map(function (r) {
    return '<tr>' + sel('Foto', thumb(r.Foto)) + sel('Pemain', esc(r.NamaPemain || nama[r.PemainID] || '-')) + sel('Kategori', esc(r.Kategori || '-')) +
      sel('Gelar', '<strong>' + esc(r.Gelar) + '</strong>') + sel('Urutan', esc(r.Urutan || '-')) +
      sel('', tombolAksi('PenghargaanPemain', r.ID), 'kolom-aksi') + '</tr>';
  }).join('') : tdKosong(6, id ? 'Belum ada penghargaan di sorotan ini' : 'Tambahkan sorotan terlebih dahulu');
}

function isiPilihanPenghargaan() {
  $('#pilih-sorotan').innerHTML = (S.data.SorotanPertandingan || []).map(function (r) { return '<option value="' + esc(r.ID) + '">' + esc(r.NamaTurnamen) + '</option>'; }).join('');
  $('#pilih-pemain').innerHTML = '<option value="">Pilih pemain</option>' + (S.data.Pemain || []).filter(function (p) { return p.Status === 'Aktif' && !isOfficial(p); })
    .map(function (p) { return '<option value="' + esc(p.ID) + '">#' + esc(p.NomorPunggung) + ' ' + esc(p.NamaLengkap) + '</option>'; }).join('');
}
// ===== AKHIR BLOK: M6_SOROTAN_PERTANDINGAN =====


// ===== BLOK: M7_GALERI =====
function renderM7() {
  const d = S.data.Galeri || [];
  const t = $('#filter-m7-tipe').value;
  const isi = d.filter(function (g) { return !t || g.Tipe === t; })
    .sort(function (a, b) { return String(b.TanggalKegiatan + b.Dibuat).localeCompare(String(a.TanggalKegiatan + a.Dibuat)); });
  $('#tabel-m7').innerHTML = isi.length ? isi.map(function (r) {
    return '<tr>' + sel('Thumbnail', thumb(r.Thumbnail)) + sel('Tipe', '<span class="badge-status badge-info">' + esc(r.Tipe) + '</span>') + sel('Judul', esc(r.Judul)) +
      sel('Tanggal', r.TanggalKegiatan ? esc(tglSingkat(r.TanggalKegiatan)) : '-') + sel('Aktif', badgeYa(r.Aktif)) +
      sel('', tombolAksi('Galeri', r.ID), 'kolom-aksi') + '</tr>';
  }).join('') : tdKosong(6, d.length ? 'Tidak ada item untuk tipe ini' : 'Belum ada data');
}
// ===== AKHIR BLOK: M7_GALERI =====


// ===== BLOK: M8_PRESTASI =====
function renderM8() {
  const d = S.data.Prestasi || [];
  $('#tabel-m8').innerHTML = d.length ? d.map(function (r) {
    return '<tr>' + sel('Trofi', thumb(r.GambarTrofi)) + sel('Peringkat', '<strong>' + esc(r.Peringkat) + '</strong>') + sel('Kejuaraan', esc(r.NamaKejuaraan)) +
      sel('Tahun', esc(r.Tahun || '-')) + sel('Urutan', esc(r.Urutan || '-')) + sel('', tombolAksi('Prestasi', r.ID), 'kolom-aksi') + '</tr>';
  }).join('') : tdKosong(6);
}
// ===== AKHIR BLOK: M8_PRESTASI =====


// ===== BLOK: M9_SPONSOR =====
function renderM9() {
  const d = S.data.Sponsor || [];
  $('#tabel-m9').innerHTML = d.length ? d.map(function (r) {
    const link = urlAman(r.LinkURL);
    return '<tr>' + sel('Logo', thumb(r.Logo)) + sel('Nama Sponsor', esc(r.NamaSponsor)) +
      sel('Link', link ? '<a class="link-status link-ada" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + ikon('i-tautan') + 'Buka</a>' : '<span class="link-status link-kosong">-</span>') +
      sel('Urutan', esc(r.Urutan || '-')) + sel('Aktif', badgeYa(r.Aktif)) + sel('', tombolAksi('Sponsor', r.ID), 'kolom-aksi') + '</tr>';
  }).join('') : tdKosong(6);
}
// ===== AKHIR BLOK: M9_SPONSOR =====


// ===== BLOK: M10_PESAN_KONTAK =====
function renderM10() {
  const d = S.data.PesanKontak || [];
  const q = $('#cari-m10').value.trim(), st = $('#filter-m10-status').value;
  const isi = d.filter(function (p) { return cocokCari(p.NamaLengkap + ' ' + p.Email + ' ' + p.Subjek, q) && (!st || p.Status === st); })
    .sort(function (a, b) { return String(b.Dibuat).localeCompare(String(a.Dibuat)); });
  $('#tabel-m10').innerHTML = isi.length ? isi.map(function (r) {
    const baru = r.Status === 'Baru';
    return '<tr' + (baru ? ' class="baris-baru"' : '') + '>' + sel('Tanggal', esc(String(r.Dibuat).slice(0, 16))) + sel('Nama', esc(r.NamaLengkap)) +
      sel('Email', esc(r.Email)) + sel('Subjek', esc(r.Subjek)) +
      sel('Status', '<span class="badge-status ' + (baru ? 'badge-info' : 'badge-tidak') + '">' + esc(r.Status) + '</span>') +
      sel('', tombolAksi('PesanKontak', r.ID, {
        tanpaUbah: true,
        ekstra: [
          { aksi: 'baca', ikon: 'i-mata', judul: 'Baca pesan' },
          { aksi: 'tandai', ikon: baru ? 'i-cek' : 'i-surat', judul: baru ? 'Tandai sudah dibaca' : 'Tandai belum dibaca' }
        ]
      }).replace('data-aksi="tandai"', 'data-aksi="tandai" data-status="' + (baru ? 'Sudah Dibaca' : 'Baru') + '"'), 'kolom-aksi') + '</tr>';
  }).join('') : tdKosong(6, d.length ? 'Tidak ada pesan yang cocok' : 'Belum ada pesan');
}

function bacaPesan(id) {
  const r = (S.data.PesanKontak || []).find(function (x) { return x.ID === id; });
  if (!r) return;
  $('#pesan-subjek').textContent = r.Subjek;
  $('#pesan-dari').textContent = r.NamaLengkap + ' • ' + r.Email + ' • ' + String(r.Dibuat).slice(0, 16);
  $('#pesan-isi').textContent = r.Pesan;
  $('#pesan-balas').target = '_blank';
  $('#pesan-balas').href = 'mailto:' + encodeURIComponent(r.Email) + '?subject=' + encodeURIComponent('Re: ' + r.Subjek);
  bukaModal('modal-pesan');
  if (r.Status === 'Baru') tandaiPesan(id, 'Sudah Dibaca', true);
}

function tandaiPesan(id, status, diam) {
  panggil('tandaiPesan', id, status).then(function (hasil) {
    upsert('PesanKontak', hasil);
    S.dashboardKotor = true;
    renderM10();
    if (!diam) toast('Status pesan diperbarui.', 'sukses');
  }).catch(gagal);
}
// ===== AKHIR BLOK: M10_PESAN_KONTAK =====


// ===== BLOK: M11_PENGATURAN =====
function renderM11() {
  const p = S.data.pengaturan || {};
  const form = $('#form-pengaturan');
  $$('[name]', form).forEach(function (el) { el.value = p[el.name] || ''; });
  $('#input-recaptcha-secret').value = '';
  $('#status-recaptcha').textContent = p.RecaptchaSiteKey && p.RecaptchaSecretTersimpan
    ? 'Google reCAPTCHA aktif di halaman Kontak Kami. Secret Key tersimpan aman di server (tidak ditampilkan).'
    : 'Google reCAPTCHA belum aktif: Kontak Kami memakai captcha kode bawaan. Isi Site Key dan Secret Key untuk mengaktifkan.';
}

function simpanPengaturan(e) {
  e.preventDefault();
  const btn = $('#btn-simpan-pengaturan');
  tombolMemuat(btn, true);
  panggil('simpanPengaturan', Object.fromEntries(new FormData(e.target))).then(function (p) {
    S.data.pengaturan = p;
    S.publikKotor = true;
    renderM11();
    toast('Pengaturan tersimpan.', 'sukses');
  }).catch(gagal).finally(function () { tombolMemuat(btn, false); });
}
// ===== AKHIR BLOK: M11_PENGATURAN =====


// ===== BLOK: M12_PENGGUNA =====
function renderM12() {
  const d = S.data.Pengguna || [];
  $('#tabel-m12').innerHTML = d.length ? d.map(function (u) {
    return '<tr>' + sel('Username', '<strong>' + esc(u.Username) + '</strong>') + sel('Nama Lengkap', esc(u.NamaLengkap)) +
      sel('Role', '<span class="badge-status badge-info">' + esc(u.Role) + '</span>') + sel('Status', badgeYa(u.Status)) +
      sel('', tombolAksi('Pengguna', u.ID, { tanpaHapus: true, ekstra: [{ aksi: 'reset', ikon: 'i-gembok', judul: 'Reset password' }] }), 'kolom-aksi') + '</tr>';
  }).join('') : tdKosong(5);
}

async function simpanPenggunaForm(form) {
  const data = Object.fromEntries(new FormData(form));
  if (!data.ID && (!data.Password || data.Password.length < 8)) throw new Error('Password awal minimal 8 karakter.');
  const hasil = await panggil('simpanPengguna', data);
  upsert('Pengguna', hasil);
  tutupModal('modal-form');
  renderM12();
  toast('Akun tersimpan.', 'sukses');
}

function bukaReset(id) {
  const u = (S.data.Pengguna || []).find(function (x) { return x.ID === id; });
  if (!u) return;
  const form = $('#form-reset');
  $$('#modal-form .form-admin').forEach(function (f) { f.hidden = f !== form; });
  form.reset();
  form.ID.value = id;
  $('#reset-untuk').textContent = 'Reset password untuk ' + u.NamaLengkap + ' (' + u.Username + '). Pengguna wajib menggantinya saat login berikutnya.';
  $('#modal-form-judul').textContent = 'Reset Password';
  bukaModal('modal-form');
}

async function simpanResetForm(form) {
  const hasil = await panggil('resetPassword', form.ID.value, form.Password.value);
  upsert('Pengguna', hasil);
  tutupModal('modal-form');
  toast('Password berhasil direset.', 'sukses');
}
// ===== AKHIR BLOK: M12_PENGGUNA =====


// ===== BLOK: AKUN =====
function bukaGantiPw(wajib) {
  S.wajibGantiPw = !!wajib;
  $('#form-gantipw').reset();
  $('#btn-gantipw-tutup').hidden = !!wajib;
  $('#gantipw-ket').textContent = wajib
    ? 'Demi keamanan, ganti password awal Anda sebelum memakai dashboard.'
    : 'Masukkan password lama dan password baru.';
  bukaModal('modal-gantipw');
}

function kirimGantiPw(e) {
  e.preventDefault();
  const f = e.target;
  if (!cekWajib(f)) return;
  if (f.baru.value !== f.ulang.value) { f.ulang.classList.add('salah'); toast('Ulangi password baru tidak sama.', 'gagal'); return; }
  const btn = $('button[type="submit"]', f);
  tombolMemuat(btn, true);
  panggil('gantiPassword', f.lama.value, f.baru.value).then(function (p) {
    const wasWajib = S.wajibGantiPw;
    S.pengguna = p;
    S.wajibGantiPw = false;
    tutupModal('modal-gantipw');
    toast('Password berhasil diganti.', 'sukses');
    if (wasWajib) { S.dashboard = null; tampilMenu(S.hash.split('/')[1] || 'm1'); }
  }).catch(gagal).finally(function () { tombolMemuat(btn, false); });
}

function keluar() {
  const t = S.token;
  S.token = ''; S.pengguna = null; S.pilihan = null; S.data = {}; S.dashboard = null; S.wajibGantiPw = false;
  simpanSesi('');
  document.body.classList.remove('peran-pengurus');
  perbaruiNavLogin();
  if (t) kirimKeApi('logout', [t]).catch(function () { /* sesi tetap dihapus di browser */ });
  toast('Anda telah keluar.', 'info');
  pergi('beranda');
}
// ===== AKHIR BLOK: AKUN =====


// ===== BLOK: INIT =====
const RENDER_MENU = {
  m1: renderM1, m2: renderM2, m3: renderM3, m4: renderM4, m5: renderM5, m6: renderM6,
  m7: renderM7, m8: renderM8, m9: renderM9, m10: renderM10, m11: renderM11, m12: renderM12
};

function pasangEvent() {

  $('#btn-burger').addEventListener('click', function () {
    const h = $('#situs-header');
    const buka = !h.classList.contains('nav-terbuka');
    h.classList.toggle('nav-terbuka', buka);
    this.setAttribute('aria-expanded', buka ? 'true' : 'false');
  });

  document.addEventListener('click', function (e) {
    const tab = e.target.closest('[data-tab]');
    if (tab) { S.galeriTipe = tab.dataset.tab; S.galeriBatas = 6; if (S.hash === 'galeri') renderHal('galeri'); }
    const tutup = e.target.closest('[data-tutup]');
    if (tutup) { const m = tutup.closest('.modal'); if (m) tutupModal(m.id); }
    const tambah = e.target.closest('[data-form]');
    if (tambah && !tambah.disabled) bukaForm(tambah.dataset.form, null);
    const muat = e.target.closest('[data-muat]');
    if (muat) {
      if (muat.dataset.muat === 'm1') S.dashboardKotor = true;
      muatMenu(muat.dataset.muat, true);
    }
    const kartuDok = e.target.closest('.kartu-dokumen');
    if (kartuDok) klikKartuDokumen(kartuDok.dataset.jenis);
    const tombolTema = e.target.closest('[data-tema-toggle]');
    if (tombolTema) { gantiTema(); return; }
    klikAksi(e);
    const img = e.target.closest('img[data-lightbox]');
    if (img && !e.target.closest('.modal')) { e.preventDefault(); bukaLightbox(img); return; }
    const unduh = e.target.closest('[data-unduh]');
    if (unduh) { e.preventDefault(); if (!unduh.disabled) unduhWallpaper(unduh); return; }
    const putar = e.target.closest('[data-video]');
    if (putar) { e.preventDefault(); bukaVideo(putar.dataset.video); return; }
    klikTautan(e);
  });

  // Popup hanya tertutup lewat tombol Batal / ikon X (atribut data-tutup); klik di luar popup tidak menutup.
  document.addEventListener('keydown', function (e) {
    if (!$('#lightbox').hidden && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) geserLightbox(e.key === 'ArrowLeft' ? -1 : 1);
  });
  $('#lb-prev').addEventListener('click', function () { geserLightbox(-1); });
  $('#lb-next').addEventListener('click', function () { geserLightbox(1); });
  let sentuhX = null;
  $('#lightbox').addEventListener('touchstart', function (e) { sentuhX = e.touches[0].clientX; }, { passive: true });
  $('#lightbox').addEventListener('touchend', function (e) {
    if (sentuhX === null) return;
    const dx = e.changedTouches[0].clientX - sentuhX;
    if (Math.abs(dx) > 50) geserLightbox(dx > 0 ? -1 : 1);
    sentuhX = null;
  });
  $('#form-galeri [name="Tipe"]').addEventListener('change', aturFieldVideo);
  $('#form-pemain [name="Posisi"]').addEventListener('change', aturFieldOfficial);

  $('#hero-prev').addEventListener('click', function () { geserHero(-1, true); });
  $('#hero-next').addEventListener('click', function () { geserHero(1, true); });
  $('#jadwal-prev').addEventListener('click', function () { geserCarousel('beranda-jadwal', -1); });
  $('#jadwal-next').addEventListener('click', function () { geserCarousel('beranda-jadwal', 1); });
  $('#tim-prev').addEventListener('click', function () { geserCarousel('beranda-tim', -1); });
  $('#tim-next').addEventListener('click', function () { geserCarousel('beranda-tim', 1); });

  $('#filter-bulan').addEventListener('change', renderJadwal);
  pasangPilihBulan();
  $$('.tab-link').forEach(function (b) {
    b.addEventListener('click', function () { S.galeriTipe = b.dataset.tipe; S.galeriBatas = 6; renderGaleri(); });
  });
  $('#btn-muat-galeri').addEventListener('click', function () { S.galeriBatas += 6; renderGaleri(); });
  $('#form-kontak').addEventListener('submit', kirimKontak);

  $('#form-login').addEventListener('submit', kirimLogin);
  $('#btn-captcha').addEventListener('click', muatCaptcha);
  $('#btn-lihat-pw').addEventListener('click', lihatPassword);
  $('#btn-lupa').addEventListener('click', function () { $('#login-info').hidden = !$('#login-info').hidden; });

  $$('#modal-form .form-admin').forEach(function (f) { f.addEventListener('submit', simpanForm); });
  $$('.input-file[data-file]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      const field = inp.closest('.field-gambar');
      if (inp.files && inp.files[0]) pratinjau(field, URL.createObjectURL(inp.files[0]));
    });
  });
  $$('.field-gambar input[type="url"]').forEach(function (inp) {
    inp.addEventListener('change', function () { pratinjau(inp.closest('.field-gambar'), inp.value.trim()); });
  });
  $$('input, textarea, select').forEach(function (el) { el.addEventListener('input', function () { el.classList.remove('salah'); }); });
  $('#btn-uji-link').addEventListener('click', ujiLink);
  $('#btn-kontak-captcha').addEventListener('click', muatCaptchaKontak);

  const cariM3 = jeda(renderM3), cariM4 = jeda(renderM4), cariM10 = jeda(renderM10);
  $('#cari-m3').addEventListener('input', cariM3);
  $('#filter-m3-bulan').addEventListener('change', renderM3);
  $('#filter-m3-status').addEventListener('change', renderM3);
  $('#cari-m4').addEventListener('input', cariM4);
  $('#filter-m4-posisi').addEventListener('change', renderM4);
  $('#filter-m4-status').addEventListener('change', renderM4);
  $('#filter-sorotan').addEventListener('change', renderPenghargaan);
  $('#filter-m7-tipe').addEventListener('change', renderM7);
  $('#cari-m10').addEventListener('input', cariM10);
  $('#filter-m10-status').addEventListener('change', renderM10);

  $('#btn-dok-lihat').addEventListener('click', function () { if (S.dokAktif && S.dokAktif.dok) bukaViewer(S.dokAktif.dok.ID); });
  $('#btn-dok-unggah').addEventListener('click', unggahDokumen);
  $('#btn-dok-setujui').addEventListener('click', function () { verifikasiDokumen('Terverifikasi'); });
  $('#btn-dok-tolak').addEventListener('click', function () { verifikasiDokumen('Ditolak'); });
  $('#btn-dok-hapus').addEventListener('click', hapusDokumen);

  $('#form-pengaturan').addEventListener('submit', simpanPengaturan);
  $('#form-gantipw').addEventListener('submit', kirimGantiPw);
  $('#btn-ganti-pw').addEventListener('click', function () { bukaGantiPw(false); });
  $('#btn-logout').addEventListener('click', keluar);
  $('#btn-logout-hp').addEventListener('click', keluar);
}

// ===== BLOK: TEMA =====
// Light / Dark / Sistem. Preferensi disimpan di localStorage (per perangkat).
const URUTAN_TEMA = ['sistem', 'terang', 'gelap'];
const LABEL_TEMA = { sistem: 'Sistem (ikuti perangkat)', terang: 'Terang', gelap: 'Gelap' };
const mediaGelap = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function prefTema() {
  let p = 'sistem';
  try { p = localStorage.getItem('astiTema') || 'sistem'; } catch (e) { p = 'sistem'; }
  return URUTAN_TEMA.indexOf(p) === -1 ? 'sistem' : p;
}

function terapkanTema(pref) {
  const gelap = pref === 'gelap' || (pref === 'sistem' && !!mediaGelap && mediaGelap.matches);
  const root = document.documentElement;
  root.setAttribute('data-tema', gelap ? 'gelap' : 'terang');
  root.setAttribute('data-pref-tema', pref);
  $$('[data-tema-toggle]').forEach(function (b) {
    b.title = 'Tema: ' + LABEL_TEMA[pref];
    b.setAttribute('aria-label', 'Ganti tema (sekarang: ' + LABEL_TEMA[pref] + ')');
  });
  if (S.dashboard && window.Chart && !$('#area-admin').hidden && !$('#m1').hidden) renderM1();
}

function gantiTema() {
  const baru = URUTAN_TEMA[(URUTAN_TEMA.indexOf(prefTema()) + 1) % URUTAN_TEMA.length];
  try { localStorage.setItem('astiTema', baru); } catch (e) { /* penyimpanan tidak tersedia: tema berlaku sesi ini */ }
  terapkanTema(baru);
  toast('Tema: ' + LABEL_TEMA[baru], 'info');
}

function pasangTema() {
  terapkanTema(prefTema());
  if (!mediaGelap) return;
  const ikuti = function () { if (prefTema() === 'sistem') terapkanTema('sistem'); };
  if (mediaGelap.addEventListener) mediaGelap.addEventListener('change', ikuti);
  else if (mediaGelap.addListener) mediaGelap.addListener(ikuti);
}
// ===== AKHIR BLOK: TEMA =====

function mulai() {
  pasangTema();
  pasangEvent();
  pasangAset(ASET);
  perbaruiNavLogin();
  amati();
  muatDataPublik();
  S.hash = location.hash.slice(1) || 'beranda';
  const ikutiHash = function () {
    const h = location.hash.slice(1) || 'beranda';
    if (h === S.hash) return;
    S.hash = h;
    rute();
  };
  window.addEventListener('hashchange', ikutiHash);
  window.addEventListener('popstate', ikutiHash);
  rute();
}

mulai();
// ===== AKHIR BLOK: INIT =====
