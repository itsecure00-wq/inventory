/**
 * Code.gs - 邮件库存预警
 * 张重辉火锅 百万镇Permas Jaya
 * v1.1.0
 *
 * 注意: 所有旧版函数 (doGet_old, checkLogin, getInventoryData, submitStocktake,
 * handleAddItem, handleUpdateItem, handleCreateUser, getStaffList, handleUpdateStaff,
 * fixOldDrinkData) 已在 v1.1 清理删除。
 *
 * 活跃路由: Ims routes.js → doGet()
 * 活跃后端: Ims backend.js → IMS_CONFIG + 所有业务函数
 * 活跃通知: Ims notify.js → WhatsApp 通知
 */

// ============================================================
// 邮件预警 (独立于 WhatsApp 通知)
// ============================================================

/**
 * 检查低库存并发送邮件预警
 * 使用 Ims backend.js 的 getLowStockItems() 获取数据
 * 可通过 Apps Script 触发器定时运行
 */
function checkLowStockAndNotify() {
  try {
    var recipientEmail = 'global.chain.fnb@gmail.com,huihotpotjb@gmail.com';

    var low = getLowStockItems();
    if (!low.success || low.count === 0) {
      Logger.log('✅ 无低库存物品，跳过邮件通知');
      return;
    }

    var lines = [];
    for (var i = 0; i < low.items.length; i++) {
      var item = low.items[i];
      lines.push('🔴 ' + item.name + ': 剩 ' + item.currentQty + ' ' + item.unit +
                  ' (警戒线: ' + item.minStock + ')');
    }

    MailApp.sendEmail(
      recipientEmail,
      '【库存警报】百万镇 需补货 ' + low.count + ' 项',
      lines.join('\n')
    );

    Logger.log('📧 邮件预警已发送: ' + low.count + ' 项低库存');

  } catch (e) {
    Logger.log('checkLowStockAndNotify error: ' + e.message);
  }
}
