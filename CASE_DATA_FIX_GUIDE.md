# Case Data Fix Guide - All Vendors

## Problem
**Case data in Google Sheets is incorrect for multiple vendors (Alpine, KeHe, Vistar, MHD).**

Your Dashboard shows correct values (e.g., Alpine: 994 cases), but Google Sheets shows inflated values (e.g., Alpine: 12,450 cases - about 12.5x higher). This indicates historical data wasn't divided by 12 to convert pieces to cases.

## Root Cause
- **New data**: Current parsers correctly calculate cases before sending to Google Sheets
  - KeHe: Divides quantity by 12 (pieces → cases)
  - Alpine: Reads cases directly from "CASES" column
  - Vistar/MHD: Uses case values as reported
- **Old data**: Historical data in Google Sheets contains piece counts instead of cases
- **Result**: When Google Sheets combines old + new data, the totals are wildly incorrect

## Solution Options

### Option 1: Inspect ALL Vendor Data (Recommended First Step)
Run this master function to check all vendors at once:

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. In the script editor, click the function dropdown and select `inspectAllVendorData`
4. Click **Run**
5. Check the **Execution log** (View → Logs or Ctrl+Enter)

This will analyze **Alpine, KeHe, Vistar, and MHD** and show for each:
- Average case quantity
- Number of records with suspiciously high values
- Sample records for manual verification
- A warning if >30% of records appear incorrect

You can also inspect individual vendors:
- `inspectAlpineData()`
- `inspectKeHeData()`
- `inspectVistarData()`
- `inspectMhdData()`

### Option 2: Auto-Fix ALL Vendor Data
If the inspection shows incorrect data, run this master function to fix everything:

1. In Apps Script, select `fixAllVendorData` from the function dropdown
2. Click **Run**
3. Check the logs to see how many records were fixed for each vendor

This will automatically fix Alpine, KeHe, Vistar, and MHD in one go.

You can also fix individual vendors:
- `fixAlpineCaseData()`
- `fixKeHeCaseData()`
- `fixVistarCaseData()`
- `fixMhdCaseData()`

**How it works:**
- Identifies records with quantities >100 that are divisible by 12 (likely pieces, not cases)
- Divides those quantities by 12 to convert to cases
- Rebuilds each vendor sheet with corrected data

**Note:** This uses a heuristic. If you have legitimate case quantities >100 that are multiples of 12, they may be incorrectly divided. In that case, use Option 3 instead.

### Option 3: Clear and Re-Upload (Safest, but time-consuming)
If you want to start completely fresh for a specific vendor:

1. In Apps Script, run one of these clear functions:
   - `clearAlpineData()`
   - `clearKeHeData()`
2. Go back to your SalesTracker app
3. Re-upload all reports for that vendor from scratch

**Advantages:**
- Guarantees all data is calculated correctly
- No risk of incorrectly "fixing" good data

**Disadvantages:**
- Requires re-uploading all historical reports
- More time-consuming

## Verification
After applying a fix, verify the results:

1. Look at the "Total Cases" row in each vendor sheet (Alpine, KeHe, Vistar, MHD)
2. Compare with what you see in your Dashboard
3. The Google Sheets totals should now match your Dashboard totals
4. Check a few specific customer/product combinations you're familiar with

**Expected Result:**
- **Before**: Google Sheets shows ~12x higher than Dashboard
- **After**: Google Sheets matches Dashboard

## Prevention
The current parser code is correct - all new uploads will have properly calculated case data. This is a **one-time fix** for historical data that was uploaded before the parsers were corrected.

## Performance Optimization
The script has also been optimized to only process the vendor you're uploading data for, which should make uploads **5-10x faster**. Previously, it was reading and writing data for all 7 vendors on every upload, even when only uploading to one vendor.

## Technical Details

**Parser Logic (correct):**
- **KeHe**: `cases: Math.round(qty / 12)` - Divides pieces by 12
- **Alpine**: `cases: parseInt(casesStr || '0')` - Reads cases from TXT file
- **Vistar**: `cases: Math.round(qty)` - Uses reported quantity as cases
- **MHD**: `cases: Math.round(qty)` - Uses reported quantity as cases

**Data Flow:**
1. Vendor files → Parser (calculates cases correctly) → Dashboard
2. Dashboard → Google Sheets API
3. Google Sheets Script → Combines with existing data → Displays monthly view

**The Problem:**
If step 3 includes old data that contains piece counts instead of cases, the combination produces incorrect totals.

## Quick Start

**TL;DR - Just fix everything:**
1. Open Google Sheets → Extensions → Apps Script
2. Run `inspectAllVendorData()` to see the problem
3. Run `fixAllVendorData()` to fix it
4. Verify the totals match your Dashboard

Done! ✅

