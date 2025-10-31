# Google Sheet - Collapsible Customer Sections Update

## Overview

The Google Sheet reporting has been enhanced to make it easier to view all customers at a glance while maintaining detailed product data when needed.

## Changes Made

### 1. Date Header Added
- **Location:** Top of the customer/product pivot table section
- **Display:** Shows the year (e.g., "2025") in a dark header bar
- **Purpose:** Clearly identifies which year's data you're viewing

### 2. Collapsible Customer Sections
- **Feature:** Each customer section is now collapsible/expandable
- **What Collapses:** 
  - Customer header row (Cases & Revenue totals)
  - All sub-vendor details (if any)
  - All product details for that customer
- **Interaction:** Click the disclosure triangle (▼) to collapse/expand

## How It Works

### Before (Expanded View)
```
2025

▼ Catapult NW (Cases)             [All rows visible]
  $ Revenue
  → Sub-Vendor A (Cases)
    $ Revenue
    • Product 1 (Cases)
    • Product 2 (Cases)
  → Sub-Vendor B (Cases)
    $ Revenue
    • Product 3 (Cases)

▼ Catapult PDX (Cases)            [All rows visible]
  $ Revenue
  • Product A (Cases)
  • Product B (Cases)
```

### After (Collapsed View - Click to Expand)
```
2025

▶ Catapult NW (Cases)             [All products hidden]
▶ Catapult PDX (Cases)            [All products hidden]
▶ Employee Purchases:Jose Olea    [All products hidden]
▶ Fulcrum Cafe (Cases)            [All products hidden]
```

When you click the disclosure triangle ▶ next to a customer name, it expands to show all the details again.

## Benefits

✅ **Easier Navigation** - See all customers on one screen
✅ **Focus on What Matters** - Expand only the customers you want to review
✅ **Cleaner Look** - Less scrolling when all collapsed
✅ **Same Data** - No data is lost, just hidden until expanded
✅ **Date Reference** - Clear year indicator at the top

## Typical Workflow

1. **View Summary:** All customers collapsed → quick scan of all company names
2. **Deep Dive:** Click on a customer → expands to show all products and revenue
3. **Compare:** Collapse one, expand another for side-by-side comparison
4. **Export:** Expand all or specific sections, then export or print

## File Changes

**File:** `UPDATED_GOOGLE_APPS_SCRIPT.js`

**Modified Section:** `rebuildMonthlyViewFor()` function

**Changes:**
- Added date header display (latestYear) before first customer
- Modified customer loop to track customerIndex
- Updated row group creation to collapse entire customer section (header + details)
- Changed collapse range from customerDetailStart to customerSectionStart

## Technical Details

### Date Header Code
```javascript
if (customerIndex === 0) {
  sheet.getRange(currentRow, 1).setValue(latestYear);
  sheet.getRange(currentRow, 1)
    .setFontWeight("bold")
    .setFontSize(12)
    .setBackground("#404040")
    .setFontColor("#ffffff");
}
```

### Collapsibility Code
```javascript
const customerSectionStart = currentRow;  // Mark section start
// ... add header and detail rows ...
sheet.getRowGroup(customerSectionStart, currentRow - 1, true).collapse();
```

## Deployment

1. Update `UPDATED_GOOGLE_APPS_SCRIPT.js` in your Google Sheet
2. Deploy as Web app (New Deployment → Web app → Deploy)
3. Next time data is uploaded or sheet is rebuilt, the new layout will appear

## Browser Compatibility

✅ Works in: Google Chrome, Firefox, Safari, Edge
✅ Google Sheets desktop version: Full support
✅ Google Sheets mobile: Full support (tap to collapse/expand)

## Tips & Tricks

- **Expand All:** Press Ctrl+Alt+1 (or Cmd+Alt+1 on Mac) in Google Sheets
- **Collapse All:** Press Ctrl+Alt+0 (or Cmd+Alt+0 on Mac) in Google Sheets
- **Keyboard:** Use Tab to navigate between customer rows
- **Print:** Expand all sections before printing for complete detail

## Troubleshooting

**Issue:** Collapse/expand buttons not showing

**Solution:**
1. Refresh Google Sheets (Ctrl+R)
2. Make sure you deployed the latest version of the script
3. Try in a different browser

**Issue:** Date header is missing

**Solution:**
1. Date only appears if you have customer data
2. If no customers, it won't display
3. Upload new data to trigger the header

## Future Enhancements

Possible improvements:
- Add period selector to show different months
- Multi-level collapsibility (collapse vendor level, sub-vendor level, product level)
- Color-coded customer collapse indicators
- Save collapse state for recurring views
