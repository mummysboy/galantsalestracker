# Google Sheet Section Removal

## What Was Removed

The "NEW & LOST CUSTOMERS DETAIL" collapsible section has been removed from the Google Sheet reporting.

### Removed Section

**Section Name:** "▼ NEW & LOST CUSTOMERS DETAIL - 2025 (Click to expand/collapse)"

**Contents That Were Removed:**
- Month-by-month breakdown of new customers
- Month-by-month breakdown of lost customers
- Customer names listed by month
- Collapsible grouping control

### Example of Removed Content

```
NEW CUSTOMERS:
Aug:                         Employee Purchases: Jose Olea, Fulcrum Cafe

LOST CUSTOMERS:
Jul:                         Catapult PDX
```

## What Still Remains

The **summary metrics** showing new and lost customer counts are **still displayed** in the top section:

- "New Customers" row with monthly counts
- "Lost Customers" row with monthly counts
- Total new/lost customer counts

These provide the high-level overview without the detailed month-by-month breakdown.

## Google Sheet Layout After Change

### Current Layout:
1. **MONTHLY SALES OVERVIEW - 2025** (title)
2. **Key Metrics** (Total Cases, Revenue, New Customers count, Lost Customers count)
3. **SALES BY CUSTOMER & PRODUCT - 2025** (pivot table)

### Previous Layout:
1. MONTHLY SALES OVERVIEW - 2025
2. Key Metrics
3. ~~NEW & LOST CUSTOMERS DETAIL (removed)~~
4. SALES BY CUSTOMER & PRODUCT - 2025

## Code Changes

**File:** `UPDATED_GOOGLE_APPS_SCRIPT.js`

**Lines Removed:** Approximately 110 lines from the `rebuildMonthlyViewFor()` function

**Specifically Removed:**
- Section header and formatting (lines ~576-589)
- NEW CUSTOMERS detail loop (lines ~593-621)
- LOST CUSTOMERS detail loop (lines ~635-663)
- Collapsible group creation (lines ~677-680)

**What Was NOT Removed:**
- Calculation of new/lost customer data (needed for summary metrics)
- Summary display in "New Customers" and "Lost Customers" rows
- All other sheet sections

## Deployment

To apply this change:

1. Update the Google Apps Script with `UPDATED_GOOGLE_APPS_SCRIPT.js`
2. Deploy the updated script
3. Next time data is uploaded or sheet is refreshed, the detail section will no longer appear

## Effect on Reporting

✅ **Cleaner, more concise sheet layout**
✅ **Faster sheet generation** (fewer rows to build)
✅ **Easier to scroll** (less content to navigate)
✅ **Summary metrics still visible** (high-level view maintained)
❌ **No detailed customer names by month** (if needed, check in app)

## Reverting (If Needed)

If you want to restore the detailed section:

1. Get the previous version of `UPDATED_GOOGLE_APPS_SCRIPT.js`
2. Redeploy
3. The detail section will reappear

Or contact support to restore that functionality.
