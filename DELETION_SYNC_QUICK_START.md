# Deletion Sync - Quick Start Guide

## What's New?

When you **delete a period** from your Sales Tracker app, it now automatically **deletes the data from Google Sheets** as well. No more orphaned data!

## Quick Deployment (5 minutes)

### 1️⃣ Update Google Apps Script

1. Open your Google Sheet
2. Click **Extensions** → **Apps Script**
3. Select all code and delete it
4. Copy ALL code from the file: `UPDATED_GOOGLE_APPS_SCRIPT.js` in this repository
5. Paste it into Apps Script
6. Click **Save**
7. Click **New Deployment** (top right)
   - Type: **Web app**
   - Execute as: **Your account**
   - Who has access: **Anyone**
8. Click **Deploy**
9. ✅ Done with Apps Script

### 2️⃣ Frontend Redeploy

The frontend code is **already updated** in `src/Dashboard.tsx`. Just redeploy:

**If using Netlify (easiest):**
- Simply push to main branch, Netlify auto-deploys

**If deploying manually:**
```bash
npm run build
npm run deploy
```

### 3️⃣ Test It

1. Upload a test period to your app (any distributor)
2. Verify it appears in Google Sheets
3. Go back to the app and click the **trash icon** to delete that period
4. Check browser console (F12) for this message:
   ```
   [Dashboard] Deletion request sent to Google Sheets for ALPINE / 2025-10
   ```
5. Go back to Google Sheets and **refresh** (Ctrl+R)
6. ✅ Data should be gone!

## How It Works

```
You delete a period
        ↓
Local state updated (instant)
        ↓
DynamoDB updated
        ↓
Google Sheets updated (async)
        ↓
Logs recorded in "Logs" sheet
```

## What Gets Deleted?

- ✅ Deleted from app (state)
- ✅ Deleted from browser storage (localStorage)
- ✅ Deleted from DynamoDB (backend database)
- ✅ Deleted from Google Sheets (synchronized)
- ✅ Deletion logged for audit trail

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Data still in Google Sheets after delete | Refresh the sheet (Ctrl+R or Cmd+R) |
| "Unauthorized" error | Check `.env` file token matches Apps Script |
| Delete fails with error | Check browser console (F12) for details |
| Not sure if it worked | Check "Logs" sheet in Google Sheets |

## Before & After

### Before (Old Behavior)
- Delete from app → App cleaned ✅
- Data still in Google Sheets → Confusion ❌

### After (New Behavior)
- Delete from app → Everywhere cleaned ✅
- Data gone from Google Sheets too ✅

## File Changes

Only 2 files changed:
1. `UPDATED_GOOGLE_APPS_SCRIPT.js` - Added delete handler
2. `src/Dashboard.tsx` - Modified delete function

## Questions?

Check the full documentation: `GOOGLE_SHEETS_DELETION_SYNC.md`
