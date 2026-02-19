# IMS - Inventory Management System

Google Apps Script inventory management system for Zhang Chong Hui Hotpot (张重辉火锅), Permas Jaya branch.

## Features

- **Login System** - Role-based access (Boss/Manager/Staff)
- **Daily Stocktake** - Frequency-based check (daily/weekly/3-day)
- **Low Stock Alerts** - WhatsApp + Email notifications
- **Purchase Orders** - Auto-generate from low stock items
- **Stock Dashboard** - Manager/Boss overview with stats
- **Abnormal Loss Detection** - Auto-alert on >30% stock discrepancy

## Project Structure

### Backend (Google Apps Script)
| File | Description |
|------|-------------|
| `Ims backend.js` | Core backend: IMS_CONFIG, stock checks, PO generation, dashboard data |
| `Ims routes.js` | Web app routing (`doGet`), staff auth, data queries |
| `Ims notify.js` | WhatsApp notifications, daily reminders, triggers |
| `Code.js` | Email low-stock alerts (uses `getLowStockItems()` from backend) |
| `IMS_Init.js` | Database init script (already run, kept for reference) |

### Frontend (HTML)
| File | Description |
|------|-------------|
| `Login.html` | Staff login page with role-based redirect |
| `Checkpage.html` | Employee stocktake page (category-grouped, frequency-based) |
| `Stockdashboard.html` | Manager/Boss dashboard (stats, low/high stock, PO) |

### Config
| File | Description |
|------|-------------|
| `appsscript.json` | Apps Script manifest (V8 runtime, Asia/Kuala_Lumpur timezone) |

## Web App Routing

```
?page=login      → Login.html
?page=check      → Checkpage.html (Staff stocktake)
?page=dashboard  → Stockdashboard.html (Manager/Boss dashboard)
```

## Database (Google Sheets)

**Spreadsheet:** IMS_Database v1

### Sheets
- `Items_DB` - 231 inventory items (16 columns: ID, Name, Category, Unit, Min/Max Stock, Current_Qty, Check_Freq, Status, Price, Supplier, Branch, Image_URL, Last_Check, Last_Update, Notes)
- `Staff_DB` - Staff accounts and permissions
- `Check_Records` - Stocktake history
- `Purchase_Orders` - Purchase order records
- `Alerts` - Stock alert log
- `Inventory_Log` - Action audit log

## Deployment

This project is deployed as a Google Apps Script Web App linked to the IMS_Database spreadsheet. Use `clasp push` to deploy code changes.
