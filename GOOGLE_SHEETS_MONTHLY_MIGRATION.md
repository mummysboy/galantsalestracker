# Google Sheets Migration: Quarterly to Monthly View

## Summary of Changes

The Google Sheets integration has been updated to push **monthly data** instead of quarterly data. The new sheet format includes:

1. **Monthly Report Summary** at the top with:
   - Total Quantity per month
   - Total Revenue per month
   - Unique Customers per month
   - Unique Products per month
   - A TOTAL row at the bottom

2. **Detailed Product Data** below with:
   - Individual rows for each Customer/Product combination
   - 12 month columns (Jan through Dec) instead of 4 quarters

## Migration Steps

### 1. Update Your Google Apps Script

1. Open your Google Sheet (e.g., "SalesTracker Data")
2. Go to **Extensions → Apps Script**
3. Replace the entire script with the new version from the README.md file (starting at line 136)
4. Make sure to keep your `TOKEN_VALUE` the same
5. Click **Save** (disk icon)
6. The script will now create/update a `Monthly_CSV_View` tab instead of `Quarterly_CSV_View`

### 2. Test the New Script

1. Upload any sales data through your SalesTracker app
2. Check your Google Sheet - you should now see:
   - The existing `AllData` tab (unchanged)
   - A new `Monthly_CSV_View` tab with:
     - **Top section**: Monthly summary with totals
     - **Bottom section**: Product-level data by month

### 3. (Optional) Clean Up Old Tab

If you have an old `Quarterly_CSV_View` tab:
- You can safely delete it or rename it to `Quarterly_CSV_View_OLD` for reference
- The new script will create and maintain the `Monthly_CSV_View` tab

## What Changed in the Script

### Function Names
- `rebuildQuarterlyView()` → `rebuildMonthlyView()`
- `QUARTER_VIEW_SHEET_NAME` → `MONTHLY_VIEW_SHEET_NAME`

### Data Structure
**Before (Quarterly):**
```
Customer | Product | Q1 | Q2 | Q3 | Q4
```

**After (Monthly):**
```
MONTHLY REPORT SUMMARY
Month          | Total Quantity | Total Revenue | Unique Customers | Unique Products
Jan 2025       | 150           | $5,234.50     | 12              | 25
Feb 2025       | 200           | $7,891.00     | 15              | 30
...

DETAILED PRODUCT DATA BY MONTH
Customer | Product | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec
```

## Key Benefits

1. **More Granular**: See month-by-month trends instead of quarter-by-quarter
2. **Summary Data**: Quick overview of monthly totals at the top
3. **Better Formatting**: Color-coded sections, frozen headers, auto-resized columns
4. **Revenue Tracking**: Monthly summary includes both quantity AND revenue

## Troubleshooting

- **Old quarterly data still showing?**: Delete the `Quarterly_CSV_View` tab manually
- **Monthly view not appearing?**: Make sure you saved and deployed the new script
- **Data looks wrong?**: Upload new data through the app to trigger a rebuild
- **Script error?**: Check that you didn't accidentally modify the TOKEN value

## Need Help?

If you encounter any issues with the migration, check the main README.md file for the complete script and detailed setup instructions.

