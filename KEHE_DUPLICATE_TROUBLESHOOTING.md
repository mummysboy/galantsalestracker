# Kehe Duplicate Issue - Troubleshooting Guide

## ⚠️ Important: The Fix Has Been Enhanced

If you tried uploading twice and the issue persisted, it was likely due to **old duplicate data already existing in DynamoDB or localStorage** from previous uploads.

**The enhanced fix now includes an additional deduplication layer that catches duplicates from all sources.**

---

## Step 1: Clear Old Duplicate Data

### Clear Browser Data
**For Chrome/Edge/Firefox:**
1. Open Developer Tools: **F12**
2. Go to **Application** tab (or **Storage** in Firefox)
3. Click **Local Storage**
4. Find and click your domain (e.g., localhost:3000 or your app URL)
5. Look for keys starting with `salesTracker_`
6. Delete the key: **`salesTracker_keheData`**
7. Refresh the page

**Or use console command:**
```javascript
// Open browser console (F12 → Console tab)
localStorage.removeItem('salesTracker_keheData');
window.location.reload();
```

### Clear DynamoDB (If Needed)
If you suspect duplicate data in DynamoDB, you may need to clear the Kehe records from your AWS DynamoDB table. Contact your admin or use the AWS console.

---

## Step 2: Verify the Fix Is Deployed

### Check Browser Console
1. Open **F12** (Developer Tools)
2. Go to **Console** tab
3. Refresh the page
4. You should see logs like:
   ```
   Loading data from DynamoDB...
   Loaded 500 records for KEHE from DynamoDB
   ```

### Check for New Build
The fix was updated on October 24, 2025. Make sure you're running the latest build:
1. **Hard refresh** the page: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
2. Or clear browser cache completely

---

## Step 3: Test the Fix

### Test Scenario: Duplicate Upload

1. **Make sure browser data is clean** (complete Step 1)
2. **Upload a Kehe CSV report once**
   - Note the total cases shown (e.g., 500)
   - Note the total revenue
3. **Open browser console** (F12 → Console tab)
4. **Upload the EXACT SAME FILE again**
5. **Watch the console for these logs:**

```
✓ handleKeHeDataParsed called with 500 records
✓ After deduplication: 500 records (removed 0 duplicates)
✓ New periods from upload: 2025-09
✓ Existing KeHe data: 500 records, keeping 0 (removing 500)
✓ Merged KeHe data: 500 records
✓ KeHe data successfully saved to DynamoDB
```

**Key indication the fix is working:**
- Total cases are **still 500, not 1000** ✅
- Console shows "removed 0 duplicates" (within the upload)
- No "WARNING: Merged data had duplicates!" message

---

## Step 4: What If It Still Doesn't Work?

### Check Console Logs
Open browser console and look for:

**What you SHOULD see:**
```
✓ After deduplication: X records (removed 0 duplicates)
✓ Existing KeHe data: X records, keeping Y...
✓ WARNING: Merged data had duplicates! Removed Z duplicate records
```

**If you see WARNING messages**, this means:
- Old duplicate data exists in DynamoDB/localStorage
- The new dedup layer is catching and removing them ✅
- You should see the correct totals despite having old duplicates

### If You Still See Duplicates

**Possible Causes:**

1. **Page not reloaded**
   - Solution: Hard refresh with **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)

2. **Build not updated**
   - Solution: Clear browser cache, reload, or use private/incognito mode

3. **Old data still in DynamoDB**
   - Solution: Clear localStorage (Step 1), close tab, reopen
   - If still persists, DynamoDB needs to be cleared by admin

4. **Different file uploaded second time**
   - Solution: Upload the EXACT SAME file with identical content

### Debug: Enable Verbose Logging

Add this to your browser console to see ALL data:
```javascript
// Show all KeHe data currently in state
const keheData = JSON.parse(localStorage.getItem('salesTracker_keheData') || '[]');
console.log(`Total KeHe records in localStorage: ${keheData.length}`);
console.log(`By period:`, keheData.reduce((acc, r) => {
  acc[r.period] = (acc[r.period] || 0) + 1;
  return acc;
}, {}));
```

This shows how many records are stored for each period.

---

## Expected Behavior - Before & After Fix

### Before Fix
```
Upload 1 (Sept 2025):  500 cases shown ✅
Upload 2 (same file):  1000 cases shown ❌ DOUBLED!
```

### After Enhanced Fix
```
Upload 1 (Sept 2025):  500 cases shown ✅
Upload 2 (same file):  500 cases shown ✅ FIXED!
```

---

## Three-Layer Protection

The fix now has three layers of deduplication:

### Layer 1: Parse-Time Dedup
- Removes duplicates immediately after CSV parsing
- Catches duplicates within the uploaded file

### Layer 2: Merge-Time Dedup  
- Deduplicates after merging with existing data
- Catches duplicates from DynamoDB or localStorage
- **NEW: This is what catches old duplicates!**

### Layer 3: DynamoDB Dedup
- Prevents saving duplicate records to database
- Backup layer for additional safety

---

## Quick Verification Checklist

- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Cleared localStorage (checked `salesTracker_keheData`)
- [ ] Uploaded a Kehe file once
- [ ] Uploaded the SAME file again
- [ ] Checked browser console for dedup logs
- [ ] Verified totals didn't increase

If all checked and issue persists, there may be a deeper issue with data loading from DynamoDB.

---

## Still Having Issues?

If you've completed all troubleshooting steps and **still see duplicates**, please provide:

1. **Screenshot of browser console logs** during the second upload
2. **What numbers you're seeing** (e.g., "First upload: 500, Second upload: 750")
3. **File you're uploading** (sample records if possible)
4. **Whether you cleared browser data** before testing

This will help identify if the issue is:
- In the dedup logic
- In how data is loaded from DynamoDB
- Something else entirely

---

## Files Modified

- `src/Dashboard.tsx`
  - Enhanced `handleKeHeDataParsed()` with additional dedup layer
  - Added WARNING log when duplicates are found and removed

---

## What This Fix Does NOT Do

- ❌ Automatically clear old duplicate data from DynamoDB
- ❌ Modify past uploads (those stay in database)
- ❌ Affect other vendors (Alpine, Pete's, etc.)

## What This Fix DOES Do

- ✅ Prevents new duplicates from being created
- ✅ Removes duplicates from all sources (upload, DynamoDB, localStorage)
- ✅ Shows warnings when duplicates are detected
- ✅ Ensures browser always displays clean data
