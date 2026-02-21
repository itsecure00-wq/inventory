/**
 * IMS_Backend.gs - 张重辉火锅 百万镇Permas Jaya 库存管理后端
 * 单店模式 - Branch固定 "百万镇Permas"
 * v2.0.0 - 新增员工分配、照片、管理后台、合并查询
 */

const IMS_CONFIG = {
  SS_ID: '1xOxPrvWT5XOxhupIRQtH7xM07aBh30S2H5M44iOHE5M',
  BRANCH: '百万镇Permas',
  TZ: 'Asia/Kuala_Lumpur',
  SHEETS: {
    ITEMS: 'Items_DB',
    CHECKS: 'Check_Records',
    PO: 'Purchase_Orders',
    ALERTS: 'Alerts',
    LOGS: 'Inventory_Log',
    STAFF: 'Staff_DB'
  },
  // Items_DB 列索引 (0-based)
  COL: {
    ID: 0, NAME: 1, CATEGORY: 2, UNIT: 3, MIN: 4, MAX: 5, QTY: 6,
    FREQ: 7, STATUS: 8, PRICE: 9, SUPPLIER: 10, BRANCH: 11,
    IMAGE: 12, LAST_CHECK: 13, LAST_UPDATE: 14, NOTES: 15
  },
  // Staff_DB 列索引 (0-based)
  STAFF_COL: {
    USERNAME: 0, PASSWORD: 1, ROLE: 2, PERMISSIONS: 3, NAME: 4, ASSIGNED_CATS: 5
  }
};

/** 获取 IMS Spreadsheet */
function getIMSSS_() {
  return SpreadsheetApp.openById(IMS_CONFIG.SS_ID);
}

/** 获取指定sheet */
function getSheet_(name) {
  return getIMSSS_().getSheetByName(name);
}

/** 格式化日期 */
function fmtDate_(date) {
  return Utilities.formatDate(date || new Date(), IMS_CONFIG.TZ, 'yyyy-MM-dd');
}

function fmtDateTime_(date) {
  return Utilities.formatDate(date || new Date(), IMS_CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
}

/** 今天是周几 (1=Mon ... 7=Sun) */
function getDayOfWeek_() {
  var d = new Date();
  var day = d.getDay(); // 0=Sun
  return day === 0 ? 7 : day;
}

/** 安全价格校验 (防脏数据) */
function safePrice_(val) {
  var p = Number(val) || 0;
  return (p > 0 && p < 100000) ? p : 0;
}

/** 安全数量校验 */
function safeQty_(val) {
  var q = Number(val) || 0;
  return q >= 0 ? q : 0;
}

/**
 * 验证用户角色权限
 * @param {string} username - 登录用户名
 * @param {Array} allowedRoles - ['Manager','Boss']
 * @returns {Object|false} 员工数据 or false
 */
function checkRole_(username, allowedRoles) {
  try {
    var sheet = getSheet_(IMS_CONFIG.SHEETS.STAFF);
    var data = sheet.getDataRange().getValues();
    var SC = IMS_CONFIG.STAFF_COL;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][SC.USERNAME]).trim() === String(username).trim()) {
        var role = data[i][SC.ROLE];
        if (allowedRoles.indexOf(role) >= 0) {
          return { username: data[i][SC.USERNAME], role: role, name: data[i][SC.NAME] };
        }
        return false;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

// ============================================================
// 1. getTodayCheckItems(staffName)
// ============================================================
/**
 * 根据员工分配和 Check_Freq 返回今天需要盘点的物品
 * Staff_DB 第5列 Assigned_Categories = 逗号分隔分类，空=全部
 * 每个物品包含 imageUrl 字段
 * @param {string} staffName - 员工用户名 (username)
 * @returns {Object} {items: [], todayTotal, categories, skippedCategories}
 */
function getTodayCheckItems(staffName) {
  try {
    var ss = getIMSSS_();
    var itemSheet = ss.getSheetByName(IMS_CONFIG.SHEETS.ITEMS);
    var staffSheet = ss.getSheetByName(IMS_CONFIG.SHEETS.STAFF);
    var data = itemSheet.getDataRange().getValues();
    var staffData = staffSheet.getDataRange().getValues();
    var today = fmtDate_();
    var dayOfWeek = getDayOfWeek_();
    var C = IMS_CONFIG.COL;
    var SC = IMS_CONFIG.STAFF_COL;

    // 查找员工分配的分类
    var assignedCats = null; // null = 全部
    var staffDisplayName = staffName;
    for (var s = 1; s < staffData.length; s++) {
      if (String(staffData[s][SC.USERNAME]).trim() === String(staffName).trim()) {
        staffDisplayName = staffData[s][SC.NAME] || staffName;
        var cats = String(staffData[s][SC.ASSIGNED_CATS] || '').trim();
        if (cats) {
          assignedCats = cats.split(',').map(function(c) { return c.trim(); }).filter(function(c) { return c; });
        }
        break;
      }
    }

    var items = [];
    var categories = {};
    var skipped = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[C.STATUS] !== 'Active') continue;

      var cat = row[C.CATEGORY] || '未分类';

      // 员工分配过滤
      if (assignedCats !== null && assignedCats.indexOf(cat) < 0) continue;

      var freq = String(row[C.FREQ]).toLowerCase();
      var lastCheck = row[C.LAST_CHECK] ? fmtDate_(new Date(row[C.LAST_CHECK])) : '';
      var needCheck = false;

      if (freq === 'daily') {
        needCheck = true;
      } else if (freq === 'weekly') {
        needCheck = (dayOfWeek === 1);
      } else if (freq === '3day') {
        if (!lastCheck) {
          needCheck = true;
        } else {
          var diff = Math.floor((new Date(today) - new Date(lastCheck)) / 86400000);
          needCheck = diff >= 3;
        }
      } else {
        needCheck = true; // 默认每天
      }

      if (needCheck) {
        var imageUrl = String(row[C.IMAGE] || '').trim();
        var item = {
          rowIndex: i + 1,
          id: row[C.ID],
          name: row[C.NAME],
          category: cat,
          unit: row[C.UNIT],
          currentQty: Number(row[C.QTY]) || 0,
          minStock: Number(row[C.MIN]) || 0,
          maxStock: Number(row[C.MAX]) || 0,
          freq: freq,
          imageUrl: imageUrl,
          checked: (lastCheck === today)
        };
        items.push(item);

        if (!categories[cat]) categories[cat] = { count: 0, checked: 0, freq: freq };
        categories[cat].count++;
        if (item.checked) categories[cat].checked++;
      } else {
        if (!skipped[cat]) skipped[cat] = { freq: freq, reason: freq === 'weekly' ? '每周一盘点' : '未到检查日' };
      }
    }

    return {
      success: true,
      staffName: staffDisplayName,
      date: today,
      items: items,
      todayTotal: items.length,
      todayChecked: items.filter(function(x) { return x.checked; }).length,
      categories: categories,
      skippedCategories: skipped,
      assignedCats: assignedCats
    };

  } catch (e) {
    Logger.log('getTodayCheckItems error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 2. submitCheckRecord(staffName, items)
// ============================================================
/**
 * 批量提交盘点记录
 * @param {string} staffName - 员工用户名
 * @param {Array} items - [{itemId, newQty}, ...]
 * @returns {Object} {updated, lowStockCount, abnormalCount, alerts}
 */
function submitCheckRecord(staffName, items) {
  try {
    var ss = getIMSSS_();
    var itemsSheet = ss.getSheetByName(IMS_CONFIG.SHEETS.ITEMS);
    var checkSheet = ss.getSheetByName(IMS_CONFIG.SHEETS.CHECKS);
    var itemsData = itemsSheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    var now = fmtDateTime_();

    var updated = 0;
    var lowStockItems = [];
    var highStockItems = [];
    var abnormalItems = [];
    var checkRows = [];
    var batchUpdates = [];

    // 建立 ID → row 映射
    var idMap = {};
    for (var i = 1; i < itemsData.length; i++) {
      idMap[itemsData[i][C.ID]] = i + 1;
    }

    for (var j = 0; j < items.length; j++) {
      var input = items[j];
      var rowNum = idMap[input.itemId];
      if (!rowNum) continue;

      var rowData = itemsData[rowNum - 1];
      var oldQty = Number(rowData[C.QTY]) || 0;
      var newQty = Number(input.newQty) || 0;
      var diff = newQty - oldQty;
      var itemName = rowData[C.NAME];
      var minStock = Number(rowData[C.MIN]) || 0;
      var maxStock = Number(rowData[C.MAX]) || 0;

      // 异常检测: 差异超过30%
      var alert = '';
      if (oldQty > 0) {
        var diffPct = Math.abs(diff) / oldQty;
        if (diffPct > 0.3) {
          alert = '异常差异 ' + Math.round(diffPct * 100) + '%';
          abnormalItems.push({ name: itemName, oldQty: oldQty, newQty: newQty, diff: diff, pct: Math.round(diffPct * 100) });
        }
      }

      // 低库存检测
      if (minStock > 0 && newQty < minStock) {
        lowStockItems.push({ name: itemName, qty: newQty, min: minStock, need: minStock - newQty, unit: rowData[C.UNIT] });
      }

      // 高库存检测
      if (maxStock > 0 && newQty > maxStock) {
        highStockItems.push({ name: itemName, qty: newQty, max: maxStock, excess: newQty - maxStock, unit: rowData[C.UNIT] });
      }

      checkRows.push([now, staffName, IMS_CONFIG.BRANCH, input.itemId, itemName, oldQty, newQty, diff, alert]);
      batchUpdates.push({ rowNum: rowNum, newQty: newQty, timestamp: now });
      updated++;
    }

    // 批量写入 Check_Records
    if (checkRows.length > 0) {
      checkSheet.getRange(checkSheet.getLastRow() + 1, 1, checkRows.length, 9).setValues(checkRows);
    }

    // 批量更新 Items_DB
    for (var b = 0; b < batchUpdates.length; b++) {
      var bu = batchUpdates[b];
      itemsSheet.getRange(bu.rowNum, C.QTY + 1).setValue(bu.newQty);
      itemsSheet.getRange(bu.rowNum, C.LAST_CHECK + 1, 1, 2).setValues([[bu.timestamp, bu.timestamp]]);
    }

    // 发送异常通知
    for (var k = 0; k < abnormalItems.length; k++) {
      try { sendAbnormalAlert(abnormalItems[k].name, abnormalItems[k].oldQty, abnormalItems[k].newQty); } catch (e) {}
    }

    return {
      success: true,
      updated: updated,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems,
      highStockCount: highStockItems.length,
      highStockItems: highStockItems,
      abnormalCount: abnormalItems.length,
      abnormalItems: abnormalItems,
      staffName: staffName,
      timestamp: now
    };

  } catch (e) {
    Logger.log('submitCheckRecord error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 3. getLowStockItems()
// ============================================================
function getLowStockItems() {
  try {
    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data = sheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    var items = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[C.STATUS] !== 'Active') continue;

      var qty = safeQty_(row[C.QTY]);
      var min = safeQty_(row[C.MIN]);
      var max = safeQty_(row[C.MAX]);
      var price = safePrice_(row[C.PRICE]);

      if (qty < min && min > 0) {
        var need = Math.max(0, max - qty);
        if (need === 0) need = min - qty;
        items.push({
          id: row[C.ID], name: row[C.NAME], category: row[C.CATEGORY],
          unit: row[C.UNIT], currentQty: qty, minStock: min, maxStock: max,
          need: need, price: price, totalCost: Math.round(need * price * 100) / 100,
          supplier: row[C.SUPPLIER],
          urgency: min > 0 ? Math.round((qty / min) * 100) : 0
        });
      }
    }

    items.sort(function(a, b) { return a.urgency - b.urgency; });
    return { success: true, items: items, count: items.length };

  } catch (e) {
    Logger.log('getLowStockItems error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 4. getHighStockItems()
// ============================================================
function getHighStockItems() {
  try {
    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data = sheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    var items = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[C.STATUS] !== 'Active') continue;
      var qty = safeQty_(row[C.QTY]);
      var max = safeQty_(row[C.MAX]);
      if (qty > max && max > 0) {
        items.push({ id: row[C.ID], name: row[C.NAME], category: row[C.CATEGORY], unit: row[C.UNIT], currentQty: qty, maxStock: max, excess: qty - max });
      }
    }

    return { success: true, items: items, count: items.length };

  } catch (e) {
    Logger.log('getHighStockItems error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 5. generatePurchaseOrder()
// ============================================================
function generatePurchaseOrder() {
  try {
    var lowResult = getLowStockItems();
    if (!lowResult.success || lowResult.count === 0) {
      return { success: true, message: '没有需要补货的物品', itemCount: 0, totalCost: 0 };
    }

    var poSheet = getSheet_(IMS_CONFIG.SHEETS.PO);
    var today = fmtDate_();
    var timeStr = Utilities.formatDate(new Date(), IMS_CONFIG.TZ, 'HHmmss');
    var poId = 'PO-' + today.replace(/-/g, '') + '-' + timeStr;
    var rows = [];
    var totalCost = 0;

    for (var i = 0; i < lowResult.items.length; i++) {
      var item = lowResult.items[i];
      totalCost += item.totalCost;
      rows.push([poId, today, IMS_CONFIG.BRANCH, item.id, item.name, item.currentQty, item.need, item.unit, item.price, item.totalCost, item.supplier, '待采购', 'System']);
    }

    if (rows.length > 0) {
      poSheet.getRange(poSheet.getLastRow() + 1, 1, rows.length, 13).setValues(rows);
    }

    return { success: true, poId: poId, itemCount: rows.length, totalCost: Math.round(totalCost * 100) / 100, items: lowResult.items, date: today };

  } catch (e) {
    Logger.log('generatePurchaseOrder error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 6. getStockDashboard()
// ============================================================
function getStockDashboard() {
  try {
    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data = sheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    var today = fmtDate_();

    var total = 0, lowCount = 0, highCount = 0, normalCount = 0;
    var todayChecked = 0, todayTotal = 0, totalValue = 0;
    var categoryStats = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[C.STATUS] !== 'Active') continue;
      total++;
      var qty = safeQty_(row[C.QTY]);
      var min = safeQty_(row[C.MIN]);
      var max = safeQty_(row[C.MAX]);
      var price = safePrice_(row[C.PRICE]);
      var cat = row[C.CATEGORY] || '未分类';
      var freq = String(row[C.FREQ]).toLowerCase();

      if (qty < min && min > 0) lowCount++;
      else if (qty > max && max > 0) highCount++;
      else normalCount++;

      totalValue += qty * price;

      var needCheck = false;
      if (freq === 'daily') needCheck = true;
      else if (freq === 'weekly' && getDayOfWeek_() === 1) needCheck = true;
      else if (freq === '3day') {
        var lc = row[C.LAST_CHECK];
        if (!lc) needCheck = true;
        else { var d2 = Math.floor((new Date(today) - new Date(fmtDate_(new Date(lc)))) / 86400000); needCheck = d2 >= 3; }
      }

      if (needCheck) {
        todayTotal++;
        var lc2 = row[C.LAST_CHECK] ? fmtDate_(new Date(row[C.LAST_CHECK])) : '';
        if (lc2 === today) todayChecked++;
      }

      if (!categoryStats[cat]) categoryStats[cat] = { total: 0, low: 0, high: 0 };
      categoryStats[cat].total++;
      if (qty < min && min > 0) categoryStats[cat].low++;
      if (qty > max && max > 0) categoryStats[cat].high++;
    }

    var poSheet = getSheet_(IMS_CONFIG.SHEETS.PO);
    var poData = poSheet.getDataRange().getValues();
    var pendingPO = 0, pendingCost = 0;
    for (var j = 1; j < poData.length; j++) {
      if (poData[j][11] === '待采购') { pendingPO++; pendingCost += Number(poData[j][9]) || 0; }
    }

    return {
      success: true, date: today, branch: IMS_CONFIG.BRANCH,
      total: total, lowCount: lowCount, highCount: highCount, normalCount: normalCount,
      todayChecked: todayChecked, todayTotal: todayTotal,
      checkProgress: todayTotal > 0 ? Math.round(todayChecked / todayTotal * 100) : 100,
      totalValue: Math.round(totalValue * 100) / 100,
      pendingPO: pendingPO, pendingCost: Math.round(pendingCost * 100) / 100,
      categoryStats: categoryStats
    };

  } catch (e) {
    Logger.log('getStockDashboard error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 7. getDashboardAll() - 合并查询，单次调用返回全部看板数据
// ============================================================
/**
 * 一次性返回看板所需的全部数据（原来4次调用合并为1次）
 * 减少加载时间从 8~16s 到 2~4s
 */
function getDashboardAll() {
  try {
    var ss = getIMSSS_();
    var itemSheet  = ss.getSheetByName(IMS_CONFIG.SHEETS.ITEMS);
    var checkSheet = ss.getSheetByName(IMS_CONFIG.SHEETS.CHECKS);
    var poSheet    = ss.getSheetByName(IMS_CONFIG.SHEETS.PO);

    // 若必要表不存在则直接报错（友好提示）
    if (!itemSheet) return { success: false, error: 'Items_DB 表不存在，请检查 Google Sheets' };

    // 诊断：先测试返回简单对象，确认 google.script.run 基础调用正常
    // return { success: true, _diag: 'step0_ok', total:0, lowCount:0, highCount:0, normalCount:0,
    //   todayChecked:0, todayTotal:0, checkProgress:100, totalValue:0, pendingPO:0, pendingCost:0,
    //   categoryStats:{}, lowItems:[], highItems:[], allItems:[], poList:[], recentHistory:[], date:'', branch:'' };

    var data = itemSheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    var today = fmtDate_();

    // 统计变量
    var total = 0, lowCount = 0, highCount = 0, normalCount = 0;
    var todayChecked = 0, todayTotal = 0, totalValue = 0;
    var categoryStats = {};
    var lowItems = [], highItems = [], allItems = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[C.STATUS] !== 'Active') continue;
      total++;

      var qty = safeQty_(row[C.QTY]);
      var min = safeQty_(row[C.MIN]);
      var max = safeQty_(row[C.MAX]);
      var price = safePrice_(row[C.PRICE]);
      var cat = row[C.CATEGORY] || '未分类';
      var freq = String(row[C.FREQ]).toLowerCase();
      var isLow = (qty < min && min > 0);
      var isHigh = (qty > max && max > 0);

      if (isLow) lowCount++;
      else if (isHigh) highCount++;
      else normalCount++;

      totalValue += qty * price;

      // 盘点进度
      var needCheck = false;
      var lcRaw = row[C.LAST_CHECK];
      var lcDate = lcRaw ? (lcRaw instanceof Date ? lcRaw : new Date(lcRaw)) : null;
      var lcIsValid = lcDate && !isNaN(lcDate.getTime());
      var lcStr = lcIsValid ? fmtDate_(lcDate) : '';

      if (freq === 'daily') needCheck = true;
      else if (freq === 'weekly' && getDayOfWeek_() === 1) needCheck = true;
      else if (freq === '3day') {
        if (!lcIsValid) needCheck = true;
        else { var dDiff = Math.floor((new Date(today) - new Date(lcStr)) / 86400000); needCheck = dDiff >= 3; }
      } else { needCheck = true; }  // 默认 daily

      if (needCheck) {
        todayTotal++;
        if (lcStr === today) todayChecked++;
      }

      // 分类统计
      if (!categoryStats[cat]) categoryStats[cat] = { total: 0, low: 0, high: 0 };
      categoryStats[cat].total++;
      if (isLow) categoryStats[cat].low++;
      if (isHigh) categoryStats[cat].high++;

      // 低库存列表
      if (isLow) {
        var need = Math.max(0, max - qty);
        if (need === 0) need = min - qty;
        lowItems.push({
          id: row[C.ID], name: row[C.NAME], category: cat, unit: row[C.UNIT],
          currentQty: qty, minStock: min, maxStock: max, need: need,
          price: price, totalCost: Math.round(need * price * 100) / 100,
          supplier: row[C.SUPPLIER], urgency: min > 0 ? Math.round((qty / min) * 100) : 0
        });
      }

      // 高库存列表
      if (isHigh) {
        highItems.push({ id: row[C.ID], name: row[C.NAME], category: cat, unit: row[C.UNIT], currentQty: qty, maxStock: max, excess: qty - max });
      }

      // 全部库存
      allItems.push({
        id: row[C.ID], name: row[C.NAME], category: cat, unit: row[C.UNIT],
        currentQty: qty, minStock: min, maxStock: max, price: price,
        supplier: row[C.SUPPLIER], freq: freq, status: row[C.STATUS],
        lastUpdate: String(row[C.LAST_UPDATE] || '').slice(0, 10),
        imageUrl: String(row[C.IMAGE] || '').trim()
      });
    }

    lowItems.sort(function(a, b) { return a.urgency - b.urgency; });

    // 采购单统计（Purchase_Orders 表可能不存在或为空）
    var pendingPO = 0, pendingCost = 0;
    var poList = [];
    if (poSheet) {
      var poData = poSheet.getDataRange().getValues();
      for (var j = 1; j < poData.length; j++) {
        if (!poData[j][0]) continue;
        if (poData[j][11] === '待采购') { pendingPO++; pendingCost += Number(poData[j][9]) || 0; }
        var poDateRaw = poData[j][1];
        var poDateStr = poDateRaw instanceof Date
          ? Utilities.formatDate(poDateRaw, IMS_CONFIG.TZ, 'yyyy-MM-dd')
          : String(poDateRaw || '');
        poList.push({
          poId:       String(poData[j][0]  || ''),
          date:       poDateStr,
          itemName:   String(poData[j][4]  || ''),
          currentQty: Number(poData[j][5]) || 0,
          need:       Number(poData[j][6]) || 0,
          unit:       String(poData[j][7]  || ''),
          price:      Number(poData[j][8]) || 0,
          total:      Number(poData[j][9]) || 0,
          supplier:   String(poData[j][10] || ''),
          status:     String(poData[j][11] || '')
        });
      }
    }

    // 最近7天盘点历史（Check_Records 表可能不存在或为空）
    var historyByDate = {};
    var sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (checkSheet) {
      var checkData = checkSheet.getDataRange().getValues();
      for (var k = 1; k < checkData.length; k++) {
        if (!checkData[k][0]) continue;
        try {
          var ts = checkData[k][0] instanceof Date ? checkData[k][0] : new Date(checkData[k][0]);
          if (isNaN(ts.getTime())) continue;      // 跳过无效日期
          if (ts < sevenDaysAgo) continue;
          var dateKey = fmtDate_(ts);
          var staff   = checkData[k][1] || '';
          var alertVal = checkData[k][8] || '';
          if (!historyByDate[dateKey]) historyByDate[dateKey] = { date: dateKey, staffSet: {}, itemCount: 0, abnormalCount: 0 };
          historyByDate[dateKey].staffSet[staff] = true;
          historyByDate[dateKey].itemCount++;
          if (alertVal) historyByDate[dateKey].abnormalCount++;
        } catch (rowErr) { /* 跳过有问题的行 */ }
      }
    }
    var recentHistory = Object.keys(historyByDate).sort().reverse().map(function(d) {
      var h = historyByDate[d];
      return { date: d, staff: Object.keys(h.staffSet).join(', '), itemCount: h.itemCount, abnormalCount: h.abnormalCount };
    });

    return {
      success: true,
      date: today,
      branch: IMS_CONFIG.BRANCH,
      // 统计
      total: total, lowCount: lowCount, highCount: highCount, normalCount: normalCount,
      todayChecked: todayChecked, todayTotal: todayTotal,
      checkProgress: todayTotal > 0 ? Math.round(todayChecked / todayTotal * 100) : 100,
      totalValue: Math.round(totalValue * 100) / 100,
      pendingPO: pendingPO, pendingCost: Math.round(pendingCost * 100) / 100,
      categoryStats: categoryStats,
      // 列表
      lowItems: lowItems,
      highItems: highItems,
      allItems: allItems,
      poList: poList,
      recentHistory: recentHistory
    };

  } catch (e) {
    Logger.log('getDashboardAll error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 8. getRecentCheckHistory(days)
// ============================================================
/**
 * 获取最近 N 天的盘点历史（按日期聚合）
 */
function getRecentCheckHistory(days) {
  try {
    var n = Number(days) || 30;
    var checkSheet = getSheet_(IMS_CONFIG.SHEETS.CHECKS);
    if (!checkSheet) return { success: true, history: [], days: n };

    var data = checkSheet.getDataRange().getValues();
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - n);

    var byDate = {};
    for (var i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;
      try {
        var ts = data[i][0] instanceof Date ? data[i][0] : new Date(data[i][0]);
        if (isNaN(ts.getTime())) continue;
        if (ts < cutoff) continue;
        var dateKey = fmtDate_(ts);
        var staff = data[i][1] || '';
        var alertStr = data[i][8] || '';
        if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey, staffSet: {}, itemCount: 0, abnormalCount: 0 };
        byDate[dateKey].staffSet[staff] = true;
        byDate[dateKey].itemCount++;
        if (alertStr) byDate[dateKey].abnormalCount++;
      } catch (rowErr) { /* 跳过有问题的行 */ }
    }

    var result = Object.keys(byDate).sort().reverse().map(function(d) {
      var h = byDate[d];
      return { date: d, staff: Object.keys(h.staffSet).join(', '), itemCount: h.itemCount, abnormalCount: h.abnormalCount };
    });

    return { success: true, history: result, days: n };

  } catch (e) {
    Logger.log('getRecentCheckHistory error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 9. updateItem(username, itemId, fields) — 需要 Manager/Boss
// ============================================================
/**
 * 更新物品参数（最低/最高库存、价格、供应商、频率、状态）
 * @param {string} username - 操作员用户名（权限检查）
 * @param {string} itemId - 物品ID
 * @param {Object} fields - {minStock, maxStock, price, supplier, freq, status, notes}
 */
function updateItem(username, itemId, fields) {
  try {
    if (!checkRole_(username, ['Manager', 'Boss'])) {
      return { success: false, error: '权限不足，需要 Manager 或 Boss 角色' };
    }

    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data = sheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    var now = fmtDateTime_();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][C.ID]) === String(itemId)) {
        var row = i + 1;
        if (fields.name     !== undefined && String(fields.name).trim())
          sheet.getRange(row, C.NAME + 1).setValue(String(fields.name).trim());
        if (fields.category !== undefined && String(fields.category).trim())
          sheet.getRange(row, C.CATEGORY + 1).setValue(String(fields.category).trim());
        if (fields.imageUrl !== undefined)
          sheet.getRange(row, C.IMAGE + 1).setValue(String(fields.imageUrl));
        if (fields.minStock !== undefined) sheet.getRange(row, C.MIN + 1).setValue(Number(fields.minStock) || 0);
        if (fields.maxStock !== undefined) sheet.getRange(row, C.MAX + 1).setValue(Number(fields.maxStock) || 0);
        if (fields.price !== undefined) sheet.getRange(row, C.PRICE + 1).setValue(Number(fields.price) || 0);
        if (fields.supplier !== undefined) sheet.getRange(row, C.SUPPLIER + 1).setValue(fields.supplier);
        if (fields.freq !== undefined) sheet.getRange(row, C.FREQ + 1).setValue(fields.freq);
        if (fields.status !== undefined) sheet.getRange(row, C.STATUS + 1).setValue(fields.status);
        if (fields.notes !== undefined) sheet.getRange(row, C.NOTES + 1).setValue(fields.notes);
        sheet.getRange(row, C.LAST_UPDATE + 1).setValue(now);
        return { success: true, itemId: itemId, updatedBy: username, timestamp: now };
      }
    }

    return { success: false, error: '物品不存在: ' + itemId };

  } catch (e) {
    Logger.log('updateItem error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 9-B. deleteItem(username, itemId) — Manager/Boss
// ============================================================
function deleteItem(username, itemId) {
  try {
    if (!checkRole_(username, ['Manager', 'Boss'])) {
      return { success: false, error: '权限不足，需要 Manager 或 Boss 角色' };
    }
    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data  = sheet.getDataRange().getValues();
    var C     = IMS_CONFIG.COL;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][C.ID]) === String(itemId)) {
        sheet.deleteRow(i + 1);
        return { success: true, itemId: itemId };
      }
    }
    return { success: false, error: '物品不存在: ' + itemId };
  } catch (e) {
    Logger.log('deleteItem error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 9-C. adjustStock(username, itemId, delta, reason) — Manager/Boss
// ============================================================
function adjustStock(username, itemId, delta, reason) {
  try {
    if (!checkRole_(username, ['Manager', 'Boss'])) {
      return { success: false, error: '权限不足，需要 Manager 或 Boss 角色' };
    }
    var d = Number(delta);
    if (isNaN(d) || d === 0) return { success: false, error: '调整数量不能为零' };

    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data  = sheet.getDataRange().getValues();
    var C     = IMS_CONFIG.COL;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][C.ID]) === String(itemId)) {
        var oldQty = safeQty_(data[i][C.QTY]);
        var newQty = Math.max(0, oldQty + d);
        var now    = fmtDateTime_();
        sheet.getRange(i + 1, C.QTY + 1).setValue(newQty);
        sheet.getRange(i + 1, C.LAST_UPDATE + 1).setValue(now);
        // 写入 Inventory_Log（容错，不影响主流程）
        try {
          var logSheet = getSheet_(IMS_CONFIG.SHEETS.LOGS);
          if (logSheet) {
            logSheet.appendRow([now, username, String(data[i][C.ID]), String(data[i][C.NAME]),
                                 oldQty, newQty, d, reason || '手动调整']);
          }
        } catch(le) { /* ignore */ }
        return { success: true, itemId: itemId, oldQty: oldQty, newQty: newQty };
      }
    }
    return { success: false, error: '物品不存在: ' + itemId };
  } catch (e) {
    Logger.log('adjustStock error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 10. getItemsForAdmin(username) — 需要 Manager/Boss
// ============================================================
/**
 * 返回全部物品（含全部字段），供管理后台使用
 */
function getItemsForAdmin(username) {
  try {
    if (!checkRole_(username, ['Manager', 'Boss'])) {
      return { success: false, error: '权限不足' };
    }

    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data = sheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    var items = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[C.ID]) continue;
      items.push({
        id: row[C.ID], name: row[C.NAME], category: row[C.CATEGORY],
        unit: row[C.UNIT], minStock: safeQty_(row[C.MIN]), maxStock: safeQty_(row[C.MAX]),
        currentQty: safeQty_(row[C.QTY]), freq: row[C.FREQ], status: row[C.STATUS],
        price: safePrice_(row[C.PRICE]), supplier: row[C.SUPPLIER], branch: row[C.BRANCH],
        imageUrl: String(row[C.IMAGE] || '').trim(),
        lastCheck: row[C.LAST_CHECK] ? fmtDateTime_(new Date(row[C.LAST_CHECK])) : '',
        notes: row[C.NOTES] || ''
      });
    }

    return { success: true, items: items, count: items.length };

  } catch (e) {
    Logger.log('getItemsForAdmin error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 11. getStaffList(username) — 需要 Manager/Boss
// ============================================================
/**
 * 返回员工列表（不含密码），含 Assigned_Categories
 */
function getStaffList(username) {
  try {
    if (!checkRole_(username, ['Manager', 'Boss'])) {
      return { success: false, error: '权限不足' };
    }

    var sheet = getSheet_(IMS_CONFIG.SHEETS.STAFF);
    var data = sheet.getDataRange().getValues();
    var SC = IMS_CONFIG.STAFF_COL;
    var staff = [];

    for (var i = 1; i < data.length; i++) {
      if (!data[i][SC.USERNAME]) continue;
      staff.push({
        username: data[i][SC.USERNAME],
        role: data[i][SC.ROLE],
        permissions: data[i][SC.PERMISSIONS],
        name: data[i][SC.NAME],
        assignedCats: String(data[i][SC.ASSIGNED_CATS] || '').trim()
      });
    }

    return { success: true, staff: staff };

  } catch (e) {
    Logger.log('getStaffList error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 12. updateStaffAssignment(username, targetUsername, categories)
// ============================================================
/**
 * 更新员工的分配分类
 * @param {string} username - 操作员（Manager/Boss）
 * @param {string} targetUsername - 被更新的员工用户名
 * @param {string} categories - 逗号分隔的分类，空=全部
 */
function updateStaffAssignment(username, targetUsername, categories) {
  try {
    if (!checkRole_(username, ['Manager', 'Boss'])) {
      return { success: false, error: '权限不足' };
    }

    var sheet = getSheet_(IMS_CONFIG.SHEETS.STAFF);
    var data = sheet.getDataRange().getValues();
    var SC = IMS_CONFIG.STAFF_COL;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][SC.USERNAME]).trim() === String(targetUsername).trim()) {
        sheet.getRange(i + 1, SC.ASSIGNED_CATS + 1).setValue(categories || '');
        return { success: true, username: targetUsername, categories: categories };
      }
    }

    return { success: false, error: '员工不存在: ' + targetUsername };

  } catch (e) {
    Logger.log('updateStaffAssignment error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 13-A. createStaff(callerUsername, staffData) — Boss only
// ============================================================
function createStaff(callerUsername, staffData) {
  try {
    if (!checkRole_(callerUsername, ['Boss'])) {
      return { success: false, error: '权限不足，只有 Boss 可以创建账号' };
    }
    var username     = String(staffData.username     || '').trim();
    var password     = String(staffData.password     || '').trim();
    var name         = String(staffData.name         || '').trim();
    var role         = String(staffData.role         || 'Staff').trim();
    var assignedCats = String(staffData.assignedCats || '').trim();

    if (!username) return { success: false, error: '用户名不能为空' };
    if (!password) return { success: false, error: '密码不能为空' };
    if (!name)     return { success: false, error: '姓名不能为空' };
    if (['Boss','Manager','Staff'].indexOf(role) < 0) return { success: false, error: '无效角色: ' + role };

    var sheet = getSheet_(IMS_CONFIG.SHEETS.STAFF);
    var data  = sheet.getDataRange().getValues();
    var SC    = IMS_CONFIG.STAFF_COL;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][SC.USERNAME]).trim().toLowerCase() === username.toLowerCase()) {
        return { success: false, error: '用户名已存在: ' + username };
      }
    }

    var newRow = ['', '', '', '', '', ''];
    var roleDefaults_ = {
      'Boss':    { pages: ['check','dashboard','admin'], adminTabs: [0,1,2,3,4] },
      'Manager': { pages: ['dashboard','admin'],         adminTabs: [0,1,2,3]   },
      'Staff':   { pages: ['check'],                     adminTabs: []           }
    };
    var permsJson = (staffData.permissions && typeof staffData.permissions === 'string')
      ? staffData.permissions
      : JSON.stringify(roleDefaults_[role] || roleDefaults_['Staff']);

    newRow[SC.USERNAME]      = username;
    newRow[SC.PASSWORD]      = password;
    newRow[SC.ROLE]          = role;
    newRow[SC.PERMISSIONS]   = permsJson;
    newRow[SC.NAME]          = name;
    newRow[SC.ASSIGNED_CATS] = assignedCats;
    sheet.appendRow(newRow);
    return { success: true, username: username };
  } catch (e) {
    Logger.log('createStaff error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 13-B. updateStaff(callerUsername, targetUsername, fields) — Boss only
// ============================================================
function updateStaff(callerUsername, targetUsername, fields) {
  try {
    if (!checkRole_(callerUsername, ['Boss'])) {
      return { success: false, error: '权限不足，只有 Boss 可以修改账号' };
    }
    var role = fields.role ? String(fields.role).trim() : null;
    if (role && ['Boss','Manager','Staff'].indexOf(role) < 0) return { success: false, error: '无效角色: ' + role };

    var sheet = getSheet_(IMS_CONFIG.SHEETS.STAFF);
    var data  = sheet.getDataRange().getValues();
    var SC    = IMS_CONFIG.STAFF_COL;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][SC.USERNAME]).trim() === String(targetUsername).trim()) {
        var rowNum = i + 1;
        if (fields.name && String(fields.name).trim()) {
          sheet.getRange(rowNum, SC.NAME + 1).setValue(String(fields.name).trim());
        }
        if (role) {
          sheet.getRange(rowNum, SC.ROLE + 1).setValue(role);
          var dp_ = {
            'Boss':    { pages: ['check','dashboard','admin'], adminTabs: [0,1,2,3,4] },
            'Manager': { pages: ['dashboard','admin'],         adminTabs: [0,1,2,3]   },
            'Staff':   { pages: ['check'],                     adminTabs: []           }
          };
          sheet.getRange(rowNum, SC.PERMISSIONS + 1).setValue(
            (fields.permissions && typeof fields.permissions === 'string')
              ? fields.permissions
              : JSON.stringify(dp_[role] || dp_['Staff'])
          );
        }
        if (!role && fields.permissions && typeof fields.permissions === 'string') {
          sheet.getRange(rowNum, SC.PERMISSIONS + 1).setValue(fields.permissions);
        }
        if (fields.password && String(fields.password).trim()) {
          sheet.getRange(rowNum, SC.PASSWORD + 1).setValue(String(fields.password).trim());
        }
        if (fields.assignedCats !== undefined) {
          sheet.getRange(rowNum, SC.ASSIGNED_CATS + 1).setValue(String(fields.assignedCats || '').trim());
        }
        return { success: true, username: targetUsername };
      }
    }
    return { success: false, error: '员工不存在: ' + targetUsername };
  } catch (e) {
    Logger.log('updateStaff error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 13-C. deleteStaff(callerUsername, targetUsername) — Boss only
// ============================================================
function deleteStaff(callerUsername, targetUsername) {
  try {
    if (!checkRole_(callerUsername, ['Boss'])) {
      return { success: false, error: '权限不足，只有 Boss 可以删除账号' };
    }
    if (String(callerUsername).trim() === String(targetUsername).trim()) {
      return { success: false, error: '不能删除自己的账号' };
    }
    var sheet = getSheet_(IMS_CONFIG.SHEETS.STAFF);
    var data  = sheet.getDataRange().getValues();
    var SC    = IMS_CONFIG.STAFF_COL;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][SC.USERNAME]).trim() === String(targetUsername).trim()) {
        sheet.deleteRow(i + 1);
        return { success: true, username: targetUsername };
      }
    }
    return { success: false, error: '员工不存在: ' + targetUsername };
  } catch (e) {
    Logger.log('deleteStaff error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 14-A. uploadItemPhoto(callerUsername, base64Data, mimeType, filename) — Manager/Boss
// ============================================================
function uploadItemPhoto(callerUsername, base64Data, mimeType, filename) {
  try {
    if (!checkRole_(callerUsername, ['Manager', 'Boss'])) {
      return { success: false, error: '权限不足，只有 Manager/Boss 可上传图片' };
    }
    var folder = DriveApp.getFolderById('1KpF9LC2z-CrBw2itPMPRf2T-Sp-fsSdm');
    var blob   = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { success: true, url: 'https://drive.google.com/uc?id=' + file.getId() };
  } catch (e) {
    Logger.log('uploadItemPhoto error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 14-B. createItem(callerUsername, itemData) — Manager/Boss
// ============================================================
function createItem(callerUsername, itemData) {
  try {
    if (!checkRole_(callerUsername, ['Manager', 'Boss'])) {
      return { success: false, error: '权限不足，只有 Manager/Boss 可添加物品' };
    }
    var name = String(itemData.name || '').trim();
    if (!name) return { success: false, error: '物品名称不能为空' };

    var sheet  = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var COL    = IMS_CONFIG.COL;
    var itemId = 'ITEM-' + Date.now();
    var now    = fmtDateTime_(new Date());

    var newRow = new Array(16);
    newRow[COL.ID]          = itemId;
    newRow[COL.NAME]        = name;
    newRow[COL.CATEGORY]    = String(itemData.category || '').trim();
    newRow[COL.UNIT]        = String(itemData.unit || '').trim();
    newRow[COL.MIN]         = 0;
    newRow[COL.MAX]         = 0;
    newRow[COL.QTY]         = 0;
    newRow[COL.FREQ]        = 'daily';
    newRow[COL.STATUS]      = 'Active';
    newRow[COL.PRICE]       = 0;
    newRow[COL.SUPPLIER]    = '';
    newRow[COL.BRANCH]      = IMS_CONFIG.BRANCH;
    newRow[COL.IMAGE]       = String(itemData.imageUrl || '');
    newRow[COL.LAST_CHECK]  = '';
    newRow[COL.LAST_UPDATE] = now;
    newRow[COL.NOTES]       = '';

    sheet.appendRow(newRow);
    return { success: true, itemId: itemId };
  } catch (e) {
    Logger.log('createItem error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 13. getPurchaseOrders(username) — 需要 Manager/Boss
// ============================================================
/**
 * 获取采购单列表
 */
function getPurchaseOrders(username) {
  try {
    if (!checkRole_(username, ['Manager', 'Boss'])) {
      return { success: false, error: '权限不足' };
    }

    var sheet = getSheet_(IMS_CONFIG.SHEETS.PO);
    var data = sheet.getDataRange().getValues();
    var orders = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      var poId = row[0];
      if (!orders[poId]) {
        orders[poId] = { poId: poId, date: row[1], branch: row[2], status: row[11], items: [], totalCost: 0 };
      }
      orders[poId].items.push({ itemName: row[4], currentQty: row[5], need: row[6], unit: row[7], price: row[8], lineTotal: row[9], supplier: row[10] });
      orders[poId].totalCost += Number(row[9]) || 0;
    }

    var list = Object.values(orders).sort(function(a, b) { return b.date > a.date ? 1 : -1; });
    return { success: true, orders: list };

  } catch (e) {
    Logger.log('getPurchaseOrders error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 14. updatePOStatus(poId, status) — 原有函数保留
// ============================================================
function updatePOStatus(poId, status) {
  try {
    var sheet = getSheet_(IMS_CONFIG.SHEETS.PO);
    var data = sheet.getDataRange().getValues();
    var updated = 0;
    var itemsToStock = [];

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === poId) {
        if (status === '已到货' && data[i][11] === '已到货') continue;
        sheet.getRange(i + 1, 12).setValue(status);
        updated++;
        if (status === '已到货') {
          itemsToStock.push({ itemId: data[i][3], orderQty: Number(data[i][6]) || 0 });
        }
      }
    }

    for (var j = 0; j < itemsToStock.length; j++) {
      addStock_(itemsToStock[j].itemId, itemsToStock[j].orderQty);
    }

    return { success: true, updated: updated, poId: poId, newStatus: status };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** 到货入库 */
function addStock_(itemId, qty) {
  try {
    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data = sheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    for (var i = 1; i < data.length; i++) {
      if (data[i][C.ID] === itemId) {
        var newQty = safeQty_(data[i][C.QTY]) + qty;
        sheet.getRange(i + 1, C.QTY + 1).setValue(newQty);
        sheet.getRange(i + 1, C.LAST_UPDATE + 1).setValue(fmtDateTime_());
        return true;
      }
    }
  } catch (e) {
    Logger.log('addStock_ error: ' + e.message);
  }
  return false;
}

// ============================================================
// 15. getCheckProgress(date) — 原有函数保留
// ============================================================
function getCheckProgress(date) {
  try {
    var targetDate = date || fmtDate_();
    var checkSheet = getSheet_(IMS_CONFIG.SHEETS.CHECKS);
    var checkData = checkSheet.getDataRange().getValues();
    var checkedIds = {};
    var lastStaff = '', lastTime = '';

    for (var i = 1; i < checkData.length; i++) {
      var ts = checkData[i][0];
      if (!ts) continue;
      var checkDate = fmtDate_(new Date(ts));
      if (checkDate === targetDate) {
        checkedIds[checkData[i][3]] = true;
        lastStaff = checkData[i][1];
        lastTime = fmtDateTime_(new Date(ts));
      }
    }

    var todayItems = getTodayCheckItems('system');
    var total = todayItems.success ? todayItems.todayTotal : 0;
    var done = Object.keys(checkedIds).length;

    return { success: true, done: done, total: total, percent: total > 0 ? Math.round(done / total * 100) : 100, lastStaff: lastStaff, lastTime: lastTime, date: targetDate };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// 16. getItemsByCategory(category) — 原有函数保留
// ============================================================
function getItemsByCategory(category) {
  try {
    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data = sheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    var items = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[C.STATUS] !== 'Active') continue;
      if (category && row[C.CATEGORY] !== category) continue;
      items.push({
        id: row[C.ID], name: row[C.NAME], category: row[C.CATEGORY], unit: row[C.UNIT],
        currentQty: Number(row[C.QTY]) || 0, minStock: Number(row[C.MIN]) || 0,
        maxStock: Number(row[C.MAX]) || 0, freq: row[C.FREQ],
        price: Number(row[C.PRICE]) || 0, supplier: row[C.SUPPLIER],
        imageUrl: String(row[C.IMAGE] || '').trim()
      });
    }

    return { success: true, items: items, count: items.length };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// 17. getPurchaseOrderText() — 原有函数保留
// ============================================================
function getPurchaseOrderText() {
  var low = getLowStockItems();
  if (!low.success || low.count === 0) return '✅ 当前无需补货';

  var lines = ['📋 【百万镇】采购清单 ' + fmtDate_(), ''];
  var totalCost = 0;
  var bySupplier = {};

  for (var i = 0; i < low.items.length; i++) {
    var item = low.items[i];
    var supplier = item.supplier || '未指定';
    if (!bySupplier[supplier]) bySupplier[supplier] = [];
    bySupplier[supplier].push(item);
    totalCost += item.totalCost;
  }

  for (var s in bySupplier) {
    lines.push('📦 ' + s + ':');
    for (var j = 0; j < bySupplier[s].length; j++) {
      var it = bySupplier[s][j];
      lines.push('  · ' + it.name + ' ' + it.need + it.unit + (it.totalCost > 0 ? ' ≈RM' + it.totalCost : ''));
    }
    lines.push('');
  }

  lines.push('💰 预估总额: RM ' + Math.round(totalCost * 100) / 100);
  return lines.join('\n');
}

// ============================================================
// 18. checkAndAlert() — 原有函数保留
// ============================================================
function checkAndAlert() {
  try {
    var alertSheet = getSheet_(IMS_CONFIG.SHEETS.ALERTS);
    var now = fmtDateTime_();
    var alerts = [];

    var low = getLowStockItems();
    if (low.success) {
      for (var i = 0; i < low.items.length; i++) {
        var item = low.items[i];
        alerts.push([now, 'low_stock', item.name, IMS_CONFIG.BRANCH, item.currentQty, item.minStock, '⚠️ ' + item.name + ' 库存不足!', 'N']);
      }
    }

    var high = getHighStockItems();
    if (high.success) {
      for (var j = 0; j < high.items.length; j++) {
        var h = high.items[j];
        alerts.push([now, 'high_stock', h.name, IMS_CONFIG.BRANCH, h.currentQty, h.maxStock, '⚠️ ' + h.name + ' 库存过高!', 'N']);
      }
    }

    if (alerts.length > 0) {
      alertSheet.getRange(alertSheet.getLastRow() + 1, 1, alerts.length, 8).setValues(alerts);
    }

    return { success: true, lowAlerts: low.success ? low.count : 0, highAlerts: high.success ? high.count : 0, totalAlerts: alerts.length };

  } catch (e) {
    Logger.log('checkAndAlert error: ' + e.message);
    return { success: false, error: e.message };
  }
}
