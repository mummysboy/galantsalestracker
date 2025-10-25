# Tony's Weight Display Fix

## Problem
Weight data is being **calculated in the parser** but **not being displayed** in the Tony's Customer Detail Modal.

The issue is that:
- ✅ Weight is calculated correctly in `tonysParser.ts`
- ✅ Weight is stored in `AlpineSalesRecord.weightLbs`
- ✅ Weight is saved to DynamoDB
- ❌ Weight is NOT extracted/aggregated in modal calculation function
- ❌ Weight is NOT displayed in the modal table

## Root Cause
In `src/components/TonysCustomerDetailModal.tsx`, the `calculateTonysCustomerDataAllPeriods()` function:
1. Only aggregates **cases** data (line 69)
2. Doesn't aggregate **weight** data
3. Doesn't store weight in product metadata
4. Modal table only shows cases, not weight

## Solution

The fix requires two changes:

### 1. Aggregate Weight Data in Calculation Function

Update `calculateTonysCustomerDataAllPeriods()` to:
- Track weight data alongside cases
- Add weight fields to productMetadata
- Sum up weight for each period

```typescript
const productMetadata = new Map<string, { 
  size?: string; 
  productCode?: string;
  weightLbs?: number;  // NEW: Track weight per case
}>();

// When aggregating data:
const currentProductWeight = productWeightData.get(recordPeriod) || 0;
productWeightData.set(recordPeriod, currentProductWeight + record.weightLbs);

// In metadata:
productMetadata.set(productName, {
  size: record.size,
  productCode: record.productCode,
  weightLbs: record.weightLbs || 0,  // NEW
});
```

### 2. Display Weight in Modal Table

Add weight columns to the table:

```typescript
<thead>
  <tr className="border-b border-gray-200">
    <th className="text-left px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">Product</th>
    <th className="text-center px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">Item#</th>
    <th className="text-center px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">Code</th>
    {periods.map((period) => (
      <th key={period} className="text-center px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">
        {period}
      </th>
    ))}
    {/* NEW: Add weight columns */}
    {periods.map((period) => (
      <th key={`weight-${period}`} className="text-center px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">
        Lbs - {period}
      </th>
    ))}
  </tr>
</thead>

// In table body:
{periods.map((period) => (
  <td key={period} className="px-4 py-3 text-sm text-right text-gray-900">
    {product.weightPeriodData.get(period) || 0}  {/* Display weight */}
  </td>
))}
```

## Files to Modify

- `src/components/TonysCustomerDetailModal.tsx`
  - Update `calculateTonysCustomerDataAllPeriods()` to aggregate weight
  - Add weight to productMetadata structure
  - Add weight display columns in table
  - Update interface types to include weight data

## Expected Result

Before:
```
Product          Item# Code  2025-01  2025-02
Burrito Bacon    1001  BC1   50       45
```

After:
```
Product          Item# Code  2025-01  2025-02  Lbs-2025-01  Lbs-2025-02
Burrito Bacon    1001  BC1   50       45       1500         1350
```

This way, when users view the Tony's customer detail modal, they'll see both the case quantities AND the corresponding weight in pounds for each period.
