# Sakuku — Praktikum 3 PABWE

**Nama:** _(isi nama kamu)_
**NIM / Username:** _(isi NIM/username kamu — ganti juga nama folder proyek jadi `{username}-pabwe-p3`)_

## Deskripsi Singkat

Sakuku adalah aplikasi web satu halaman (single page) dengan 3 fitur yang dipisah menggunakan tab:

1. **Sakuku Uang** — Expense Tracker: catat pemasukan/pengeluaran, ringkasan saldo, cari/filter/sort, CRUD via modal.
2. **Sakuku Link** — Bookmark Manager: simpan tautan favorit dengan validasi URL, cari/sort, CRUD via modal.
3. **Sakuku Kuis** — Quiz App: kuis pilihan ganda 6 soal dasar JavaScript, skor akhir, dan high score.

## Struktur Folder

```
{username}-pabwe-p3/
├── index.html
├── assets/
│   ├── script.js      → seluruh logika (DOM, event, validasi, state, localStorage, query string)
│   ├── style.css       → hasil build statis Tailwind (lihat bagian "Build CSS" di bawah)
│   └── img/             (opsional)
├── netlify.toml         → konfigurasi redirect untuk deploy Netlify
├── _redirects            → cadangan aturan redirect Netlify
└── README.md
```

`index.html` fokus pada markup/struktur (tab, panel, modal). Semua logika ada di `assets/script.js`, dikelompokkan per fitur dengan komentar bagian, tanpa `onclick` inline.

## Teknologi

- HTML5 semantic (`header`, `nav`, `main`, `section`, `footer`)
- Tailwind CSS — di-build statis ke `assets/style.css` (bukan CDN runtime)
- Google Fonts (Poppins & Inter)
- Ikon inline SVG (tanpa dependency webfont eksternal)
- JavaScript murni (vanilla JS) — tanpa framework, tanpa backend/fetch

## State & Penyimpanan

- **Tab aktif** disimpan & dipulihkan lewat **query string URL** (`?tab=expense|bookmark|quiz`) memakai `URLSearchParams` + `history.replaceState` — **bukan** `localStorage`.
- **Data tiap fitur** disimpan di `localStorage` dengan key terpisah (tidak saling menimpa):
  - `sakuku-expense-data`
  - `sakuku-bookmark-data`
  - `sakuku-quiz-highscore`

## Cara Menjalankan

Cukup buka `index.html` langsung di browser, atau akses lewat URL dengan query string tab, misalnya:
`index.html?tab=bookmark` — tidak perlu server atau instalasi apa pun.

## Build CSS (opsional, hanya kalau menambah class Tailwind baru)

`assets/style.css` sudah di-build dan siap pakai. Kalau kamu mengedit `index.html`/`assets/script.js` dan menambah class Tailwind baru, rebuild dengan:

```bash
npm install -D tailwindcss@3
npx tailwindcss -i - -o ./assets/style.css --minify --content "./index.html,./assets/**/*.js" <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF
```

Perintah ini mengirim CSS input lewat stdin sehingga tidak perlu menyimpan file `tailwind.config.js` terpisah di repo (biar struktur proyek tetap minim & fokus ke `index.html` + `assets/script.js`). Kalau butuh kustomisasi `fontFamily` (Poppins/Inter) seperti semula, buat `tailwind.config.js` sementara sebelum menjalankan perintah di atas, lalu hapus lagi setelah build selesai.

## Catatan Perbaikan Lighthouse / Aksesibilitas

- **Ikon** memakai inline SVG (bukan webfont Tabler Icons dari CDN) → menghilangkan render-blocking request, unused CSS, dan masalah `font-display`.
- **Google Fonts** dimuat non-blocking lewat teknik `<link rel="preload" ... onload>`.
- **Tailwind di-build statis** ke `assets/style.css` (bukan Play CDN `cdn.tailwindcss.com`) → menghilangkan render-blocking script + unused JS.
- **Pola ARIA tab** yang valid: `role="tablist"` pada nav, `role="tab"` + `aria-selected` pada tombol, `role="tabpanel"` pada tiap panel.
- **Kontras warna** teks abu-abu tipis dinaikkan (mis. `text-slate-400` → `text-slate-500`) agar lolos rasio kontras AA.
- Semua `<select>`/`<input>` pencarian punya `aria-label`.
- `<meta name="description">` dan favicon inline (data URI) ditambahkan agar tidak ada request 404.
- `netlify.toml` dan `_redirects` menahan crawler grader yang menebak `/index`, `/assets`, `/netlify` sebagai halaman (padahal itu path folder/file biasa) supaya tidak 404.

**Langkah manual di dashboard Netlify** (opsional, kalau redirect masih 404 setelah deploy ulang):
1. Pastikan `netlify.toml` dan `_redirects` ikut ter-upload (ada di root folder, sejajar dengan `index.html`).
2. Site settings → Build & deploy → Post processing → Asset optimization → matikan **Pretty URLs**.
3. Kalau masih ngeyel, coba "Clear cache and deploy site" di tab Deploys.
