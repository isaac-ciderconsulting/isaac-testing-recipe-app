/* ===================================================================
   Our Cookbook — app logic
   - Recipes saved on the device (localStorage). No login needed.
   - Share a recipe as a link; friends can open it and save it too.
   =================================================================== */

(function () {
  "use strict";

  const STORE_KEY = "cookbook.recipes.v1";
  const app     = document.getElementById("app");
  const fab     = document.getElementById("fab");
  const backBtn = document.getElementById("backBtn");
  const brand   = document.getElementById("brand");
  const toastEl = document.getElementById("toast");

  /* ---------- inline SVG line icons (sleek, consistent) ---------- */
  const PATHS = {
    chef:   '<path d="M6 13.9A4 4 0 0 1 7.4 6 5 5 0 0 1 8.5 4.5a5 5 0 0 1 7 0A5 5 0 0 1 16.6 6 4 4 0 0 1 18 13.9V21H6z"/><path d="M6 17h12"/>',
    clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/>',
    users:  '<path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="8" r="3.3"/><path d="M21 20v-1a4 4 0 0 0-3-3.8"/><path d="M15.5 4.7a3.3 3.3 0 0 1 0 6.4"/>',
    list:   '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    steps:  '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6M9 15h4"/>',
    share:  '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.4 13.4l7.2 4.2M15.6 6.4l-7.2 4.2"/>',
    edit:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash:  '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M18.5 6l-1 14a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5.5 6"/><path d="M10 11v6M14 11v6"/>',
    gift:   '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M12 8.5V21"/><path d="M19 12.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6.5"/><path d="M12 8.5S11 4 8 4a2.2 2.2 0 0 0 0 4.5zM12 8.5S13 4 16 4a2.2 2.2 0 0 1 0 4.5z"/>',
    check:  '<path d="M5 12.5l4.5 4.5L19 7"/>',
    camera: '<path d="M3 8.5A2 2 0 0 1 5 6.5h1.6L8 4.5h8l1.4 2H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.4"/>',
    close:  '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/>',
    home:   '<path d="M3 11l9-7 9 7"/><path d="M5.5 9.5V20h13V9.5"/>',
    save:   '<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  };
  function icon(name, size = 20, sw = 1.9) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ""}</svg>`;
  }

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

  function setChrome({ back = false, showFab = false }) {
    backBtn.hidden = !back;
    fab.classList.toggle("hidden", !showFab);
  }

  /* =================================================================
     VIEW: list / home
     ================================================================= */
  function viewList() {
    setChrome({ back: false, showFab: true });
    const recipes = loadRecipes();

    if (recipes.length === 0) {
      app.innerHTML = "";
      app.appendChild(el(`
        <div class="view empty">
          <div class="empty-art">${icon("chef", 46, 1.6)}</div>
          <h2>Welcome!</h2>
          <p>This is your own private cookbook. Tap <b>New Recipe</b> below to add your first one.</p>
        </div>`));
      return;
    }

    const wrap = el(`<div class="view"></div>`);
    wrap.appendChild(el(`
      <div class="page-head">
        <h2>Your Recipes</h2>
        <p>${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} saved</p>
      </div>`));
    wrap.appendChild(el(`
      <div class="search-wrap">
        <span class="s-icon">${icon("search", 20)}</span>
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
        grid.appendChild(el(`<p class="empty" style="grid-column:1/-1;padding:40px 0;color:var(--ink-soft)">No recipes match “${esc(filter)}”.</p>`));
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
    if (r.time)     meta.push(`<span>${icon("clock", 15)} ${esc(r.time)}</span>`);
    if (r.servings) meta.push(`<span>${icon("users", 15)} ${esc(r.servings)}</span>`);
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
    setChrome({ back: true, showFab: false });

    const hero = r.photo
      ? `<img class="detail-hero" src="${r.photo}" alt="${esc(r.title)}" />`
      : `<div class="detail-hero placeholder">🍽️</div>`;

    const meta = [];
    if (r.time)     meta.push(`<span class="chip">${icon("clock", 16)} ${esc(r.time)}</span>`);
    if (r.servings) meta.push(`<span class="chip">${icon("users", 16)} Serves ${esc(r.servings)}</span>`);

    const ingHtml = (r.ingredients || []).map((x, i) =>
      `<li data-i="${i}"><span class="tick">${icon("check", 14, 3)}</span><span class="txt">${esc(x)}</span></li>`).join("");
    const stepHtml = (r.steps || []).map((x) => `<li>${esc(x)}</li>`).join("");

    const view = el(`
      <div class="view">
        ${hero}
        <h1 class="detail-title">${esc(r.title)}</h1>
        <div class="detail-meta">${meta.join("")}</div>

        ${ingHtml ? `<div class="section"><div class="section-label">${icon("list", 17)} Ingredients</div><ul class="ingredients">${ingHtml}</ul></div>` : ""}
        ${stepHtml ? `<div class="section"><div class="section-label">${icon("steps", 17)} Method</div><ol class="steps">${stepHtml}</ol></div>` : ""}

        <div class="actions">
          <button class="btn btn-primary" id="shareBtn">${icon("share")} Share</button>
          <button class="btn btn-ghost" id="editBtn">${icon("edit")} Edit</button>
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn btn-danger btn-block" id="deleteBtn">${icon("trash")} Delete recipe</button>
        </div>
      </div>`);

    app.innerHTML = "";
    app.appendChild(view);

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
    setChrome({ back: true, showFab: false });

    let photoData = r ? (r.photo || "") : "";

    const view = el(`
      <div class="view">
        <div class="page-head"><h2>${editing ? "Edit Recipe" : "New Recipe"}</h2></div>
        <form class="form" id="recipeForm">
          <div class="field">
            <div class="photo-picker" id="photoPicker">
              <input type="file" id="photoInput" accept="image/*" />
              <div class="pp-inner" id="ppInner">
                <div class="pp-badge">${icon("camera", 26, 1.7)}</div>
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
            <button type="submit" class="btn btn-primary btn-block">${icon("save")} Save recipe</button>
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
        const clr = el(`<button type="button" class="photo-clear" aria-label="Remove photo">${icon("close", 18, 2.2)}</button>`);
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
    const payload = { t: r.title, tm: r.time, sv: r.servings, i: r.ingredients, s: r.steps };
    if (withPhoto && r.photo) payload.p = r.photo;
    const encoded = b64encode(JSON.stringify(payload));
    return location.origin + location.pathname + "#shared=" + encoded;
  }

  async function shareRecipe(r) {
    let url = buildShareURL(r, true);
    if (url.length > 7000) url = buildShareURL(r, false);

    const shareText = `Check out my recipe: ${r.title}`;
    if (navigator.share) {
      try { await navigator.share({ title: r.title, text: shareText, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied! Paste it to a friend.");
    } catch (e) {
      confirmDialog("Share this recipe", "Copy the link below and send it to a friend:", "Done", null, url);
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
      time: payload.tm || "", servings: payload.sv || "",
      photo: payload.p || "", ingredients: payload.i || [], steps: payload.s || [],
    };
    setChrome({ back: true, showFab: false });

    const hero = r.photo
      ? `<img class="detail-hero" src="${r.photo}" alt="${esc(r.title)}" />`
      : `<div class="detail-hero placeholder">🍽️</div>`;
    const meta = [];
    if (r.time)     meta.push(`<span class="chip">${icon("clock", 16)} ${esc(r.time)}</span>`);
    if (r.servings) meta.push(`<span class="chip">${icon("users", 16)} Serves ${esc(r.servings)}</span>`);
    const ingHtml  = r.ingredients.map((x) => `<li><span class="tick">${icon("check", 14, 3)}</span><span class="txt">${esc(x)}</span></li>`).join("");
    const stepHtml = r.steps.map((x) => `<li>${esc(x)}</li>`).join("");

    const view = el(`
      <div class="view">
        <div class="shared-banner">
          <span class="sb-icon">${icon("gift", 24)}</span>
          <div><b>A friend shared this with you!</b><small>Save it to keep it in your own cookbook.</small></div>
        </div>
        ${hero}
        <h1 class="detail-title">${esc(r.title)}</h1>
        <div class="detail-meta">${meta.join("")}</div>
        ${ingHtml ? `<div class="section"><div class="section-label">${icon("list", 17)} Ingredients</div><ul class="ingredients">${ingHtml}</ul></div>` : ""}
        ${stepHtml ? `<div class="section"><div class="section-label">${icon("steps", 17)} Method</div><ol class="steps">${stepHtml}</ol></div>` : ""}
        <div class="actions">
          <button class="btn btn-primary btn-block" id="saveSharedBtn">${icon("save")} Save to my cookbook</button>
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn btn-ghost btn-block" id="homeBtn">${icon("home")} Go to my cookbook</button>
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
     Confirm / link dialog
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
  brand.innerHTML = `<span class="logo">${icon("chef", 22, 1.7)}</span><span class="brand-text">Our Cookbook</span>`;
  fab.addEventListener("click", () => { location.hash = "add"; });
  backBtn.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.hash = "";
  });
  window.addEventListener("hashchange", render);

  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
