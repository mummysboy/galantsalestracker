# Alpine Product Code Mapping Implementation

## Overview
Updated the product mapping system to match products by Alpine's internal product codes (e.g., 183981, 999982, 999986) in addition to product descriptions.

## Changes Made

### 1. Enhanced Product Mapping Interface
**File:** `src/utils/productMapping.ts`

Added `alpineProductCodes` field to the `ProductMapping` interface:
```typescript
export interface ProductMapping {
  itemNumber: string;
  canonicalName: string;
  alternateNames: string[];
  category?: string;
  alpineProductCodes?: string[]; // ← NEW: Alpine-specific product codes
}
```

### 2. Added Alpine Product Codes to All Products

| Alpine Code(s) | Product Description | Canonical Name |
|---------------|---------------------|----------------|
| 183981 | GAL WRAP CHIC BAC RAN | Chicken Bacon Ranch Wrap |
| 999982 | GAL SAND BRKFST BACON | Bacon Breakfast Sandwich |
| 999986 | GAL SAND SSG TURKEY | Turkey Sausage Breakfast Sandwich |
| 999983 | GAL BURR BRKFST BACON | Uncured Bacon Breakfast Burrito |
| 999989 | GAL BURR BRKFST SAUSAGE | Sausage Breakfast Burrito |
| 999987 | GAL BURR BFST CHORIZO | Chorizo Breakfast Burrito |
| 999984 | GAL SAND BRKFST CHORIZO | Chorizo Breakfast Sandwich |
| 999985 | GAL SAND PROV PESTO | Pesto Provolone Breakfast Sandwich |
| 999978 | GAL BAGEL DOG BEEF | Jumbo Beef Frank Bagel Dog |
| 999979 | GAL BAGEL DOG POLISH | Jumbo Polish Sausage Bagel Dog |
| 183922 | GAL BAGEL DOG BEEF FRANK | Jumbo Beef Frank Bagel Dog |
| 183923 | GAL BAGEL DOG POLISH SSG | Jumbo Polish Sausage Bagel Dog |
| 183924 | GAL BAGEL DOG JALA CHS | Benny's Jalapeno & Cheddar Bagel Dogs |
| 183979 | GAL PIROSHKI BEEF CHS N/S | Beef & Cheese Piroshki |
| 184028 | GAL PIROSHKI BF MUSH N/S | Beef & Mushroom Piroshki |
| 184016 | GAL SAMPLE KIT | Sample Kit |

### 3. Updated Reverse Lookup Function

Modified `createReverseLookup()` to include Alpine product codes in the mapping:
```typescript
// Map Alpine product codes to the canonical name
if (mapping.alpineProductCodes) {
  for (const alpineCode of mapping.alpineProductCodes) {
    lookup.set(alpineCode, mapping.canonicalName);
  }
}
```

### 4. Enhanced Alpine Parser
**File:** `src/utils/alpineParser.ts`

Updated the parser to try matching by Alpine product code first, then fall back to description:
```typescript
// Try to map by Alpine product code first, then fall back to description
let mappedProductName = mapToCanonicalProductName(itemNumber);
// If the product code didn't map (returned the code itself), try the description
if (mappedProductName === itemNumber) {
  mappedProductName = mapToCanonicalProductName(description);
}
```

### 5. Updated Dynamic Mapping Function

Enhanced `addProductMapping()` to support Alpine codes when dynamically adding new products:
```typescript
// Add Alpine product codes if present
if (mapping.alpineProductCodes) {
  for (const alpineCode of mapping.alpineProductCodes) {
    lookup.set(alpineCode, mapping.canonicalName);
  }
}
```

## How It Works

### Mapping Priority
1. **First:** Try to match by Alpine product code (e.g., "183981")
2. **Second:** If no match, fall back to product description (e.g., "GAL WRAP CHIC BAC RAN")
3. **Third:** If still no match, return original description

### Example Flow
When parsing this Alpine line:
```
183981  GAL WRAP CHIC BAC RAN     12/8 OZ          2                 12.00         60.96                      431
```

**Before:**
- Extracted itemNumber: "183981"
- Matched by description: "GAL WRAP CHIC BAC RAN"
- Result: "Chicken Bacon Ranch Wrap" ✅ (only worked after adding to alternateNames)

**After:**
- Extracted itemNumber: "183981"
- Matched directly by Alpine code: "183981"
- Result: "Chicken Bacon Ranch Wrap" ✅ (works even if description changes)

## Benefits

### 1. More Reliable Matching
- Product codes are more stable than descriptions
- Descriptions may change format, but codes remain consistent
- Reduces risk of unmapped products

### 2. Faster Matching
- Direct code lookup is faster than string matching
- No need for normalization and fuzzy matching

### 3. Future-Proof
- If Alpine changes product descriptions, mapping still works via code
- Easier to maintain - just add Alpine codes to new products

### 4. Better Data Quality
- Less reliance on text normalization
- More predictable results

## Testing

To verify the implementation works:

1. Upload the Alpine report: `IT415V_010525_050147.TXT`
2. Check that all 16 products map correctly:
   - ✅ 183981 → Chicken Bacon Ranch Wrap
   - ✅ 999982 → Bacon Breakfast Sandwich
   - ✅ 999986 → Turkey Sausage Breakfast Sandwich
   - ✅ All other products map correctly

## Maintenance

### Adding New Alpine Products

When new products appear in Alpine reports:

1. Identify the Alpine product code (first column in report)
2. Identify the canonical product name
3. Add to `PRODUCT_MAPPINGS` in `productMapping.ts`:

```typescript
{
  itemNumber: '123',
  canonicalName: 'New Product Name',
  alternateNames: [
    'GAL NEW PRODUCT',
    'OTHER VENDOR NAME',
  ],
  category: 'Category',
  alpineProductCodes: ['999999'] // ← Add Alpine code here
}
```

### Multiple Alpine Codes

Some products have multiple Alpine codes (e.g., different pack sizes):
```typescript
alpineProductCodes: ['999978', '183922'] // Both map to same product
```

## Related Files

- `/src/utils/productMapping.ts` - Product mapping definitions and lookup
- `/src/utils/alpineParser.ts` - Alpine report parser
- `/alpine-product-mapping-analysis.md` - Initial analysis of Alpine report

## Status: ✅ COMPLETE

All Alpine products now have product code mappings and the parser has been updated to use them.

