# ⚠️ ARCHIVED - Fix Your Google Sheets Issue NOW - Quick Start

**STATUS: ARCHIVED - October 15, 2025**

This guide is archived because the underlying issue has been completely fixed with the script overhaul.

**→ For current information, see: `GOOGLE_SHEETS_README.md`**

---

# Fix Your Google Sheets Issue NOW - Quick Start

## Your Problem
**"I uploaded data for 1 month, but Google Sheets shows 3 months of data and the cases are wrong"**

## Why This Happens
Your Google Apps Script **accumulates data** across uploads. When you upload September, it combines it with July + August that you uploaded before. This is by design, but it can cause issues if you:
1. Upload the same month twice (duplicates)
2. Have old data with incorrect case calculations

## Immediate Fix (5 minutes)

### Step 1: Update Your Google Apps Script

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Select ALL code (Ctrl+A / Cmd+A)
4. Delete it
5. Copy ALL code from `/Users/isaachirsch/Desktop/GalantCo/SalesTracker/UPDATED_GOOGLE_APPS_SCRIPT.js`
6. Paste it into the Apps Script editor
7. Click **Save** (💾 icon)

### Step 2: Clear Duplicate/Problem Data

Choose the option that fits your situation:

#### Option A: Clear one specific month from one vendor
```javascript
clearMonthData("KeHe", 2025, 9)
```
**Example:** `clearMonthData("KeHe", 2025, 9)` clears September 2025 from KeHe

#### Option B: Clear one month from ALL vendors
```javascript
clearAllVendorsMonthData(2025, 9)
```
**Example:** `clearAllVendorsMonthData(2025, 9)` clears September from all vendors

#### Option C: Start completely fresh for one vendor
```javascript
clearKeHeData()
```
**Available functions:**
- `clearAlpineData()`
- `clearKeHeData()`
- `clearMhdData()`

**How to run these:**
1. In Apps Script, select the function name from the dropdown at the top
2. Click the **Run** button (▶)
3. Grant permissions if prompted
4. Check **View → Logs** to see what was deleted

### Step 3: Fix Case Calculation Issues

Run these two functions in order:

```javascript
inspectAllVendorData()  // See what's wrong
fixAllVendorData()      // Fix it
```

**What this does:**
- Checks if your historical data has pieces instead of cases
- Automatically divides quantities by 12 where needed
- Rebuilds all vendor sheets with correct data

### Step 4: Verify the Fix

1. Look at your Google Sheets - check the "Total Cases" row
2. Compare with your Dashboard numbers
3. They should now match!

### Step 5: Re-upload Clean Data

If you cleared a month in Step 2:
1. Go back to your SalesTracker app
2. Upload the report for that month again
3. It will now show correct data without duplicates

## Vendor Names Reference

When using `clearMonthData()`, use these exact names:

- `"Alpine"`
- `"Pete's Coffee"`
- `"KeHe"`
- `"Vistar"`
- `"Tony's Fine Foods"`
- `"Troia Foods"`
- `"Mike Hudson"`

## Example Scenarios

### Scenario 1: "I uploaded September twice"
```javascript
// 1. Clear the duplicate September data
clearMonthData("KeHe", 2025, 9)

// 2. Re-upload September report from SalesTracker app
```

### Scenario 2: "All my data is wrong, need to start over"
```javascript
// 1. Clear everything for the problematic vendor
clearKeHeData()

// 2. Re-upload ALL reports for KeHe from SalesTracker app
```

### Scenario 3: "Cases are 12x too high"
```javascript
// 1. Check all vendors
inspectAllVendorData()

// 2. Fix the case calculations
fixAllVendorData()

// Done! No need to re-upload
```

### Scenario 4: "Show only the month I just uploaded"
**Note:** The Google Sheets are designed to show ALL months together. This is intentional for year-to-date tracking. If you want to see only one month:

```javascript
// Option 1: Clear all other months (not recommended)
clearMonthData("KeHe", 2025, 7)  // Clear July
clearMonthData("KeHe", 2025, 8)  // Clear August
// Now only September remains

// Option 2: Use filtering in Google Sheets
// - In the monthly columns, use Google Sheets' built-in filter feature
// - Hide columns you don't want to see
```

## Understanding the Monthly View

Your Google Sheets show a **year-to-date cumulative view** with:
- ✅ Jan-Dec columns showing all months with data
- ✅ New/Lost customer tracking across months
- ✅ Customer → Product breakdown
- ✅ Hierarchical grouping (collapsible)

**This is intentional!** It helps you see trends across the year, compare months, and track customer retention.

## After the Fix

Going forward, to avoid this issue:

1. **Check before uploading** - See what months are already in Google Sheets
2. **Don't upload twice** - If you need to replace data, clear the month first
3. **Use the Dashboard** - The Dashboard shows per-period data without accumulation
4. **Use Google Sheets** - Google Sheets shows year-to-date cumulative data

## Still Having Issues?

Run this diagnostic:
```javascript
inspectAllVendorData()
```

Check the logs (View → Logs) for:
- How many records per vendor
- Average case quantities
- Warnings about incorrect data
- Sample records for manual verification

## Summary - What You Did

✅ Updated Google Apps Script with new helper functions
✅ Cleared duplicate or problematic month data
✅ Fixed case calculation issues (divided pieces by 12)
✅ Verified that Dashboard and Google Sheets now match
✅ Re-uploaded clean data if needed

**Your Google Sheets should now show correct data!** 🎉

---

## Quick Command Reference

```javascript
// INSPECT DATA
inspectAllVendorData()           // Check all vendors
inspectKeHeData()                // Check one vendor

// FIX CASE CALCULATIONS  
fixAllVendorData()               // Fix all vendors
fixKeHeCaseData()                // Fix one vendor

// CLEAR SPECIFIC MONTHS
clearMonthData("KeHe", 2025, 9)  // Clear one month from one vendor
clearAllVendorsMonthData(2025, 9) // Clear one month from all vendors

// CLEAR EVERYTHING
clearKeHeData()                  // Clear all KeHe data
clearAlpineData()                // Clear all Alpine data
clearMhdData()                   // Clear all MHD data
```

Copy this script, paste into Apps Script, save, and run! ✨

