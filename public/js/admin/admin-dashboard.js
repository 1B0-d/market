// public/js/admin/admin-dashboard.js
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

  // Try to update numbers if placeholders exist
  try {
    const [prodResult, catResult, userResult] = await Promise.allSettled([
      window.app.api("/api/products?limit=1"),
      window.app.api("/api/categories?limit=1"),
      window.app.api("/api/admin/users?limit=1", { authRequired: true })
    ]);

    const productMetric = document.getElementById("metricProducts");
    const categoryMetric = document.getElementById("metricCategories");
    const userMetric = document.getElementById("metricUsers");
    const identityPill = document.getElementById("adminIdentityPill");

    if (prodResult.status === "fulfilled" && productMetric) {
      const prodTotal = prodResult.value.total ?? prodResult.value.items?.length ?? 0;
      productMetric.textContent = String(prodTotal);
    }

    if (catResult.status === "fulfilled" && categoryMetric) {
      const catTotal = catResult.value.total ?? catResult.value.items?.length ?? 0;
      categoryMetric.textContent = String(catTotal);
    }

    if (userResult.status === "fulfilled" && userMetric) {
      const userTotal = userResult.value.total ?? userResult.value.items?.length ?? 0;
      userMetric.textContent = String(userTotal);
    }

    if (identityPill) {
      identityPill.textContent = `Admin: ${me.user?.name || me.user?.email || ""}`;
    }
  } catch {}
});
