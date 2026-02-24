import os
q = chr(39)
fp = r"C:\Users\Pei Shee\Documents\code\inventory-ims\CheckPage.html"
with open(fp, "r", encoding="utf-8") as f:
    content = f.read()
target = "var APP_URL = " + q + "<?= appUrl ?>" + q + ";"
assert content.count(target) == 1, "target not unique"
assert "function t(key)" not in content, "already exists"
assert "var STRINGS" not in content, "already exists"
print("Preconditions OK")
