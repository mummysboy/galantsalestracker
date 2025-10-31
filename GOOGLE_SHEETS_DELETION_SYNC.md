# Google Sheets Deletion Sync Feature

## Overview

This feature ensures that **when you delete a period/invoice from the Sales Tracker app, it is also deleted from Google Sheets**. Previously, deletions only happened locally and in DynamoDB, leaving orphaned data in Google Sheets.

## Problem This Solves

**Before:** 
- Delete a period from the app → Data disappears from app ✓
- But the data remains forever in Google Sheets ✗
- Creates data inconsistency between app and Google Sheets

**After:**
- Delete a period from the app → Data is deleted from:
  - Local storage (app state)
  - DynamoDB (backend database)
  - Google Sheets (synchronized automatically)

## Technical Changes

### 1. Google Apps Script Updates (UPDATED_GOOGLE_APPS_SCRIPT.js)

Added a new `handleDeleteRequest()` function that:
- Accepts DELETE requests with `action: "delete"`, `distributor`, and `period` parameters
- Filters out records matching the specified period from the raw data storage
- Rebuilds the Google Sheet view with only the remaining data
- Logs all deletion actions in the "Logs" sheet
- Counts and reports how many rows were deleted

**Key Method:**
```javascript
function handleDeleteRequest(body) {
  // Receives: { token, action: "delete", distributor: "ALPINE", period: "2025-10" }
  // Returns: OK response with deleted row count
}
```

### 2. Frontend Dashboard Updates (src/Dashboard.tsx)

Modified `handleDeletePeriod()` function to:
- Send a POST request to Google Apps Script after deleting locally
- Include action type, distributor name, and period to delete
- Handle the request gracefully (doesn't fail if Google Sheets update fails)
- Logs confirmation when deletion is sent to Google Sheets

**New Code Added:**
```typescript
// Send deletion request to Google Sheets
try {
  const webAppUrl = (process.env.REACT_APP_GS_WEBAPP_URL || '').trim();
  const token = (process.env.REACT_APP_GS_TOKEN || '').trim();
  if (webAppUrl && token) {
    await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        token,
        action: 'delete',
        distributor: selectedDistributor,
        period: periodToDelete
      })
    });
  }
}
```

## How It Works

### Delete Flow:

1. **User deletes a period** in the Sales Tracker app
2. **Local deletion** happens immediately
   - Data removed from React component state
   - localStorage updated automatically
3. **DynamoDB deletion** happens
   - Period records deleted from DynamoDB
   - Customer progressions recalculated
4. **Google Sheets deletion** happens asynchronously
   - POST request sent to Apps Script with delete action
   - Apps Script removes matching period from stored raw data
   - Google Sheet is rebuilt with remaining data
   - Deletion logged in "Logs" sheet
5. **UI updates** reflect the deletion

### Request Format:

```json
{
  "token": "asrdfgasertfawdsatfqwrasdf",
  "action": "delete",
  "distributor": "ALPINE",
  "period": "2025-10"
}
```

### Response Format:

```
OK: Deleted 45 rows for ALPINE / 2025-10
```

## Deployment Instructions

### Step 1: Update Google Apps Script

1. Go to your Google Sheet: https://docs.google.com/spreadsheets/d/17lLApxgIRcSasKIKlvc1Nqw8oYdsIheXbZbsM0kRRag
2. Click **Extensions** → **Apps Script**
3. Delete all existing code
4. Copy the entire content from `UPDATED_GOOGLE_APPS_SCRIPT.js` file
5. Click **Save** (top left)
6. You should see a "Deploy" button appear
   - If not, click **Project Settings** → check for recent deployment
   - Click on the latest deployment ID to manage
7. Click **New Deployment** → **Type: Web app**
   - Execute as: Your account
   - Who has access: Anyone
8. Click **Deploy**
9. Copy the new deployment URL and verify it matches `REACT_APP_GS_WEBAPP_URL` in your `.env` file

### Step 2: Redeploy the Frontend

1. The frontend changes are already included in `src/Dashboard.tsx`
2. Rebuild and redeploy:
   ```bash
   npm run build
   npm run deploy  # or your deployment command
   ```
3. Or if using Netlify: Simply push to main branch, it will auto-deploy

### Step 3: Verify Deployment

Test the deletion sync:

1. Upload a period of data to the app (e.g., 2025-10)
2. Check that it appears in Google Sheets
3. Delete that period from the app (use the trash icon)
4. Check the browser console (F12) for confirmation log:
   - `[Dashboard] Deletion request sent to Google Sheets for ALPINE / 2025-10`
5. Refresh Google Sheets and verify the data is gone
6. Check the "Logs" sheet in Google Sheets for the deletion record

## Error Handling

- **If Google Sheets update fails:** Local deletion still succeeds. A warning is logged to console but not shown to user (doesn't disrupt workflow).
- **If DynamoDB delete fails:** Operation stops and shows error alert to user.
- **All deletions are logged** in the "Logs" sheet in Google Sheets for audit trail

## Monitoring

### Check Google Sheets Logs

The "Logs" sheet now shows:
- Timestamp of each deletion
- Distributor and period deleted
- Number of rows removed
- Any error messages if deletion failed

Example log entry:
```
2025-10-25T15:30:45.123Z | DELETE: ALPINE / 2025-10 (removed 45 rows)
```

## Data Integrity

- **Raw data storage:** Uses PropertiesService (9KB limit) to store raw data
- **Deduplication:** Records are keyed by `date|customer|product|productCode`
- **Filtering:** Period-based deletion uses date prefix matching (YYYY-MM)
- **Rebuild:** Google Sheet layout is completely rebuilt after deletion for accuracy

## Limitations & Notes

1. **Period-based deletion only:** Deletes all records for a given month/period, not individual rows
2. **Distributor-specific:** Deletion only affects the specified distributor's sheet
3. **No undo from Apps Script:** If you accidentally delete, you'd need to re-upload the data
4. **Async operation:** Google Sheets update happens after local deletion, so app responds instantly

## Troubleshooting

### Deletion succeeded locally but not in Google Sheets

**Check:**
1. Verify `REACT_APP_GS_WEBAPP_URL` is correct in `.env`
2. Verify `REACT_APP_GS_TOKEN` matches `TOKEN` in Apps Script
3. Check browser console for warnings
4. Check Google Sheets "Logs" sheet for error messages
5. Verify Apps Script deployment is active (go to Extensions → Apps Script → Deployments)

### Google Sheets shows deleted data still there

**Check:**
1. Refresh the sheet (Ctrl+R or Cmd+R)
2. Check if you're looking at the right distributor's sheet
3. Check if the period was actually deleted (look for it in other dates)
4. Check Apps Script logs for errors

### "Unauthorized" error

**Fix:**
1. Verify token matches exactly in:
   - `REACT_APP_GS_TOKEN` in your `.env` file
   - `TOKEN` variable at top of Apps Script
2. Redeploy Apps Script after changing token

## Future Enhancements

Possible improvements for the future:

1. **Row-level deletion:** Delete specific customer/product combinations instead of entire periods
2. **Soft delete:** Mark rows as deleted without removing from Google Sheets (for audit)
3. **Batch deletion:** Delete multiple periods in one request
4. **Restore functionality:** Ability to restore recently deleted data
5. **Real-time sync:** Automatic sync of deletions as they happen (currently on-demand)

---

## Files Modified

- `UPDATED_GOOGLE_APPS_SCRIPT.js` - Added `handleDeleteRequest()` function
- `src/Dashboard.tsx` - Modified `handleDeletePeriod()` to send deletion to Google Sheets
