/**
 * Sakuku — Praktikum 3 PABWE
 * Fitur: Tab switcher, Expense Tracker, Bookmark Manager, Quiz App
 * Semua data disimpan di localStorage dengan key terpisah per fitur.
 *
 * Catatan performa/aksesibilitas:
 * - Ikon dibuat sebagai inline SVG (fungsi iconSVG) agar tidak bergantung pada
 *   webfont ikon eksternal (menghindari render-blocking request & unused CSS).
 * - Tab memakai pola ARIA tablist/tab/tabpanel yang valid (lihat switchTab()).
 */

/* ========================================================= */
/* ================== UTILITAS UMUM =========================*/
/* ========================================================= */

/** Ambil satu elemen; lempar error jika tidak ada (membantu debug DOM) */
function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Elemen tidak ditemukan: ${selector}`);
  return el;
}

/** Ambil banyak elemen sekaligus */
function $all(selector) {
  return document.querySelectorAll(selector);
}

/** Format angka menjadi format Rupiah sederhana (Rp1.000.000) */
function formatRupiah(number) {
  return "Rp" + Number(number).toLocaleString("id-ID");
}

/** Buat id unik sederhana (fallback jika crypto.randomUUID tidak tersedia) */
function makeId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

/** Tampilkan modal (pakai flex agar konten ter-center) */
function openModal(modal) {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

/** Sembunyikan modal */
function closeModal(modal) {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

/**
 * Kumpulan path ikon (gaya stroke, mirip Feather/Tabler) dipakai untuk ikon
 * yang dibuat secara dinamis lewat JavaScript, supaya tidak perlu memuat
 * font ikon eksternal untuk elemen yang di-render ulang (tombol Ubah/Hapus).
 */
const ICON_PATHS = {
  pencil: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>',
  trash:
    '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>',
};

/** Buat markup inline SVG untuk ikon dinamis (dipakai lewat innerHTML) */
function iconSVG(name, cls = "w-4 h-4") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${
    ICON_PATHS[name] || ""
  }</svg>`;
}

/* ========================================================= */
/* ================== TAB SWITCHER ===========================*/
/* ========================================================= */

const VALID_TABS = ["expense", "bookmark", "quiz"];
const tabButtons = $all(".tab-btn");
const panels = {
  expense: $("#panel-expense"),
  bookmark: $("#panel-bookmark"),
  quiz: $("#panel-quiz"),
};

/** Baca tab aktif dari query string (?tab=expense|bookmark|quiz), default "expense" */
function getTabFromQueryString() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  return VALID_TABS.includes(tab) ? tab : "expense";
}

/** Tulis tab aktif ke query string tanpa reload/menambah entri history baru */
function setTabInQueryString(name) {
  const params = new URLSearchParams(window.location.search);
  params.set("tab", name);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  history.replaceState(null, "", newUrl);
}

/**
 * Ganti tab aktif: sembunyikan panel lain, update atribut ARIA tab yang valid
 * (role="tab" pada tombol mendukung aria-selected), lalu simpan ke query string URL.
 */
function switchTab(name) {
  if (!VALID_TABS.includes(name)) name = "expense";

  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== name);
  });

  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.setAttribute("aria-selected", String(active));
    btn.setAttribute("tabindex", active ? "0" : "-1");
    btn.classList.toggle("bg-violet-600", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("shadow", active);
    btn.classList.toggle("text-slate-600", !active);
  });

  setTabInQueryString(name);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

/* ========================================================= */
/* ================== EXPENSE TRACKER ========================*/
/* ========================================================= */

const EXPENSE_STORAGE_KEY = "sakuku-expense-data";

let expenses = loadExpenses();
let editingExpenseId = null;
let deletingExpenseId = null;

// Elemen form & kontrol
const expenseForm = $("#expense-form");
const expenseTitleInput = $("#expense-title");
const expenseCategoryInput = $("#expense-category");
const expenseAmountInput = $("#expense-amount");
const expenseTypeInput = $("#expense-type");
const expenseDateInput = $("#expense-date");

const expenseSearch = $("#expense-search");
const expenseFilterType = $("#expense-filter-type");
const expenseFilterCategory = $("#expense-filter-category");
const expenseSort = $("#expense-sort");

const expenseList = $("#expense-list");
const expenseEmpty = $("#expense-empty");

const expenseTotalIncomeEl = $("#expense-total-income");
const expenseTotalExpenseEl = $("#expense-total-expense");
const expenseBalanceEl = $("#expense-balance");

// Elemen modal
const modalEditExpense = $("#modal-edit-expense");
const modalDeleteExpense = $("#modal-delete-expense");
const editExpenseForm = $("#edit-expense-form");
const editExpenseTitle = $("#edit-expense-title");
const editExpenseCategory = $("#edit-expense-category");
const editExpenseType = $("#edit-expense-type");
const editExpenseAmount = $("#edit-expense-amount");
const editExpenseDate = $("#edit-expense-date");
const deleteExpenseTitleEl = $("#delete-expense-title");
const deleteExpenseConfirmBtn = $("#delete-expense-confirm");

/** Baca data transaksi dari localStorage */
function loadExpenses() {
  try {
    const raw = localStorage.getItem(EXPENSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Simpan data transaksi ke localStorage */
function saveExpenses() {
  localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
}

/** Hitung ringkasan pemasukan, pengeluaran, dan saldo */
function renderExpenseSummary() {
  const totalIncome = expenses
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = expenses
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  expenseTotalIncomeEl.textContent = formatRupiah(totalIncome);
  expenseTotalExpenseEl.textContent = formatRupiah(totalExpense);
  expenseBalanceEl.textContent = formatRupiah(totalIncome - totalExpense);
}

/** Filter, urutkan, lalu render daftar transaksi ke DOM */
function renderExpenses() {
  renderExpenseSummary();

  const query = expenseSearch.value.trim().toLowerCase();
  const filterType = expenseFilterType.value;
  const filterCategory = expenseFilterCategory.value;
  const sortBy = expenseSort.value;

  let items = expenses.filter((e) => {
    const matchQuery = e.title.toLowerCase().includes(query);
    const matchType = filterType === "all" || e.type === filterType;
    const matchCategory = filterCategory === "all" || e.category === filterCategory;
    return matchQuery && matchType && matchCategory;
  });

  items = [...items].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return a.createdAt - b.createdAt;
      case "amount-desc":
        return b.amount - a.amount;
      case "amount-asc":
        return a.amount - b.amount;
      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });

  // Empty state: beda pesan untuk "belum ada data sama sekali" vs "tidak ketemu filter"
  const noDataAtAll = expenses.length === 0;
  expenseEmpty.classList.toggle("hidden", !noDataAtAll && items.length !== 0);
  expenseEmpty.textContent = noDataAtAll
    ? "Belum ada transaksi. Yuk mulai catat pemasukan atau pengeluaranmu!"
    : "Tidak ada transaksi yang cocok dengan pencarian/filter.";

  expenseList.innerHTML = "";
  if (items.length === 0) return;

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className =
      "flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3";
    li.dataset.id = item.id;

    const isIncome = item.type === "income";

    const info = document.createElement("div");
    info.className = "flex-1 min-w-0";

    const titleRow = document.createElement("div");
    titleRow.className = "flex items-center gap-2 flex-wrap";

    const titleEl = document.createElement("p");
    titleEl.className = "font-medium text-slate-900 truncate";
    titleEl.textContent = item.title;

    const typeBadge = document.createElement("span");
    typeBadge.className = `inline-flex text-xs font-semibold px-2 py-0.5 rounded-md ${
      isIncome ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
    }`;
    typeBadge.textContent = isIncome ? "Pemasukan" : "Pengeluaran";

    const categoryBadge = document.createElement("span");
    categoryBadge.className = "inline-flex text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600";
    categoryBadge.textContent = item.category;

    titleRow.append(titleEl, typeBadge, categoryBadge);

    const metaEl = document.createElement("p");
    metaEl.className = "text-xs text-slate-500 mt-1";
    metaEl.textContent = item.date;

    info.append(titleRow, metaEl);

    const amountEl = document.createElement("p");
    amountEl.className = `font-display font-bold text-base sm:w-32 sm:text-right ${
      isIncome ? "text-emerald-600" : "text-rose-600"
    }`;
    amountEl.textContent = (isIncome ? "+" : "-") + formatRupiah(item.amount);

    const actions = document.createElement("div");
    actions.className = "flex items-center gap-1.5 shrink-0";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50";
    editBtn.innerHTML = `${iconSVG("pencil")} Ubah`;
    editBtn.addEventListener("click", () => openEditExpenseModal(item.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50";
    deleteBtn.innerHTML = `${iconSVG("trash")} Hapus`;
    deleteBtn.addEventListener("click", () => openDeleteExpenseModal(item.id));

    actions.append(editBtn, deleteBtn);
    li.append(info, amountEl, actions);
    expenseList.appendChild(li);
  });
}

/** Validasi input form: field wajib tidak kosong & jumlah harus angka > 0 */
function isValidExpenseInput(title, amount, date) {
  if (!title) return false;
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (!date) return false;
  return true;
}

// Submit form tambah transaksi
expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = expenseTitleInput.value.trim();
  const category = expenseCategoryInput.value;
  const amount = Number(expenseAmountInput.value);
  const type = expenseTypeInput.value;
  const date = expenseDateInput.value;

  if (!isValidExpenseInput(title, amount, date)) {
    alert("Judul, tanggal wajib diisi dan jumlah harus angka lebih dari 0.");
    return;
  }

  expenses.push({
    id: makeId(),
    title,
    category,
    amount,
    type,
    date,
    createdAt: Date.now(),
  });

  saveExpenses();
  expenseForm.reset();
  renderExpenses();
});

// Event cari / filter / sort langsung merender ulang
expenseSearch.addEventListener("input", renderExpenses);
expenseFilterType.addEventListener("change", renderExpenses);
expenseFilterCategory.addEventListener("change", renderExpenses);
expenseSort.addEventListener("change", renderExpenses);

/** Buka modal ubah transaksi, isi field dengan data lama */
function openEditExpenseModal(id) {
  const item = expenses.find((e) => e.id === id);
  if (!item) return;

  editingExpenseId = id;
  editExpenseTitle.value = item.title;
  editExpenseCategory.value = item.category;
  editExpenseType.value = item.type;
  editExpenseAmount.value = item.amount;
  editExpenseDate.value = item.date;

  openModal(modalEditExpense);
  editExpenseTitle.focus();
}

/** Buka modal konfirmasi hapus transaksi */
function openDeleteExpenseModal(id) {
  const item = expenses.find((e) => e.id === id);
  if (!item) return;

  deletingExpenseId = id;
  deleteExpenseTitleEl.textContent = `"${item.title}"`;
  openModal(modalDeleteExpense);
}

// Simpan perubahan dari modal edit
editExpenseForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = editExpenseTitle.value.trim();
  const amount = Number(editExpenseAmount.value);
  const date = editExpenseDate.value;

  if (!isValidExpenseInput(title, amount, date) || !editingExpenseId) {
    alert("Judul, tanggal wajib diisi dan jumlah harus angka lebih dari 0.");
    return;
  }

  const item = expenses.find((e) => e.id === editingExpenseId);
  if (item) {
    item.title = title;
    item.category = editExpenseCategory.value;
    item.type = editExpenseType.value;
    item.amount = amount;
    item.date = date;
    saveExpenses();
    renderExpenses();
  }

  closeModal(modalEditExpense);
  editingExpenseId = null;
});

// Konfirmasi hapus dari modal
deleteExpenseConfirmBtn.addEventListener("click", () => {
  if (!deletingExpenseId) return;
  expenses = expenses.filter((e) => e.id !== deletingExpenseId);
  saveExpenses();
  renderExpenses();
  closeModal(modalDeleteExpense);
  deletingExpenseId = null;
});

/* ========================================================= */
/* ================== BOOKMARK MANAGER =======================*/
/* ========================================================= */

const BOOKMARK_STORAGE_KEY = "sakuku-bookmark-data";

let bookmarks = loadBookmarks();
let editingBookmarkId = null;
let deletingBookmarkId = null;

const bookmarkForm = $("#bookmark-form");
const bookmarkTitleInput = $("#bookmark-title");
const bookmarkUrlInput = $("#bookmark-url");
const bookmarkUrlError = $("#bookmark-url-error");
const bookmarkCategoryInput = $("#bookmark-category");
const bookmarkNoteInput = $("#bookmark-note");

const bookmarkSearch = $("#bookmark-search");
const bookmarkSort = $("#bookmark-sort");

const bookmarkList = $("#bookmark-list");
const bookmarkEmpty = $("#bookmark-empty");

const modalEditBookmark = $("#modal-edit-bookmark");
const modalDeleteBookmark = $("#modal-delete-bookmark");
const editBookmarkForm = $("#edit-bookmark-form");
const editBookmarkTitle = $("#edit-bookmark-title");
const editBookmarkUrl = $("#edit-bookmark-url");
const editBookmarkUrlError = $("#edit-bookmark-url-error");
const editBookmarkCategory = $("#edit-bookmark-category");
const editBookmarkNote = $("#edit-bookmark-note");
const deleteBookmarkTitleEl = $("#delete-bookmark-title");
const deleteBookmarkConfirmBtn = $("#delete-bookmark-confirm");

/** Baca data bookmark dari localStorage */
function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Simpan data bookmark ke localStorage */
function saveBookmarks() {
  localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
}

/** Validasi URL sederhana: minimal diawali http:// atau https:// */
function isValidBookmarkUrl(url) {
  return /^https?:\/\/.+/i.test(url.trim());
}

/** Filter, urutkan, lalu render daftar bookmark ke DOM */
function renderBookmarks() {
  const query = bookmarkSearch.value.trim().toLowerCase();
  const sortBy = bookmarkSort.value;

  let items = bookmarks.filter((b) => {
    return (
      b.title.toLowerCase().includes(query) ||
      b.url.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query)
    );
  });

  items = [...items].sort((a, b) => {
    switch (sortBy) {
      case "title-asc":
        return a.title.localeCompare(b.title, "id");
      case "title-desc":
        return b.title.localeCompare(a.title, "id");
      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });

  const noDataAtAll = bookmarks.length === 0;
  bookmarkEmpty.classList.toggle("hidden", !noDataAtAll && items.length !== 0);
  bookmarkEmpty.textContent = noDataAtAll
    ? "Belum ada bookmark tersimpan. Tambahkan tautan favoritmu!"
    : "Tidak ada bookmark yang cocok dengan pencarian.";

  bookmarkList.innerHTML = "";
  if (items.length === 0) return;

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4";
    li.dataset.id = item.id;

    const titleRow = document.createElement("div");
    titleRow.className = "flex items-start justify-between gap-2";

    const titleWrap = document.createElement("div");
    titleWrap.className = "min-w-0";

    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "font-medium text-violet-700 hover:underline truncate block";
    link.textContent = item.title;

    const urlText = document.createElement("p");
    urlText.className = "text-xs text-slate-500 truncate";
    urlText.textContent = item.url;

    titleWrap.append(link, urlText);

    const categoryBadge = document.createElement("span");
    categoryBadge.className =
      "shrink-0 inline-flex text-xs font-semibold px-2 py-0.5 rounded-md bg-violet-100 text-violet-700";
    categoryBadge.textContent = item.category;

    titleRow.append(titleWrap, categoryBadge);
    li.append(titleRow);

    if (item.note) {
      const noteEl = document.createElement("p");
      noteEl.className = "text-sm text-slate-500";
      noteEl.textContent = item.note;
      li.append(noteEl);
    }

    const actions = document.createElement("div");
    actions.className = "flex items-center gap-1.5 pt-1";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50";
    editBtn.innerHTML = `${iconSVG("pencil")} Ubah`;
    editBtn.addEventListener("click", () => openEditBookmarkModal(item.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className =
      "inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50";
    deleteBtn.innerHTML = `${iconSVG("trash")} Hapus`;
    deleteBtn.addEventListener("click", () => openDeleteBookmarkModal(item.id));

    actions.append(editBtn, deleteBtn);
    li.append(actions);
    bookmarkList.appendChild(li);
  });
}

// Validasi URL secara live saat mengetik
bookmarkUrlInput.addEventListener("input", () => {
  const valid = bookmarkUrlInput.value.trim() === "" || isValidBookmarkUrl(bookmarkUrlInput.value);
  bookmarkUrlError.classList.toggle("hidden", valid);
});

// Submit form tambah bookmark
bookmarkForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = bookmarkTitleInput.value.trim();
  const url = bookmarkUrlInput.value.trim();
  const category = bookmarkCategoryInput.value.trim();
  const note = bookmarkNoteInput.value.trim();

  if (!title || !category) {
    alert("Judul dan kategori wajib diisi.");
    return;
  }
  if (!isValidBookmarkUrl(url)) {
    bookmarkUrlError.classList.remove("hidden");
    bookmarkUrlInput.focus();
    return;
  }

  bookmarks.push({
    id: makeId(),
    title,
    url,
    category,
    note,
    createdAt: Date.now(),
  });

  saveBookmarks();
  bookmarkForm.reset();
  bookmarkUrlError.classList.add("hidden");
  renderBookmarks();
});

bookmarkSearch.addEventListener("input", renderBookmarks);
bookmarkSort.addEventListener("change", renderBookmarks);

/** Buka modal ubah bookmark */
function openEditBookmarkModal(id) {
  const item = bookmarks.find((b) => b.id === id);
  if (!item) return;

  editingBookmarkId = id;
  editBookmarkTitle.value = item.title;
  editBookmarkUrl.value = item.url;
  editBookmarkCategory.value = item.category;
  editBookmarkNote.value = item.note || "";
  editBookmarkUrlError.classList.add("hidden");

  openModal(modalEditBookmark);
  editBookmarkTitle.focus();
}

/** Buka modal konfirmasi hapus bookmark */
function openDeleteBookmarkModal(id) {
  const item = bookmarks.find((b) => b.id === id);
  if (!item) return;

  deletingBookmarkId = id;
  deleteBookmarkTitleEl.textContent = `"${item.title}"`;
  openModal(modalDeleteBookmark);
}

// Simpan perubahan dari modal edit bookmark
editBookmarkForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = editBookmarkTitle.value.trim();
  const url = editBookmarkUrl.value.trim();
  const category = editBookmarkCategory.value.trim();

  if (!title || !category || !editingBookmarkId) {
    alert("Judul dan kategori wajib diisi.");
    return;
  }
  if (!isValidBookmarkUrl(url)) {
    editBookmarkUrlError.classList.remove("hidden");
    editBookmarkUrl.focus();
    return;
  }

  const item = bookmarks.find((b) => b.id === editingBookmarkId);
  if (item) {
    item.title = title;
    item.url = url;
    item.category = category;
    item.note = editBookmarkNote.value.trim();
    saveBookmarks();
    renderBookmarks();
  }

  closeModal(modalEditBookmark);
  editingBookmarkId = null;
});

// Konfirmasi hapus bookmark dari modal
deleteBookmarkConfirmBtn.addEventListener("click", () => {
  if (!deletingBookmarkId) return;
  bookmarks = bookmarks.filter((b) => b.id !== deletingBookmarkId);
  saveBookmarks();
  renderBookmarks();
  closeModal(modalDeleteBookmark);
  deletingBookmarkId = null;
});

/* ========================================================= */
/* ================== TUTUP MODAL (SHARED) ===================*/
/* ========================================================= */

// Tutup lewat tombol Batal / X
$all("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.closeModal;
    const modalMap = {
      "edit-expense": modalEditExpense,
      "delete-expense": modalDeleteExpense,
      "edit-bookmark": modalEditBookmark,
      "delete-bookmark": modalDeleteBookmark,
    };
    if (modalMap[target]) closeModal(modalMap[target]);
  });
});

// Tutup lewat klik backdrop
$all(".modal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", () => {
    closeModal(backdrop.parentElement);
  });
});

// Tutup modal yang sedang terbuka dengan tombol Escape
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  [modalEditExpense, modalDeleteExpense, modalEditBookmark, modalDeleteBookmark].forEach((modal) => {
    if (!modal.classList.contains("hidden")) closeModal(modal);
  });
});

/* ========================================================= */
/* ================== QUIZ APP ================================*/
/* ========================================================= */

const QUIZ_HIGHSCORE_KEY = "sakuku-quiz-highscore";

/** Data soal disimpan sebagai array of object, bukan hardcode di HTML */
const quizQuestions = [
  {
    question: "Kata kunci apa yang digunakan untuk mendeklarasikan variabel yang nilainya tidak boleh diubah?",
    options: ["var", "let", "const", "static"],
    correctIndex: 2,
  },
  {
    question: "Method array mana yang digunakan untuk menyaring elemen berdasarkan kondisi tertentu?",
    options: ["map()", "filter()", "reduce()", "forEach()"],
    correctIndex: 1,
  },
  {
    question: "Fungsi apa yang digunakan untuk mengambil elemen HTML berdasarkan selector CSS pertama yang cocok?",
    options: ["getElementById()", "querySelectorAll()", "querySelector()", "getElementsByClass()"],
    correctIndex: 2,
  },
  {
    question: "Bagaimana cara menyimpan data string ke localStorage?",
    options: [
      "localStorage.save(key, value)",
      "localStorage.setItem(key, value)",
      "localStorage.put(key, value)",
      "localStorage.write(key, value)",
    ],
    correctIndex: 1,
  },
  {
    question: "Method mana yang mengubah objek/array JavaScript menjadi string JSON?",
    options: ["JSON.parse()", "JSON.toString()", "JSON.stringify()", "JSON.convert()"],
    correctIndex: 2,
  },
  {
    question: "Event apa yang dipicu saat form dikirim (submit)?",
    options: ["click", "change", "submit", "input"],
    correctIndex: 2,
  },
];

// State kuis
let currentQuestionIndex = 0;
let currentScore = 0;
let isAnswered = false;

const quizStartScreen = $("#quiz-start-screen");
const quizQuestionScreen = $("#quiz-question-screen");
const quizResultScreen = $("#quiz-result-screen");

const quizStartBtn = $("#quiz-start-btn");
const quizRestartBtn = $("#quiz-restart-btn");
const quizNextBtn = $("#quiz-next-btn");

const quizProgress = $("#quiz-progress");
const quizProgressBar = $("#quiz-progress-bar");
const quizScoreLive = $("#quiz-score-live");
const quizQuestionText = $("#quiz-question-text");
const quizOptions = $("#quiz-options");
const quizFeedback = $("#quiz-feedback");

const quizFinalScore = $("#quiz-final-score");
const quizTotalQuestion = $("#quiz-total-question");
const quizHighscoreStart = $("#quiz-highscore-start");
const quizHighscoreResult = $("#quiz-highscore-result");

quizTotalQuestion.textContent = quizQuestions.length;

/** Ambil high score dari localStorage */
function getQuizHighScore() {
  const v = localStorage.getItem(QUIZ_HIGHSCORE_KEY);
  return v ? Number(v) : 0;
}

/** Tampilkan high score di layar mulai */
function showQuizHighScore() {
  quizHighscoreStart.textContent = `${getQuizHighScore()} / ${quizQuestions.length}`;
}

/** Pindah antar layar kuis (mulai / soal / hasil) */
function showQuizScreen(name) {
  quizStartScreen.classList.toggle("hidden", name !== "start");
  quizQuestionScreen.classList.toggle("hidden", name !== "question");
  quizResultScreen.classList.toggle("hidden", name !== "result");
}

/** Mulai / ulangi kuis: reset semua state */
function startQuiz() {
  currentQuestionIndex = 0;
  currentScore = 0;
  isAnswered = false;
  showQuizScreen("question");
  renderQuizQuestion();
}

/** Render soal saat ini beserta opsi jawabannya */
function renderQuizQuestion() {
  const question = quizQuestions[currentQuestionIndex];
  isAnswered = false;

  quizProgress.textContent = `Soal ${currentQuestionIndex + 1}/${quizQuestions.length}`;
  quizProgressBar.style.width = `${(currentQuestionIndex / quizQuestions.length) * 100}%`;
  quizScoreLive.textContent = `Skor: ${currentScore}`;
  quizQuestionText.textContent = question.question;

  quizFeedback.classList.add("hidden");
  quizNextBtn.classList.add("hidden");
  quizNextBtn.disabled = true;

  quizOptions.innerHTML = "";
  question.options.forEach((optionText, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "quiz-option w-full text-left rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition";
    btn.textContent = optionText;
    btn.addEventListener("click", () => handleQuizAnswer(index, btn));
    quizOptions.appendChild(btn);
  });
}

/** Proses jawaban yang dipilih pemain */
function handleQuizAnswer(selectedIndex, selectedBtn) {
  if (isAnswered) return;
  isAnswered = true;

  const question = quizQuestions[currentQuestionIndex];
  const isCorrect = selectedIndex === question.correctIndex;

  // Nonaktifkan semua opsi & beri highlight benar/salah
  $all(".quiz-option").forEach((btn, index) => {
    btn.disabled = true;
    if (index === question.correctIndex) {
      btn.classList.add("border-emerald-400", "bg-emerald-50", "text-emerald-800");
    } else if (btn === selectedBtn) {
      btn.classList.add("border-rose-400", "bg-rose-50", "text-rose-800");
    }
  });

  if (isCorrect) currentScore += 1;

  quizFeedback.classList.remove("hidden");
  quizFeedback.className = `rounded-xl border px-4 py-3 text-sm ${
    isCorrect ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
  }`;
  quizFeedback.textContent = isCorrect
    ? "Benar! Jawabanmu tepat."
    : `Kurang tepat. Jawaban yang benar: "${question.options[question.correctIndex]}"`;

  quizScoreLive.textContent = `Skor: ${currentScore}`;
  quizNextBtn.classList.remove("hidden");
  quizNextBtn.disabled = false;
}

// Tombol lanjut ke soal berikutnya / ke hasil akhir jika soal terakhir
quizNextBtn.addEventListener("click", () => {
  currentQuestionIndex += 1;
  if (currentQuestionIndex >= quizQuestions.length) {
    finishQuiz();
  } else {
    renderQuizQuestion();
  }
});

/** Tampilkan layar hasil akhir & simpan high score jika lebih baik */
function finishQuiz() {
  quizProgressBar.style.width = "100%";
  quizFinalScore.textContent = currentScore;

  const highScore = getQuizHighScore();
  let message = `Skor tertinggi saat ini: ${highScore} / ${quizQuestions.length}`;

  if (currentScore > highScore) {
    localStorage.setItem(QUIZ_HIGHSCORE_KEY, String(currentScore));
    message = `Rekor baru! Skor tertinggi sekarang: ${currentScore} / ${quizQuestions.length}`;
  }

  quizHighscoreResult.textContent = message;
  showQuizScreen("result");
}

quizStartBtn.addEventListener("click", startQuiz);
quizRestartBtn.addEventListener("click", startQuiz);

/* ========================================================= */
/* ================== INISIALISASI HALAMAN ====================*/
/* ========================================================= */

// Set tanggal default form expense ke hari ini
expenseDateInput.value = new Date().toISOString().slice(0, 10);

// Render awal untuk setiap fitur
renderExpenses();
renderBookmarks();
showQuizHighScore();
showQuizScreen("start");

// Tentukan tab aktif dari query string URL (?tab=expense|bookmark|quiz), default: expense
switchTab(getTabFromQueryString());

// Sinkronkan ulang panel saat pengguna menekan tombol back/forward browser
window.addEventListener("popstate", () => switchTab(getTabFromQueryString()));
