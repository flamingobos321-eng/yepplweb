(() => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  navToggle?.addEventListener("click", () => {
    const open = Boolean(nav?.classList.contains("hidden"));
    nav?.classList.toggle("hidden", !open);
    navToggle.querySelector(".nav-icon-open")?.classList.toggle("hidden", open);
    navToggle.querySelector(".nav-icon-close")?.classList.toggle("hidden", !open);
    navToggle.setAttribute("aria-expanded", String(Boolean(open)));
  });
  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.add("hidden");
    navToggle?.querySelector(".nav-icon-open")?.classList.remove("hidden");
    navToggle?.querySelector(".nav-icon-close")?.classList.add("hidden");
    navToggle?.setAttribute("aria-expanded", "false");
  }));

  const panel = document.querySelector("[data-search-panel]");
  const input = document.querySelector("[data-search-input]");
  const results = document.querySelector("[data-search-results]");
  let index = [];
  let lastFocused = null;
  const closeSearch = () => {
    if (!panel || panel.classList.contains("hidden")) return;
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocused?.focus();
  };

  async function openSearch() {
    if (!panel || !input || !results) return;
    lastFocused = document.activeElement;
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    input.focus();
    if (index.length === 0) {
      results.innerHTML = '<p class="muted" role="status">Loading search…</p>';
      try {
        const response = await fetch("/search-index.json", { cache: "force-cache" });
        if (!response.ok) throw new Error("Search index unavailable");
        index = await response.json();
        if (!Array.isArray(index)) throw new Error("Invalid search index");
        renderResults();
      } catch {
        results.innerHTML = '<p class="muted" role="alert">Search is unavailable right now. Please try again later.</p>';
      }
    }
  }

  document.querySelectorAll("[data-search-open]").forEach((button) => button.addEventListener("click", openSearch));
  document.querySelector("[data-search-close]")?.addEventListener("click", closeSearch);
  panel?.addEventListener("click", (event) => {
    if (event.target === panel) closeSearch();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSearch();
    if (event.key === "Tab" && panel && !panel.classList.contains("hidden")) {
      const focusable = [...panel.querySelectorAll('input, button, a[href]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
    }
  });

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  function renderResults() {
    const query = input.value.trim().toLocaleLowerCase();
    if (query.length < 2) {
      results.innerHTML = '<p class="muted" role="status">Enter at least two characters.</p>';
      return;
    }
    const matches = index
      .map((item) => {
        const haystack = `${item.title} ${item.description} ${item.keywords}`.toLocaleLowerCase();
        const score = item.title.toLocaleLowerCase().includes(query) ? 3 : haystack.includes(query) ? 1 : 0;
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 20);
    results.innerHTML = matches.length
      ? matches.map(({ item }) => `<a class="search-result" href="${escapeHtml(item.url)}"><small>${escapeHtml(item.type)}</small><strong>${escapeHtml(item.title)}</strong><div class="muted">${escapeHtml(item.description)}</div></a>`).join("")
      : '<p class="muted" role="status">No matching products or technical pages were found.</p>';
  }
  input?.addEventListener("input", renderResults);

  const params = new URLSearchParams(window.location.search);
  document.querySelectorAll('input[name="product"]').forEach((field) => {
    if (!field.value && params.get("product")) field.value = params.get("product");
  });
  document.querySelectorAll('input[name="product_url"]').forEach((field) => {
    if (!field.value) field.value = params.get("product_url") || window.location.href;
  });
  document.querySelectorAll('input[name="form_started"]').forEach((field) => {
    field.value = String(Math.floor(Date.now() / 1000));
  });
})();