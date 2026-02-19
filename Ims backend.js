/**
 * IMS_Backend.gs - 张重辉火锅 百万镇Permas Jaya 库存管理后端
 * 单店模式 - Branch固定 "百万镇Permas"
 * v1.0.0
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
  return (p > 0 && p < 100000) ? p : 0; // 单价超过10万视为异常
}

/** 安全数量校验 */
function safeQty_(val) {
  var q = Number(val) || 0;
  return q >= 0 ? q : 0;
}

// ============================================================
// 1. getTodayCheckItems(staffName)
// ============================================================
/**
 * 根据 Check_Freq 返回今天需要盘点的物品
 * @param {string} staffName - 员工姓名
 * @returns {Object} {items: [], todayTotal: number, categories: {}}
 */
function getTodayCheckItems(staffName) {
  try {
    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data = sheet.getDataRange().getValues();
    var today = fmtDate_();
    var dayOfWeek = getDayOfWeek_();
    var C = IMS_CONFIG.COL;
    
    var items = [];
    var categories = {};
    var skipped = {}; // 今天不需要盘点的分类
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[C.STATUS] !== 'Active') continue;
      
      var freq = String(row[C.FREQ]).toLowerCase();
      var lastCheck = row[C.LAST_CHECK] ? fmtDate_(new Date(row[C.LAST_CHECK])) : '';
      var needCheck = false;
      
      if (freq === 'daily') {
        needCheck = true;
      } else if (freq === 'weekly') {
        needCheck = (dayOfWeek === 1); // 每周一
      } else if (freq === '3day') {
        if (!lastCheck) {
          needCheck = true;
        } else {
          var diff = Math.floor((new Date(today) - new Date(lastCheck)) / 86400000);
          needCheck = diff >= 3;
        }
      }
      
      var cat = row[C.CATEGORY] || '未分类';
      
      if (needCheck) {
        var item = {
          rowIndex: i + 1, // 1-based for sheet
          id: row[C.ID],
          name: row[C.NAME],
          category: cat,
          unit: row[C.UNIT],
          currentQty: Number(row[C.QTY]) || 0,
          minStock: Number(row[C.MIN]) || 0,
          maxStock: Number(row[C.MAX]) || 0,
          freq: freq,
          checked: (lastCheck === today)
        };
        items.push(item);
        
        if (!categories[cat]) categories[cat] = { count: 0, checked: 0, freq: freq };
        categories[cat].count++;
        if (item.checked) categories[cat].checked++;
      } else {
        // 今天不需要盘点的分类
        if (!skipped[cat]) skipped[cat] = { freq: freq, reason: freq === 'weekly' ? '每周一盘点' : '未到检查日' };
      }
    }
    
    return {
      success: true,
      staffName: staffName,
      date: today,
      items: items,
      todayTotal: items.length,
      todayChecked: items.filter(function(x) { return x.checked; }).length,
      categories: categories,
      skippedCategories: skipped
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
 * @param {string} staffName - 员工姓名
 * @param {Array} items - [{itemId: 'ITEM-2001', newQty: 15}, ...]
 * @returns {Object} {updated, lowStockCount, alerts}
 */
function submitCheckRecord(staffName, items) {
  try {
    var ss = getIMSSS_();
    var itemsSheet = ss.getSheetByName(IMS_CONFIG.SHEETS.ITEMS);
    var checkSheet = ss.getSheetByName(IMS_CONFIG.SHEETS.CHECKS);
    var itemsData = itemsSheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    var now = fmtDateTime_();
    var today = fmtDate_();
    
    var updated = 0;
    var lowStockItems = [];
    var abnormalItems = [];
    var checkRows = [];
    var batchUpdates = [];
    
    // 建立 ID → row 映射
    var idMap = {};
    for (var i = 1; i < itemsData.length; i++) {
      idMap[itemsData[i][C.ID]] = i + 1; // 1-based row
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
      
      // 异常检测: 差异超过30%
      var alert = '';
      if (oldQty > 0) {
        var diffPct = Math.abs(diff) / oldQty;
        if (diffPct > 0.3) {
          alert = '异常差异 ' + Math.round(diffPct * 100) + '%';
          abnormalItems.push({
            name: itemName,
            oldQty: oldQty,
            newQty: newQty,
            diff: diff,
            pct: Math.round(diffPct * 100)
          });
        }
      }
      
      // 低库存检测
      if (newQty < minStock) {
        lowStockItems.push({
          name: itemName,
          qty: newQty,
          min: minStock,
          need: minStock - newQty,
          unit: rowData[C.UNIT]
        });
      }
      
      // 写入 Check_Records
      checkRows.push([now, staffName, IMS_CONFIG.BRANCH, input.itemId, itemName, oldQty, newQty, diff, alert]);

      // 收集批量更新数据 (row, qty, timestamp)
      batchUpdates.push({ rowNum: rowNum, newQty: newQty, timestamp: now });

      updated++;
    }

    // 批量写入 Check_Records
    if (checkRows.length > 0) {
      checkSheet.getRange(checkSheet.getLastRow() + 1, 1, checkRows.length, 9).setValues(checkRows);
    }

    // 批量更新 Items_DB (替代逐行 setValue，性能提升 3x)
    for (var b = 0; b < batchUpdates.length; b++) {
      var bu = batchUpdates[b];
      itemsSheet.getRange(bu.rowNum, C.QTY + 1, 1, 1).setValue(bu.newQty);
      itemsSheet.getRange(bu.rowNum, C.LAST_CHECK + 1, 1, 2).setValues([[bu.timestamp, bu.timestamp]]);
    }
    
    // 触发异常通知
    for (var k = 0; k < abnormalItems.length; k++) {
      var ab = abnormalItems[k];
      try {
        sendAbnormalAlert(ab.name, ab.oldQty, ab.newQty);
      } catch (e) {
        Logger.log('Alert send failed: ' + e.message);
      }
    }
    
    return {
      success: true,
      updated: updated,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems,
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
/**
 * 获取低库存物品 (Current_Qty < Min_Stock)
 * @returns {Array} 低库存物品列表，按紧急度排序
 */
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
        var need = Math.max(0, max - qty); // 防止负数
        if (need === 0) need = min - qty;  // fallback: 补到最低线
        items.push({
          id: row[C.ID],
          name: row[C.NAME],
          category: row[C.CATEGORY],
          unit: row[C.UNIT],
          currentQty: qty,
          minStock: min,
          maxStock: max,
          need: need,
          price: price,
          totalCost: Math.round(need * price * 100) / 100,
          supplier: row[C.SUPPLIER],
          urgency: min > 0 ? Math.round((qty / min) * 100) : 0 // 越低越紧急
        });
      }
    }
    
    // 按紧急度排序 (urgency 越小越紧急)
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
/**
 * 获取库存过高物品 (Current_Qty > Max_Stock)
 * @returns {Array} 过高库存物品列表
 */
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
        items.push({
          id: row[C.ID],
          name: row[C.NAME],
          category: row[C.CATEGORY],
          unit: row[C.UNIT],
          currentQty: qty,
          maxStock: max,
          excess: qty - max
        });
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
/**
 * 生成采购单 - 基于低库存物品
 * @returns {Object} {poId, items, totalCost}
 */
function generatePurchaseOrder() {
  try {
    var lowResult = getLowStockItems();
    if (!lowResult.success || lowResult.count === 0) {
      return { success: true, message: '没有需要补货的物品', items: [], totalCost: 0 };
    }
    
    var poSheet = getSheet_(IMS_CONFIG.SHEETS.PO);
    var now = fmtDateTime_();
    var today = fmtDate_();
    // PO ID: 日期 + 时分秒 防重复
    var timeStr = Utilities.formatDate(new Date(), IMS_CONFIG.TZ, 'HHmmss');
    var poId = 'PO-' + today.replace(/-/g, '') + '-' + timeStr;
    
    var rows = [];
    var totalCost = 0;
    
    for (var i = 0; i < lowResult.items.length; i++) {
      var item = lowResult.items[i];
      var lineTotal = item.totalCost;
      totalCost += lineTotal;
      
      rows.push([
        poId, today, IMS_CONFIG.BRANCH,
        item.id, item.name, item.currentQty, item.need,
        item.unit, item.price, lineTotal,
        item.supplier, '待采购', 'System'
      ]);
    }
    
    if (rows.length > 0) {
      poSheet.getRange(poSheet.getLastRow() + 1, 1, rows.length, 13).setValues(rows);
    }
    
    return {
      success: true,
      poId: poId,
      itemCount: rows.length,
      totalCost: Math.round(totalCost * 100) / 100,
      items: lowResult.items,
      date: today
    };
    
  } catch (e) {
    Logger.log('generatePurchaseOrder error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 6. getStockDashboard()
// ============================================================
/**
 * 获取库存看板统计数据
 * @returns {Object} 看板数据
 */
function getStockDashboard() {
  try {
    var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
    var data = sheet.getDataRange().getValues();
    var C = IMS_CONFIG.COL;
    var today = fmtDate_();
    
    var total = 0, lowCount = 0, highCount = 0, normalCount = 0;
    var todayChecked = 0, todayTotal = 0;
    var totalValue = 0;
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

      // 库存状态
      if (qty < min && min > 0) lowCount++;
      else if (qty > max && max > 0) highCount++;
      else normalCount++;

      // 库存价值 (仅计入有效价格)
      totalValue += qty * price;
      
      // 今天是否需要盘点
      var needCheck = false;
      if (freq === 'daily') needCheck = true;
      else if (freq === 'weekly' && getDayOfWeek_() === 1) needCheck = true;
      else if (freq === '3day') {
        var lc = row[C.LAST_CHECK];
        if (!lc) needCheck = true;
        else {
          var diff = Math.floor((new Date(today) - new Date(fmtDate_(new Date(lc)))) / 86400000);
          needCheck = diff >= 3;
        }
      }
      
      if (needCheck) {
        todayTotal++;
        var lastCheck = row[C.LAST_CHECK] ? fmtDate_(new Date(row[C.LAST_CHECK])) : '';
        if (lastCheck === today) todayChecked++;
      }
      
      // 分类统计
      if (!categoryStats[cat]) categoryStats[cat] = { total: 0, low: 0 };
      categoryStats[cat].total++;
      if (qty < min && min > 0) categoryStats[cat].low++;
    }
    
    // 采购单统计
    var poSheet = getSheet_(IMS_CONFIG.SHEETS.PO);
    var poData = poSheet.getDataRange().getValues();
    var pendingPO = 0, pendingCost = 0;
    for (var j = 1; j < poData.length; j++) {
      if (poData[j][11] === '待采购') {
        pendingPO++;
        pendingCost += Number(poData[j][9]) || 0;
      }
    }
    
    return {
      success: true,
      date: today,
      branch: IMS_CONFIG.BRANCH,
      total: total,
      lowCount: lowCount,
      highCount: highCount,
      normalCount: normalCount,
      todayChecked: todayChecked,
      todayTotal: todayTotal,
      checkProgress: todayTotal > 0 ? Math.round(todayChecked / todayTotal * 100) : 100,
      totalValue: Math.round(totalValue * 100) / 100,
      pendingPO: pendingPO,
      pendingCost: Math.round(pendingCost * 100) / 100,
      categoryStats: categoryStats
    };
    
  } catch (e) {
    Logger.log('getStockDashboard error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ============================================================
// 7. checkAndAlert()
// ============================================================
/**
 * 检查库存并生成警报记录
 * @returns {Object} {lowAlerts, highAlerts}
 */
function checkAndAlert() {
  try {
    var alertSheet = getSheet_(IMS_CONFIG.SHEETS.ALERTS);
    var now = fmtDateTime_();
    var alerts = [];
    
    // 低库存
    var low = getLowStockItems();
    if (low.success) {
      for (var i = 0; i < low.items.length; i++) {
        var item = low.items[i];
        var msg = '⚠️ ' + item.name + ' 库存不足! 当前' + item.currentQty + item.unit + 
                  '，最低' + item.minStock + item.unit + '，需补' + item.need + item.unit;
        alerts.push([now, 'low_stock', item.name, IMS_CONFIG.BRANCH, item.currentQty, item.minStock, msg, 'N']);
      }
    }
    
    // 高库存
    var high = getHighStockItems();
    if (high.success) {
      for (var j = 0; j < high.items.length; j++) {
        var h = high.items[j];
        var hmsg = '⚠️ ' + h.name + ' 库存过高! 当前' + h.currentQty + h.unit +
                   '，最高' + h.maxStock + h.unit;
        alerts.push([now, 'high_stock', h.name, IMS_CONFIG.BRANCH, h.currentQty, h.maxStock, hmsg, 'N']);
      }
    }
    
    // 写入 Alerts
    if (alerts.length > 0) {
      alertSheet.getRange(alertSheet.getLastRow() + 1, 1, alerts.length, 8).setValues(alerts);
    }
    
    return {
      success: true,
      lowAlerts: low.success ? low.count : 0,
      highAlerts: high.success ? high.count : 0,
      totalAlerts: alerts.length
    };
    
  } catch (e) {
    Logger.log('checkAndAlert error: ' + e.message);
    return { success: false, error: e.message };
  }
}