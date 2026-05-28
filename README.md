# 🍳 Our Cookbook

### 📱 Live app: **https://isaac-ciderconsulting.github.io/isaac-testing-recipe-app/**

A simple, beautiful recipe app — built to be easy enough for anyone to use, even if they don't like fiddling with technology.

- 📖 Save your favorite recipes with a photo, ingredients, and steps
- 🔍 Search your recipes instantly
- ✅ Tap ingredients to check them off while cooking
- 📤 Share any recipe with a friend by sending them a link
- 🎁 Friends can open the link and save the recipe to their own cookbook
- 📱 Works on phones, tablets, and computers — and can be added to the home screen like a real app
- 🔌 Works offline once it has loaded

No accounts, no passwords, no setup. Your recipes are saved privately on your own device.

---

## 📱 How to use it (the easy way)

The app is a single web page. The simplest way to put it on your wife's phone:

### Option A — It's already online for free! (recommended)

The app is already published with GitHub Pages at:

**https://isaac-ciderconsulting.github.io/isaac-testing-recipe-app/**

1. Open that link on her phone. Then:
   - **iPhone (Safari):** tap the Share button → **Add to Home Screen**.
   - **Android (Chrome):** tap the ⋮ menu → **Add to Home screen / Install app**.

Now it has its own icon on the home screen and opens like a normal app. 🎉

### Option B — Just open it on a computer

Double-click `index.html` to open it in any web browser. (Sharing links work best with Option A.)

---

## 🤝 How sharing works

1. Open a recipe and tap **📤 Share**.
2. On a phone it opens the normal share menu (WhatsApp, Messages, email, etc.).
   On a computer it copies a link to the clipboard.
3. Send that link to a friend. When they open it, they see the recipe and can tap
   **💾 Save to my cookbook** to keep their own copy.

> Photos are included in the share link when they're small enough; otherwise the
> recipe text is shared on its own so the link always works.

---

## 🛠️ What's inside (for the curious)

Plain HTML, CSS, and JavaScript — no frameworks, no build step. Recipes are stored in the
browser's `localStorage`, so everything stays on the device.

| File | What it does |
|------|--------------|
| `index.html` | The page structure |
| `styles.css` | The look and feel |
| `app.js` | All the app logic (saving, viewing, sharing) |
| `manifest.json` + `sw.js` | Makes it installable and work offline |
| `icon.svg` | The app icon |

---

Made with ❤️ for the best cook I know.
