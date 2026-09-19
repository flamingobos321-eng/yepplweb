(() => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  navToggle?.addEventListener("click", () => {
    const open = nav?.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(Boolean(open)));
  });

  const panel = document.querySelector("[data-search-panel]");
  const input = document.querySelector("[data-search-input]");
  const results = document.querySelector("[data-search-results]");
  let index = [];

  async function openSearch() {
    panel?.classList.add("open");
    panel?.setAttribute("aria-hidden", "false");
    input?.focus();
    if (index.length === 0) {
      const response = await fetch("/search-index.json", { cache: "force-cache" });
      index = await response.json();
    }
  }

  document.querySelectorAll("[data-search-open]").forEach((button) => button.addEventListener("click", openSearch));
  document.querySelector("[data-search-close]")?.addEventListener("click", () => {
    panel?.classList.remove("open");
    panel?.setAttribute("aria-hidden", "true");
  });
  panel?.addEventListener("click", (event) => {
    if (event.target === panel) panel.classList.remove("open");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") panel?.classList.remove("open");
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
    }
  });

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  input?.addEventListener("input", () => {
    const query = input.value.trim().toLocaleLowerCase();
    if (query.length < 2) {
      results.innerHTML = '<p class="muted">Enter at least two characters.</p>';
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
      : '<p class="muted">No matching products or technical pages were found.</p>';
  });

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