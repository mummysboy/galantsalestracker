# New & Lost Customers - Vendor Context Enhancement

## Overview
Enhanced the "New & Lost Customers Detail" section in Google Sheets to clearly show which vendor/retailer each customer belongs to when displaying hierarchical data (like KeHe and Vistar).

## Problem
Previously, when displaying new and lost customers from vendors with hierarchical structures, the display wasn't clear about which vendor territory or retailer the customer belonged to. For example:

**Old Display:**
```
✅ NEW CUSTOMERS:
Jan: Store #123 - San Francisco, MONSTER VENDING LLC, Berkeley Store #456
```

This didn't make it clear that:
- "Store #123 - San Francisco" belongs to Whole Foods
- "MONSTER VENDING LLC" belongs to Vistar Illinois
- "Berkeley Store #456" belongs to Whole Foods

## Solution
Updated the Google Apps Script to parse hierarchical customer names and display them with vendor context using the → arrow symbol.

**New Display:**
```
✅ NEW CUSTOMERS:
Jan: 
  Vistar Illinois → MONSTER VENDING LLC
  Whole Foods → Store #123 - San Francisco
  Whole Foods → Berkeley Store #456
```

Now it's immediately clear which vendor/retailer each customer belongs to!

## How It Works

### 1. Data Format
The upload components (KeHe, Vistar, MHD, etc.) send hierarchical customer names in the format:
```
"Vendor - Customer"
```

Examples:
- `"Whole Foods - San Francisco Store #123"`
- `"Vistar Illinois - MONSTER VENDING LLC"`
- `"Safeway - Oakland Location"`

### 2. Parsing Logic
The Google Apps Script now:

1. **Detects Hierarchical Names**: Identifies customer names containing " - " separator
2. **Splits into Components**: 
   - Main vendor/retailer (before the " - ")
   - Sub-customer/location (after the " - ")
3. **Groups by Vendor**: Groups all customers under their respective vendors
4. **Formats Display**: Shows each customer with vendor context using → arrow

### 3. Display Format
The script displays customers in two categories:

**Standalone Customers** (no hierarchy):
```
Jan:
  Pete's Coffee
  Alpine Foods
```

**Hierarchical Customers** (with vendor context):
```
Jan:
  Vistar Illinois → ABC VENDING
  Vistar Illinois → XYZ VENDING
  Whole Foods → Berkeley Store
```

## Visual Example

### New Customers Section:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEW & LOST CUSTOMERS DETAIL - 2025

✅ NEW CUSTOMERS:

Jan:  Vistar Illinois → MONSTER VENDING LLC
      Whole Foods → San Francisco Store #123

Feb:  Vistar Northern California → ACME VENDING INC
      Safeway → Oakland Location

Mar:  Pete's Coffee

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ LOST CUSTOMERS:

Feb:  Whole Foods → Berkeley Store #456

Mar:  Vistar Illinois → OLD VENDING CO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Benefits

### 📍 Clear Vendor Attribution
- Immediately see which vendor/retailer each customer belongs to
- No confusion about customer names that might be similar across vendors

### 🎯 Better Geographic Tracking
For vendors like Vistar with regional divisions:
- Easily see if new customers are from "Vistar Illinois" vs "Vistar Northern California"
- Track regional growth patterns

### 📊 Retailer Chain Insights
For retailers like Whole Foods, Safeway, etc.:
- See which specific store locations are new/lost
- Track expansion or contraction by location

### 🔍 Faster Analysis
- No need to cross-reference with other sections
- All context visible at a glance
- Grouped by vendor for easy scanning

## Technical Details

### Code Changes (UPDATED_GOOGLE_APPS_SCRIPT.js)

**Lines 544-598: New Customers Display**
```javascript
// Group by main vendor if hierarchical (contains " - ")
const grouped = {};
const standalone = [];

sortedCustomers.forEach(custName => {
  if (custName.includes(" - ")) {
    const parts = custName.split(" - ");
    const mainVendor = parts[0].trim();
    const subCustomer = parts.slice(1).join(" - ").trim();
    if (!grouped[mainVendor]) grouped[mainVendor] = [];
    grouped[mainVendor].push(subCustomer);
  } else {
    standalone.push(custName);
  }
});

// Build formatted display string
const displayParts = [];
standalone.forEach(c => displayParts.push(c));

Object.keys(grouped).sort().forEach(vendor => {
  grouped[vendor].forEach(subCust => {
    displayParts.push(`${vendor} → ${subCust}`);
  });
});

const customerList = displayParts.join("\n");
```

**Lines 622-676: Lost Customers Display**
- Same logic applied to lost customers section

### Formatting Features
- Each customer on its own line (using `\n` separator)
- Wrapped text for readability
- Vertical alignment set to "top"
- Vendor names sorted alphabetically
- Standalone customers shown first, then hierarchical ones

## Real-World Examples

### KeHe Sheet - New Customers
```
✅ NEW CUSTOMERS:

Jan:  Whole Foods → San Francisco #123
      Whole Foods → Berkeley #456
      Safeway → Oakland Downtown

Feb:  Whole Foods → Palo Alto #789
      Target → San Jose #101
```

### Vistar Sheet - Lost Customers
```
❌ LOST CUSTOMERS:

Mar:  Vistar Illinois → OLD VENDING CO
      Vistar Illinois → CLOSED LOCATION

Apr:  Vistar Northern California → DEFUNCT VENDING LLC
```

### MHD Sheet - New Customers
```
✅ NEW CUSTOMERS:

Jan:  Costco → San Mateo Warehouse
      Costco → Fremont Warehouse
      
Feb:  Sam's Club → Oakland Club
```

## Compatibility

### Works With All Vendors
This enhancement works automatically with:
- ✅ KeHe (Retailer → Store Location)
- ✅ Vistar (OPCO Region → Vending Company)
- ✅ MHD (Retailer → Location)
- ✅ Tony's (if hierarchical data exists)
- ✅ Troia (if hierarchical data exists)
- ✅ Alpine (standalone customers)
- ✅ Pete's (standalone customers)

### Backward Compatible
- Vendors without hierarchical data (like Alpine, Pete's) show normally
- No impact on existing functionality
- Only enhances display for hierarchical data

## Testing

### 1. Upload Hierarchical Data
Upload KeHe or Vistar reports with multiple customers

### 2. Check Google Sheets
Go to the "NEW & LOST CUSTOMERS DETAIL" section

### 3. Verify Format
Look for:
- ✅ Vendor names shown before →
- ✅ Customer names shown after →
- ✅ Each customer on separate line
- ✅ Proper grouping by vendor
- ✅ Alphabetical sorting

### 4. Test Edge Cases
- Single customer per vendor
- Multiple customers per vendor
- Mix of hierarchical and standalone customers
- Customers with multiple " - " separators

## Deployment

### Update Google Apps Script:
1. Open Google Apps Script editor
2. Replace code with updated `UPDATED_GOOGLE_APPS_SCRIPT.js`
3. Save (Ctrl+S / Cmd+S)
4. No need to redeploy - changes take effect immediately

### Test:
1. Upload KeHe report
2. Check "KeHe" sheet → "NEW & LOST CUSTOMERS DETAIL" section
3. Verify vendor → customer format is displayed

## Summary

The "New & Lost Customers Detail" section now clearly shows vendor context for hierarchical data:

**Before:**
```
Jan: Store #123, MONSTER VENDING LLC, Berkeley #456
```

**After:**
```
Jan: Whole Foods → Store #123
     Vistar Illinois → MONSTER VENDING LLC
     Whole Foods → Berkeley #456
```

This makes it much easier to understand which customers belong to which vendors, especially important for companies like KeHe and Vistar that have multiple territories and sub-customers! 🎉

