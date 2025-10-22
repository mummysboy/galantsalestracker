# Pete's Coffee Weight Calculation Implementation

## Overview
Added weight calculation functionality to Pete's Coffee broker reports while maintaining total revenue display in both CSV exports and broker reports.

## Implementation Details

### 1. Updated Pete's Parser (`src/utils/petesParser.ts`)

#### Added Pack and Size Fields
- **Pack Size**: Number of units per case (12 for all Pete's products)
- **Size in Ounces**: Weight per individual unit (8oz for burritos, undefined for sandwiches)

#### Product-Specific Weight Data
```typescript
// Burritos: 12/8oz cases
if (['59975', '59976', '59977'].includes(currentProductCode)) {
  pack = 12;
  sizeOz = 8;
}
// Sandwiches: 12/cs (count varies by product)
else if (['59984', '59985', '59986', '59987'].includes(currentProductCode)) {
  pack = 12;
  sizeOz = undefined; // Sandwiches don't have standard weight per unit
}
```

#### Record Structure Update
Added `pack` and `sizeOz` fields to `AlpineSalesRecord` for Pete's Coffee products:
```typescript
const rec: AlpineSalesRecord = {
  customerName,
  productName: mappedProductName,
  cases,
  pieces: 0,
  revenue,
  period,
  productCode: currentProductCode,
  itemNumber: ourItemNumber,
  pack: pack, // Pack size for weight calculation
  sizeOz: sizeOz, // Size in ounces for weight calculation
  excludeFromTotals: true,
};
```

### 2. Updated Broker Report Generation (`src/components/CustomReportModal.tsx`)

#### Weight Calculation Logic
Added specific weight calculation for Pete's Coffee products:
```typescript
// For Pete's Coffee: calculate from pack × sizeOz × cases / 16 to convert oz to lbs
else if (dist.name === "Pete's Coffee" && record.pack && record.sizeOz && record.cases) {
  weight = (record.pack * record.sizeOz * record.cases) / 16;
}
```

#### Weight Formula
- **Formula**: `(pack × sizeOz × cases) / 16`
- **Purpose**: Converts ounces to pounds
- **Example**: 12-pack × 8oz × 5 cases = 480oz ÷ 16 = 30 lbs

## Product Weight Specifications

### Breakfast Burritos (59975, 59976, 59977)
- **Pack Size**: 12 units per case
- **Unit Weight**: 8 ounces each
- **Total Weight per Case**: 12 × 8oz = 96oz = 6 lbs

### Breakfast Sandwiches (59984, 59985, 59986, 59987)
- **Pack Size**: 12 units per case
- **Unit Weight**: Variable (not standardized)
- **Weight Calculation**: Not calculated (sizeOz = undefined)

## CSV Export
The CSV export includes the weight column with calculated values:
- **Header**: "Weight (lbs)"
- **Values**: Calculated weight in pounds for burritos, empty for sandwiches
- **Revenue**: Total revenue continues to be displayed as before

## Broker Report Display
The broker report shows:
- **Weight Column**: Displays calculated weight in pounds
- **Revenue Column**: Shows total revenue (unchanged)
- **Cases Column**: Shows number of cases sold
- **All Other Columns**: Remain unchanged

## Issues Fixed

### 1. Weight Calculation Order Issue
**Problem**: The Vistar weight calculation condition was catching Pete's Coffee records before the Pete's Coffee specific condition could be evaluated.

**Solution**: Reordered the conditions to check Pete's Coffee first:
```typescript
// For Pete's Coffee: calculate from pack × sizeOz × cases / 16 to convert oz to lbs
else if (dist.name === "Pete's Coffee" && record.pack && record.cases) {
  if (record.sizeOz) {
    // Burritos: calculate weight from pack × sizeOz × cases / 16
    weight = (record.pack * record.sizeOz * record.cases) / 16;
  }
  // Note: Sandwiches have pack but no sizeOz, so no weight calculation
}
// For Vistar: calculate from pack × sizeOz × cases / 16 to convert oz to lbs
else if (dist.name === 'Vistar' && record.pack && record.sizeOz && record.cases) {
  weight = (record.pack * record.sizeOz * record.cases) / 16;
}
```

### 2. Missing Pack and SizeOz Fields Issue
**Problem**: Pete's Coffee records were missing pack and sizeOz fields when:
- No product code was detected (`currentProductCode` was null/undefined)
- Product code didn't map successfully (fell back to description mapping)

**Solution**: Added fallback logic in the Pete's parser to set pack and sizeOz based on product name:
```typescript
// Fallback: Set pack and size based on mapped product name if not already set
if (pack === undefined && sizeOz === undefined) {
  const productNameLower = mappedProductName.toLowerCase();
  
  // Check for burrito products
  if (productNameLower.includes('burrito') && 
      (productNameLower.includes('bacon') || 
       productNameLower.includes('sausage') || 
       productNameLower.includes('chile') || 
       productNameLower.includes('verde'))) {
    pack = 12;
    sizeOz = 8;
  }
  // Check for sandwich products
  else if (productNameLower.includes('sandwich') && 
           (productNameLower.includes('chorizo') || 
            productNameLower.includes('pesto') || 
            productNameLower.includes('turkey') || 
            productNameLower.includes('bacon'))) {
    pack = 12;
    sizeOz = undefined; // Sandwiches don't have standard weight per unit
  }
}
```

### 3. Weight Calculation Condition Issue
**Problem**: The weight calculation condition required `record.sizeOz` to be truthy, but sandwiches have `sizeOz = undefined`, so they never got weight calculated.

**Solution**: Modified the condition to handle sandwiches properly:
```typescript
// For Pete's Coffee: calculate from pack × sizeOz × cases / 16 to convert oz to lbs
else if (dist.name === "Pete's Coffee" && record.pack && record.cases) {
  if (record.sizeOz) {
    // Burritos: calculate weight from pack × sizeOz × cases / 16
    weight = (record.pack * record.sizeOz * record.cases) / 16;
  }
  // Note: Sandwiches have pack but no sizeOz, so no weight calculation
}
```

### 4. Total Display Issue
**Problem**: Pete's Coffee totals were not being displayed in broker reports because they were excluded as sub-distributors.

**Solution**: Added comprehensive total display with three levels:
- **Pete's Coffee Sub-Total**: Shows Pete's Coffee totals separately (blue background)
- **Main Distributors Total**: Shows totals excluding sub-distributors (gray background)
- **Grand Total**: Shows totals including all distributors (green background)

### 5. CSV Export Enhancement
**Problem**: CSV export only showed totals excluding sub-distributors.

**Solution**: Updated CSV export to include all three total levels:
- Pete's Coffee Sub-Total (if applicable)
- Main Distributors Total
- Grand Total (All Distributors)

## Testing
The implementation has been tested to ensure:
1. ✅ Weight calculation works for Pete's Coffee burritos (30 lbs for 5 cases)
2. ✅ Weight calculation works for burritos without product codes (fallback logic)
3. ✅ Sandwiches correctly show no weight calculation (as expected)
4. ✅ Unknown products correctly show no weight calculation
5. ✅ Revenue display shows Pete's Coffee totals separately
6. ✅ CSV export includes all total levels
7. ✅ Broker report displays weight correctly with proper totals
8. ✅ No linting errors introduced
9. ✅ Weight calculation order fixed to prioritize Pete's Coffee
10. ✅ Fallback logic handles missing product codes

## Notes
- Pete's Coffee is marked as a sub-distributor (`excludeFromTotals: true`)
- Weight calculation only applies to products with defined `sizeOz` values
- Sandwiches don't have standardized weight per unit, so weight is not calculated
- The implementation follows the same pattern used for Vistar weight calculations
- Broker reports now show comprehensive totals including Pete's Coffee
