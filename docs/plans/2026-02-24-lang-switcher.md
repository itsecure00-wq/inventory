# @87 Language Switcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Chinese ↔ Burmese language toggle to CheckPage.html with localStorage persistence.

**Architecture:** `data-zh/my` attributes for static HTML elements (labels, buttons, option text); `t(key)` lookup function for dynamically generated text in JS (cards, toasts, modals). `applyLang()` applies both on toggle. Only `CheckPage.html` is touched.

**Tech Stack:** Vanilla JS, Google Apps Script web app HTML, no test framework (manual verification only), clasp for deployment.

---

## Pre-flight

```bash
cd "C:\Users\Pei Shee\Documents\code\inventory-ims"
git pull origin main
```

---

## Task 1: Add i18n Core (STRINGS dict + helper functions)

**Files:**
- Modify: `CheckPage.html` — inside `<script>` block, right after `var APP_URL = '<?= appUrl ?>';` (line ~462)

**Step 1: Insert translation infrastructure**

Find this exact line:
```javascript
var APP_URL = '<?= appUrl ?>';
```

Insert IMMEDIATELY AFTER it (keep a blank line above the new block):

```javascript

// ── i18n ──────────────────────────────────────────────
var currentLang = localStorage.getItem('ims_lang') || 'zh';

var STRINGS = {
  zh: {
    pageTitle:        '🔥 库存盘点',
    addItemBtn:       '＋ 物品',
    logoutBtn:        '退出',
    progressPrefix:   '已填:',
    loading:          '加载中...',
    loadingItems:     '正在加载盘点物品...',
    noCategoryItems:  '该分类暂无物品',
    noTasksToday:     '今日暂无分配给您的盘点任务',
    currentStock:     '现有:',
    submitBarLabel:   '提交盘点记录',
    submitBtn:        '提交盘点',
    submitBtnAll:     '✅ 全部填完，提交',
    draftSaved:       '📝 草稿已保存',
    confirmTitle:     '确认提交',
    confirmBtn:       '完成',
    retryBtn:         '重试',
    continueSurvey:   '继续盘点',
    logoutTitle:      '确认退出？',
    logoutBody:       '您有未提交的草稿数据。<br>退出后，草稿将继续保留。',
    logoutConfirm:    '退出登录',
    successTitle:     '提交成功！',
    successMsg:       '已记录 %n 件盘点物品！',
    successAbnormal:  '以下物品库存异常，请告知主管：',
    addItemTitle:     '➕ 新增物品',
    photoLabel:       '拍照 / 选图（可选）',
    itemNameLabel:    '物品名称',
    itemNamePh:       '输入物品名称',
    categoryLabel:    '类别',
    unitLabel:        '计量单位',
    pkgLabel:         '每包件数',
    pkgPh:            '例:10',
    addItemSaveBtn:   '+ 添加物品',
    cancelBtn:        '取消',
    unit_kg:   'kg（公斤）',  unit_g:    'g（克）',
    unit_bao:  '包',          unit_he:   '盒',
    unit_ping: '瓶',          unit_tong: '桶',
    unit_xiang:'箱',          unit_dai:  '袋',
    unit_fen:  '份',          unit_tiao: '条',
    unit_guan: '罐',          unit_L:    '升（L）',
    unit_mL:   '毫升（mL）',  unit_ge:   '个',
    unit_pian: '片',
    cat_rou:     '肉类',   cat_cai:      '菜类',
    cat_haixian: '海鲜',   cat_tiaoliao: '调料',
    cat_yinliao: '饮料',   cat_zhushi:   '主食',
    cat_zhanliao:'蘸料',   cat_youliao:  '油料',
    cat_lengdong:'冷冻',   cat_ganhuo:   '干货',
    cat_wanzi:   '丸子',   cat_guodi:    '锅底',
    cat_tianpin: '甜品',   cat_jiushui:  '酒水',
    cat_xiaochi: '小吃',   cat_xiaohao:  '消耗品',
    cat_canju:   '餐具',   cat_qita:     '其他',
    errNameEmpty:  '❌ 物品名称不能为空',
    errFillPkg:    '❌ 请填写每包件数',
    warnImgFail:   '⚠️ 图片上传失败，物品仍将保存（无图）',
    successAdded:  '✅ 物品已添加:',
    successSaved:  '✅ 已记录 %n 件盘点物品',
  },
  my: {
    pageTitle:        '🔥 ကုန်ပစ္စည်းစစ်ဆေး',
    addItemBtn:       '＋ ပစ္စည်း',
    logoutBtn:        'ထွက်',
    progressPrefix:   'ဖြည့်ပြီး:',
    loading:          'တင်နေသည်...',
    loadingItems:     'ကုန်ပစ္စည်းများ တင်နေသည်...',
    noCategoryItems:  'ဤအမျိုးအစားတွင် ပစ္စည်းမရှိပါ',
    noTasksToday:     'ယနေ့ သင့်အတွက် စစ်ဆေးရမည့် ပစ္စည်းမရှိပါ',
    currentStock:     'ရှိ:',
    submitBarLabel:   'မှတ်တမ်းတင်ရန်',
    submitBtn:        'တင်ရန်',
    submitBtnAll:     '✅ အားလုံးဖြည့်ပြီး၊ တင်ရန်',
    draftSaved:       '📝 မူကြမ်း သိမ်းပြီး',
    confirmTitle:     'တင်ရန် အတည်ပြု',
    confirmBtn:       'ပြီးပါပြီ',
    retryBtn:         'ထပ်ကြိုးစားရန်',
    continueSurvey:   'ဆက်စစ်ဆေးရန်',
    logoutTitle:      'ထွက်ခွာမည်လား？',
    logoutBody:       'တင်မပြီးသေးသော မူကြမ်းဒေတာ ရှိနေသည်။<br>ထွက်ပြီးနောက် မူကြမ်းကို သိမ်းဆည်းထားမည်။',
    logoutConfirm:    'ထွက်ပါ',
    successTitle:     'တင်ပြီးပါပြီ！',
    successMsg:       'ပစ္စည်း %n ခု မှတ်တမ်းတင်ပြီး！',
    successAbnormal:  'အောက်ပါ ပစ္စည်းများ မမှန်ကန်ပါ၊ ခေါင်းဆောင်ကို ပြောပါ：',
    addItemTitle:     '➕ ပစ္စည်းအသစ် ထည့်ရန်',
    photoLabel:       'ဓာတ်ပုံ / ပုံရွေးရန်（ရွေးနိုင်）',
    itemNameLabel:    'ပစ္စည်းအမည်',
    itemNamePh:       'ပစ္စည်းအမည် ထည့်ပါ',
    categoryLabel:    'အမျိုးအစား',
    unitLabel:        'တိုင်းတာသည့် ယူနစ်',
    pkgLabel:         'တစ်ထုပ်လျှင် အရေအတွက်',
    pkgPh:            'ဥပမာ:10',
    addItemSaveBtn:   '+ ပစ္စည်းထည့်ရန်',
    cancelBtn:        'ပယ်ဖျက်ရန်',
    unit_kg:   'kg（ကီလိုဂရမ်）', unit_g:    'g（ဂရမ်）',
    unit_bao:  'ထုပ်',             unit_he:   'သေတ္တာ',
    unit_ping: 'ပုလင်း',           unit_tong: 'ပုံး',
    unit_xiang:'ဘောက်စ်',          unit_dai:  'အိတ်',
    unit_fen:  'ဆာဗစ်',            unit_tiao: 'ချောင်း',
    unit_guan: 'ဘူး',              unit_L:    'လီတာ（L）',
    unit_mL:   'မီလီလီတာ（mL）',   unit_ge:   'ခု',
    unit_pian: 'ချပ်',
    cat_rou:     'အသား',            cat_cai:      'ဟင်းသီးဟင်းရွက်',
    cat_haixian: 'ပင်လယ်စာ',       cat_tiaoliao: 'အမြုတ်',
    cat_yinliao: 'အချိုရည်',        cat_zhushi:   'အဓိကအစားအစာ',
    cat_zhanliao:'ဆော့စ်',          cat_youliao:  'ဆီ',
    cat_lengdong:'အေးခဲ',           cat_ganhuo:   'ခြောက်သွေ့ကုန်',
    cat_wanzi:   'ဂျင်မောင်းကြော်', cat_guodi:    'ဟင်းအုတ်',
    cat_tianpin: 'မုန့်',            cat_jiushui:  'အရက်',
    cat_xiaochi: 'မုန့်ဟင်းခါး',    cat_xiaohao:  'သုံးပစ္စည်း',
    cat_canju:   'ဇွန်းခက်',        cat_qita:     'အခြား',
    errNameEmpty:  '❌ ပစ္စည်းအမည် ဖြည့်ပေးပါ',
    errFillPkg:    '❌ တစ်ထုပ်လျှင် အရေအတွက် ဖြည့်ပေးပါ',
    warnImgFail:   '⚠️ ပုံတင်မရပါ၊ ပစ္စည်းကို ပုံမပါဘဲ သိမ်းမည်',
    successAdded:  '✅ ပစ္စည်းထည့်ပြီး:',
    successSaved:  '✅ ပစ္စည်း %n ခု မှတ်တမ်းတင်ပြီး',
  }
};

// Category Chinese → STRINGS key lookup (values go to backend as Chinese)
var CAT_KEYS = {
  '肉类':'cat_rou',   '菜类':'cat_cai',      '海鲜':'cat_haixian',
  '调料':'cat_tiaoliao','饮料':'cat_yinliao','主食':'cat_zhushi',
  '蘸料':'cat_zhanliao','油料':'cat_youliao','冷冻':'cat_lengdong',
  '干货':'cat_ganhuo', '丸子':'cat_wanzi',   '锅底':'cat_guodi',
  '甜品':'cat_tianpin','酒水':'cat_jiushui', '小吃':'cat_xiaochi',
  '消耗品':'cat_xiaohao','餐具':'cat_canju', '其他':'cat_qita'
};

function t(key) {
  return (STRINGS[currentLang] && STRINGS[currentLang][key]) ||
         (STRINGS.zh[key]) || key;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('ims_lang', lang);
  applyLang();
}

function applyLang() {
  // 1. Update static HTML elements with data-zh attribute
  document.querySelectorAll('[data-zh]').forEach(function(el) {
    el.textContent = (currentLang === 'my' ? el.dataset.my : el.dataset.zh) || el.dataset.zh;
  });
  // 2. Update placeholder inputs with data-ph-zh attribute
  document.querySelectorAll('[data-ph-zh]').forEach(function(el) {
    el.placeholder = (currentLang === 'my' ? el.dataset.phMy : el.dataset.phZh) || el.dataset.phZh;
  });
  // 3. Update lang toggle button (shows target language)
  var btn = document.getElementById('langToggleBtn');
  if (btn) btn.textContent = currentLang === 'zh' ? 'မြ' : '中';
  // 4. Re-apply dynamic UI if items are loaded
  if (typeof allItems !== 'undefined' && allItems.length) {
    updateProgress();
    updateSubmitBtn();
    renderItems();
  }
}
// ── end i18n ───────────────────────────────────────────
```

**Step 2: Verify insertion**

Search for `function t(key)` in CheckPage.html — it should appear exactly once, after `var APP_URL`.

**Step 3: Commit**

```bash
git add CheckPage.html
git commit -m "@87 feat: add i18n core (STRINGS dict + t/setLang/applyLang)"
```

---

## Task 2: Toggle Button CSS + HTML

**Files:**
- Modify: `CheckPage.html` — CSS block and top bar HTML

### Step 1: Add CSS

Find the end of the CSS block. Look for this section (it's the last rule before `</style>`):

```css
    @media (min-width: 769px) {
      .add-item-fab  { display: none !important; }
      #addItemTopBtn { display: none !important; }
    }
  </style>
```

Insert the `.lang-toggle-btn` rule BEFORE `@media (min-width: 769px)`:

```css
    /* ── 语言切换按钮 ── */
    .lang-toggle-btn {
      background: rgba(255,255,255,.2);
      border: 1px solid rgba(255,255,255,.4);
      color: #fff;
      padding: 4px 9px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
      line-height: 1.4;
      margin-right: 6px;
    }

    @media (min-width: 769px) {
```

### Step 2: Add button to top bar HTML

Find the top bar buttons section. Look for this exact block:

```html
    <button class="logout-btn" id="addItemTopBtn" onclick="openAddItemModal()"
```

The top bar ends with the logout button. Find the LOGOUT button line:

```html
    <button class="logout-btn" onclick="doLogout()">退出</button>
```

Replace it with (lang button inserted before logout button):

```html
    <button class="lang-toggle-btn" id="langToggleBtn" onclick="setLang(currentLang==='zh'?'my':'zh')">မြ</button>
    <button class="logout-btn" onclick="doLogout()" data-zh="退出" data-my="ထွက်">退出</button>
```

> Note: The `data-zh/my` on the logout button is added here so `applyLang()` handles it.

### Step 3: Verify

Search for `langToggleBtn` — must appear exactly once in HTML and once in `applyLang()`.

### Step 4: Commit

```bash
git add CheckPage.html
git commit -m "@87 feat: add lang toggle button to top bar"
```

---

## Task 3: Static HTML — Top Bar Title + Bottom Bar + Status Area

**Files:**
- Modify: `CheckPage.html` — static text in HTML body

### Step 1: Top bar title

Find the top bar title element. Look for the element containing `🔥 库存盘点`. It will be inside a div with class `topbar-title` or similar. Find:

```
🔥 库存盘点
```

in the HTML (not in JS). Add `data-zh` and `data-my` attributes to its containing element. For example, if it reads:

```html
<div class="topbar-title">🔥 库存盘点</div>
```

Change to:

```html
<div class="topbar-title" data-zh="🔥 库存盘点" data-my="🔥 ကုန်ပစ္စည်းစစ်ဆေး">🔥 库存盘点</div>
```

### Step 2: Add item top button text

Find:
```html
    <button class="logout-btn" id="addItemTopBtn" onclick="openAddItemModal()"
```

The button text is `+ 物品` or `＋ 物品`. Read the full line to see the text content. Add `data-zh` and `data-my`:

Change the button text content to add data attributes. The button text span or text node should become:

```html
    <button class="logout-btn" id="addItemTopBtn" onclick="openAddItemModal()"
            style="display:none;background:rgba(255,255,255,.25);border-color:rgba(255,255,255,.5)"
            data-zh="＋ 物品" data-my="＋ ပစ္စည်း">＋ 物品</button>
```

### Step 3: Bottom bar label

Find:
```html
    <span id="filledCount">已填: 0 / 0</span>
```

Change to:
```html
    <span id="filledCount" data-zh="已填: 0 / 0" data-my="ဖြည့်ပြီး: 0 / 0">已填: 0 / 0</span>
```

> Note: This is only the INITIAL state. Once items load, `updateProgress()` (updated in Task 5) will overwrite it. The `data-zh/my` here handles the language switch before items load.

Find:
```html
    <span class="draft-label" id="draftLabel">📝 草稿已保存</span>
```

Change to:
```html
    <span class="draft-label" id="draftLabel" data-zh="📝 草稿已保存" data-my="📝 မူကြမ်း သိမ်းပြီး">📝 草稿已保存</span>
```

### Step 4: Status area initial text

Find:
```html
<div id="statusArea" class="status-area">
  <div class="spinner"></div>
  <div>正在加载盘点...</div>
</div>
```

Change to:
```html
<div id="statusArea" class="status-area">
  <div class="spinner"></div>
  <div data-zh="正在加载盘点物品..." data-my="ကုန်ပစ္စည်းများ တင်နေသည်...">正在加载盘点物品...</div>
</div>
```

### Step 5: Commit

```bash
git add CheckPage.html
git commit -m "@87 feat: add data-zh/my to top bar, bottom bar, status area"
```

---

## Task 4: Static HTML — Add Item Modal Labels + Unit Options

**Files:**
- Modify: `CheckPage.html` — add item modal HTML (around line 404+)

### Step 1: Modal title

Find:
```html
    <div class="ai-title">+ 新增物品</div>
```

Change to:
```html
    <div class="ai-title" data-zh="➕ 新增物品" data-my="➕ ပစ္စည်းအသစ် ထည့်ရန်">➕ 新增物品</div>
```

### Step 2: Photo placeholder

Find the photo placeholder div. Look for `拍照 / 选图` in the HTML. It will be inside `aiPhotoPlaceholder`. Change its text content to add data attributes:

```html
      <div class="ai-photo-placeholder" id="aiPhotoPlaceholder"
           data-zh="拍照 / 选图（可选）" data-my="ဓာတ်ပုံ / ပုံရွေးရန်（ရွေးနိုင်）">拍照 / 选图（可选）</div>
```

### Step 3: Item name label + input placeholder

Find the label for item name (the `ai-label` above the item name input). It contains `物品名称`. Change:

```html
<label class="ai-label">物品名称 <span style="color:#d32f2f">*</span></label>
```

To (add data-zh/my to the label, keep the span as-is by setting only the text node via data attribute on the outer label — since the label has a child span, use a wrapper span for the text):

```html
<label class="ai-label"><span data-zh="物品名称" data-my="ပစ္စည်းအမည်">物品名称</span> <span style="color:#d32f2f">*</span></label>
```

Find the item name input (it has `id="ai_name"` or similar — check the file). Add `data-ph-zh` and `data-ph-my` attributes for placeholder translation:

```html
<input id="ai_name" class="ai-input" type="text"
       placeholder="输入物品名称"
       data-ph-zh="输入物品名称"
       data-ph-my="ပစ္စည်းအမည် ထည့်ပါ">
```

### Step 4: Category label

Find `<label class="ai-label">类别` and add data attributes to its text:

```html
<label class="ai-label"><span data-zh="类别" data-my="အမျိုးအစား">类别</span></label>
```

### Step 5: Unit label

Find `<label class="ai-label">计量单位` and add data attributes:

```html
<label class="ai-label"><span data-zh="计量单位" data-my="တိုင်းတာသည့် ယူနစ်">计量单位</span> <span style="color:#d32f2f">*</span></label>
```

### Step 6: Pkg qty label + placeholder

Find `<label class="ai-label">` containing `每包件数` and add data attributes to the text:

```html
<label class="ai-label"><span data-zh="每包件数" data-my="တစ်ထုပ်လျှင် အရေအတွက်">每包件数</span> <span style="color:#d32f2f">*</span></label>
```

Find `ai_pkg_qty` input (line ~452). Add `data-ph-zh` and `data-ph-my`:

```html
<input id="ai_pkg_qty" class="ai-input" type="number" min="1"
       placeholder="例:10"
       data-ph-zh="例:10"
       data-ph-my="ဥပမာ:10">
```

### Step 7: Save + Cancel buttons

Find:
```html
    <button id="addItemSaveBtn" class="ai-save-btn" onclick="saveNewItem()">+ 添加物品</button>
    <button class="ai-cancel-btn" onclick="closeAddItemOverlayDirect()">取消</button>
```

Change to:
```html
    <button id="addItemSaveBtn" class="ai-save-btn" onclick="saveNewItem()"
            data-zh="+ 添加物品" data-my="+ ပစ္စည်းထည့်ရန်">+ 添加物品</button>
    <button class="ai-cancel-btn" onclick="closeAddItemOverlayDirect()"
            data-zh="取消" data-my="ပယ်ဖျက်ရန်">取消</button>
```

### Step 8: Unit `<select>` options

Find the unit `<select>` element (look for `id="ai_unit"` or find the select containing `kg（公斤）`).

Add `data-zh` and `data-my` to each `<option>`. The 15 options should become:

```html
<option value="kg（公斤）" data-zh="kg（公斤）" data-my="kg（ကီလိုဂရမ်）">kg（公斤）</option>
<option value="g（克）"   data-zh="g（克）"   data-my="g（ဂရမ်）">g（克）</option>
<option value="包"  data-zh="包"  data-my="ထုပ်">包</option>
<option value="盒"  data-zh="盒"  data-my="သေတ္တာ">盒</option>
<option value="瓶"  data-zh="瓶"  data-my="ပုလင်း">瓶</option>
<option value="桶"  data-zh="桶"  data-my="ပုံး">桶</option>
<option value="箱"  data-zh="箱"  data-my="ဘောက်စ်">箱</option>
<option value="袋"  data-zh="袋"  data-my="အိတ်">袋</option>
<option value="份"  data-zh="份"  data-my="ဆာဗစ်">份</option>
<option value="条"  data-zh="条"  data-my="ချောင်း">条</option>
<option value="罐"  data-zh="罐"  data-my="ဘူး">罐</option>
<option value="升（L）"   data-zh="升（L）"   data-my="လီတာ（L）">升（L）</option>
<option value="毫升（mL）" data-zh="毫升（mL）" data-my="မီလီလီတာ（mL）">毫升（mL）</option>
<option value="个"  data-zh="个"  data-my="ခု">个</option>
<option value="片"  data-zh="片"  data-my="ချပ်">片</option>
```

> IMPORTANT: Keep `value` attributes unchanged — they are sent to the backend.

### Step 9: Commit

```bash
git add CheckPage.html
git commit -m "@87 feat: add data-zh/my to add-item form labels + unit options"
```

---

## Task 5: JS — Dynamic Text in updateProgress / updateSubmitBtn / makeCard / renderItems / loadItems

**Files:**
- Modify: `CheckPage.html` — JS functions in the `<script>` block

### Step 1: `updateProgress()` — translate "已填:" prefix

Find the function that sets `filledCount.textContent`. Look for the line:

```javascript
document.getElementById('filledCount').textContent
```

Or search for `filledCount` in JS. The line will construct something like `'已填: ' + filled + ' / ' + total`.

Replace the hardcoded Chinese string with `t('progressPrefix')`:

```javascript
document.getElementById('filledCount').textContent = t('progressPrefix') + ' ' + filled + ' / ' + total;
```

### Step 2: `updateSubmitBtn()` — translate submit button text

Find the function that sets `submitBtn.textContent`. Look for:

```javascript
btn.textContent = '提交盘点';
```
and
```javascript
btn.textContent = '✅ 全部填完，提交';
```

Replace with `t()` calls:

```javascript
btn.textContent = t('submitBtn');
```
and
```javascript
btn.textContent = t('submitBtnAll') + ' (' + total + ')';
```

> Note: The current code has `'✅ 全部填完，提交 (' + total + ')'` — just replace the string literal part.

### Step 3: `makeCard()` — translate "现有:" label

Find inside `makeCard()`:

```javascript
'现有:'
```

Replace with `t('currentStock')`. There may be one or two occurrences inside `makeCard()` — replace all of them.

### Step 4: `renderItems()` — translate empty state text

Find inside `renderItems()` (or wherever the empty state message is built):

```javascript
'该分类暂无物品'
```

Replace with `t('noCategoryItems')`.

Also find the "noTasksToday" message. Search for `今日暂无分配` and replace that string literal with `t('noTasksToday')`.

### Step 5: `loadItems()` / `showLoading()` — translate loading message

Find:
```javascript
showLoading('正在加载盘点...')
```
or
```javascript
showLoading('正在加载盘点物品...')
```

Replace with:
```javascript
showLoading(t('loadingItems'))
```

### Step 6: Commit

```bash
git add CheckPage.html
git commit -m "@87 feat: t() in updateProgress/SubmitBtn/makeCard/renderItems"
```

---

## Task 6: JS — Category Options in openAddItemModal()

**Files:**
- Modify: `CheckPage.html` — `openAddItemModal()` function (around line 562)

### Step 1: Update category option display

Find the `catList.forEach` block inside `openAddItemModal()`:

```javascript
  catList.forEach(function(c) {
```

The body creates `<option>` elements. Find where `option.textContent` or `opt.textContent` or `option.text` is set, or where option value and text are set together.

Replace the option creation to show translated text while keeping Chinese value:

**Find the current option creation** (it will look something like):
```javascript
  catList.forEach(function(c) {
    var opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catSel.appendChild(opt);
  });
```

**Replace with:**
```javascript
  catList.forEach(function(c) {
    var opt = document.createElement('option');
    opt.value = c;                                           // keep Chinese for backend
    opt.textContent = CAT_KEYS[c] ? t(CAT_KEYS[c]) : c;   // translated display
    catSel.appendChild(opt);
  });
```

> `CAT_KEYS` was added in Task 1. If the category isn't in `CAT_KEYS` (custom category from sheet), it falls back to the raw Chinese name — correct behavior.

### Step 2: Verify

Check that `CAT_KEYS` is defined before `openAddItemModal()` is called (it was added at the top of the script in Task 1). ✓

### Step 3: Commit

```bash
git add CheckPage.html
git commit -m "@87 feat: translate category options in add-item modal"
```

---

## Task 7: JS — Toast Messages + Modal Strings

**Files:**
- Modify: `CheckPage.html` — `saveNewItem()`, `doSubmit()`, `doLogout()`, `confirmSubmit()`, and submit success handler

### Step 1: `saveNewItem()` — toast messages + button text

Find inside `saveNewItem()`:

```javascript
showToast('❌ 物品名称不能为空')
```
Replace with: `showToast(t('errNameEmpty'))`

```javascript
showToast('❌ 请填写每包件数')
```
Replace with: `showToast(t('errFillPkg'))`

```javascript
showToast('⚠️ 图片上传失败，物品仍将保存（无图）')
```
Replace with: `showToast(t('warnImgFail'))`

```javascript
showToast('✅ 物品已添加:' + name)
```
or similar. Replace with: `showToast(t('successAdded') + ' ' + name)`

Find where button text is reset inside `saveNewItem()` or `doCreate()`:

```javascript
btn.textContent = '+ 添加物品'
```
Replace with: `btn.textContent = t('addItemSaveBtn')`

### Step 2: `confirmSubmit()` — modal title + buttons

Find the `showModal(...)` call inside `confirmSubmit()`:

```javascript
showModal('✏️', '确认提交', msg, [
  { label: '确认提交', primary: true,  fn: doSubmit },
  { label: '继续盘点', primary: false, fn: closeModal }
]);
```

Replace string literals:
```javascript
showModal('✏️', t('confirmTitle'), msg, [
  { label: t('confirmTitle'), primary: true,  fn: doSubmit },
  { label: t('continueSurvey'), primary: false, fn: closeModal }
]);
```

Also translate the `msg` construction inside `confirmSubmit()`. Find the lines that build `msg` with strings like `'您填写了 <b>'`, `'项未填，将不提交'`, `'确认提交吗？'`. Replace each Chinese string literal with `t()` calls using keys added in STRINGS, OR keep these message body strings in Chinese if not in STRINGS (they are complex dynamic messages).

> For the dynamic `msg` body, it's acceptable to keep them in Chinese for V1 — the important strings are the title and buttons. If you want full translation, add these to STRINGS: `confirmMsgFilled: '您填写了 %n 项'`, etc. — but this is OPTIONAL for @87.

### Step 3: Submit success handler

Find the success handler in `doSubmit()` that builds the modal HTML. Look for:

```javascript
'<div class="modal-title" ...>提交成功！</div>'
```
and
```javascript
'已记录 <b>' + saved + '</b> 件盘点物品'
```
and
```javascript
'以下物品库存异常，请告知主管：'
```

Replace:
```javascript
t('successTitle')           // replaces '提交成功！'
t('successMsg').replace('%n', saved)  // replaces '已记录 %n 件...'
t('successAbnormal')        // replaces '以下物品...'
```

Find the "完成" button in the success modal:
```javascript
{ label: '完成', primary: true, fn: goLogin }
```
Replace with: `{ label: t('confirmBtn'), primary: true, fn: goLogin }`

Find the failure retry modal (search for `重试`):
```javascript
{ label: '重试', ... }
{ label: '取消', ... }
```
Replace with: `t('retryBtn')` and `t('cancelBtn')` respectively.

### Step 4: `doLogout()` — logout confirmation modal

Find in `doLogout()`:

```javascript
showModal('⚠️', '确认退出？',
  '您有未提交的草稿数据。<br>退出后，草稿将继续保留。', [
  { label: '退出登录', primary: false, fn: _doLogout },
  { label: '继续盘点', primary: true,  fn: closeModal }
]);
```

Replace with:
```javascript
showModal('⚠️', t('logoutTitle'),
  t('logoutBody'), [
  { label: t('logoutConfirm'),   primary: false, fn: _doLogout },
  { label: t('continueSurvey'),  primary: true,  fn: closeModal }
]);
```

### Step 5: Draft label JS setter

Search the file for where `draftLabel` text is set by JS (there may be a line like `document.getElementById('draftLabel').style.display = 'block'` with a nearby text assignment). If the text is only set in HTML (Task 3 added `data-zh/my` to it), no change needed. But if JS also sets `draftLabel.textContent`, replace that too:

```javascript
// if found, replace:
document.getElementById('draftLabel').textContent = '📝 草稿已保存';
// with:
document.getElementById('draftLabel').textContent = t('draftSaved');
```

### Step 6: `successSaved` in submit flow

If there is a toast that says `'✅ 已记录 X 件盘点物品'`, find it and replace:

```javascript
showToast('✅ 已记录 ' + count + ' 件盘点物品')
// Replace with:
showToast(t('successSaved').replace('%n', count))
```

### Step 7: Commit

```bash
git add CheckPage.html
git commit -m "@87 feat: t() in toasts, submit/logout/confirm modals"
```

---

## Task 8: Wire applyLang on Load + Deploy

**Files:**
- Modify: `CheckPage.html` — `window.addEventListener('load', ...)` block

### Step 1: Call applyLang() in the load handler

Find the existing `window.addEventListener('load', function() {` block (around line 498). It currently contains three lightbox event listeners. Add `applyLang()` as the first line:

```javascript
window.addEventListener('load', function() {
  applyLang();   // ← ADD THIS as first line
  document.getElementById('imgLightboxImg').addEventListener('click', function(e) {
    ...
```

### Step 2: Call applyLang() after items are rendered

Find `onItemsLoaded` (or the success handler for the `getCheckItems` / `loadItems` call). After items are set and rendered (after `renderItems()` is called there), call `applyLang()` to refresh dynamic text:

```javascript
// Inside onItemsLoaded or similar, after items are rendered:
applyLang();
```

> This ensures that if the user already set language to Burmese before items load, the cards and progress text render in Burmese.

### Step 3: Push and deploy

```bash
git add CheckPage.html
git commit -m "@87 feat: wire applyLang on load + after items render"
git push origin main
clasp push --force
clasp deploy --deploymentId AKfycbwpVx5_CQqDiFjq6x3bSEvGw3nEWjSt86vLshI7BpTAQhmDFYp_QddaoPdenHrAxVyr --description "@87 lang switcher: Chinese/Burmese CheckPage"
```

---

## Manual Verification Checklist

After deployment, test on mobile (Chrome):

| Test | Expected |
|------|----------|
| Open CheckPage in Chinese | All text Chinese, toggle shows `မြ` |
| Tap `မြ` button | All static text switches to Burmese, toggle shows `中` |
| Reload page | Burmese persists (localStorage) |
| Tap `中` | Switches back to Chinese |
| Switch language after items load | Item cards, progress, status update |
| Add item modal in Burmese | Labels, unit options, category options in Burmese |
| Submit confirmation in Burmese | Modal title + buttons in Burmese |
| Logout with draft in Burmese | Logout modal in Burmese |
| Toast on submit/save in Burmese | Toast in Burmese |
| AdminPage / Login / Dashboard | Unaffected (no change) |
