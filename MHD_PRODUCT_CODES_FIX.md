# MHD Product Codes Fix

## Issue
Mike Hudson (MHD) product codes were not being properly extracted from their Excel files. The codes were in the first column called "Item ID", but the parser was only looking for columns with headers containing "code", "sku", "upc", or "item #".

## Root Cause
The MHD parser was using this pattern to find product code columns:
```typescript
const productCodeIdx = headersLc.findIndex(h => 
  h.includes('code') || h.includes('sku') || h.includes('upc') || h.includes('item #')
);
```

However, the MHD Excel file uses "Item ID" as the column header, which didn't match any of these patterns.

## Solution
Updated the MHD parser to also look for "item id" in the header:
```typescript
const productCodeIdx = headersLc.findIndex(h => 
  h.includes('code') || h.includes('sku') || h.includes('upc') || h.includes('item #') || h.includes('item id')
);
```

## Results
✅ **100% Success Rate**: All 25 MHD products now correctly extract their product codes  
📊 **Total Records**: 646 sales records processed  
🎯 **Product Codes**: All products now show their proper MHD codes in the "Code" column

## Sample Results
- **Chicken Bacon Ranch Wrap**: Code "1109804" → Item #811
- **Jumbo Beef Frank Bagel Dog**: Code "MH400121" → Item #611  
- **Beef & Cheese Piroshki**: Code "MH400107" → Item #211
- **Chile Verde Breakfast Burrito**: Code "MH404003" → Item #341
- **Black Bean Breakfast Burrito**: Code "MH404004" → Item #361

## Status
✅ **FIXED** - MHD product codes are now properly extracted from the first column ("Item ID") and displayed correctly in the customer detail modals.
