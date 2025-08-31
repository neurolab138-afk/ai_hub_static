
const CATEGORIES = ["AI", "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "MLOps", "Data Engineering", "Robotics", "Web Dev", "Mobile", "Cloud", "Cybersecurity", "Ethics", "Industry News"];
const SUBTYPES = ["Гайд", "Туториал", "Обзор", "Исследование", "Кейс", "Мнение"];
const LEVELS = ["Новичок", "Средний", "Продвинутый"];
const TAGS = ["PyTorch", "TensorFlow", "Transformers", "RAG", "LLM", "GAN", "YOLO", "LangChain", "K8s", "Docker", "Kafka", "Airflow", "TypeScript", "Next.js", "FastAPI", "Go", "Rust", "GCP", "AWS", "Azure"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const state = {
  dark: false,
  query: "",
  categories: new Set(),
  subtypes: new Set(),
  levels: new Set(),
  tags: new Set(),
  sortBy: "newest",
  page: 1,
  pageSize: 12,
  bookmarks: new Set(JSON.parse(localStorage.getItem("bookmarks") || "[]")),
  open: null,
  data: []
};

function saveBookmarks() {
  localStorage.setItem("bookmarks", JSON.stringify([...state.bookmarks]));
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const sorters = {
  newest: (a, b) => new Date(b.date) - new Date(a.date),
  popular: (a, b) => b.views - a.views,
  short: (a, b) => a.read - b.read,
  rating: (a, b) => b.rating - a.rating
};

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function render() {
  document.documentElement.classList.toggle("dark", state.dark);

  // search input
  $("#search").value = state.query;

  // sidebar chips active states (handled on click)

  // compute filtered
  let filtered = state.data.filter(a => state.categories.size ? state.categories.has(a.category) : true)
    .filter(a => state.subtypes.size ? state.subtypes.has(a.subtype) : true)
    .filter(a => state.levels.size ? state.levels.has(a.level) : true)
    .filter(a => state.tags.size ? a.tags.some(t => state.tags.has(t)) : true);

  if (state.query.trim()) {
    const q = state.query.trim().toLowerCase();
    filtered = filtered.filter(a => (`${a.title} ${a.subtitle} ${a.excerpt} ${a.category} ${a.subtype} ${a.tags.join(" ")}`.toLowerCase().includes(q)));
  }
  filtered.sort(sorters[state.sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  if (state.page > totalPages) state.page = 1;

  // slice
  const items = filtered.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);

  // grid
  const grid = $("#grid");
  grid.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = `<div class="small" style="text-align:center; padding:24px; color:var(--muted)">Ничего не найдено. Попробуйте изменить фильтры или запрос.</div>`;
    grid.appendChild(empty);
  } else {
    for (const a of items) {
      const card = document.createElement("article");
      card.className = "card-article";
      card.innerHTML = `
        <div class="cover">
          <img src="${a.cover}" alt="cover">
          <div class="badges">
            <span class="badge">${a.category}</span>
            ${a.trending ? `<span class="badge">В тренде</span>` : ``}
          </div>
          <button class="bookmark" data-id="${a.id}" title="Закладка">${state.bookmarks.has(a.id) ? "★" : "☆"}</button>
        </div>
        <div class="body">
          <div class="line-clamp-2" style="font-weight:600">${a.title}</div>
          <div class="small" style="color:var(--muted)">${a.subtitle}</div>
          <div class="meta">
            <span>${formatDate(a.date)}</span>
            <span class="dot">${a.read} мин</span>
            <span class="dot">★ ${a.rating}</span>
          </div>
          <div class="tags">
            ${a.tags.map(t => `<span class="tag">${t}</span>`).join("")}
          </div>
          <div class="actions">
            <button class="button" data-open="${a.id}">Превью</button>
            <button class="button primary" data-open="${a.id}">Читать</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    }
  }

  // pager
  $("#page-label").textContent = `Страница ${state.page} из ${totalPages}`;
  $("#first").disabled = state.page === 1;
  $("#prev").disabled = state.page === 1;
  $("#next").disabled = state.page === totalPages;
  $("#last").disabled = state.page === totalPages;

  // trending list
  const trendBox = $("#trending");
  const trending = state.data.filter(a => a.trending).slice(0, 6);
  trendBox.innerHTML = trending.map(a => `<li style="display:flex; gap:8px"><span>★</span><button class="link" data-open="${a.id}" style="text-align:left; background:none; border:none; color:inherit; cursor:pointer">${a.title}</button></li>`).join("");

  // tag cloud
  const cloud = $("#cloud");
  cloud.innerHTML = TAGS.map(t => `<span class="tag ${state.tags.has(t) ? "active" : ""}" data-tag="${t}">${t}</span>`).join("");
}

function openArticle(a) {
  const modal = $("#modal");
  $("#m-cover").src = a.cover;
  $("#m-category").textContent = a.category;
  $("#m-date").textContent = formatDate(a.date);
  $("#m-read").textContent = `${a.read} мин`;
  $("#m-rating").textContent = a.rating;
  $("#m-title").textContent = a.title;
  $("#m-subtitle").textContent = a.subtitle;
  $("#m-tags").innerHTML = a.tags.map(t => `<span class="tag">${t}</span>`).join("");
  $("#m-body").textContent = a.content;
  $("#m-bookmark").dataset.id = a.id;
  $("#m-bookmark").textContent = state.bookmarks.has(a.id) ? "В закладках" : "Добавить в закладки";
  modal.style.display = "flex";
}

function closeModal() { $("#modal").style.display = "none"; }

function toggleSet(set, value) {
  if (set.has(value)) set.delete(value); else set.add(value);
  state.page = 1;
  render();
}

function attachEvents() {
  // search
  $("#search").addEventListener("input", (e) => { state.query = e.target.value; state.page = 1; render(); });
  $("#btn-search").addEventListener("click", () => { state.page = 1; render(); });

  // dark mode
  $("#theme").addEventListener("click", () => {
    state.dark = !state.dark;
    saveTheme();
    render();
  });

  // dropdown menus
  const dropFilters = $("#drop-filters");
  const menuFilters = $("#menu-filters");
  dropFilters.addEventListener("click", () => { menuFilters.classList.toggle("open"); });
  document.addEventListener("click", (e) => {
    if (!dropFilters.contains(e.target) && !menuFilters.contains(e.target)) {
      menuFilters.classList.remove("open");
    }
  });

  const dropSort = $("#drop-sort");
  const menuSort = $("#menu-sort");
  dropSort.addEventListener("click", () => { menuSort.classList.toggle("open"); });
  document.addEventListener("click", (e) => {
    if (!dropSort.contains(e.target) && !menuSort.contains(e.target)) {
      menuSort.classList.remove("open");
    }
  });

  // filter checkboxes (delegation)
  $("#menu-filters").addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.group === "cat") toggleSet(state.categories, t.value);
    if (t.dataset.group === "sub") toggleSet(state.subtypes, t.value);
    if (t.dataset.group === "lvl") toggleSet(state.levels, t.value);
    if (t.dataset.group === "tag") toggleSet(state.tags, t.value);
  });
  $("#reset-filters").addEventListener("click", () => {
    state.categories.clear(); state.subtypes.clear(); state.levels.clear(); state.tags.clear();
    state.query = ""; state.sortBy = "newest"; state.page = 1;
    // uncheck all inputs
    $all("#menu-filters input[type=checkbox]").forEach(i => i.checked = false);
    render();
  });

  // sort menu
  $all("#menu-sort input[name=sort]").forEach(r => {
    r.addEventListener("change", () => { state.sortBy = r.value; state.page = 1; render(); });
  });

  // sidebar chips
  $all(".chip-cat").forEach(chip => chip.addEventListener("click", () => { toggleSet(state.categories, chip.dataset.val); chip.classList.toggle("active"); }));
  $all(".chip-sub").forEach(chip => chip.addEventListener("click", () => { toggleSet(state.subtypes, chip.dataset.val); chip.classList.toggle("active"); }));
  $all(".chip-lvl").forEach(chip => chip.addEventListener("click", () => { toggleSet(state.levels, chip.dataset.val); chip.classList.toggle("active"); }));

  // grid delegation
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open]");
    const bookmarkBtn = e.target.closest(".bookmark");
    const tagBtn = e.target.closest("#cloud .tag");
    const linkBtn = e.target.closest(".link");
    if (openBtn) {
      const id = Number(openBtn.dataset.open);
      const a = state.data.find(x => x.id === id);
      openArticle(a);
    }
    if (bookmarkBtn) {
      const id = Number(bookmarkBtn.dataset.id);
      if (state.bookmarks.has(id)) state.bookmarks.delete(id); else state.bookmarks.add(id);
      saveBookmarks();
      render();
      // also reflect in modal button if open
      if ($("#modal").style.display === "flex" && $("#m-bookmark").dataset.id == String(id)) {
        $("#m-bookmark").textContent = state.bookmarks.has(id) ? "В закладках" : "Добавить в закладки";
      }
    }
    if (tagBtn) {
      const t = tagBtn.dataset.tag;
      toggleSet(state.tags, t);
    }
    if (linkBtn) {
      const id = Number(linkBtn.dataset.open);
      const a = state.data.find(x => x.id === id);
      openArticle(a);
    }
  });

  // modal
  $("#close-modal").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  $("#m-bookmark").addEventListener("click", (e) => {
    const id = Number(e.target.dataset.id);
    if (state.bookmarks.has(id)) state.bookmarks.delete(id); else state.bookmarks.add(id);
    saveBookmarks();
    e.target.textContent = state.bookmarks.has(id) ? "В закладках" : "Добавить в закладки";
    render();
  });

  // pager
  $("#first").addEventListener("click", () => { state.page = 1; render(); });
  $("#prev").addEventListener("click", () => { if (state.page > 1) state.page--; render(); });
  $("#next").addEventListener("click", () => { state.page++; render(); });
  $("#last").addEventListener("click", () => {
    // compute total after current filters
    let filtered = state.data.filter(a => state.categories.size ? state.categories.has(a.category) : true)
      .filter(a => state.subtypes.size ? state.subtypes.has(a.subtype) : true)
      .filter(a => state.levels.size ? state.levels.has(a.level) : true)
      .filter(a => state.tags.size ? a.tags.some(t => state.tags.has(t)) : true);
    if (state.query.trim()) {
      const q = state.query.trim().toLowerCase();
      filtered = filtered.filter(a => (`${a.title} ${a.subtitle} ${a.excerpt} ${a.category} ${a.subtype} ${a.tags.join(" ")}`.toLowerCase().includes(q)));
    }
    filtered.sort(sorters[state.sortBy]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = totalPages; render();
  });
}

function buildFilterMenu() {
  const sec = $("#menu-filters .rows");
  const mkChecks = (title, items, group) => {
    const wrap = document.createElement("div");
    wrap.className = "row";
    wrap.innerHTML = `<div class="row-title">${title}</div>`;
    items.forEach(v => {
      const id = `f-${group}-${v.replace(/\\W+/g, '_')}`;
      const row = document.createElement("label");
      row.className = "check";
      row.htmlFor = id;
      row.innerHTML = `<input id="${id}" type="checkbox" value="${v}" data-group="${group}"> ${v}`;
      wrap.appendChild(row);
    });
    sec.appendChild(wrap);
  };
  mkChecks("Категории", CATEGORIES, "cat");
  mkChecks("Тип материала", SUBTYPES, "sub");
  mkChecks("Уровень", LEVELS, "lvl");
  mkChecks("Теги", TAGS, "tag");
}

function buildSidebar() {
  const cats = $("#side-cats");
  CATEGORIES.forEach(c => {
    const chip = document.createElement("span");
    chip.className = "tag chip-cat"; chip.dataset.val = c; chip.textContent = c;
    cats.appendChild(chip);
  });
  const subs = $("#side-subs");
  SUBTYPES.forEach(s => {
    const chip = document.createElement("span");
    chip.className = "tag chip-sub"; chip.dataset.val = s; chip.textContent = s;
    subs.appendChild(chip);
  });
  const lvls = $("#side-lvls");
  LEVELS.forEach(l => {
    const chip = document.createElement("span");
    chip.className = "tag chip-lvl"; chip.dataset.val = l; chip.textContent = l;
    lvls.appendChild(chip);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  buildFilterMenu();
  buildSidebar();
  attachEvents();

  loadTheme()

  fetch("articles.json")
    .then(res => res.json())
    .then(data => {
      state.data = data;   // статьи попадают в state
      render();            // отрисовка карточек
    })
    .catch(err => {
      console.error("Ошибка загрузки статей:", err);
    });
});

function saveTheme() {
  localStorage.setItem("theme", state.dark ? "dark" : "light");
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    state.dark = true;
  } else if (saved === "light") {
    state.dark = false;
  } else {
    // если тема не сохранена — по дефолту делаем тёмную
    state.dark = true;
  }
}

