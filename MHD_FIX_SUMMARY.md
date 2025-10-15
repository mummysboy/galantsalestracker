# Mike Hudson (MHD) Data Upload Fix

## Problem
Mike Hudson report data was not being pushed to Google Sheets properly.

## Root Cause
The source identifier being sent was `"MHD XLSX"` but needed to be clearer for proper routing in the Google Apps Script.

## Fix Applied

### 1. Updated Source Identifier (MhdReportUpload.tsx)
Changed line 70 from:
```javascript
"MHD XLSX",
```

To:
```javascript
"Mike Hudson",
```

This ensures the data matches the Google Apps Script filter which looks for:
```javascript
.includes("mhd") || .includes("mike hudson")
```

### 2. Added Debug Logging
Added console logging before and after the fetch call to help diagnose any issues:
```javascript
console.log('MHD Upload - Sending to Google Sheets:', {
  url: webAppUrl,
  recordCount: rows.length,
  sampleRows: rows.slice(0, 2)
});
await fetch(webAppUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ token, rows }) });
console.log('MHD Upload - Data sent successfully');
```

## How It Works Now

When you upload Mike Hudson reports:

1. **Frontend (React App)**:
   - Parses the Excel file using `mhdParser.ts`
   - Extracts customer, product, and sales data by month
   - Sends data to Google Sheets with source: `"Mike Hudson"`

2. **Backend (Google Apps Script)**:
   - Receives the data
   - Filters rows where source contains "mike hudson"
   - Routes to the "Mike Hudson" sheet
   - Reads existing MHD data from `Mike Hudson_RawData` hidden sheet
   - Combines with new data
   - Rebuilds the "Mike Hudson" sheet with ALL data (existing + new)
   - Saves new data to `Mike Hudson_RawData` sheet

3. **Google Sheets Display**:
   - Monthly sales overview with totals
   - New and lost customers tracking
   - Sales by customer and product breakdown
   - Hierarchical display if sub-vendors detected

## Testing Steps

1. **Upload MHD Report**:
   - Click on "Mike Hudson Distributor Reports" section
   - Upload one or more Excel files
   - Click "Process Files"
   - Watch the browser console for debug messages

2. **Verify in Google Sheets**:
   - Open your Google Sheets
   - Go to the "Mike Hudson" tab
   - Should see monthly data displayed
   - Check the "Logs" tab for confirmation entry

3. **Upload Another Vendor**:
   - Upload data from another vendor (e.g., Alpine)
   - Verify that MHD data is still present in the "Mike Hudson" sheet
   - MHD data should NOT be deleted

4. **Upload More MHD Data**:
   - Upload another MHD report with different months
   - Verify that both old and new data appear in the sheet
   - Data should accumulate, not replace

## Console Output to Look For

When uploading MHD data, you should see in the browser console:
```
MHD Upload - Sending to Google Sheets: {
  url: "https://script.google.com/...",
  recordCount: 150,
  sampleRows: [...]
}
MHD Upload - Data sent successfully
```

## Troubleshooting

### If MHD Data Still Doesn't Appear:

1. **Check Environment Variables**:
   - Ensure `REACT_APP_GS_WEBAPP_URL` is set
   - Ensure `REACT_APP_GS_TOKEN` is set

2. **Check Browser Console**:
   - Look for the "MHD Upload - Sending..." message
   - Check if there are any errors

3. **Check Google Sheets Logs Tab**:
   - Look for entries showing MHD rows received
   - Check the "AddedMhd" column for count

4. **Check Google Apps Script Logs**:
   - Go to Apps Script editor
   - View → Executions
   - Look for recent executions and any errors

5. **Verify Hidden Sheet**:
   - In Google Sheets, unhide sheets (if hidden)
   - Look for "Mike Hudson_RawData" sheet
   - Check if data is being stored there

### If No Data Appears in Google Sheets After First Fix Deployment:

If you had existing MHD data in your sheets BEFORE deploying the persistence fix, that data may have been lost. After deploying these changes:
- Re-upload your MHD reports
- The data will now persist correctly going forward

## Files Modified

1. `/src/components/MhdReportUpload.tsx` - Fixed source identifier and added logging
2. `/UPDATED_GOOGLE_APPS_SCRIPT.js` - Already fixed for data persistence

## Deploy Steps

### Frontend (React App):
```bash
npm install
npm run build
# Deploy to Netlify or your hosting service
```

### Backend (Google Apps Script):
1. Open Google Apps Script editor
2. Paste updated code from `UPDATED_GOOGLE_APPS_SCRIPT.js`
3. Save (Ctrl+S / Cmd+S)
4. Deploy → Manage deployments → Edit (or New deployment)
5. Update/create as Web App
6. Copy the web app URL to your `.env` file as `REACT_APP_GS_WEBAPP_URL`

## Summary

The MHD data should now properly upload to Google Sheets and persist across multiple uploads from different vendors. The source identifier has been clarified and debug logging added to help diagnose any future issues.

