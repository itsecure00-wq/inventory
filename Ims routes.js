/**
 * IMS_Routes.gs - Web App 路由和员工认证
 * 张重辉火锅 百万镇Permas Jaya
 * v1.0.0
 */

// ============================================================
// Web App 入口
// ============================================================

/**
 * GET 路由
 * ?page=login   → 登录页
 * ?page=check   → 员工盘点页
 * ?page=dashboard → 店长看板
 */
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};

  // ========== JSONP API 调用 (从iframe sandbox绕过CORS) ==========
  if (params.callback && params.payload) {
    try {
      var data = JSON.parse(params.payload);
      var result;

      switch (data.action) {
        case 'verifyStaff':
          result = verifyStaff(data.username, data.password);
          break;
        case 'submitCheck':
          result = submitCheckRecord(data.staffName, data.items);
          break;
        case 'getTodayCheckItems':
          result = getTodayCheckItems(data.staffName);
          break;
        case 'getCheckProgress':
          result = getCheckProgress(data.date);
          break;
        case 'getLowStockItems':
          result = getLowStockItems();
          break;
        case 'getItemsByCategory':
          result = getItemsByCategory(data.category);
          break;
        case 'getPurchaseOrderText':
          result = { success: true, text: getPurchaseOrderText() };
          break;
        case 'updatePOStatus':
          result = updatePOStatus(data.poId, data.status);
          break;
        case 'getStockDashboard':
          result = getStockDashboard();
          break;
        case 'getHighStockItems':
          result = getHighStockItems();
          break;
        case 'generatePurchaseOrder':
          result = generatePurchaseOrder();
          break;
        default:
          result = { success: false, error: 'Unknown action: ' + data.action };
      }

      var js = params.callback + '(' + JSON.stringify(result) + ')';
      return ContentService.createTextOutput(js).setMimeType(ContentService.MimeType.JAVASCRIPT);

    } catch (err) {
      var errJs = params.callback + '(' + JSON.stringify({ success: false, error: err.message }) + ')';
      return ContentService.createTextOutput(errJs).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
  }

  // ========== 页面路由 ==========
  var page = params.page || 'login';

  try {
    var fileName;
    switch (page) {
      case 'check': fileName = 'CheckPage'; break;
      case 'dashboard': fileName = 'StockDashboard'; break;
      case 'admin': fileName = 'AdminPage'; break;
      default: fileName = 'Login'; break;
    }

    // 用模板注入 APP_URL，避免客户端异步获取 URL 导致移动端 redirect blocked
    var tpl = HtmlService.createTemplateFromFile(fileName);
    tpl.appUrl = ScriptApp.getService().getUrl();
    return tpl.evaluate()
      .setTitle('GLOBAL CHAIN F&B SDN. BHD. · 库存管理')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');

  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<div style="padding:40px;text-align:center;font-family:sans-serif">' +
      '<h3 style="color:#d32f2f">系统加载错误</h3>' +
      '<p>' + err.message + '</p>' +
      '<a href="' + ScriptApp.getService().getUrl() + '?page=login">返回登录</a>' +
      '</div>'
    ).setTitle('GLOBAL CHAIN F&B SDN. BHD. · 错误')
     .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * POST 处理 - 盘点提交
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var result;

    switch (data.action) {
      case 'verifyStaff':
        result = verifyStaff(data.username, data.password);
        break;
      case 'submitCheck':
        result = submitCheckRecord(data.staffName, data.items);
        break;
      case 'getTodayCheckItems':
        result = getTodayCheckItems(data.staffName);
        break;
      case 'getCheckProgress':
        result = getCheckProgress(data.date);
        break;
      case 'getLowStockItems':
        result = getLowStockItems();
        break;
      case 'getItemsByCategory':
        result = getItemsByCategory(data.category);
        break;
      case 'getPurchaseOrderText':
        result = { success: true, text: getPurchaseOrderText() };
        break;
      case 'updatePOStatus':
        result = updatePOStatus(data.poId, data.status);
        break;
      case 'getStockDashboard':
        result = getStockDashboard();
        break;
      case 'getHighStockItems':
        result = getHighStockItems();
        break;
      case 'generatePurchaseOrder':
        result = generatePurchaseOrder();
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + data.action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// 页面跳转辅助
// ============================================================

/**
 * 返回 Web App 的根 URL（不含 ?page=...）
 * 前端无法读 window.top.location，通过此函数从服务端获取
 */
function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

// ============================================================
// 员工认证
// ============================================================

/**
 * 验证员工登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Object} {success, role, name, permissions}
 */
function verifyStaff(username, password) {
  try {
    var sheet = SpreadsheetApp.openById(IMS_CONFIG.SS_ID).getSheetByName('Staff_DB');
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(username).trim() && 
          String(data[i][1]).trim() === String(password).trim()) {
        return {
          success: true,
          username: String(data[i][0]),
          role: data[i][2],        // Boss/Manager/Staff
          permissions: data[i][3], // 权限
          name: data[i][4]         // 真实姓名
        };
      }
    }
    
    return { success: false, error: '用户名或密码错误' };
    
  } catch (e) {
    Logger.log('verifyStaff error: ' + e.message);
    return { success: false, error: '系统错误: ' + e.message };
  }
}

// ============================================================
// 数据查询函数 (供前端调用)
// ============================================================

/**
 * 按分类获取物品
 * @param {string} category - 分类名称, 空=全部
 * @returns {Array} 物品列表
 */
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
        id: row[C.ID],
        name: row[C.NAME],
        category: row[C.CATEGORY],
        unit: row[C.UNIT],
        currentQty: Number(row[C.QTY]) || 0,
        minStock: Number(row[C.MIN]) || 0,
        maxStock: Number(row[C.MAX]) || 0,
        freq: row[C.FREQ],
        price: Number(row[C.PRICE]) || 0,
        supplier: row[C.SUPPLIER]
      });
    }
    
    return { success: true, items: items, count: items.length };
    
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 更新采购单状态
 * @param {string} poId - 采购单号
 * @param {string} status - 新状态: 待采购/已下单/已到货
 */
function updatePOStatus(poId, status) {
  try {
    var sheet = getSheet_(IMS_CONFIG.SHEETS.PO);
    var data = sheet.getDataRange().getValues();
    var updated = 0;
    var itemsToStock = []; // 先收集，再入库

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === poId) {
        // 防止重复到货: 只有 "待采购" 或 "已下单" 状态才能改为 "已到货"
        if (status === '已到货' && data[i][11] === '已到货') continue;

        sheet.getRange(i + 1, 12).setValue(status);
        updated++;

        // 收集到货入库数据
        if (status === '已到货') {
          itemsToStock.push({
            itemId: data[i][3],
            orderQty: Number(data[i][6]) || 0
          });
        }
      }
    }

    // 统一入库 (用收集的数据，避免二次遍历旧数据)
    for (var j = 0; j < itemsToStock.length; j++) {
      addStock_(itemsToStock[j].itemId, itemsToStock[j].orderQty);
    }

    return { success: true, updated: updated, poId: poId, newStatus: status };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 到货后增加库存
 * @private
 */
function addStock_(itemId, qty) {
  var sheet = getSheet_(IMS_CONFIG.SHEETS.ITEMS);
  var data = sheet.getDataRange().getValues();
  var C = IMS_CONFIG.COL;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][C.ID] === itemId) {
      var currentQty = Number(data[i][C.QTY]) || 0;
      sheet.getRange(i + 1, C.QTY + 1).setValue(currentQty + qty);
      sheet.getRange(i + 1, C.LAST_UPDATE + 1).setValue(fmtDateTime_());
      
      // 写入 Inventory_Log
      var logSheet = getSheet_(IMS_CONFIG.SHEETS.LOGS);
      logSheet.appendRow([fmtDateTime_(), itemId, data[i][C.NAME], '到货入库', qty, 'System', 'PO到货自动入库']);
      break;
    }
  }
}

/**
 * 获取今日盘点进度
 * @param {string} date - 日期 yyyy-MM-dd, 空=今天
 * @returns {Object} {done, total, percent, lastStaff}
 */
function getCheckProgress(date) {
  try {
    var targetDate = date || fmtDate_();
    var checkSheet = getSheet_(IMS_CONFIG.SHEETS.CHECKS);
    var checkData = checkSheet.getDataRange().getValues();
    
    var checkedIds = {};
    var lastStaff = '';
    var lastTime = '';
    
    for (var i = 1; i < checkData.length; i++) {
      var ts = checkData[i][0];
      if (!ts) continue;
      var checkDate = fmtDate_(new Date(ts));
      if (checkDate === targetDate) {
        checkedIds[checkData[i][3]] = true; // Item_ID
        lastStaff = checkData[i][1];
        lastTime = fmtDateTime_(new Date(ts));
      }
    }
    
    // 计算今天需要盘点的总数
    var todayItems = getTodayCheckItems('system');
    var total = todayItems.success ? todayItems.todayTotal : 0;
    var done = Object.keys(checkedIds).length;
    
    return {
      success: true,
      done: done,
      total: total,
      percent: total > 0 ? Math.round(done / total * 100) : 100,
      lastStaff: lastStaff,
      lastTime: lastTime,
      date: targetDate
    };
    
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 生成采购单WhatsApp文本
 * @returns {string} 采购清单文本
 */
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
      lines.push('  · ' + it.name + ' ' + it.need + it.unit + ' ≈RM' + it.totalCost);
    }
    lines.push('');
  }
  
  lines.push('💰 预估总额: RM ' + Math.round(totalCost * 100) / 100);
  
  return lines.join('\n');
}