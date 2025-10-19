# Troia Product Codes Fix Summary

## Problem Identified
The user reported that Troia Foods Sales Reports were not displaying their product codes in the customer detail modal. The "Code" column was empty for all Troia products.

## Root Cause Analysis
The Troia parser (`src/utils/troiaParser.ts`) was not setting the `productCode` field in the `AlpineSalesRecord` objects. While other distributors' parsers (KeHE, Vistar, Alpine, Pete's, Tony's, MHD) all set this field with vendor-specific codes, the Troia parser was missing this crucial field.

## Solution Implemented
Updated the Troia parser to extract product codes from the product list section and include them in the `AlpineSalesRecord`:

1. **Product List Parsing**: Extract product codes and names from rows 4-7 which contain the product list
2. **Code Extraction**: Parse format "29992-GLNT BACON BREAKF BURRITO 12CT" to extract code "29992"
3. **Column Mapping**: Map product columns to their corresponding codes and names
4. **Record Creation**: Include the extracted product code in the record

```typescript
const record: AlpineSalesRecord = {
  customerName,
  productName: mapToCanonicalProductName(productCol.name),
  cases: Math.round(qty),
  pieces: 0,
  revenue: 0, // Troia data doesn't include revenue
  period,
  productCode: productCol.code, // Troia's numeric product code (29991, 22986, etc.)
  customerId: customerNum || undefined,
  excludeFromTotals: false, // Troia is a direct distributor, include in totals
};
```

## Issues Fixed

### 1. Missing Product Codes
- **Problem**: Troia parser wasn't extracting product codes from the Excel file
- **Solution**: Updated parser to extract codes from product list section (rows 4-7)

### 2. Duplicate Item Numbers
- **Problem**: Both "Plant Based Sausage Breakfast Burrito" and "Turkey Sausage Breakfast Sandwich" had item number `841`
- **Solution**: Changed Turkey Sausage Breakfast Sandwich to item number `212` (following sandwich numbering pattern)

### 3. Missing Troia Alternate Names
- **Problem**: Some Troia product names were truncated and not included in alternate names
- **Solution**: Added truncated Troia names to product mappings:
  - `GLNT CHORIZO BRKFST` (for Chorizo Breakfast Burrito)
  - `GLNT TURKEY SSAGE` (for Turkey Sausage Breakfast Sandwich)

## Troia Product Code Format
Troia uses numeric product codes that appear in the product list section of the Excel file:
- `29991` - Bacon Breakfast Sandwich
- `22986` - Bean & Cheese Burrito  
- `29988` - Chicken Curry Wrap
- `29993` - Chile Verde Breakfast Burrito
- `22984` - Chorizo Breakfast Sandwich
- `29987` - Chorizo Breakfast Burrito
- `22983` - Pesto Provolone Breakfast Sandwich
- `22985` - Sausage Breakfast Burrito
- `29990` - Turkey Sausage Breakfast Sandwich
- `29984` - Plant Based Sausage Breakfast Burrito

## Verification Results
✅ **Test Results**: All 19 records now have product codes
✅ **Code Column**: Will display Troia's numeric codes (29991, 22986, 29988, etc.)
✅ **Item# Column**: Now displays correct item numbers (211, 212, 213, 311, 331, 341, 451, 821, 841, 851)
✅ **Product Mapping**: Product names are correctly mapped to canonical names
✅ **Unique Codes**: 10 different product codes successfully extracted
✅ **No Duplicates**: Fixed duplicate item number issue (Turkey Sausage Breakfast Sandwich now uses 212)
✅ **Missing Products**: Product 29992 not included because it had no sales in this report (correct behavior)

## Status
✅ **COMPLETE** - Troia Foods Sales Reports now display their product codes in the Code column.
