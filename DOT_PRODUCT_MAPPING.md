# DOT Product Code Mapping - Implementation Guide

## Problem Solved ✅

Product descriptions like "Sandwich Breakfast Turkey" with code GFO20001 were not being properly mapped to canonical product names like "Turkey Sausage Breakfast Sandwich" from the Master 2025 Pricing file.

**Root Cause**: DOT parser was not using product code mapping like other vendors do.

## Solution Implemented

### 1. Added DOT Product Code Support to ProductMapping Interface

```typescript
export interface ProductMapping {
  itemNumber: string;
  canonicalName: string;
  alternateNames: string[];
  category?: string;
  alpineProductCodes?: string[];
  petesProductCodes?: string[];
  keheProductCodes?: string[];
  vistarProductCodes?: string[];
  dotProductCodes?: string[];  // ← ADDED
}
```

### 2. Added DOT Code Mapping to Lookup

When the lookup map is created, DOT codes are now included:

```typescript
// Map DOT product codes to the canonical name
if (mapping.dotProductCodes) {
  for (const dotCode of mapping.dotProductCodes) {
    lookup.set(dotCode, mapping.canonicalName);
  }
}
```

### 3. Added Helper Function

```typescript
export function getItemNumberFromDotCode(dotProductCode: string): string | undefined {
  if (!dotProductCode) return undefined;
  
  const mapping = PRODUCT_MAPPINGS.find(m => 
    m.dotProductCodes && m.dotProductCodes.includes(dotProductCode)
  );
  return mapping ? mapping.itemNumber : undefined;
}
```

### 4. Updated DOT Parser to Use Mapping

The `dotParser.ts` now:

1. **Imports mapping functions**:
   ```typescript
   import { 
     mapToCanonicalProductName, 
     getItemNumberFromDotCode, 
     PRODUCT_MAPPINGS 
   } from './productMapping';
   ```

2. **Maps product codes in priority order**:
   ```typescript
   // Try DOT code first
   let canonicalProductName = mapToCanonicalProductName(dotId || '');
   
   // Then MFG code
   if (canonicalProductName === (dotId || '')) {
     canonicalProductName = mapToCanonicalProductName(mfgCode || '');
   }
   
   // Finally fall back to description
   if (canonicalProductName === (mfgCode || '') || !canonicalProductName) {
     canonicalProductName = mapToCanonicalProductName(itemDesc);
   }
   ```

3. **Gets item numbers from product codes**:
   ```typescript
   let ourItemNumber = getItemNumberFromDotCode(dotId);
   if (!ourItemNumber) {
     const mapping = PRODUCT_MAPPINGS.find(m => m.canonicalName === canonicalProductName);
     ourItemNumber = mapping ? mapping.itemNumber : undefined;
   }
   ```

4. **Creates records with canonical names**:
   ```typescript
   const record: AlpineSalesRecord = {
     productName: canonicalProductName,  // ← Canonical name, not raw description
     itemNumber: ourItemNumber,           // ← Internal item number
     // ... rest of fields
   };
   ```

## Example Flow

### Before (Broken)
```
CSV Input: "Sandwich Breakfast Turkey" (GFO20001)
                    ↓
        Parsed as-is (no mapping)
                    ↓
Database: productName = "Sandwich Breakfast Turkey"  ❌ Wrong!
```

### After (Fixed)
```
CSV Input: "Sandwich Breakfast Turkey" (GFO20001)
                    ↓
        mapToCanonicalProductName(GFO20001)
                    ↓
Database: productName = "Turkey Sausage Breakfast Sandwich" ✅ Correct!
                    ↓
        itemNumber = 841 ✅ Also correct!
```

## How to Add DOT Product Code Mappings

If DOT uses unique product codes (like "DOT#" values), add them to the `PRODUCT_MAPPINGS`:

```typescript
{
  itemNumber: '841',
  canonicalName: 'Turkey Sausage Breakfast Sandwich',
  alternateNames: [
    // ... existing variants ...
    'Sandwich Breakfast Turkey',  // DOT description
    'DOT#765043',                  // DOT product code
  ],
  category: 'Breakfast Sandwich',
  dotProductCodes: ['765043'],     // ← ADD HERE
  // ... other vendor codes ...
}
```

## Product Mapping Priority (All Vendors)

Each parser follows this priority for product name normalization:

1. **Product Code** (Alpine code, Vistar GFO code, DOT code, etc.)
   - Most precise and vendor-specific
   
2. **MFG Code / Alternate Code** (if product code doesn't map)
   - Secondary identifier from manufacturer
   
3. **Product Description** (fallback)
   - Natural language description
   - Works when codes aren't available

This ensures maximum mapping accuracy while maintaining graceful fallbacks.

## Validation

After adding DOT product codes:

1. **Parse a DOT CSV file**
2. **Check product names in dashboard**
   - Should see canonical names like "Turkey Sausage Breakfast Sandwich"
   - NOT raw descriptions like "Sandwich Breakfast Turkey"

3. **Verify item numbers**
   - Dashboard should show item #841 for that product
   - Correct categorization as "Breakfast Sandwich"

4. **Test mapping lookup**
   - In browser console: `mapToCanonicalProductName('765043')`
   - Should return `'Turkey Sausage Breakfast Sandwich'`

## Benefits

✅ **Consistency**: All vendors now use same product mapping logic
✅ **Accuracy**: Product codes take priority over descriptions
✅ **Maintainability**: Single source of truth for product mappings
✅ **Scalability**: Easy to add mappings for new vendors or products
✅ **Data Quality**: Canonical names used throughout dashboard

## Technical Notes

- Product code mappings are case-sensitive
- Mappings are looked up once on app startup (cached in `PRODUCT_LOOKUP`)
- Multiple product codes can map to same canonical name (handled correctly)
- Lookup is bidirectional: code → name and name → code (via canonical name)
- Product codes with vendor prefixes (e.g., "DOT#765043") should have prefix stripped before mapping


