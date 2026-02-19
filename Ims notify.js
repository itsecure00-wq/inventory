/**
 * IMS_Notify.gs - WhatsApp 自动通知
 * 张重辉火锅 百万镇Permas Jaya
 * v1.0.0
 */

// ============================================================
// WhatsApp API 发送 (预留接口)
// ============================================================

/**
 * 发送 WhatsApp 消息
 * @param {string} phone - 手机号
 * @param {string} message - 消息内容
 * @returns {boolean} 是否成功
 */
function sendWhatsApp_(phone, message) {
  Logger.log('📱 WhatsApp → ' + phone);
  Logger.log(message);
  Logger.log('---');
  return true;
}

/**
 * 获取店长手机号
 * @returns {string} 手机号
 */
function getManagerPhone_() {
  var sheet = getSheet_(IMS_CONFIG.SHEETS.STAFF);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var role = String(data[i][2]).toLowerCase();
    if (role === 'manager' || role === 'boss') {
      return data[i][5] ? String(data[i][5]) : '';
    }
  }
  return '';
}

/**
 * 获取老板手机号
 */
function getBossPhone_() {
  var sheet = getSheet_(IMS_CONFIG.SHEETS.STAFF);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]).toLowerCase() === 'boss') {
      return data[i][5] ? String(data[i][5]) : '';
    }
  }
  return '';
}

// ============================================================
// 1. 库存预警通知
// ============================================================

function sendStockAlert() {
  try {
    var low = getLowStockItems();
    if (!low.success || low.count === 0) {
      Logger.log('✅ 无低库存物品，跳过通知');
      return;
    }
    var lines = [
      '⚠️ 【百万镇】库存预警',
      '',
      '🔴 低库存 ' + low.count + ' 项:'
    ];
    var totalCost = 0;
    for (var i = 0; i < low.items.length; i++) {
      var item = low.items[i];
      totalCost += item.totalCost;
      lines.push('· ' + item.name + ' ' + item.currentQty + item.unit +
                  ' (最低' + item.minStock + ') 需补' + item.need + item.unit);
    }
    lines.push('');
    lines.push('💰 采购预估: RM ' + totalCost.toFixed(2));
    var msg = lines.join('\n');
    var phone = getManagerPhone_();
    if (phone) sendWhatsApp_(phone, msg);
    Logger.log(msg);
  } catch (e) {
    Logger.log('sendStockAlert error: ' + e.message);
  }
}

// ============================================================
// 2. 每日盘点提醒
// ============================================================

function sendDailyCheckReminder() {
  try {
    var todayItems = getTodayCheckItems('system');
    if (!todayItems.success) return;
    var webAppUrl = ScriptApp.getService().getUrl();
    var msg = [
      '📋 【百万镇】今日盘点提醒',
      '',
      '今日需盘点 ' + todayItems.todayTotal + ' 项',
      '',
      '分类明细:'
    ];
    for (var cat in todayItems.categories) {
      var c = todayItems.categories[cat];
      msg.push('· ' + cat + ': ' + c.count + '项');
    }
    msg.push('');
    msg.push('👉 点击开始盘点:');
    msg.push(webAppUrl + '?page=login');
    var message = msg.join('\n');
    var phone = getManagerPhone_();
    if (phone) sendWhatsApp_(phone, message);
    Logger.log(message);
  } catch (e) {
    Logger.log('sendDailyCheckReminder error: ' + e.message);
  }
}

// ============================================================
// 3. 每日汇总报告
// ============================================================

function sendDailySummary() {
  try {
    var dashboard = getStockDashboard();
    if (!dashboard.success) return;
    var d = dashboard;
    var checkStatus = d.todayChecked >= d.todayTotal ? '✅' : '⚠️ 未完成';
    var msg = [
      '📊 今日库存汇总 ' + d.date,
      '',
      '百万镇: 盘点 ' + d.todayChecked + '/' + d.todayTotal + ' ' + checkStatus,
      '',
      '📦 库存状态:',
      '· 🔴 需补货: ' + d.lowCount + '项',
      '· 🟡 偏高: ' + d.highCount + '项',
      '· 🟢 正常: ' + d.normalCount + '项',
      '· 总计: ' + d.total + '项'
    ];
    if (d.lowCount > 0) {
      var low = getLowStockItems();
      if (low.success && low.items.length > 0) {
        var top3 = low.items.slice(0, 3).map(function(x) { return x.name; });
        msg.push('');
        msg.push('🔴 低库存Top3: ' + top3.join('、'));
      }
    }
    msg.push('');
    msg.push('💰 库存总值: RM ' + d.totalValue.toFixed(2));
    if (d.pendingPO > 0) {
      msg.push('📋 待采购单: ' + d.pendingPO + '笔 (RM ' + d.pendingCost.toFixed(2) + ')');
    }
    var message = msg.join('\n');
    var phone = getBossPhone_();
    if (phone) sendWhatsApp_(phone, message);
    Logger.log(message);
  } catch (e) {
    Logger.log('sendDailySummary error: ' + e.message);
  }
}

// ============================================================
// 4. 异常损耗通知
// ============================================================

function sendAbnormalAlert(itemName, oldQty, newQty) {
  try {
    var diff = newQty - oldQty;
    var pct = oldQty > 0 ? Math.round(Math.abs(diff) / oldQty * 100) : 0;
    if (pct <= 30) return;
    var msg = [
      '🚨 【百万镇】库存异常!',
      '',
      '物品: ' + itemName,
      '系统: ' + oldQty + ' → 实际: ' + newQty,
      '差异: ' + diff + ' (' + pct + '%)',
      '',
      '⏰ ' + fmtDateTime_(),
      '',
      '请核实原因!'
    ].join('\n');
    var mgrPhone = getManagerPhone_();
    var bossPhone = getBossPhone_();
    if (mgrPhone) sendWhatsApp_(mgrPhone, msg);
    if (bossPhone && bossPhone !== mgrPhone) sendWhatsApp_(bossPhone, msg);
    var alertSheet = getSheet_(IMS_CONFIG.SHEETS.ALERTS);
    alertSheet.appendRow([
      fmtDateTime_(), 'abnormal_loss', itemName, IMS_CONFIG.BRANCH,
      newQty, oldQty, msg, 'Y'
    ]);
    Logger.log(msg);
  } catch (e) {
    Logger.log('sendAbnormalAlert error: ' + e.message);
  }
}

// ============================================================
// 5. 定时触发器安装
// ============================================================

function installIMSTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var funcName = triggers[i].getHandlerFunction();
    if (funcName === 'sendDailyCheckReminder' ||
        funcName === 'sendDailySummary' ||
        funcName === 'sendStockAlert') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('sendDailyCheckReminder')
    .timeBased()
    .atHour(10)
    .everyDays(1)
    .inTimezone(IMS_CONFIG.TZ)
    .create();
  ScriptApp.newTrigger('sendDailySummary')
    .timeBased()
    .atHour(21)
    .everyDays(1)
    .inTimezone(IMS_CONFIG.TZ)
    .create();
  Logger.log('✅ IMS 触发器已安装');
  SpreadsheetApp.getUi().alert(
    '✅ IMS 触发器已安装!\n\n' +
    '· 10:00 AM: 每日盘点提醒\n' +
    '· 9:00 PM: 每日库存汇总\n' +
    '· 盘点后: 低库存预警 (自动触发)'
  );
}

// ============================================================
// 菜单
// ============================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🍲 IMS 库存管理')
    .addItem('⏰ 安装定时触发器', 'installIMSTriggers')
    .addSeparator()
    .addItem('📊 查看库存统计', 'menuShowDashboard_')
    .addItem('📉 查看低库存', 'menuShowLowStock_')
    .addItem('📋 生成采购单', 'menuGeneratePO_')
    .addSeparator()
    .addItem('🔔 发送库存预警', 'sendStockAlert')
    .addItem('📨 发送每日汇总', 'sendDailySummary')
    .addToUi();
}

function menuShowDashboard_() {
  var d = getStockDashboard();
  if (!d.success) { SpreadsheetApp.getUi().alert('❌ ' + d.error); return; }
  SpreadsheetApp.getUi().alert(
    '📊 库存统计 ' + d.date + '\n\n' +
    '总物品: ' + d.total + '\n' +
    '🔴 需补货: ' + d.lowCount + '\n' +
    '🟡 偏高: ' + d.highCount + '\n' +
    '🟢 正常: ' + d.normalCount + '\n\n' +
    '今日盘点: ' + d.todayChecked + '/' + d.todayTotal + '\n' +
    '库存总值: RM ' + d.totalValue.toFixed(2)
  );
}

function menuShowLowStock_() {
  var low = getLowStockItems();
  if (!low.success) { SpreadsheetApp.getUi().alert('❌ ' + low.error); return; }
  if (low.count === 0) { SpreadsheetApp.getUi().alert('✅ 所有物品库存充足!'); return; }
  var lines = ['📉 低库存物品 (' + low.count + '项)\n'];
  for (var i = 0; i < low.items.length; i++) {
    var item = low.items[i];
    lines.push(item.name + ': ' + item.currentQty + '/' + item.minStock + item.unit + ' → 需补' + item.need);
  }
  SpreadsheetApp.getUi().alert(lines.join('\n'));
}

function menuGeneratePO_() {
  var result = generatePurchaseOrder();
  if (!result.success) { SpreadsheetApp.getUi().alert('❌ ' + result.error); return; }
  if (result.itemCount === 0) {
    SpreadsheetApp.getUi().alert('✅ 当前无需补货');
  } else {
    SpreadsheetApp.getUi().alert(
      '✅ 采购单已生成!\n\n' +
      '单号: ' + result.poId + '\n' +
      '物品: ' + result.itemCount + '项\n' +
      '总额: RM ' + result.totalCost.toFixed(2)
    );
  }
}