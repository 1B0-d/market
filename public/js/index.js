document.addEventListener("DOMContentLoaded", async () => {
  const featuredGrid = document.getElementById("featuredGrid");
  const arrivalsGrid = document.getElementById("arrivalsGrid");
  if (!featuredGrid && !arrivalsGrid) return;

  const token = window.app?.auth.getToken();
  const likedIds = token ? await window.app.getLikedIds() : [];

  async function load(limit, mount) {
    if (!mount) return;

    mount.innerHTML = "";

    try {
      const data = await window.app.api(`/api/products?limit=${limit}`);
      const items = data.items || [];

      if (items.length === 0) {
        mount.innerHTML = `<div class="card"><div class="card__body">No products yet.</div></div>`;
        return;
      }

      mount.innerHTML = items.map((product) => window.ui.productCard(product, { likedIds })).join("");
      wireCardActions(mount, likedIds);
    } catch (error) {
      console.error("Failed to load homepage products:", error);
      mount.innerHTML = `<div class="card"><div class="card__body">Could not load products.</div></div>`;
    }
  }

  function wireCardActions(root, likedIdsArr) {
    root.querySelectorAll("[data-like]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!window.app.auth.getToken()) {
          window.location.href = "login.html";
          return;
        }

        const id = btn.getAttribute("data-like");
        const res = await window.app.api(`/api/likes/${id}/toggle`, { method: "POST", authRequired: true });

        likedIdsArr.length = 0;
        (res.ids || []).forEach((value) => likedIdsArr.push(value));

        btn.classList.toggle("is-liked", !!res.liked);
      });
    });
  }

  await load(4, featuredGrid);
  await load(4, arrivalsGrid);
});
