/**
 * ⚠️ ALREADY RUN — 此文件仅供参考，请勿重复运行
 * 此脚本已于初始化时执行完成，保留作为数据库结构文档参考。
 * 如需重新初始化，请确认数据库状态后谨慎操作。
 */

/**
 * IMS 数据库初始化脚本
 * 运行一次: 在 IMS_Database v1 的 Apps Script 里粘贴运行
 * 功能: 更新 Items_DB 列 + 创建 3 个新表
 */

function initIMS() {
  var ss = SpreadsheetApp.openById('1xOxPrvWT5XOxhupIRQtH7xM07aBh30S2H5M44iOHE5M');
  
  // ============ 1. 更新 Items_DB 列 ============
  var items = ss.getSheetByName('Items_DB');
  var headers = ['ID','Name','Category','Unit','Min_Stock','Max_Stock','Current_Qty',
                 'Check_Freq','Status','Price','Supplier','Branch','Image_URL',
                 'Last_Check','Last_Update','Notes'];
  
  // 写入新表头
  items.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // 设置 Check_Freq 默认值 (根据现有Category)
  var data = items.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var cat = data[i][2]; // Category列
    var freq = 'weekly'; // 默认每周
    if (/肉|菜|蔬|海鲜|虾|鱼|丸|滑|锅底|汤底/.test(cat)) freq = 'daily';
    if (/甜品|小吃/.test(cat)) freq = '3day';
    
    // H列=Check_Freq, L列=Branch
    items.getRange(i + 1, 8).setValue(freq);     // Check_Freq
    items.getRange(i + 1, 12).setValue('百万镇Permas'); // Branch 百万镇Permas Jaya
  }
  
  // 设置列宽
  items.setColumnWidth(1, 100);  // ID
  items.setColumnWidth(2, 150);  // Name
  items.setColumnWidth(3, 80);   // Category
  items.setColumnWidth(8, 80);   // Check_Freq
  
  Logger.log('✅ Items_DB 更新完成: ' + headers.length + ' 列');
  
  // ============ 2. 创建 Check_Records 盘点记录 ============
  var cr = ss.getSheetByName('Check_Records');
  if (!cr) cr = ss.insertSheet('Check_Records');
  cr.clear();
  cr.getRange(1, 1, 1, 9).setValues([
    ['Timestamp','Staff_Name','Branch','Item_ID','Item_Name','Old_Qty','New_Qty','Diff','Alert']
  ]);
  cr.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#d32f2f').setFontColor('white');
  cr.setFrozenRows(1);
  Logger.log('✅ Check_Records 创建完成');
  
  // ============ 3. 创建 Purchase_Orders 采购单 ============
  var po = ss.getSheetByName('Purchase_Orders');
  if (!po) po = ss.insertSheet('Purchase_Orders');
  po.clear();
  po.getRange(1, 1, 1, 13).setValues([
    ['PO_ID','Date','Branch','Item_ID','Item_Name','Current_Qty','Order_Qty',
     'Unit','Price','Total','Supplier','Status','Created_By']
  ]);
  po.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#1565c0').setFontColor('white');
  po.setFrozenRows(1);
  Logger.log('✅ Purchase_Orders 创建完成');
  
  // ============ 4. 创建 Alerts 通知记录 ============
  var al = ss.getSheetByName('Alerts');
  if (!al) al = ss.insertSheet('Alerts');
  al.clear();
  al.getRange(1, 1, 1, 8).setValues([
    ['Timestamp','Type','Item_Name','Branch','Current_Qty','Threshold','Message','Notified']
  ]);
  al.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#ff6f00').setFontColor('white');
  al.setFrozenRows(1);
  Logger.log('✅ Alerts 创建完成');
  
  // ============ 5. 添加示例食材数据 ============
  var sampleItems = [
    // 肉类 - daily
    ['ITEM-2001','牛肉卷','肉类','kg',10,30,0,'daily','Active',25.00,'旺记肉铺','百万镇Permas','','','',''],
    ['ITEM-2002','羊肉卷','肉类','kg',8,25,0,'daily','Active',28.00,'旺记肉铺','百万镇Permas','','','',''],
    ['ITEM-2003','猪肉片','肉类','kg',5,20,0,'daily','Active',15.00,'旺记肉铺','百万镇Permas','','','',''],
    ['ITEM-2004','牛百叶','肉类','包',10,30,0,'daily','Active',12.00,'旺记肉铺','百万镇Permas','','','',''],
    ['ITEM-2005','毛肚','肉类','包',8,25,0,'daily','Active',18.00,'旺记肉铺','百万镇Permas','','','',''],
    // 蔬菜 - daily
    ['ITEM-2010','白菜','菜类','kg',10,40,0,'daily','Active',3.50,'菜市场','百万镇Permas','','','',''],
    ['ITEM-2011','生菜','菜类','kg',5,20,0,'daily','Active',4.00,'菜市场','百万镇Permas','','','',''],
    ['ITEM-2012','金针菇','菜类','包',15,50,0,'daily','Active',3.00,'菜市场','百万镇Permas','','','',''],
    ['ITEM-2013','木耳','菜类','包',10,30,0,'daily','Active',5.00,'菜市场','百万镇Permas','','','',''],
    ['ITEM-2014','土豆','菜类','kg',8,30,0,'daily','Active',2.50,'菜市场','百万镇Permas','','','',''],
    // 海鲜 - daily
    ['ITEM-2020','虾滑','海鲜','盒',10,30,0,'daily','Active',8.00,'海鲜批发','百万镇Permas','','','',''],
    ['ITEM-2021','鱼片','海鲜','包',8,25,0,'daily','Active',10.00,'海鲜批发','百万镇Permas','','','',''],
    ['ITEM-2022','蟹棒','海鲜','包',10,30,0,'daily','Active',6.00,'海鲜批发','百万镇Permas','','','',''],
    // 丸子 - daily
    ['ITEM-2030','鱼丸','丸子','包',15,40,0,'daily','Active',5.00,'丸子批发','百万镇Permas','','','',''],
    ['ITEM-2031','牛肉丸','丸子','包',15,40,0,'daily','Active',7.00,'丸子批发','百万镇Permas','','','',''],
    ['ITEM-2032','虾丸','丸子','包',10,30,0,'daily','Active',6.50,'丸子批发','百万镇Permas','','','',''],
    // 锅底 - daily
    ['ITEM-2040','麻辣锅底','锅底','包',5,20,0,'daily','Active',8.00,'自制','百万镇Permas','','','',''],
    ['ITEM-2041','番茄锅底','锅底','包',5,20,0,'daily','Active',6.00,'自制','百万镇Permas','','','',''],
    ['ITEM-2042','菌汤锅底','锅底','包',3,15,0,'daily','Active',7.00,'自制','百万镇Permas','','','',''],
    // 调味料 - weekly
    ['ITEM-2050','沙茶酱','调味料','桶',2,8,0,'weekly','Active',15.00,'调料批发','百万镇Permas','','','',''],
    ['ITEM-2051','芝麻酱','调味料','桶',2,8,0,'weekly','Active',12.00,'调料批发','百万镇Permas','','','',''],
    ['ITEM-2052','辣椒油','调味料','桶',3,10,0,'weekly','Active',10.00,'自制','百万镇Permas','','','',''],
    ['ITEM-2053','蒜蓉','调味料','kg',2,8,0,'weekly','Active',8.00,'菜市场','百万镇Permas','','','',''],
    // 消耗品 - weekly
    ['ITEM-2060','纸巾','消耗品','箱',2,10,0,'weekly','Active',25.00,'日用批发','百万镇Permas','','','',''],
    ['ITEM-2061','一次性手套','消耗品','箱',1,5,0,'weekly','Active',18.00,'日用批发','百万镇Permas','','','',''],
    ['ITEM-2062','打包盒','消耗品','箱',2,8,0,'weekly','Active',30.00,'日用批发','百万镇Permas','','','',''],
    // 甜品 - 3day
    ['ITEM-2070','冰粉','甜品','份',20,60,0,'3day','Active',2.00,'自制','百万镇Permas','','','',''],
    ['ITEM-2071','红糖糍粑','甜品','份',15,40,0,'3day','Active',3.00,'甜品供应','百万镇Permas','','','',''],
  ];
  
  // 检查是否已有示例数据
  var lastRow = items.getLastRow();
  if (lastRow <= 15) { // 只有原始饮品数据
    items.getRange(lastRow + 1, 1, sampleItems.length, sampleItems[0].length).setValues(sampleItems);
    Logger.log('✅ 添加 ' + sampleItems.length + ' 种示例食材');
  } else {
    Logger.log('⏭️ 已有足够数据，跳过示例');
  }
  
  // ============ 6. 更新 SYSTEMS config in Command Center ============
  Logger.log('\n============================');
  Logger.log('🎉 IMS 初始化完成!');
  Logger.log('Tables: Items_DB, Check_Records, Purchase_Orders, Alerts, Inventory_Log, Staff_DB');
  Logger.log('总计 6 个表');
  Logger.log('============================');
  
  SpreadsheetApp.getUi().alert(
    '🎉 IMS 初始化完成!\n\n' +
    '✅ Items_DB 更新为 16 列\n' +
    '✅ Check_Records 盘点记录表\n' +
    '✅ Purchase_Orders 采购单表\n' +
    '✅ Alerts 通知记录表\n' +
    '✅ 添加 ' + sampleItems.length + ' 种火锅食材\n\n' +
    '总计 6 个工作表'
  );
}

// ============================================================
// initStaff() — 初始化 Staff_DB，确保 admin 账号存在
// 在 GAS 编辑器中手动运行一次即可
// ============================================================
function initStaff() {
  var ss = SpreadsheetApp.openById(IMS_CONFIG.SS_ID);
  var sheet = ss.getSheetByName('Staff_DB');
  if (!sheet) {
    sheet = ss.insertSheet('Staff_DB');
    sheet.getRange(1, 1, 1, 5).setValues([['Username','Password','Role','Permissions','Name']]);
  }
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === 'admin') {
      Logger.log('Admin 账号已存在，跳过创建');
      Browser.msgBox('✅ Admin 账号已存在（' + data[i][0] + '），无需重新创建。');
      return;
    }
  }
  sheet.appendRow(['admin', '1234', 'Boss', '', 'Admin']);
  Logger.log('Admin 账号已创建');
  Browser.msgBox('✅ Admin 账号已创建！\n用户名: admin\n密码: 1234\n角色: Boss');
}

// ============================================================
// resetAdminPwd() — 将 admin 账号密码重置为 1234
// 在 GAS 编辑器中手动运行一次即可
// ============================================================
function resetAdminPwd() {
  var ss = SpreadsheetApp.openById(IMS_CONFIG.SS_ID);
  var sheet = ss.getSheetByName('Staff_DB');
  if (!sheet) {
    Browser.msgBox('❌ Staff_DB 表不存在，请先运行 initStaff()');
    return;
  }
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === 'admin') {
      sheet.getRange(i + 1, 2).setValue('1234');
      Logger.log('Admin 密码已重置为 1234');
      Browser.msgBox('✅ Admin 密码已重置为 1234\n请返回登录页，使用 admin / 1234 登录');
      return;
    }
  }
  Browser.msgBox('❌ 找不到 admin 账号，请先运行 initStaff()');
}