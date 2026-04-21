document.addEventListener("DOMContentLoaded", async () => {
  if (!window.app.auth.getToken()) {
    window.location.href = "../login.html";
    return;
  }

  const me = await window.app.api("/api/auth/profile", { authRequired: true });
  if (me.user?.role !== "ADMIN") {
    window.location.href = "../index.html";
    return;
  }

  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  const titleEl = document.getElementById("p-name");
  const priceEl = document.getElementById("p-price");
  const descEl = document.getElementById("p-desc");
  const catEl = document.getElementById("p-cat");
  const imgEl = document.getElementById("p-img-url");
  const previewEl = document.getElementById("p-img-preview");
  const saveBtn = document.querySelector("button.admin-btn--accent");
  const sizeInputs = Array.from(document.querySelectorAll('input[name="size"]'));
  const colorInputs = Array.from(document.querySelectorAll('input[name="color"]'));

  const normalizeImageUrl = (url) => {
    const raw = String(url || "").trim();
    if (!raw) return "";
    if (/^data:/i.test(raw)) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.includes(".") && !raw.startsWith("/")) return `https://${raw}`;
    return raw;
  };

  const parseImages = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return [];

    const parts = raw.includes("data:") ? raw.split(/\n+/) : raw.split(/[,\n]+/);
    return parts
      .map((item) => item.trim())
      .filter((item) => item.length > 10)
      .map(normalizeImageUrl);
  };

  const setPreview = (url) => {
    if (!previewEl) return;
    if (!url) {
      previewEl.style.display = "none";
      previewEl.src = "";
      return;
    }

    const validUrl = normalizeImageUrl(url);
    previewEl.src = validUrl;
    previewEl.style.display = "block";
    previewEl.onerror = () => {
      previewEl.style.display = "none";
      previewEl.src = "";
    };
  };

  const setCheckedValues = (inputs, values) => {
    const set = new Set((values || []).map((value) => String(value).trim().toLowerCase()));
    inputs.forEach((input) => {
      input.checked = set.has(String(input.value).trim().toLowerCase());
    });
  };

  const getCheckedValues = (inputs) => {
    return inputs.filter((input) => input.checked).map((input) => input.value);
  };

  const cats = await window.app.api("/api/categories?limit=100");
  const categories = cats.items || cats || [];
  if (catEl) {
    catEl.innerHTML = categories
      .map((category) => `<option value="${category._id}">${window.ui.escapeHtml(category.name)}</option>`)
      .join("");
  }

  if (id) {
    const product = await window.app.api(`/api/products/${id}`);
    if (titleEl) titleEl.value = product.title || "";
    if (priceEl) priceEl.value = product.price ?? "";
    if (descEl) descEl.value = product.description || "";
    if (catEl) catEl.value = product.category?._id || product.category || "";
    if (imgEl) imgEl.value = (product.images || []).join(", ");

    setCheckedValues(sizeInputs, product.sizes || []);
    setCheckedValues(colorInputs, product.colors || []);
    setPreview(product.images?.[0] || "");
  }

  imgEl?.addEventListener("input", () => {
    const firstImage = parseImages(imgEl.value)[0] || "";
    setPreview(firstImage);
  });

  saveBtn?.addEventListener("click", async () => {
    const body = {
      title: titleEl?.value?.trim(),
      price: Number(priceEl?.value || 0),
      description: descEl?.value?.trim(),
      category: catEl?.value,
      images: parseImages(imgEl?.value),
      sizes: getCheckedValues(sizeInputs),
      colors: getCheckedValues(colorInputs)
    };

    if (!body.title || !body.category || Number.isNaN(body.price)) {
      alert("Fill title, price, and category.");
      return;
    }

    if (id) {
      await window.app.api(`/api/products/${id}`, { method: "PUT", authRequired: true, body });
    } else {
      await window.app.api("/api/products", { method: "POST", authRequired: true, body });
    }

    window.location.href = "admin-products.html";
  });
});
