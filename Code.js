// ====== Code.gs (含频率管理 & 库存设置版) ======

const IMAGE_FOLDER_ID = "1HGaUydgv2mWzemwtTmga25mWhCdF5LkG"; 
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet_old() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('张崇会火锅-库存管理系统')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 辅助函数
function getServerRole(username) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Staff_DB");
  const data = sheet.getDataRange().getValues();
  const cleanUser = String(username).trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === cleanUser) return data[i][2];
  }
  return null;
}

function logAction(actionType, detail, user) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Inventory_Log");
  sheet.appendRow([new Date(), "SYSTEM", detail, actionType, 0, user, "操作记录"]);
}

// === 1. 登录 ===
function checkLogin(username, password) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Staff_DB");
  const data = sheet.getDataRange().getValues();
  const cleanUser = String(username).trim().toLowerCase();
  const cleanPass = String(password).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === cleanUser && String(data[i][1]).trim() === cleanPass) {
      let perms = data[i][3] ? String(data[i][3]) : 'All';
      return { success: true, role: data[i][2], user: data[i][0], permissions: perms };
    }
  }
  return { success: false, message: "账号或密码错误" };
}

// === 2. 获取库存 (读取频率字段) ===
function getInventoryData() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Items_DB");
  const data = sheet.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    items.push({
      id: data[i][0], name: data[i][1], category: data[i][2], unit: data[i][3],
      minStock: data[i][4], maxStock: data[i][5], image: data[i][6],
      currentQty: data[i][8] === "" ? 0 : data[i][8],
      frequency: data[i][10] ? data[i][10] : "Daily" // 读取K列(索引10), 默认Daily
    });
  }
  return items;
}

// === 3. 提交盘点 ===
function submitStocktake(stockData, user) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const itemSheet = ss.getSheetByName("Items_DB");
  const logSheet = ss.getSheetByName("Inventory_Log");
  const itemData = itemSheet.getDataRange().getValues();
  const timestamp = new Date();
  
  let changeCount = 0;
  stockData.forEach(function(update) {
    for (let i = 1; i < itemData.length; i++) {
      if (String(itemData[i][0]) === String(update.id)) {
        let oldQty = itemData[i][8] === "" ? 0 : Number(itemData[i][8]);
        let newQty = Number(update.newQty);
        if (oldQty !== newQty) {
          itemSheet.getRange(i + 1, 9).setValue(newQty); 
          itemSheet.getRange(i + 1, 10).setValue(timestamp);
          let diff = newQty - oldQty;
          logSheet.appendRow([timestamp, update.id, update.name, "盘点/Stocktake", diff, user, `从 ${oldQty} 改为 ${newQty}`]);
          changeCount++;
        }
        break;
      }
    }
  });
  return { success: true, message: `成功更新 ${changeCount} 项库存` };
}

// === 4. 新增物品 (写入频率) ===
function handleAddItem(formObject) {
  const role = getServerRole(formObject.user);
  if (role !== 'Boss' && role !== 'Manager') return { success: false, message: "权限不足" };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const itemsSheet = ss.getSheetByName("Items_DB");
    let imageUrl = "";
    if (formObject.imageFile && formObject.imageFile.length > 0) {
      const data = formObject.imageFile.split(","); 
      const type = data[0].split(";")[0].replace("data:", "");
      const imageBlob = Utilities.newBlob(Utilities.base64Decode(data[1]), type, formObject.itemName + "_" + new Date().getTime());
      const folder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
      const file = folder.createFile(imageBlob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      imageUrl = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w800";
    }
    const lastRow = itemsSheet.getLastRow();
    const newId = "ITEM-" + (1000 + lastRow); 
    
    // 保存: ..., Frequency (Col K)
    itemsSheet.appendRow([
      newId, formObject.itemName, formObject.category, formObject.unit, 
      formObject.minStock, formObject.maxStock, imageUrl, "Active", 0, new Date(), 
      formObject.frequency // 新增频率
    ]);
    logAction("新增物品", `添加: ${formObject.itemName} (${formObject.frequency})`, formObject.user);
    return { success: true, message: "添加成功" };
  } catch (e) { return { success: false, message: "Error: " + e.toString() }; }
}

// === 5. 修改物品 (含频率、Min、Max) ===
function handleUpdateItem(itemData, user) {
  const role = getServerRole(user);
  if (role !== 'Boss' && role !== 'Manager') return { success: false, message: "权限不足" };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Items_DB");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(itemData.id)) {
      sheet.getRange(i+1, 2).setValue(itemData.name);
      sheet.getRange(i+1, 3).setValue(itemData.category);
      sheet.getRange(i+1, 4).setValue(itemData.unit);
      sheet.getRange(i+1, 5).setValue(itemData.minStock);
      sheet.getRange(i+1, 6).setValue(itemData.maxStock);
      sheet.getRange(i+1, 11).setValue(itemData.frequency); // 更新频率 (Col 11)
      
      logAction("修改资料", `修改ID: ${itemData.id}`, user);
      return { success: true, message: "修改成功" };
    }
  }
  return { success: false, message: "未找到物品" };
}

// === 6. 创建用户 ===
function handleCreateUser(userData, adminUser) {
  const role = getServerRole(adminUser);
  if (role !== 'Boss') return { success: false, message: "权限不足" };
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Staff_DB");
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++){
    if(String(data[i][0]).toLowerCase() === String(userData.newUsername).toLowerCase()){
      return { success: false, message: "用户名已存在" };
    }
  }
  sheet.appendRow([userData.newUsername, userData.newPassword, userData.newRole, userData.permissions]);
  logAction("创建用户", `创建: ${userData.newUsername}`, adminUser);
  return { success: true, message: "账号创建成功" };
}

// === 7. 获取员工 ===
function getStaffList(adminUser) {
  const role = getServerRole(adminUser);
  if (role !== 'Boss') return [];
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Staff_DB");
  const data = sheet.getDataRange().getValues();
  let users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({ username: data[i][0], password: data[i][1], role: data[i][2], permissions: data[i][3]?data[i][3]:"All" });
  }
  return users;
}

// === 8. 更新员工 ===
function handleUpdateStaff(staffData, adminUser) {
  const role = getServerRole(adminUser);
  if (role !== 'Boss') return { success: false, message: "权限不足" };
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Staff_DB");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(staffData.username)) {
      sheet.getRange(i+1, 2).setValue(staffData.password);
      sheet.getRange(i+1, 3).setValue(staffData.role);
      sheet.getRange(i+1, 4).setValue(staffData.permissions);
      logAction("更新员工", `修改员工: ${staffData.username}`, adminUser);
      return { success: true, message: "员工资料已更新" };
    }
  }
  return { success: false, message: "未找到该员工" };
}

// 邮件预警
function checkLowStockAndNotify() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Items_DB");
  const data = sheet.getDataRange().getValues();
  const recipientEmail = "global.chain.fnb@gmail.com,huihotpotjb@gmail.com"; 
  let lowStockItems = [];
  for (let i = 1; i < data.length; i++) {
    let name = data[i][1];
    let minStock = data[i][4];
    let currentQty = data[i][8];
    let unit = data[i][3];
    if (minStock > 0 && currentQty < minStock) {
      lowStockItems.push(`🔴 ${name}: 剩 ${currentQty} ${unit} (警戒线: ${minStock})`);
    }
  }
  if (lowStockItems.length > 0) MailApp.sendEmail(recipientEmail, "【库存警报】需补货", lowStockItems.join("\n"));
}
/**
 * 修复旧酒水数据列错位
 * 运行一次即可，运行后删除此函数
 */
function fixOldDrinkData() {
  var ss = SpreadsheetApp.openById('1xOxPrvWT5XOxhupIRQtH7xM07aBh30S2H5M44iOHE5M');
  var sheet = ss.getSheetByName('Items_DB');
  var data = sheet.getDataRange().getValues();
  var fixed = 0;
  
  for (var i = 1; i < data.length; i++) {
    var gVal = String(data[i][6]); // G列 Current_Qty
    
    // 如果G列是链接，说明是旧数据需要修复
    if (gVal.indexOf('http') === 0 || gVal.indexOf('drive.google') >= 0) {
      var row = i + 1;
      
      // 旧列顺序猜测: ID,Name,Category,Unit,Min_Stock,Max_Stock,Image_URL,?,Status,...
      // 新列顺序: ID,Name,Category,Unit,Min_Stock,Max_Stock,Current_Qty,Check_Freq,Status,Price,Supplier,Branch,Image_URL,...
      
      var imageUrl = data[i][6];  // G列的链接 → 应该去M列
      var oldStatus = data[i][8]; // I列 Status
      
      // 修复: 
      sheet.getRange(row, 7).setValue(0);           // G: Current_Qty = 0
      sheet.getRange(row, 8).setValue('weekly');     // H: Check_Freq = weekly (酒水)
      sheet.getRange(row, 9).setValue('Active');     // I: Status
      sheet.getRange(row, 13).setValue(imageUrl);    // M: Image_URL (移过去)
      sheet.getRange(row, 12).setValue('百万镇Permas'); // L: Branch
      
      fixed++;
      Logger.log('修复: ' + data[i][1] + ' (行' + row + ')');
    }
  }
  
  SpreadsheetApp.getUi().alert('✅ 修复完成! 共修复 ' + fixed + ' 行酒水数据\n\nCurrent_Qty 已重置为 0\nImage_URL 已移到正确列');
}