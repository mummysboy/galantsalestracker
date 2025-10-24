# Alpine "Case by Customer Item #" Display Fix

## Issue
When viewing the "Cases by Customer" section for Alpine vendor, the **Item #** column was not displaying properly - showing "-" (dash) instead of the internal item numbers (321, 431, 811, etc.).

## Root Cause Analysis

The issue had two parts:

### 1. Missing Alpine Product Code Mappings
Some Alpine vendor codes were not mapped to their corresponding item numbers in the product mappings:
- **183979** → Beef & Cheese Piroshki (Item 211)
- **184028** → Beef & Mushroom Piroshki (Item 624 - new product)

### 2. No Fallback When Mapping Fails
When an Alpine product code wasn't found in the mappings, the `getItemNumberFromAlpineCode()` function returned `undefined`, and there was no fallback to other data sources.

## Solution Implemented

### Changes Made

#### 1. **Alpine Parser Enhancement** (`src/utils/alpineParser.ts`)
Added a fallback mechanism to use the `mfgItemNumber` field when the Alpine vendor code doesn't have a mapping:

```typescript
// Get our internal item number from the Alpine vendor code (left-side code)
const ourItemNumber = getItemNumberFromAlpineCode(itemNumber);

const record: AlpineSalesRecord = {
  // ...
  itemNumber: ourItemNumber || mfg, // Fallback to MFG ITEM # if mapping not found
  // ...
};
```

**Benefit**: Even if an Alpine code isn't in the mappings, the item number will display from the MFG ITEM # column on the invoice.

#### 2. **Product Mapping Updates** (`src/utils/productMapping.ts`)

Added missing Alpine product codes:

**Item 211 - Beef & Cheese Piroshki:**
```typescript
{
  itemNumber: '211',
  canonicalName: 'Beef & Cheese Piroshki',
  // ... other fields ...
  alpineProductCodes: ['183979']  // ← NEW
}
```

**Item 624 - Beef & Mushroom Piroshki (NEW):**
```typescript
{
  itemNumber: '624',
  canonicalName: 'Beef & Mushroom Piroshki',
  alternateNames: [
    'BEEF & MUSHROOM PIROSHKI',
    'BEEF MUSHROOM PIROSHKI',
    'PIROSHKI BEEF MUSHROOM',
    'MH406047',
  ],
  category: 'Piroshki',
  alpineProductCodes: ['184028']  // ← NEW
}
```

## Complete Alpine Product Code Mapping

All Alpine codes are now mapped:

| Alpine Code | Item # | Product Name |
|------------|--------|-----|
| 183981 | 811 | Chicken Bacon Ranch Wrap |
| 999982 | 841 | Bacon Breakfast Sandwich |
| 999986 | 212 | Turkey Sausage Breakfast Sandwich |
| 999983 | 321 | Uncured Bacon Breakfast Burrito |
| 999989 | 331 | Sausage Breakfast Burrito |
| 999987 | 311 | Chorizo Breakfast Burrito |
| 999984 | 821 | Chorizo Breakfast Sandwich |
| 999985 | 831 | Pesto Provolone Breakfast Sandwich |
| 999978 | 611 | Jumbo Beef Frank Bagel Dog |
| 999979 | 612 | Jumbo Polish Sausage Bagel Dog |
| 183922 | 611 | Jumbo Beef Frank Bagel Dog |
| 183923 | 612 | Jumbo Polish Sausage Bagel Dog |
| 183924 | 531 | Benny's Jalapeno & Cheddar Bagel Dogs |
| 183979 | 211 | Beef & Cheese Piroshki |
| 184028 | 624 | Beef & Mushroom Piroshki |
| 184016 | 901 | Sample Kit |

## How It Works

When an Alpine invoice line is processed:

1. **Extract Alpine vendor code** (first column, e.g., 183981)
2. **Look up item number** using `getItemNumberFromAlpineCode()`
   - If found in mappings → use mapped item number ✅
   - If NOT found → use MFG ITEM # field from invoice as fallback ✅
3. **Display in table**:
   - Product name in "Product" column
   - Item number in "Item #" column (now guaranteed to have a value)
   - Alpine code in "Vendor Code" column
   - Cases by month in remaining columns

## Expected Results

After uploading Alpine reports:

- ✅ **Item #** column displays actual item numbers (211, 321, 431, etc.)
- ✅ **Vendor Code** column displays Alpine codes (183981, 999982, 184028, etc.)
- ✅ **Product** column displays canonical product names
- ✅ All products properly mapped and searchable/filterable

## Files Modified

1. `/src/utils/alpineParser.ts` - Added fallback for item number extraction
2. `/src/utils/productMapping.ts` - Added missing Alpine product codes and new Beef & Mushroom Piroshki product

## Testing

To verify the fix works:

1. Upload an Alpine report containing products with Alpine codes
2. Click on a customer in the "Cases by Customer" section
3. Verify in the modal that:
   - Product column shows canonical product names ✅
   - Item # column shows internal item numbers (not "-") ✅
   - Vendor Code column shows Alpine codes ✅
   - All data is searchable by product name, item #, or vendor code ✅

## Backward Compatibility

This fix is fully backward compatible:
- Existing data continues to work as before
- New data gets the benefit of proper item number display
- Fallback mechanism only activates when needed

