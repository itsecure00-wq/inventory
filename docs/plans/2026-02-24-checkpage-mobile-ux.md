# CheckPage Mobile UX — Design Doc
**Date**: 2026-02-24
**Scope**: CheckPage.html only (+ CSS)

## Problem
1. Employees cannot enlarge product photos to identify items
2. "Add item" button should only appear on mobile (Boss/Manager); desktop stays unchanged
3. Responsive: mobile and desktop have distinct feature sets

## Key Finding
The "add item" FAB (`addItemFab`), top bar button (`addItemTopBtn`), full modal overlay, and
backend `createItem()` are **already fully implemented**. No new backend or modal code needed.

---

## Feature 1 — Image Lightbox

### What
Tap any product image on the check list → dark overlay + enlarged image + product name →
tap anywhere to close.

### Implementation
- Add `<div id="imgLightbox">` overlay (hidden by default) to HTML body
- CSS: `position:fixed; inset:0; background:rgba(0,0,0,.85); z-index:9999; display:flex; align-items:center; justify-content:center`
- In `makeCard()`: add `onclick="showImgLightbox(this.src, '${item.name}')"` to `img`
- JS: `showImgLightbox(src, name)` sets image + name text, removes `hidden` class
- Tap overlay → `closeImgLightbox()`

### Files
- `CheckPage.html`: new CSS block, new HTML div, update `makeCard()`, two JS functions

---

## Feature 2 — Mobile-only "Add Item" Button

### What
`addItemFab` (FAB) and `addItemTopBtn` (top bar "＋ 物品") currently show for Manager/Boss
on all screen sizes. Hide them on desktop (≥ 769 px).

### Implementation
One CSS rule added to the existing `<style>` block:
```css
@media (min-width: 769px) {
  .add-item-fab { display: none !important; }
  #addItemTopBtn { display: none !important; }
}
```

### Files
- `CheckPage.html`: 4 lines of CSS

---

## Out of Scope
- No changes to backend
- No changes to the add-item modal (already complete)
- No changes to desktop layout
- Other pages (Login, Admin, Dashboard) unchanged

---

## Verification
1. Mobile (≤ 768 px), Staff account → no add button, can tap image to enlarge ✅
2. Mobile, Manager/Boss account → add button visible, tap → modal opens, save → item appears ✅
3. Desktop (≥ 769 px), Manager/Boss account → add button hidden ✅
4. Lightbox: tap image → enlarged; tap overlay → closes ✅
