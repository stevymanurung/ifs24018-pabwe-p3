# Sakuku — Praktikum 3 PABWE

**Nama:** _(isi nama kamu)_
**NIM / Username:** _(isi NIM/username kamu — ganti juga nama folder proyek jadi `{username}-pabwe-p3`)_

## Deskripsi Singkat

Sakuku adalah aplikasi web satu halaman (single page) dengan 3 fitur yang dipisah menggunakan tab:

1. **Sakuku Uang** — Expense Tracker: catat pemasukan/pengeluaran, ringkasan saldo, cari/filter/sort, CRUD via modal.
2. **Sakuku Link** — Bookmark Manager: simpan tautan favorit dengan validasi URL, cari/sort, CRUD via modal.
3. **Sakuku Kuis** — Quiz App: kuis pilihan ganda 6 soal dasar JavaScript, skor akhir, dan high score.

## Teknologi

- HTML5 semantic
- Tailwind CSS (CDN)
- Google Fonts (Poppins & Inter)
- Tabler Icons
- JavaScript murni (vanilla JS) — tanpa framework, tanpa backend
- `localStorage` untuk persistensi data (key terpisah per fitur):
  - `sakuku-active-tab`
  - `sakuku-expense-data`
  - `sakuku-bookmark-data`
  - `sakuku-quiz-highscore`

## Cara Menjalankan

Cukup buka `index.html` langsung di browser — tidak perlu server atau instalasi apa pun.

## Struktur Folder

```
{username}-pabwe-p3/
├── index.html
├── assets/
│   ├── script.js
│   └── img/        (opsional)
└── README.md
```
