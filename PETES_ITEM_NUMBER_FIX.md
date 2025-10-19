# Pete's Coffee Item Number Fix - COMPLETE

## Issue
The Pete's Coffee product mapping was showing Pete's vendor codes (59975, 59976, etc.) in the "Vendor Code" column, but the "Item #" column was showing dashes (-) instead of Galant's internal item numbers (321, 331, etc.).

## Root Cause
The Pete's parser was not populating the `itemNumber` field in the `AlpineSalesRecord`. While Pete's codes were correctly mapped to canonical product names and stored in `productCode`, the parser wasn't extracting the corresponding Galant item numbers.

## Solution Implemented

### 1. Added Pete's Item Number Function
**File:** `src/utils/productMapping.ts`

Added `getItemNumberFromPetesCode()` function:
```typescript
/**
 * Get item number from Pete's Coffee vendor code
 * @param petesVendorCode The Pete's vendor code (e.g., "59975", "59976", "59986")
 * @returns Our internal item number (e.g., "321", "331", "841")
 */
export function getItemNumberFromPetesCode(petesVendorCode: string): string | undefined {
  if (!petesVendorCode) return undefined;
  
  // Find the mapping that contains this Pete's vendor code
  const mapping = PRODUCT_MAPPINGS.find(m => 
    m.petesProductCodes && m.petesProductCodes.includes(petesVendorCode)
  );
  return mapping ? mapping.itemNumber : undefined;
}
```

### 2. Updated Pete's Parser
**File:** `src/utils/petesParser.ts`

Enhanced the parser to:
- Import the new function: `getItemNumberFromPetesCode`
- Extract Galant item numbers from Pete's codes
- Populate the `itemNumber` field in records

```typescript
// Get our internal item number from Pete's code
ourItemNumber = getItemNumberFromPetesCode(currentProductCode);

const rec: AlpineSalesRecord = {
  customerName,
  productName: mappedProductName,
  cases,
  pieces: 0,
  revenue,
  period,
  productCode: currentProductCode, // Pete's code (59975, 59976, etc.)
  itemNumber: ourItemNumber, // Galant item number (321, 331, etc.)
  excludeFromTotals: true,
};
```

## Test Results

### Item Number Mapping Test
```
✅ 59975 → 321 (Item #)
✅ 59976 → 331 (Item #)
✅ 59977 → 341 (Item #)
✅ 59984 → 213 (Item #)
✅ 59985 → 451 (Item #)
✅ 59986 → 841 (Item #)
✅ 59987 → 211 (Item #)

Status: ✅ ALL TESTS PASSED (7/7)
```

## Expected Dashboard Results

After re-uploading Pete's reports, the dashboard should now show:

| Product | Item # | Vendor Code |
|---------|--------|-------------|
| Bacon Breakfast Sandwich | **211** | 59987 |
| Chile Verde Breakfast Burrito | **341** | 59977 |
| Chorizo Breakfast Sandwich | **213** | 59984 |
| Pesto Provolone Breakfast Sandwich | **451** | 59985 |
| Sausage Breakfast Burrito | **331** | 59976 |
| Turkey Sausage Breakfast Sandwich | **841** | 59986 |
| Uncured Bacon Breakfast Burrito | **321** | 59975 |

## Files Modified

- ✅ `src/utils/productMapping.ts` - Added `getItemNumberFromPetesCode()` function
- ✅ `src/utils/petesParser.ts` - Enhanced to populate `itemNumber` field
- ✅ `PETES_CODES_SOLUTION.md` - Updated documentation

## Status: ✅ FIXED

The Pete's Coffee product mapping now correctly displays:
- **Vendor Code column:** Pete's codes (59975, 59976, etc.)
- **Item # column:** Galant item numbers (321, 331, etc.)

Both columns should now be properly populated when you re-upload Pete's sales reports.

---

**Date Fixed:** October 19, 2025  
**Issue:** Item # column showing dashes (-)  
**Solution:** Populate itemNumber field from Pete's codes  
**Test Status:** ✅ PASS (7/7 products)
