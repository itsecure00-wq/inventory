import os, sys
q = chr(39)
nl = chr(10)
target_path = r'C:\Users\Pei Shee\Documents\code\inventory-ims\CheckPage.html'

with open(target_path, 'r', encoding='utf-8') as f:
    content = f.read()

target_str = "var APP_URL = " + q + "<?= appUrl ?>" + q + ";"
assert content.count(target_str) == 1
assert "function t(key)" not in content
assert "var STRINGS" not in content

# Build the i18n block line by line
L = []
L.append("")
L.append("// \u2500\u2500 i18n \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500")
L.append("var currentLang = localStorage.getItem(" + q + "ims_lang" + q + ") || " + q + "zh" + q + ";")
L.append("")
L.append("var STRINGS = {")
L.append("  zh: {")
L.append("    pageTitle:        " + q + "\U0001f525 \u5e93\u5b58\u76d8\u70b9" + q + ",")
L.append("    addItemBtn:       " + q + "\uff0b \u7269\u54c1" + q + ",")
L.append("    logoutBtn:        " + q + "\u9000\u51fa" + q + ",")
L.append("    progressPrefix:   " + q + "\u5df2\u586b:" + q + ",")
L.append("    loading:          " + q + "\u52a0\u8f7d\u4e2d..." + q + ",")
L.append("    loadingItems:     " + q + "\u6b63\u5728\u52a0\u8f7d\u76d8\u70b9\u7269\u54c1..." + q + ",")
L.append("    noCategoryItems:  " + q + "\u8be5\u5206\u7c7b\u6682\u65e0\u7269\u54c1" + q + ",")
L.append("    noTasksToday:     " + q + "\u4eca\u65e5\u6682\u65e0\u5206\u914d\u7ed9\u60a8\u7684\u76d8\u70b9\u4efb\u52a1" + q + ",")
L.append("    currentStock:     " + q + "\u73b0\u6709:" + q + ",")
L.append("    submitBarLabel:   " + q + "\u63d0\u4ea4\u76d8\u70b9\u8bb0\u5f55" + q + ",")
L.append("    submitBtn:        " + q + "\u63d0\u4ea4\u76d8\u70b9" + q + ",")
L.append("    submitBtnAll:     " + q + "\u2705 \u5168\u90e8\u586b\u5b8c\uff0c\u63d0\u4ea4" + q + ",")
L.append("    draftSaved:       " + q + "\U0001f4dd \u8349\u7a3f\u5df2\u4fdd\u5b58" + q + ",")
L.append("    confirmTitle:     " + q + "\u786e\u8ba4\u63d0\u4ea4" + q + ",")
L.append("    confirmBtn:       " + q + "\u5b8c\u6210" + q + ",")
L.append("    retryBtn:         " + q + "\u91cd\u8bd5" + q + ",")
L.append("    continueSurvey:   " + q + "\u7ee7\u7eed\u76d8\u70b9" + q + ",")
L.append("    logoutTitle:      " + q + "\u786e\u8ba4\u9000\u51fa\uff1f" + q + ",")
L.append("    logoutBody:       " + q + "\u60a8\u6709\u672a\u63d0\u4ea4\u7684\u8349\u7a3f\u6570\u636e\u3002<br>\u9000\u51fa\u540e\uff0c\u8349\u7a3f\u5c06\u7ee7\u7eed\u4fdd\u7559\u3002" + q + ",")
L.append("    logoutConfirm:    " + q + "\u9000\u51fa\u767b\u5f55" + q + ",")
L.append("    successTitle:     " + q + "\u63d0\u4ea4\u6210\u529f\uff01" + q + ",")
L.append("    successMsg:       " + q + "\u5df2\u8bb0\u5f55 %n \u4ef6\u76d8\u70b9\u7269\u54c1\uff01" + q + ",")
L.append("    successAbnormal:  " + q + "\u4ee5\u4e0b\u7269\u54c1\u5e93\u5b58\u5f02\u5e38\uff0c\u8bf7\u544a\u77e5\u4e3b\u7ba1\uff1a" + q + ",")
L.append("    addItemTitle:     " + q + "\u2795 \u65b0\u589e\u7269\u54c1" + q + ",")
L.append("    photoLabel:       " + q + "\u62cd\u7167 / \u9009\u56fe\uff08\u53ef\u9009\uff09" + q + ",")
L.append("    itemNameLabel:    " + q + "\u7269\u54c1\u540d\u79f0" + q + ",")
L.append("    itemNamePh:       " + q + "\u8f93\u5165\u7269\u54c1\u540d\u79f0" + q + ",")
L.append("    categoryLabel:    " + q + "\u7c7b\u522b" + q + ",")
L.append("    unitLabel:        " + q + "\u8ba1\u91cf\u5355\u4f4d" + q + ",")
L.append("    pkgLabel:         " + q + "\u6bcf\u5305\u4ef6\u6570" + q + ",")
L.append("    pkgPh:            " + q + "\u4f8b:10" + q + ",")
L.append("    addItemSaveBtn:   " + q + "+ \u6dfb\u52a0\u7269\u54c1" + q + ",")
L.append("    cancelBtn:        " + q + "\u53d6\u6d88" + q + ",")
