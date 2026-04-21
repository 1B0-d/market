document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  const categorySelect = document.getElementById("f-category");
  const minPriceInput = document.getElementById("f-minprice");
  const maxPriceInput = document.getElementById("f-maxprice");
  const applyBtn = document.getElementById("f-apply");
  const sortSelect = document.getElementById("sort");
  const countBadge = document.getElementById("catalogCount");
  const sizeInputs = Array.from(document.querySelectorAll('input[name="size"]'));
  const colorButtons = Array.from(document.querySelectorAll("[data-color]"));
  const quickButtons = Array.from(document.querySelectorAll("[data-quick]"));

  const token = window.app.auth.getToken();
  const likedIds = token ? await window.app.getLikedIds() : [];

  const params = new URLSearchParams(window.location.search);
  const q = params.get("q") || "";
  const categoryParam = params.get("category") || "";
  const minPrice = params.get("minPrice") || "";
  const maxPrice = params.get("maxPrice") || "";
  const sort = params.get("sort") || "newest";
  const limit = params.get("limit") || "24";
  const sizeParam = params.get("sizes") || "";
  const quickParam = params.get("quick") || "new";
  const colorParam = params.get("color") || "";

  let selectedQuick = quickParam;
  let selectedColor = colorParam;
  let categoryIdForApi = categoryParam;

  const activeSizes = sizeParam ? sizeParam.split(",").map((value) => value.trim()).filter(Boolean) : [];

  const setChipState = (buttons, getValue, activeValue) => {
    buttons.forEach((button) => {
      const isActive = getValue(button) === activeValue;
      button.classList.toggle("chip--active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  };

  const syncQuickParam = () => {
    const next = new URLSearchParams(window.location.search);
    if (selectedQuick && selectedQuick !== "new") next.set("quick", selectedQuick);
    else next.delete("quick");
    const query = next.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  };

  sizeInputs.forEach((input) => {
    const chip = input.closest(".chip-checkbox")?.querySelector(".chip");
    if (activeSizes.includes(input.value)) {
      input.checked = true;
      chip?.classList.add("chip--active");
    }

    input.addEventListener("change", () => {
      chip?.classList.toggle("chip--active", input.checked);
    });
  });

  setChipState(colorButtons, (button) => button.dataset.color, selectedColor);
  setChipState(quickButtons, (button) => button.dataset.quick, selectedQuick);

  colorButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.color || "";
      selectedColor = selectedColor === value ? "" : value;
      setChipState(colorButtons, (item) => item.dataset.color, selectedColor);
      applyFilters();
    });
  });

  quickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedQuick = button.dataset.quick || "new";
      setChipState(quickButtons, (item) => item.dataset.quick, selectedQuick);
      syncQuickParam();
    });
  });

  try {
    const cats = await window.app.api("/api/categories");
    const categories = cats.items || cats || [];
    if (categorySelect) {
      categories.forEach((category) => {
        const opt = document.createElement("option");
        opt.value = category._id;
        opt.textContent = category.name;
        categorySelect.appendChild(opt);
      });
    }

    const found = categories.find((category) => category.slug === categoryParam || category._id === categoryParam);
    if (found) {
      categoryIdForApi = found._id;
      if (categorySelect) categorySelect.value = found._id;
    }
  } catch (error) {
    console.error("Categories load failed", error);
  }

  if (minPriceInput) minPriceInput.value = minPrice;
  if (maxPriceInput) maxPriceInput.value = maxPrice;
  if (sortSelect) sortSelect.value = sort;

  const applyFilters = () => {
    const next = new URLSearchParams();

    if (q) next.set("q", q);

    const catVal = categorySelect?.value;
    if (catVal) next.set("category", catVal);

    const selectedSizes = sizeInputs.filter((input) => input.checked).map((input) => input.value);
    if (selectedSizes.length > 0) next.set("sizes", selectedSizes.join(","));

    if (selectedColor) next.set("color", selectedColor);

    const minV = minPriceInput?.value.trim();
    if (minV) next.set("minPrice", minV);

    const maxV = maxPriceInput?.value.trim();
    if (maxV) next.set("maxPrice", maxV);

    const sortV = sortSelect?.value || "newest";
    if (sortV !== "newest") next.set("sort", sortV);

    if (limit !== "24") next.set("limit", limit);
    if (selectedQuick && selectedQuick !== "new") next.set("quick", selectedQuick);

    window.location.search = next.toString();
  };

  applyBtn?.addEventListener("click", applyFilters);
  sortSelect?.addEventListener("change", applyFilters);

  grid.innerHTML = `<div class="card u-p-6">Loading products...</div>`;

  try {
    let apiUrl = `/api/products?limit=${encodeURIComponent(limit)}`;
    if (q) apiUrl += `&q=${encodeURIComponent(q)}`;
    if (categoryIdForApi) apiUrl += `&category=${encodeURIComponent(categoryIdForApi)}`;
    if (sizeParam) apiUrl += `&sizes=${encodeURIComponent(sizeParam)}`;
    if (colorParam) apiUrl += `&color=${encodeURIComponent(colorParam)}`;
    if (minPrice) apiUrl += `&minPrice=${encodeURIComponent(minPrice)}`;
    if (maxPrice) apiUrl += `&maxPrice=${encodeURIComponent(maxPrice)}`;
    if (sort && sort !== "newest") apiUrl += `&sort=${encodeURIComponent(sort)}`;

    const data = await window.app.api(apiUrl);
    const items = data.items || [];

    if (countBadge) countBadge.textContent = `Showing ${data.total ?? items.length} items`;

    grid.innerHTML = items.length
      ? items.map((product) => window.ui.productCard(product, { likedIds })).join("")
      : `<div class="card u-p-6">No products match your filters.</div>`;

    wireLikeButtons(grid, likedIds);
  } catch (error) {
    grid.innerHTML = `<div class="card u-p-6 u-error">Error loading catalog.</div>`;
    console.error(error);
  }

  function wireLikeButtons(root, likedIdsArr) {
    root.querySelectorAll("[data-like]").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        if (!window.app.auth.getToken()) {
          window.location.href = "login.html";
          return;
        }

        const id = btn.getAttribute("data-like");
        btn.classList.toggle("is-liked");

        try {
          const res = await window.app.api(`/api/likes/${id}/toggle`, { method: "POST", authRequired: true });
          likedIdsArr.length = 0;
          if (res.ids) res.ids.forEach((value) => likedIdsArr.push(value));
        } catch (error) {
          btn.classList.toggle("is-liked");
          alert("Could not save like.");
        }
      });
    });
  }
});
