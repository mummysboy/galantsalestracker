# Tony's Vendor Weight Calculation Fix

## Problem
The Tony's custom broker report parser was **not calculating weight (weightLbs)** like other vendors do, resulting in missing weight data for Tony's records in DynamoDB.

This meant:
- ✅ Alpine, Pete's, KeHe, Vistar, Troia, MHD: All calculating weights correctly
- ❌ Tony's: No weight calculations - `weightLbs` field was undefined

## Root Cause
The `parseTonysXLSX()` function in `src/utils/tonysParser.ts`:
- Was missing the `loadPricingData()` import
- Was not loading pricing database for weight lookups
- Was not calculating `weightPerCase` for products
- Was not calculating `totalWeight` for records
- Was not including `weightLbs` field in sales records

## Solution Implemented

### 1. Added Weight Calculation Imports
```typescript
import { loadPricingData, getProductWeight } from './pricingLoader';
```

### 2. Load Pricing Data in Parser
```typescript
export async function parseTonysXLSX(file: File): Promise<ParsedTonysData> {
  // ... initialization code ...
  
  // Load pricing data for weight calculations
  const pricingDb = await loadPricingData();
```

### 3. Calculate Weight for Each Record
For both current and previous period records:

```typescript
// Calculate mapped product name once for weight lookup
const mappedProductName = mapToCanonicalProductName(productName);

// Calculate weight for this product
const weightPerCase = getProductWeight(pricingDb, undefined, mappedProductName);
const totalWeight = Math.round(currentQty) * weightPerCase;

const record: AlpineSalesRecord = {
  // ... other fields ...
  weightLbs: totalWeight, // Total weight in pounds
};
```

## How Weight Calculation Works

### getProductWeight()
The `getProductWeight()` function from `pricingLoader.ts`:
1. **First tries**: Look up weight by item number (most accurate)
2. **Falls back to**: Product name matching (exact match)
3. **Then tries**: Partial matching for product categories (burritos, sandwiches, etc.)
4. **Default**: Returns 0 if no match found (safe fallback)

### Weight Calculation Formula
```
Total Weight = Cases × Weight Per Case (lbs)

Example:
- Product: "Galant Burrito Bacon 12pk x 8oz"
- Cases ordered: 50
- Weight per case: 30 lbs (from master pricing)
- Total weight: 50 × 30 = 1,500 lbs
```

## Files Modified

```
✅ src/utils/tonysParser.ts
   - Added import: loadPricingData, getProductWeight
   - Made parseTonysXLSX() async (was already async)
   - Added pricingDb loading
   - Added weight calculations for current period
   - Added weight calculations for previous period
   - Added weightLbs field to records
```

## Impact

### Before Fix
```
Tony's Record:
{
  customerName: "TONY'S FINE FOODS - REED",
  productName: "Galant Burrito Bacon",
  cases: 50,
  revenue: 1500.00,
  weightLbs: undefined  // ❌ Missing!
}
```

### After Fix
```
Tony's Record:
{
  customerName: "TONY'S FINE FOODS - REED",
  productName: "Galant Burrito Bacon",
  cases: 50,
  revenue: 1500.00,
  weightLbs: 1500  // ✅ Calculated!
}
```

## Weight Data Consistency

Now ALL vendors have consistent weight calculations:
- ✅ Alpine - Calculating weights
- ✅ Pete's - Calculating weights
- ✅ KeHe - Calculating weights
- ✅ Vistar - Calculating weights
- ✅ Tony's - Calculating weights (NEW!)
- ✅ Troia - Calculating weights
- ✅ MHD - Calculating weights

## Testing

To verify the fix works:
1. Upload a Tony's report
2. Check DynamoDB records
3. Verify `weightLbs` field is populated
4. Compare calculated weight: `cases × weight_per_case_from_master_pricing`

## Console Output

The weight calculation logs helpful debugging info:
```
Getting weight for itemNumber: undefined, productName: "Galant Burrito Bacon"
Found weight by exact product name: 30 lbs
```

This helps troubleshoot any missing product weight mappings in the master pricing database.
