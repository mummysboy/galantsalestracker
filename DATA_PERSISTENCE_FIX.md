# Data Persistence Fix - Sales Tracker

## Problem
When uploading invoices from different vendors, the script was clearing and rebuilding each vendor's sheet with ONLY the newly uploaded data, effectively deleting all previously uploaded data from other vendors.

For example:
1. Upload Alpine invoices → Alpine sheet populated ✅
2. Upload Pete's invoices → Pete's sheet populated ✅, but Alpine sheet gets cleared ❌
3. Upload KeHe invoices → KeHe sheet populated ✅, but Alpine and Pete's sheets get cleared ❌

## Root Cause
The `rebuildMonthlyViewFor()` function was calling `sheet.clear()` and then rebuilding with only the `dataRows` parameter passed to it. Since each vendor's data was processed independently, only the current upload's data was being used to rebuild each sheet.

## Solution Implemented

### 1. **Hidden Raw Data Storage**
- Each vendor sheet now has a corresponding hidden `_RawData` sheet (e.g., `Alpine_RawData`, `Pete's Coffee_RawData`)
- These hidden sheets store ALL raw transaction data for each vendor
- The raw data persists across uploads and is used to rebuild the monthly views

### 2. **New Functions Added**

#### `readExistingData_(sheet)`
- Reads existing raw transaction data from the vendor's `_RawData` sheet
- Returns an array of all previous transactions
- Returns empty array if no previous data exists

#### `storeRawData_(sheet, allRows)`
- Stores the combined raw transaction data (existing + new) in the vendor's `_RawData` sheet
- Creates hidden sheet if it doesn't exist
- Clears and rewrites all data to ensure consistency

### 3. **Updated Upload Process**
The `doPost()` function now:

1. **Reads existing data** from each vendor's raw data sheet:
   ```javascript
   const existingAlpine = readExistingData_(alpineSheet);
   const existingPetes = readExistingData_(petesSheet);
   // ... etc for all vendors
   ```

2. **Combines existing with new data**:
   ```javascript
   const allAlpineRows = [...existingAlpine, ...alpineRows];
   const allPetesRows = [...existingPetes, ...petesRows];
   // ... etc for all vendors
   ```

3. **Rebuilds monthly views** with ALL data (existing + new):
   ```javascript
   rebuildMonthlyViewFor(alpineSheet, allAlpineRows);
   rebuildMonthlyViewFor(petesSheet, allPetesRows);
   // ... etc for all vendors
   ```

4. **Stores combined data** back to raw data sheets:
   ```javascript
   storeRawData_(alpineSheet, allAlpineRows);
   storeRawData_(petesSheet, allPetesRows);
   // ... etc for all vendors
   ```

## What This Means for You

### ✅ Data is Now Persistent
- Upload Alpine invoices → Alpine data saved
- Upload Pete's invoices → Pete's data saved, Alpine data preserved
- Upload KeHe invoices → KeHe data saved, Alpine and Pete's data preserved
- And so on for all vendors...

### 📊 Monthly Views Always Show Complete Data
Each vendor's main sheet will always show:
- All historical data across all months
- New and lost customer tracking
- Product sales by customer and month
- Complete sales overview for the year

### 🔍 Hidden Raw Data Sheets
You'll see new hidden sheets in your Google Sheets:
- `Alpine_RawData`
- `Pete's Coffee_RawData`
- `KeHe_RawData`
- `Vistar_RawData`
- `Tony's Fine Foods_RawData`
- `Troia Foods_RawData`
- `Mike Hudson_RawData`

These store all raw transaction records and are automatically managed by the script. You don't need to interact with them directly, but they can be unhidden if you need to see raw data.

## Deployment Steps

1. Open your Google Apps Script editor
2. Copy the entire contents of `UPDATED_GOOGLE_APPS_SCRIPT.js`
3. Paste it into your script editor, replacing all existing code
4. Click **Save** (Ctrl+S / Cmd+S)
5. Click **Deploy** → **New Deployment**
6. Deploy as Web App (or update existing deployment)

## Testing

After deploying, test by:

1. Upload invoices from Vendor A (e.g., Alpine)
2. Verify data appears in Alpine sheet
3. Upload invoices from Vendor B (e.g., Pete's)
4. Verify data appears in Pete's sheet
5. **Check that Alpine sheet still has all its data** ✅
6. Upload more invoices from Vendor A
7. Verify Alpine sheet now has both old and new data combined

## Notes

- **First Upload After Fix**: The first time you upload for each vendor after deploying this fix, only the new data will be present (since there's no previous raw data stored yet). Subsequent uploads will accumulate data correctly.

- **Duplicate Handling**: The current implementation appends all new data without checking for duplicates. If you upload the same invoice twice, it will appear twice in the sheets. Consider adding duplicate detection logic if needed (based on InvoiceId + Date + Customer + Product combination).

- **Data Limits**: Google Sheets has a limit of 10 million cells per spreadsheet. With proper data management, this should be sufficient for years of sales data.

## Support

If you encounter any issues:
1. Check the **Logs** sheet in your Google Sheets for error messages
2. View execution logs in Google Apps Script (View → Executions)
3. Ensure the `TOKEN` in the script matches what your frontend is sending

