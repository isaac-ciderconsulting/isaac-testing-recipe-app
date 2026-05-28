/* ===================================================================
   Our Cookbook — app logic
   - Recipes saved on the device (localStorage). No login needed.
   - Share a recipe as a link; friends can open it and save it too.
   =================================================================== */

(function () {
  "use strict";

  const STORE_KEY = "cookbook.recipes.v1";
  const app    = document.getElementById("app");
  const fab     = document.getElementById("fab");
  const backBtn = document.getElementById("backBtn");
  const brand   = document.getElementById("brand");
  const toastEl = document.getElementById("toast");

  /* ---------- tiny helpers ---------- */
  const $  = (sel, el = document) => el.querySelector(sel);
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const lines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  /* ---------- unicode-safe base64 (for share links) ---------- */
  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64decode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    return decodeURIComponent(escape(atob(str)));
  }

  /* ---------- storage ---------- */
  function loadRecipes() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveRecipes(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
    catch (e) { toast("Storage is full — try a smaller photo."); }
  }
  function getRecipe(id) { return loadRecipes().find((r) => r.id === id); }
  function upsertRecipe(recipe) {
    const list = loadRecipes();
    const i = list.findIndex((r) => r.id === recipe.id);
    if (i >= 0) list[i] = recipe; else list.unshift(recipe);
    saveRecipes(list);
  }
  function deleteRecipe(id) { saveRecipes(loadRecipes().filter((r) => r.id !== id)); }

  /* ---------- image compression ---------- */
  function fileToCompressedDataURL(file, maxDim = 1100, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* =================================================================
     ROUTER
     ================================================================= */
  function parseHash() {
    const h = location.hash.replace(/^#/, "");
    if (!h) return { name: "list" };
    if (h.startsWith("shared=")) return { name: "shared", data: h.slice(7) };
    const [route, arg] = h.split("/");
    if (route === "add") return { name: "form", id: null };
    if (route === "edit" && arg) return { name: "form", id: arg };
    if (route === "recipe" && arg) return { name: "detail", id: arg };
    return { name: "list" };
  }

  function render() {
    const r = parseHash();
    window.scrollTo(0, 0);
    if (r.name === "list")   return viewList();
    if (r.name === "detail") return viewDetail(r.id);
    if (r.name === "form")   return viewForm(r.id);
    if (r.name === "shared") return viewShared(r.data);
    viewList();
  }

  function setChrome({ back = false, title = "Our Cookbook", emoji = "🍳", showFab = false }) {
    backBtn.hidden = !back;
    brand.innerHTML = `<span class="brand-emoji" aria-hidden="true">${emoji}</span><span class="brand-text">${esc(title)}</span>`;
    fab.classList.toggle("hidden", !showFab);
  }

  /* =================================================================
     VIEW: list / home
     ================================================================= */
  function viewList() {
    setChrome({ back: false, title: "Our Cookbook", emoji: "🍳", showFab: true });
    const recipes = loadRecipes();

    if (recipes.length === 0) {
      app.innerHTML = "";
      app.appendChild(el(`
        <div class="view empty">
          <div class="empty-emoji">🥘</div>
          <h2>Welcome!</h2>
          <p>This is your very own cookbook. Tap the big <b>New Recipe</b> button below to add your first one.</p>
        </div>`));
      return;
    }

    const wrap = el(`<div class="view"></div>`);
    wrap.appendChild(el(`
      <div class="search-wrap">
        <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.2-3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input class="search" id="search" type="text" placeholder="Search recipes…" autocomplete="off" />
      </div>`));

    const grid = el(`<div class="grid" id="grid"></div>`);
    wrap.appendChild(grid);
    app.innerHTML = "";
    app.appendChild(wrap);

    function paint(filter = "") {
      const f = filter.toLowerCase();
      const shown = recipes.filter((r) =>
        !f || r.title.toLowerCase().includes(f) ||
        (r.ingredients || []).join(" ").toLowerCase().includes(f));
      grid.innerHTML = "";
      if (shown.length === 0) {
        grid.appendChild(el(`<p class="empty" style="grid-column:1/-1">No recipes match “${esc(filter)}”.</p>`));
        return;
      }
      shown.forEach((r) => grid.appendChild(card(r)));
    }
    paint();
    $("#search").addEventListener("input", (e) => paint(e.target.value));
  }

  function card(r) {
    const photo = r.photo
      ? `<img class="card-photo" src="${r.photo}" alt="" loading="lazy" />`
      : `<div class="card-photo placeholder">🍽️</div>`;
    const meta = [];
    if (r.time)     meta.push(`<span>⏱️ ${esc(r.time)}</span>`);
    if (r.servings) meta.push(`<span>🍴 ${esc(r.servings)}</span>`);
    const c = el(`
      <button class="card" aria-label="Open ${esc(r.title)}">
        ${photo}
        <div class="card-body">
          <h3 class="card-title">${esc(r.title)}</h3>
          <div class="card-meta">${meta.join("")}</div>
        </div>
      </button>`);
    c.addEventListener("click", () => { location.hash = "recipe/" + r.id; });
    return c;
  }

  /* =================================================================
     VIEW: recipe detail
     ================================================================= */
  function viewDetail(id) {
    const r = getRecipe(id);
    if (!r) { location.hash = ""; return; }
    setChrome({ back: true, title: r.title, emoji: "📖", showFab: false });

    const hero = r.photo
      ? `<img class="detail-hero" src="${r.photo}" alt="${esc(r.title)}" />`
      : `<div class="detail-hero placeholder">🍽️</div>`;

    const meta = [];
    if (r.time)     meta.push(`<span class="chip">⏱️ ${esc(r.time)}</span>`);
    if (r.servings) meta.push(`<span class="chip">🍴 Serves ${esc(r.servings)}</span>`);

    const ingHtml = (r.ingredients || []).map((x, i) =>
      `<li data-i="${i}"><span class="tick">✓</span><span class="txt">${esc(x)}</span></li>`).join("");
    const stepHtml = (r.steps || []).map((x) => `<li>${esc(x)}</li>`).join("");

    const view = el(`
      <div class="view">
        ${hero}
        <h1 class="detail-title">${esc(r.title)}</h1>
        <div class="detail-meta">${meta.join("")}</div>

        ${ingHtml ? `<div class="section"><h2>🧺 Ingredients</h2><ul class="ingredients">${ingHtml}</ul></div>` : ""}
        ${stepHtml ? `<div class="section"><h2>👩‍🍳 How to make it</h2><ol class="steps">${stepHtml}</ol></div>` : ""}

        <div class="actions">
          <button class="btn btn-primary" id="shareBtn">📤 Share</button>
          <button class="btn btn-ghost" id="editBtn">✏️ Edit</button>
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn btn-danger btn-block" id="deleteBtn">🗑️ Delete recipe</button>
        </div>
      </div>`);

    app.innerHTML = "";
    app.appendChild(view);

    // tap ingredients to check them off (handy while cooking)
    view.querySelectorAll(".ingredients li").forEach((li) =>
      li.addEventListener("click", () => li.classList.toggle("checked")));

    $("#shareBtn").addEventListener("click", () => shareRecipe(r));
    $("#editBtn").addEventListener("click", () => { location.hash = "edit/" + r.id; });
    $("#deleteBtn").addEventListener("click", () =>
      confirmDialog("Delete this recipe?", "This cannot be undone.", "Delete", () => {
        deleteRecipe(r.id);
        toast("Recipe deleted");
        location.hash = "";
      }));
  }

  /* =================================================================
     VIEW: add / edit form
     ================================================================= */
  function viewForm(id) {
    const editing = !!id;
    const r = editing ? getRecipe(id) : null;
    if (editing && !r) { location.hash = ""; return; }
    setChrome({ back: true, title: editing ? "Edit Recipe" : "New Recipe", emoji: "📝", showFab: false });

    let photoData = r ? (r.photo || "") : "";

    const view = el(`
      <div class="view">
        <form class="form" id="recipeForm">
          <div class="field">
            <div class="photo-picker" id="photoPicker">
              <input type="file" id="photoInput" accept="image/*" />
              <div class="pp-inner" id="ppInner">
                <div class="pp-emoji">📷</div>
                <div>Tap to add a photo</div>
              </div>
            </div>
          </div>

          <div class="field">
            <label for="title">Recipe name</label>
            <input type="text" id="title" placeholder="e.g. Grandma's Pancakes" value="${esc(r ? r.title : "")}" required />
          </div>

          <div class="row2">
            <div class="field">
              <label for="time">Time <span class="hint">(optional)</span></label>
              <input type="text" id="time" placeholder="30 min" value="${esc(r ? r.time : "")}" />
            </div>
            <div class="field">
              <label for="servings">Serves <span class="hint">(optional)</span></label>
              <input type="text" id="servings" placeholder="4" value="${esc(r ? r.servings : "")}" />
            </div>
          </div>

          <div class="field">
            <label for="ingredients">Ingredients <span class="hint">— one per line</span></label>
            <textarea id="ingredients" placeholder="2 cups flour&#10;1 cup milk&#10;2 eggs">${esc(r ? (r.ingredients || []).join("\n") : "")}</textarea>
          </div>

          <div class="field">
            <label for="steps">Steps <span class="hint">— one per line</span></label>
            <textarea id="steps" placeholder="Mix the dry ingredients&#10;Add the milk and eggs&#10;Cook on a hot pan">${esc(r ? (r.steps || []).join("\n") : "")}</textarea>
          </div>

          <div class="actions">
            <button type="submit" class="btn btn-primary btn-block">💾 Save recipe</button>
          </div>
        </form>
      </div>`);

    app.innerHTML = "";
    app.appendChild(view);

    const picker = $("#photoPicker");
    const ppInner = $("#ppInner");

    function showPhoto(src) {
      picker.querySelectorAll("img, .photo-clear").forEach((n) => n.remove());
      if (src) {
        ppInner.style.display = "none";
        picker.appendChild(el(`<img src="${src}" alt="preview" />`));
        const clr = el(`<button type="button" class="photo-clear" aria-label="Remove photo">✕</button>`);
        clr.addEventListener("click", (e) => { e.stopPropagation(); photoData = ""; showPhoto(""); });
        picker.appendChild(clr);
      } else {
        ppInner.style.display = "";
      }
    }
    if (photoData) showPhoto(photoData);

    $("#photoInput").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      toast("Adding photo…");
      try {
        photoData = await fileToCompressedDataURL(file);
        showPhoto(photoData);
      } catch (err) { toast("Could not load that photo."); }
    });

    $("#recipeForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("#title").value.trim();
      if (!title) { toast("Please give your recipe a name."); $("#title").focus(); return; }
      const recipe = {
        id: editing ? r.id : uid(),
        title,
        time: $("#time").value.trim(),
        servings: $("#servings").value.trim(),
        photo: photoData,
        ingredients: lines($("#ingredients").value),
        steps: lines($("#steps").value),
        updated: Date.now(),
      };
      upsertRecipe(recipe);
      toast(editing ? "Recipe saved" : "Recipe added!");
      location.hash = "recipe/" + recipe.id;
    });
  }

  /* =================================================================
     SHARING
     ================================================================= */
  function buildShareURL(r, withPhoto) {
    const payload = {
      t: r.title, tm: r.time, sv: r.servings,
      i: r.ingredients, s: r.steps,
    };
    if (withPhoto && r.photo) payload.p = r.photo;
    const encoded = b64encode(JSON.stringify(payload));
    return location.origin + location.pathname + "#shared=" + encoded;
  }

  async function shareRecipe(r) {
    // Include the photo only if the link stays a reasonable length,
    // so it opens reliably in any messaging app.
    let url = buildShareURL(r, true);
    if (url.length > 7000) url = buildShareURL(r, false);

    const shareText = `Check out my recipe: ${r.title} 🍳`;
    if (navigator.share) {
      try {
        await navigator.share({ title: r.title, text: shareText, url });
        return;
      } catch (e) { if (e && e.name === "AbortError") return; }
    }
    // fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied! Paste it to a friend.");
    } catch (e) {
      confirmDialog("Share this recipe", "Copy the link below and send it to a friend:",
        "Done", null, url);
    }
  }

  /* =================================================================
     VIEW: shared recipe (opened from a link)
     ================================================================= */
  function viewShared(data) {
    let payload;
    try { payload = JSON.parse(b64decode(data)); }
    catch (e) { toast("That shared link looks broken."); location.hash = ""; return; }

    const r = {
      id: "shared",
      title: payload.t || "Shared recipe",
      time: payload.tm || "",
      servings: payload.sv || "",
      photo: payload.p || "",
      ingredients: payload.i || [],
      steps: payload.s || [],
    };
    setChrome({ back: true, title: r.title, emoji: "🎁", showFab: false });

    const hero = r.photo
      ? `<img class="detail-hero" src="${r.photo}" alt="${esc(r.title)}" />`
      : `<div class="detail-hero placeholder">🍽️</div>`;
    const meta = [];
    if (r.time)     meta.push(`<span class="chip">⏱️ ${esc(r.time)}</span>`);
    if (r.servings) meta.push(`<span class="chip">🍴 Serves ${esc(r.servings)}</span>`);
    const ingHtml  = r.ingredients.map((x) => `<li><span class="tick">✓</span><span class="txt">${esc(x)}</span></li>`).join("");
    const stepHtml = r.steps.map((x) => `<li>${esc(x)}</li>`).join("");

    const view = el(`
      <div class="view">
        <div class="shared-banner">
          <span class="sb-emoji">🎁</span>
          <div><b>A friend shared this with you!</b><small>Save it to keep it in your own cookbook.</small></div>
        </div>
        ${hero}
        <h1 class="detail-title">${esc(r.title)}</h1>
        <div class="detail-meta">${meta.join("")}</div>
        ${ingHtml ? `<div class="section"><h2>🧺 Ingredients</h2><ul class="ingredients">${ingHtml}</ul></div>` : ""}
        ${stepHtml ? `<div class="section"><h2>👩‍🍳 How to make it</h2><ol class="steps">${stepHtml}</ol></div>` : ""}
        <div class="actions">
          <button class="btn btn-primary btn-block" id="saveSharedBtn">💾 Save to my cookbook</button>
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn btn-ghost btn-block" id="homeBtn">🏠 Go to my cookbook</button>
        </div>
      </div>`);

    app.innerHTML = "";
    app.appendChild(view);
    view.querySelectorAll(".ingredients li").forEach((li) =>
      li.addEventListener("click", () => li.classList.toggle("checked")));

    $("#saveSharedBtn").addEventListener("click", () => {
      const saved = { ...r, id: uid(), updated: Date.now() };
      upsertRecipe(saved);
      toast("Saved to your cookbook!");
      location.hash = "recipe/" + saved.id;
    });
    $("#homeBtn").addEventListener("click", () => { location.hash = ""; });
  }

  /* =================================================================
     Confirm dialog
     ================================================================= */
  function confirmDialog(title, body, okLabel, onOk, extraText) {
    const backdrop = el(`
      <div class="modal-backdrop">
        <div class="modal" role="dialog" aria-modal="true">
          <h3>${esc(title)}</h3>
          <p>${esc(body)}</p>
          ${extraText ? `<input class="search" style="margin-bottom:18px" readonly value="${esc(extraText)}" />` : ""}
          <div class="actions">
            ${onOk ? `<button class="btn btn-ghost" data-act="cancel">Cancel</button>` : ""}
            <button class="btn ${onOk ? "btn-danger" : "btn-primary"}" data-act="ok">${esc(okLabel)}</button>
          </div>
        </div>
      </div>`);
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add("show"));
    const close = () => { backdrop.classList.remove("show"); setTimeout(() => backdrop.remove(), 220); };
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
      const act = e.target.closest("[data-act]");
      if (!act) return;
      if (act.dataset.act === "ok" && onOk) onOk();
      close();
    });
    if (extraText) { const inp = backdrop.querySelector("input"); inp.focus(); inp.select(); }
  }

  /* ---------- wiring ---------- */
  fab.addEventListener("click", () => { location.hash = "add"; });
  backBtn.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.hash = "";
  });
  window.addEventListener("hashchange", render);

  // first paint
  render();

  // register service worker (offline support) — best effort
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
