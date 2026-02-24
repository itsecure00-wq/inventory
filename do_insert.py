# -*- coding: utf-8 -*-
import sys,json
fp=r"C:UsersPei SheeDocumentscodeinventory-imsCheckPage.html"
jp=r"C:UsersPei SheeDocumentscodeinventory-imsi18n_payload.json"
with open(fp,"r",encoding="utf-8") as f: content=f.read()
with open(jp,"r",encoding="utf-8") as f: data=json.load(f)
anchor=data["anchor"]
if anchor not in content: sys.exit("anchor not found")
if content.count(anchor)!=1: sys.exit("anchor not unique")
if "function t(key)" in content: sys.exit("t() exists")
if "var STRINGS" in content: sys.exit("STRINGS exists")
new_content=content.replace(anchor,anchor+data["insertion"],1)
with open(fp,"w",encoding="utf-8") as f: f.write(new_content)
print("SUCCESS lines_before:",content.count(chr(10)),"lines_after:",new_content.count(chr(10)))
