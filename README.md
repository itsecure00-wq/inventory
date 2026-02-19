# IMS - Inventory Management System

Google Apps Script inventory management system for Zhang Chong Hui Hotpot (张重辉火锅), Permas Jaya branch.

## Features

- **Login System** - Role-based access (Boss/Manager/Staff)
- **Daily Stocktake** - Frequency-based check (daily/weekly/3-day)
- **Low Stock Alerts** - Automatic detection and WhatsApp notifications
- **Purchase Orders** - Auto-generate from low stock items
- **Stock Dashboard** - Manager/Boss overview with stats
- **Multi-language** - Chinese/Myanmar support

## Project Structure

### Backend (Google Apps Script)
| File | Description |
|------|-------------|
| `Code.js` | Core functions: login, inventory CRUD, stocktake |
| `Ims backend.js` | Backend logic: stock checks, PO generation, dashboard |
| `Ims routes.js` | Web app routing, staff auth, data queries |
| `Ims notify.js` | WhatsApp notifications, daily reminders, alerts |
| `IMS_Init.js` | Database initialization script (run once) |

### Frontend (HTML)
| File | Description |
|------|-------------|
| `index.html` | Main app: stocktake, add items, user management |
| `Login.html` | Staff login page |
| `Checkpage.html` | Employee stocktake page |
| `Stockdashboard.html` | Manager stock dashboard |

### Config
| File | Description |
|------|-------------|
| `appsscript.json` | Apps Script manifest |

## Database (Google Sheets)

**Spreadsheet:** IMS_Database v1

### Sheets
- `Items_DB` - Inventory items (ID, Name, Category, Unit, Min/Max Stock, Qty, Freq, Status, Price, Supplier, Branch, Image, etc.)
- `Staff_DB` - Staff accounts and permissions
- `Check_Records` - Stocktake history
- `Purchase_Orders` - Purchase order records
- `Alerts` - Stock alert log
- `Inventory_Log` - Action audit log

## Deployment

This project is deployed as a Google Apps Script Web App linked to the IMS_Database spreadsheet.
