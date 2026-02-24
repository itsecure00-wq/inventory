# CheckPage Mobile UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add image lightbox on CheckPage + hide the "add item" button on desktop.

**Architecture:** Two surgical edits to `CheckPage.html` only. No backend changes. No new files.
- Task 1: Image lightbox — inject one CSS block, one HTML div, two JS functions, one `onclick` on `img`
- Task 2: Desktop hide — four lines of CSS media query

**Tech Stack:** Google Apps Script web app HTML (vanilla JS, no frameworks, no test runner — verification is manual browser check)

---

### Task 1: Image Lightbox

**Files:**
- Modify: `CheckPage.html` (CSS ~line 309, HTML ~line 364, JS `makeCard()` ~line 783)

---

**Step 1: Add lightbox CSS — insert before `</style>` (line 309)**

Find this exact line:
```
    .ai-cancel-btn {
      width: 100%; padding: 11px; margin-top: 8px;
      background: #f5f5f5; color: #616161; border: none;
      border-radius: 10px; font-size: 14px; cursor: pointer;
    }
  </style>
```

Replace with:
```
    .ai-cancel-btn {
      width: 100%; padding: 11px; margin-top: 8px;
      background: #f5f5f5; color: #616161; border: none;
      border-radius: 10px; font-size: 14px; cursor: pointer;
    }

    /* ── 图片 lightbox ── */
    #imgLightbox {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,.88);
      display: none; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 24px;
    }
    #imgLightbox.show { display: flex; }
    #imgLightbox img {
      max-width: 100%; max-height: 75vh;
      border-radius: 10px; object-fit: contain;
      box-shadow: 0 4px 24px rgba(0,0,0,.5);
    }
    #imgLightboxName {
      color: #fff; font-size: 16px; font-weight: 600;
      margin-top: 14px; text-align: center;
    }
    #imgLightboxClose {
      position: absolute; top: 16px; right: 20px;
      color: #fff; font-size: 28px; cursor: pointer;
      line-height: 1; opacity: .8;
    }
    .item-photo img { cursor: pointer; }
  </style>
```

---

**Step 2: Add lightbox HTML — insert the overlay div right before the existing add-item overlay**

Find this exact line (around line 366):
```html
<!-- 添加物品 Sheet Modal -->
<div class="add-item-overlay" id="addItemOverlay" onclick="closeAddItemOverlayBg(event)">
```

Insert BEFORE it:
```html
<!-- 图片放大 Lightbox -->
<div id="imgLightbox" onclick="closeImgLightbox()">
  <span id="imgLightboxClose" onclick="closeImgLightbox()">✕</span>
  <img id="imgLightboxImg" src="" alt="">
  <div id="imgLightboxName"></div>
</div>

```

---

**Step 3: Add lightbox JS — insert two functions near `navigateTo` / `goLogin`**

Find this exact block (around line 448):
```javascript
function navigateTo(page) {
  window.top.location.href = APP_URL + '?page=' + page;
}
```

Insert AFTER it (leave a blank line):
```javascript
// ── 图片 lightbox ──
function showImgLightbox(src, name) {
  document.getElementById('imgLightboxImg').src = src;
  document.getElementById('imgLightboxName').textContent = name;
  document.getElementById('imgLightbox').classList.add('show');
}
function closeImgLightbox() {
  document.getElementById('imgLightbox').classList.remove('show');
  document.getElementById('imgLightboxImg').src = '';
}
```

---

**Step 4: Wire `onclick` to the image in `makeCard()`**

Find this exact block (around line 783):
```javascript
    var img = document.createElement('img');
    img.src = item.imageUrl;
    img.loading = 'lazy';
    img.alt = item.name;
    img.onerror = function() { photoDiv.textContent = catEmoji(item.category); };
```

Replace with:
```javascript
    var img = document.createElement('img');
    img.src = item.imageUrl;
    img.loading = 'lazy';
    img.alt = item.name;
    img.title = item.name;
    img.onclick = (function(s, n) {
      return function(e) { e.stopPropagation(); showImgLightbox(s, n); };
    })(item.imageUrl, item.name);
    img.onerror = function() { photoDiv.textContent = catEmoji(item.category); };
```

Note: The IIFE captures `item.imageUrl` and `item.name` by value to avoid closure-in-loop bug.

---

**Step 5: Manual verification**

Open the check page URL on mobile and desktop:
```
https://script.google.com/macros/s/AKfycbwpVx5_CQqDiFjq6x3bSEvGw3nEWjSt86vLshI7BpTAQhmDFYp_QddaoPdenHrAxVyr/exec?page=check
```

Check:
- [ ] Tap any product image → dark overlay + enlarged image + product name appears
- [ ] Tap the overlay (or ✕) → closes
- [ ] Items with no image (emoji placeholder) → no cursor change, no lightbox

---

**Step 6: Commit**

```bash
cd "C:\Users\Pei Shee\Documents\code\inventory-ims"
git add CheckPage.html
git commit -m "@86 feat: image lightbox on CheckPage tap-to-enlarge"
```

---

### Task 2: Hide "Add Item" Button on Desktop

**Files:**
- Modify: `CheckPage.html` CSS block (~line 309, now after Task 1's additions)

---

**Step 1: Add media query to CSS**

Find this exact line (now at end of CSS block, after the lightbox styles added in Task 1):
```css
    .item-photo img { cursor: pointer; }
  </style>
```

Replace with:
```css
    .item-photo img { cursor: pointer; }

    /* ── 手机专属功能：桌面隐藏增加物品按钮 ── */
    @media (min-width: 769px) {
      .add-item-fab  { display: none !important; }
      #addItemTopBtn { display: none !important; }
    }
  </style>
```

---

**Step 2: Manual verification**

- [ ] Desktop browser (≥ 769 px), logged in as Manager/Boss → no ＋ FAB, no "＋ 物品" top button
- [ ] Mobile browser (≤ 768 px), logged in as Manager/Boss → ＋ FAB visible, tap → modal opens, can add item
- [ ] Mobile browser, logged in as Staff → no ＋ FAB (role check still applies)

---

**Step 3: Commit + deploy**

```bash
cd "C:\Users\Pei Shee\Documents\code\inventory-ims"
git add CheckPage.html
git commit -m "@86 feat: hide add-item button on desktop (mobile-only)"
git push origin main
clasp push --force
clasp deploy --deploymentId AKfycbwpVx5_CQqDiFjq6x3bSEvGw3nEWjSt86vLshI7BpTAQhmDFYp_QddaoPdenHrAxVyr --description "@86 mobile UX: image lightbox + mobile-only add button"
```

---

## Summary of All Edits

| Task | Location in CheckPage.html | Change |
|------|---------------------------|--------|
| Lightbox CSS | Before `</style>` | Add 30-line CSS block |
| Lightbox HTML | Before add-item overlay | Add 1 div with img + name |
| Lightbox JS | After `navigateTo()` | Add `showImgLightbox` + `closeImgLightbox` |
| `makeCard()` onclick | `img` element in photo block | Add `img.onclick` + `img.title` |
| Desktop hide CSS | After lightbox CSS | 4-line media query |

**Single file changed: `CheckPage.html`**
