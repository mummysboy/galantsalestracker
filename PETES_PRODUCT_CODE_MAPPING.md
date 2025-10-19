# Pete's Product Code Mapping Implementation

## Overview
Updated the product mapping system to match products by Pete's Coffee internal product codes (e.g., 59975, 59976, 59986) in addition to product descriptions. Pete's distributes Galant products under the CLARA'S brand name.

## Changes Made

### 1. Enhanced Product Mapping Interface
**File:** `src/utils/productMapping.ts`

Add `petesProductCodes` field to the `ProductMapping` interface:
```typescript
export interface ProductMapping {
  itemNumber: string;
  canonicalName: string;
  alternateNames: string[];
  category?: string;
  alpineProductCodes?: string[]; // Alpine-specific product codes
  petesProductCodes?: string[]; // ← NEW: Pete's Coffee product codes
}
```

### 2. Pete's Product Code Mapping Table

| Pete's Code | Galant Item# | Canonical Name | Category |
|-------------|--------------|----------------|----------|
| 59975 | 321 | Uncured Bacon Breakfast Burrito | Breakfast Burrito |
| 59976 | 331 | Sausage Breakfast Burrito | Breakfast Burrito |
| 59977 | 341 | Chile Verde Breakfast Burrito | Breakfast Burrito |
| 59984 | 213 | Chorizo Breakfast Sandwich | Breakfast Sandwich |
| 59985 | 451 | Pesto Provolone Breakfast Sandwich | Breakfast Sandwich |
| 59986 | 841 | Turkey Sausage Breakfast Sandwich | Breakfast Sandwich |
| 59987 | 211 | Bacon Breakfast Sandwich | Breakfast Sandwich |

### 3. Updated Reverse Lookup Function

Modified `createReverseLookup()` to include Pete's product codes in the mapping:
```typescript
// Map Pete's product codes to the canonical name
if (mapping.petesProductCodes) {
  for (const petesCode of mapping.petesProductCodes) {
    lookup.set(petesCode, mapping.canonicalName);
  }
}
```

### 4. Enhanced Pete's Parser
**File:** `src/utils/petesParser.ts`

Updated the parser to:
1. **Extract Pete's product codes from grouped header rows**
   - Pete's reports use a hierarchical structure
   - Product codes appear in format: `59975 (CLARA'S Product Description)`
   - Need to track current product code as we process detail lines

2. **Associate codes with transaction lines**
   - Each product code header is followed by multiple invoice detail lines
   - Parser must maintain state to assign the current code to each line

3. **Map by Pete's code first, then description**
   - Try to match by Pete's product code first
   - Fall back to description mapping if code doesn't match
   - Store Pete's code in `productCode` field

### 5. Updated Dynamic Mapping Function

Enhanced `addProductMapping()` to support Pete's codes when dynamically adding new products:
```typescript
// Add Pete's product codes if present
if (mapping.petesProductCodes) {
  for (const petesCode of mapping.petesProductCodes) {
    lookup.set(petesCode, mapping.canonicalName);
  }
}
```

## How It Works

### Pete's Report Structure
Pete's reports have a unique hierarchical format:
```
Inventory
  FROZEN
    FOOD
      59975 (CLARA'S Uncured Bacon Breakfast Burrito 12/8oz)
        Invoice  8/1/25  LU331252  CLARA'S Uncured...  Catapult NW  2  cs  30.6  61.2
        Invoice  8/2/25  LU330816  CLARA'S Uncured...  Catapult NW  3  cs  30.6  91.8
      59976 (CLARA'S Sausage Breakfast Burrito 12/8oz)
        Invoice  8/3/25  LU331742  CLARA'S Sausage...  Fulcrum Cafe  1  cs  30.6  30.6
```

### Mapping Priority
1. **First:** Extract Pete's product code from grouped header row
2. **Second:** Associate code with subsequent detail lines
3. **Third:** Map code to canonical product name
4. **Fourth:** If no code found, fall back to description mapping

### Example Flow
When parsing a Pete's report section:

```
Row 4:   59975 (CLARA'S Uncured Bacon Breakfast Burrito 12/8oz)
Row 5:   Invoice  8/1/25  LU331252  CLARA'S Uncured...  Catapult NW  2  cs  30.6  61.2
```

**Processing:**
1. Detect row 4 as a product header (matches pattern: `NUMBER (description)`)
2. Extract Pete's code: "59975"
3. Set current product code to "59975"
4. Process row 5 as detail line
5. Assign Pete's code "59975" to the transaction
6. Map "59975" to "Uncured Bacon Breakfast Burrito"
7. Store "59975" in `productCode` field

**Result:**
```javascript
{
  customerName: "Catapult NW",
  productName: "Uncured Bacon Breakfast Burrito", // Canonical name
  cases: 2,
  revenue: 61.2,
  period: "2025-08",
  productCode: "59975", // Pete's product code
  excludeFromTotals: true
}
```

## Benefits

### 1. More Reliable Matching
- Product codes are more stable than descriptions
- CLARA'S descriptions may vary slightly, but codes remain consistent
- Reduces risk of unmapped products

### 2. Better Tracking
- Can track sales by Pete's product code
- Easier to reconcile with Pete's invoices
- Clear visibility into which products Pete's is distributing

### 3. Future-Proof
- If Pete's changes product descriptions, mapping still works via code
- Easier to maintain - just add Pete's codes to new products
- Can handle new CLARA'S branded products easily

### 4. Consistent with Other Distributors
- Follows same pattern as Alpine product code mapping
- Unified approach across all distributors
- Easier for users to understand and maintain

## Testing

To verify the implementation works:

1. Upload Pete's sales report: `Pete's 8.25 Sales Report.xlsx`
2. Check that all 7 products map correctly:
   - ✅ 59975 → Uncured Bacon Breakfast Burrito
   - ✅ 59976 → Sausage Breakfast Burrito
   - ✅ 59977 → Chile Verde Breakfast Burrito
   - ✅ 59984 → Chorizo Breakfast Sandwich
   - ✅ 59985 → Pesto Provolone Breakfast Sandwich
   - ✅ 59986 → Turkey Sausage Breakfast Sandwich
   - ✅ 59987 → Bacon Breakfast Sandwich

3. Verify product codes appear in the Code column of the dashboard

## Maintenance

### Adding New Pete's Products

When new products appear in Pete's reports:

1. Identify the Pete's product code (from grouped header row)
2. Identify the canonical product name
3. Add to `PRODUCT_MAPPINGS` in `productMapping.ts`:

```typescript
{
  itemNumber: '321',
  canonicalName: 'Uncured Bacon Breakfast Burrito',
  alternateNames: [
    'GAL BURR BRKFST BACON',
    'BACON BREAKFAST BURRITO',
    "CLARA'S Uncured Bacon Breakfast Burrito",
  ],
  category: 'Breakfast Burrito',
  alpineProductCodes: ['999983'],
  petesProductCodes: ['59975'] // ← Add Pete's code here
}
```

### Multiple Pete's Codes
If Pete's uses multiple codes for the same product (e.g., different pack sizes):
```typescript
petesProductCodes: ['59975', '59975A'] // Both map to same product
```

## Related Files

- `/src/utils/productMapping.ts` - Product mapping definitions and lookup
- `/src/utils/petesParser.ts` - Pete's Coffee report parser
- `/PETES_PRODUCT_CODES.md` - Quick reference guide
- `/ALPINE_PRODUCT_CODE_MAPPING.md` - Similar implementation for Alpine

## Status: 🚧 IN PROGRESS

Implementation steps:
- [ ] Add `petesProductCodes` field to `ProductMapping` interface
- [ ] Add Pete's codes to all 7 products in `PRODUCT_MAPPINGS`
- [ ] Update `createReverseLookup()` to include Pete's codes
- [ ] Enhance `petesParser.ts` to extract codes from grouped headers
- [ ] Update parser to associate codes with detail lines
- [ ] Test with Pete's 8.25 Sales Report

