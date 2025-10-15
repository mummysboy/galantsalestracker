# ⚠️ ARCHIVED - Google Sheets Data Accumulation Issue - Fix Guide

**STATUS: ARCHIVED - October 15, 2025**

This issue has been completely resolved with the script overhaul.

**→ For current information, see: `GOOGLE_SHEETS_README.md`**

---

# Google Sheets Data Accumulation Issue - Fix Guide

## The Problem

**Symptom:** When you upload data for 1 month, Google Sheets shows data for 3 months, and the case numbers don't match what you see in your Dashboard.

### Root Cause

Your Google Apps Script is designed to **accumulate and persist data** across uploads. This means:

1. When you upload September data, the script:
   - Reads ALL existing data from hidden `_RawData` sheets (July, August, etc.)
   - Combines September with the existing months
   - Shows ALL months together in the monthly view

2. If you upload the same month multiple times, it may add duplicate data (even with duplicate detection)

3. The case data might be wrong if old data wasn't properly converted from pieces to cases

## Understanding the Behavior

**Current (Accumulative) Behavior:**
- Upload July → Sheet shows July ✓
- Upload August → Sheet shows July + August ✓
- Upload September → Sheet shows July + August + September ✓
- Re-upload September → Sheet shows July + August + September + September (duplicate!) ✗

**What You Might Expect (Replace Behavior):**
- Upload July → Sheet shows ONLY July
- Upload August → Sheet shows ONLY August
- Upload September → Sheet shows ONLY September

## Solutions

### Solution 1: Clear Specific Month Data (Quick Fix)

If you've uploaded duplicate data or want to remove specific months:

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Run one of these functions:

#### Clear one month from one vendor:
```javascript
clearMonthData("KeHe", 2025, 9)  // Clears September 2025 from KeHe
clearMonthData("Vistar", 2025, 8)  // Clears August 2025 from Vistar
```

#### Clear one month from ALL vendors:
```javascript
clearAllVendorsMonthData(2025, 9)  // Clears September 2025 from all vendors
```

**Available vendor names:**
- `"Alpine"`
- `"Pete's Coffee"`
- `"KeHe"`
- `"Vistar"`
- `"Tony's Fine Foods"`
- `"Troia Foods"`
- `"Mike Hudson"`

**How to run:**
1. In Apps Script editor, select the function from the dropdown at the top
2. Click **Run** (▶ button)
3. Check the **Execution log** (View → Logs or Ctrl+Enter) to see results

### Solution 2: Replace Mode (Coming Soon)

I've added support for a `replaceMode` flag in the script. When implemented in the React app, this will:
- Clear ALL existing data for a vendor before uploading new data
- Useful if you want to start fresh for a vendor

**Note:** This needs frontend updates to enable (not yet implemented in React components)

### Solution 3: Clear All Vendor Data and Re-upload

If you want to completely start fresh for a vendor:

1. In Apps Script, run:
```javascript
clearAlpineData()  // or clearKeHeData(), etc.
```

2. Re-upload all your reports for that vendor from the SalesTracker app

**Available clear functions:**
- `clearAlpineData()`
- `clearKeHeData()`
- `clearVistarData()` (you'll need to add this - copy from clearKeHeData)
- Or use the master functions in the script

### Solution 4: Fix Case Data Issues

If your case numbers are wrong (inflated by 12x), run:

```javascript
inspectAllVendorData()  // Check all vendors for issues
fixAllVendorData()       // Auto-fix case calculation issues
```

See `CASE_DATA_FIX_GUIDE.md` for detailed instructions.

## How to Use the Data Accumulation Feature Correctly

The accumulation feature is actually useful if you understand it:

### Best Practice for Monthly Data

**Option A: Upload all months at once**
- Collect all your monthly reports (July, August, September)
- Upload them all in one session
- The sheet will show the complete yearly view

**Option B: Add months progressively**
- Upload July in July → Sheet shows July
- Upload August in August → Sheet shows July + August (cumulative)
- Upload September in September → Sheet shows July + August + September (full year-to-date)

**Option C: Re-upload a corrected month**
1. First, clear the month: `clearMonthData("KeHe", 2025, 9)`
2. Then upload the corrected September data
3. The sheet will now have the correct data for all months

## Prevention: Avoiding Duplicate Data

To prevent uploading the same month twice:

1. **Before uploading**, check your Google Sheet to see what months already exist
2. **If you need to replace a month**, clear it first using `clearMonthData()`
3. **Keep track** of what you've uploaded in a spreadsheet or notes

## Understanding the Monthly View

The monthly view in Google Sheets shows:

### Top Section: Key Metrics
- Total Cases by month
- New Customers by month
- Lost Customers by month

### Middle Section: Customer Details
- Lists of new and lost customers with vendor context

### Bottom Section: Sales Pivot
- Customer → Product → Monthly cases
- Shows ALL months with data
- Collapsed groups for easy navigation

**This is cumulative by design** - it's meant to show your entire year's data in one place.

## Technical Details

### How Duplicate Detection Works

The script prevents exact duplicates using this key:
```
date|customer|product|invoiceId
```

**This means:**
- If you upload the same invoice file twice, it should detect duplicates
- BUT if invoice IDs are synthetic or change between uploads, duplicates may slip through
- Month-level clearing (`clearMonthData`) is more reliable than duplicate detection

### Data Storage Structure

```
Google Sheets:
├── Alpine (monthly view - what you see)
├── Alpine_RawData (hidden - raw transaction data)
├── Pete's Coffee (monthly view)
├── Pete's Coffee_RawData (hidden)
├── KeHe (monthly view)
├── KeHe_RawData (hidden)
└── ... (all vendors follow this pattern)
```

### When Data Gets Combined

```
Upload Flow:
1. React App → Sends NEW data → Google Apps Script
2. Script reads Alpine_RawData → Gets EXISTING data
3. Script combines: [existing] + [new] = [all data]
4. Script rebuilds Alpine sheet with [all data]
5. Script saves [all data] back to Alpine_RawData
```

## Quick Reference

### Common Scenarios

**"I uploaded September twice by accident"**
```javascript
clearMonthData("KeHe", 2025, 9)  // Then re-upload once
```

**"My KeHe data shows 3 months but I only want September"**
```javascript
clearKeHeData()  // Clear everything, then re-upload ONLY September
```

**"All my vendors show wrong data for August"**
```javascript
clearAllVendorsMonthData(2025, 8)  // Then re-upload August for each vendor
```

**"Case numbers are way too high (12x inflated)"**
```javascript
inspectAllVendorData()  // Check the issue
fixAllVendorData()       // Fix it automatically
```

**"I want to start completely fresh"**
```javascript
// For each vendor you want to clear:
clearAlpineData()
clearKeHeData()
clearVistarData() // Note: You may need to add this function
clearMhdData()    // Note: You may need to add this function
// Then re-upload all your data
```

## Next Steps

1. **Immediate Fix**: Run `clearMonthData()` to remove duplicate/unwanted months
2. **Fix Case Data**: Run `inspectAllVendorData()` and `fixAllVendorData()` if needed
3. **Deploy Updated Script**: Copy the updated `UPDATED_GOOGLE_APPS_SCRIPT.js` to your Apps Script editor
4. **Test**: Upload a single month and verify it works as expected

## Need Help?

If you're still seeing issues:
1. Check the **Logs** sheet in your Google Sheets for upload history
2. Check **Execution log** in Apps Script for detailed error messages
3. Run `inspectAllVendorData()` to see detailed statistics about your data
4. Look at the hidden `_RawData` sheets to see exactly what's stored

---

## Summary

✅ **The accumulation behavior is by design** - it helps you build a yearly view
✅ **You can clear specific months** using `clearMonthData()`
✅ **You can start fresh** using `clearKeHeData()` and similar functions
✅ **Case data issues** can be fixed with `fixAllVendorData()`
⚠️ **Always check what's already in Google Sheets** before uploading
⚠️ **Clear old data first** if you're re-uploading the same month

