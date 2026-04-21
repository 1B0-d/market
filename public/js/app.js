// public/js/app.js
// Small client SDK: auth token, API wrapper, navbar UI

(() => {
  const TOKEN_KEY = "wearly_token";
  const USER_KEY = "wearly_user"; // session cache
  const sameOriginBase = window.location.origin;
  let runtimeConfig = null;
  let runtimeConfigPromise = null;

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeBaseUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    return raw.replace(/\/+$/, "");
  }

  async function loadRuntimeConfig() {
    if (runtimeConfig) return runtimeConfig;
    if (!runtimeConfigPromise) {
      runtimeConfigPromise = fetch("/config.json", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : {}))
        .catch(() => ({}))
        .then((config) => {
          runtimeConfig = {
            apiBaseUrl: normalizeBaseUrl(config.apiBaseUrl || "")
          };
          return runtimeConfig;
        });
    }
    return runtimeConfigPromise;
  }

  async function getApiBaseUrl() {
    const config = await loadRuntimeConfig();
    return config.apiBaseUrl || "";
  }

  async function buildApiUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;

    const baseUrl = await getApiBaseUrl();
    const normalizedPath = String(path || "").startsWith("/") ? String(path) : `/${String(path || "")}`;
    return `${baseUrl}${normalizedPath}`;
  }

  const auth = {
    getToken() {
      return localStorage.getItem(TOKEN_KEY) || "";
    },
    setToken(token) {
      if (!token) return;
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(USER_KEY);
    },
    clear() {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    },
    async getUser() {
      const cached = sessionStorage.getItem(USER_KEY);
      if (cached) return JSON.parse(cached);

      const token = auth.getToken();
      if (!token) return null;

      try {
        const apiUrl = await buildApiUrl("/api/auth/profile");
        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        const user = data.user || null;
        if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
      } catch {
        return null;
      }
    }
  };

  async function api(path, { method = "GET", body, authRequired = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (authRequired) {
      const token = auth.getToken();
      if (!token) throw new Error("Unauthorized");
      headers.Authorization = `Bearer ${token}`;
    }

    const apiUrl = await buildApiUrl(path);
    const res = await fetch(apiUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) throw new Error((data && data.message) || `HTTP ${res.status}`);
    return data;
  }

  function safeJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  function ensureNavElements() {
    const actions = document.querySelector(".navbar__actions");
    if (!actions) return;

    // add Logout button if not exists
    if (!document.getElementById("navLogout")) {
      const a = document.createElement("a");
      a.id = "navLogout";
      a.className = "btn btn--outline btn--sm";
      a.href = "#";
      a.textContent = "Logout";
      a.style.display = "none";
      a.addEventListener("click", (e) => {
        e.preventDefault();
        auth.clear();
        window.location.href = "/index.html";
      });
      actions.appendChild(a);
    }

    // add Admin link if not exists
    const nav = document.querySelector(".navbar__links");
    if (nav && !document.getElementById("navAdmin")) {
      const admin = document.createElement("a");
      admin.id = "navAdmin";
      admin.className = "navlink";
      admin.href = "/admin/admin-dashboard.html";
      admin.textContent = "Admin";
      admin.style.display = "none";
      nav.appendChild(admin);
    }
  }

  async function updateNavbar() {
    ensureNavElements();

    const loginBtn = document.querySelector('.navbar__actions a[href="login.html"]');
    const profileBtn = document.querySelector('.navbar__actions a[href="profile.html"]');
    const logoutBtn = document.getElementById("navLogout");
    const likesLink = document.querySelector('.navbar__links a[href="likes.html"]');
    const adminLink = document.getElementById("navAdmin");

    const user = await auth.getUser();
    const loggedIn = !!user;

    if (loginBtn) loginBtn.style.display = loggedIn ? "none" : "inline-flex";
    if (profileBtn) profileBtn.style.display = loggedIn ? "inline-flex" : "none";
    if (logoutBtn) logoutBtn.style.display = loggedIn ? "inline-flex" : "none";
    if (likesLink) likesLink.style.display = loggedIn ? "inline-flex" : "none";
    if (adminLink) adminLink.style.display = user?.role === "ADMIN" ? "inline-flex" : "none";
  }

  async function wakeBackend() {
    const apiBaseUrl = await getApiBaseUrl();
    if (!apiBaseUrl || apiBaseUrl === sameOriginBase) return;

    try {
      const healthUrl = await buildApiUrl("/api/health");
      await fetch(healthUrl, { method: "GET", cache: "no-store" });
    } catch {
      // Backend cold starts or temporary network issues should not block page render.
    }
  }

  async function populateCategoryMenus() {
    const menus = Array.from(document.querySelectorAll(".navbar .drop__menu[role='menu']"));
    if (menus.length === 0) return;

    try {
      const data = await api("/api/categories?limit=100");
      const categories = data.items || data || [];
      if (!Array.isArray(categories) || categories.length === 0) return;

      const itemsHtml = categories
        .filter((category) => category && (category._id || category.slug))
        .map((category) => {
          const value = category.slug || category._id;
          const name = escapeHtml(category.name || "Category");
          return `<a class="drop__item" href="category.html?category=${encodeURIComponent(value)}">${name} <span class="u-muted">→</span></a>`;
        })
        .join("");

      if (!itemsHtml) return;
      menus.forEach((menu) => {
        menu.innerHTML = itemsHtml;
      });
    } catch (error) {
      console.error("Failed to load nav categories:", error);
    }
  }

  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("admin")) return;

    const logoutLink = event.target.closest('a[href="admin-login.html"]');
    if (!logoutLink) return;

    event.preventDefault();
    auth.clear();
    window.location.href = "/index.html";
  });

  // likes helper
  async function getLikedIds() {
    try {
      const data = await api("/api/likes/ids", { authRequired: true });
      return data.ids || [];
    } catch {
      return [];
    }
  }

  window.app = {
    auth,
    api,
    buildApiUrl,
    updateNavbar,
    getLikedIds
  };

  document.addEventListener("DOMContentLoaded", async () => {
    await wakeBackend();
    populateCategoryMenus();
    updateNavbar();
  });
})();
