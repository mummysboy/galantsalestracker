# KeHE Product Code Mapping Implementation

## Overview
Updated the product mapping system to match products by KeHE's UPC codes (e.g., 611665888003, 611665900101, 611665200218) in addition to product descriptions. KeHE distributes Galant products under the CLARA'S KITCHEN and BENNY'S BAGEL DOGS brands.

## Changes Made

### 1. Enhanced Product Mapping Interface
**File:** `src/utils/productMapping.ts`

Add `keheProductCodes` field to the `ProductMapping` interface:
```typescript
export interface ProductMapping {
  itemNumber: string;
  canonicalName: string;
  alternateNames: string[];
  category?: string;
  alpineProductCodes?: string[]; // Alpine-specific product codes
  petesProductCodes?: string[]; // Pete's Coffee product codes (CLARA'S brand)
  keheProductCodes?: string[]; // ← NEW: KeHE UPC codes
}
```

### 2. KeHE Product Code Mapping Table

| KeHE UPC | Galant Item# | Canonical Name | Category |
|----------|--------------|----------------|----------|
| 611665888003 | 321 | Uncured Bacon Breakfast Burrito | Breakfast Burrito |
| 611665888010 | 341 | Chile Verde Breakfast Burrito | Breakfast Burrito |
| 611665888027 | 331 | Sausage Breakfast Burrito | Breakfast Burrito |
| 611665888089 | 811 | Chicken Bacon Ranch Wrap | Wrap |
| 611665888119 | 311 | Chorizo Breakfast Burrito | Breakfast Burrito |
| 611665888126 | 361 | Black Bean Breakfast Burrito | Breakfast Burrito |
| 611665888140 | 391 | Plant Based Breakfast Burrito | Breakfast Burrito |
| 611665900095 | 451 | Pesto Provolone Breakfast Sandwich | Breakfast Sandwich |
| 611665900101 | 211 | Bacon Breakfast Sandwich | Breakfast Sandwich |
| 611665900118 | 213 | Chorizo Breakfast Sandwich | Breakfast Sandwich |
| 611665901009 | 821 | Chicken Curry Wrap | Wrap |
| 611665901023 | 341 | Chile Verde Breakfast Burrito | Breakfast Burrito |
| 611665901047 | 361 | Black Bean Breakfast Burrito | Breakfast Burrito |
| 611665901054 | 851 | Bean & Cheese Burrito | Burrito |
| 611665100013 | 611 | Jumbo Beef Frank Bagel Dog | Bagel Dog |
| 611665200010 | 611 | Jumbo Beef Frank Bagel Dog | Bagel Dog |
| 611665200218 | 612 | Jumbo Polish Sausage Bagel Dog | Bagel Dog |
| 611665200225 | 531 | Benny's Jalapeno & Cheddar Bagel Dogs | Bagel Dog |

### 3. Updated Reverse Lookup Function

Modified `createReverseLookup()` to include KeHE UPC codes in the mapping:
```typescript
// Map KeHE UPC codes to the canonical name
if (mapping.keheProductCodes) {
  for (const keheCode of mapping.keheProductCodes) {
    lookup.set(keheCode, mapping.canonicalName);
  }
}
```

### 4. Enhanced KeHE Parser
**File:** `src/utils/keheParser.ts`

Updated the parser to:
1. **Extract KeHE UPC codes from ProductDescription column**
   - KeHE reports use UPC codes in the ProductDescription field
   - Need to identify and extract these 12-digit codes
   - Map them to canonical product names

2. **Map by KeHE UPC code first, then description**
   - Try to match by KeHE UPC code first
   - Fall back to description mapping if code doesn't match
   - Store KeHE UPC code in `productCode` field

3. **Handle KeHE's hierarchical customer structure**
   - KeHE reports show retailer accounts with multiple store locations
   - Each row represents a specific store's sales
   - Need to aggregate by retailer account name

### 5. Updated Dynamic Mapping Function

Enhanced `addProductMapping()` to support KeHE codes when dynamically adding new products:
```typescript
// Add KeHE UPC codes if present
if (mapping.keheProductCodes) {
  for (const keheCode of mapping.keheProductCodes) {
    lookup.set(keheCode, mapping.canonicalName);
  }
}
```

## How It Works

### KeHE Report Structure
KeHE reports have a hierarchical format:
```
Description,DescriptionDetails,Version,VersionNumber,Vendor,EnterpriseSupplierName,Format,StoresDownItemsDownDataAcross,Items,Brands,DistributionCenter,DCs,Stores,StoresSelected,DateRange,DateRangeSelected,Channel,RetailerArea,RetailerName,CustomerName,AddressBookNumber,Addressline1,AddressLine2,CustomerCity,CustomerStateCode,CustomerPostalCode,DC,UPC,BrandName,ProductDescription,ProductSize,UOM,ProductDivision,ProductSubDivision,ProductCategory,ProductSubCategory,ProductClass,CurrentYearQTY,PriorYearQTY,CurrentYearCost,PriorYearCost,YoYDollarChangePercent,YoYQtyChangePercent
Description,Shows units and cost for all items at all locations for Retailer Area selected for single calendar month with year-over-year change.,Version,3,Vendor,GALANT ENTERPRISES INC (02016427),Format,"Stores Down, Items Down, Data Across",Items, <ALL>,Distribution Center,All DC,Stores,ALL,Date Range,1/1/2025 to 1/31/2025,Alternate Channel,All Other,Gobble Inc,GOBBLE INC SHIP,705597,90 STEMMERS LN,,WESTAMPTON,NJ,080605652,EMD,611665888010,CLARAS KITCHEN,WRAP BRKFST CHILE EGG CHS,8.000,OZ,FRESH,FRESH,DELI PREPARED FOODS,SANDWICHES,PREPACK,0,300,$0.00,$720.00,-100.0 %,-100.0 %
```

### Mapping Priority
1. **First:** Try to match by KeHE UPC code (e.g., "611665888010")
2. **Second:** If no match, fall back to product description (e.g., "WRAP BRKFST CHILE EGG CHS")
3. **Third:** If still no match, return original description

### Example Flow
When parsing this KeHE line:
```
EMD,611665888010,CLARAS KITCHEN,WRAP BRKFST CHILE EGG CHS,8.000,OZ,FRESH,FRESH,DELI PREPARED FOODS,SANDWICHES,PREPACK,0,300,$0.00,$720.00
```

**Processing:**
1. Extract KeHE UPC code: "611665888010"
2. Map UPC to canonical name: "Chile Verde Breakfast Burrito"
3. Extract customer info: "GOBBLE INC SHIP"
4. Extract quantity and revenue data
5. Create sales record

**Result:**
```javascript
{
  customerName: "GOBBLE INC SHIP",
  productName: "Chile Verde Breakfast Burrito", // Canonical name
  cases: 300,
  revenue: 720.00,
  period: "2025-01",
  productCode: "611665888010", // KeHE UPC code
  excludeFromTotals: false // KeHE is a direct distributor
}
```

## Benefits

### 1. More Reliable Matching
- UPC codes are more stable than descriptions
- CLARA'S KITCHEN descriptions may vary slightly, but UPC codes remain consistent
- Reduces risk of unmapped products

### 2. Better Tracking
- Can track sales by KeHE UPC codes
- Easier to reconcile with KeHE invoices
- Clear visibility into which products KeHE is distributing

### 3. Future-Proof
- If KeHE changes product descriptions, mapping still works via UPC code
- Easier to maintain - just add KeHE UPC codes to new products
- Can handle new CLARA'S KITCHEN and BENNY'S products easily

### 4. Consistent with Other Distributors
- Follows same pattern as Alpine and Pete's product code mapping
- Unified approach across all distributors
- Easier for users to understand and maintain

## Testing

To verify the implementation works:

1. Upload KeHE sales report: `KeHE Full POD Vendor.csv`
2. Check that all 18+ products map correctly:
   - ✅ 611665888003 → Uncured Bacon Breakfast Burrito
   - ✅ 611665888010 → Chile Verde Breakfast Burrito
   - ✅ 611665888027 → Sausage Breakfast Burrito
   - ✅ 611665888089 → Chicken Bacon Ranch Wrap
   - ✅ 611665888119 → Chorizo Breakfast Burrito
   - ✅ 611665900101 → Bacon Breakfast Sandwich
   - ✅ 611665200218 → Jumbo Polish Sausage Bagel Dog
   - ✅ All other products map correctly

3. Verify product codes appear in the Code column of the dashboard

## Maintenance

### Adding New KeHE Products

When new products appear in KeHE reports:

1. Identify the KeHE UPC code (from ProductDescription column)
2. Identify the canonical product name
3. Add to `PRODUCT_MAPPINGS` in `productMapping.ts`:

```typescript
{
  itemNumber: '341',
  canonicalName: 'Chile Verde Breakfast Burrito',
  alternateNames: [
    'GAL BURR BRKFST VERDE',
    'CHILI VERDE BREAKFAST BURRITO',
    'WRAP BRKFST CHILE EGG CHS',
  ],
  category: 'Breakfast Burrito',
  alpineProductCodes: ['999988'],
  petesProductCodes: ['59977'],
  keheProductCodes: ['611665888010'] // ← Add KeHE UPC here
}
```

### Multiple KeHE UPCs
If KeHE uses multiple UPC codes for the same product (e.g., different pack sizes):
```typescript
keheProductCodes: ['611665888010', '611665901023'] // Both map to same product
```

## Related Files

- `/src/utils/productMapping.ts` - Product mapping definitions and lookup
- `/src/utils/keheParser.ts` - KeHE report parser
- `/KEHE_PRODUCT_CODES.md` - Quick reference guide
- `/ALPINE_PRODUCT_CODE_MAPPING.md` - Similar implementation for Alpine
- `/PETES_PRODUCT_CODE_MAPPING.md` - Similar implementation for Pete's

## Status: 🚧 IN PROGRESS

Implementation steps:
- [ ] Add `keheProductCodes` field to `ProductMapping` interface
- [ ] Add KeHE UPC codes to all products in `PRODUCT_MAPPINGS`
- [ ] Update `createReverseLookup()` to include KeHE codes
- [ ] Enhance `keheParser.ts` to extract UPC codes from ProductDescription
- [ ] Update parser to map by UPC code first, description second
- [ ] Test with KeHE Full POD Vendor.csv

## Unknown Products

These KeHE products need to be mapped to Galant products:
- **611665106015** - CALZONE ITALIAN COMBO
- **611665106022** - CALZONE CHICKEN FAJITA

These may be new products not yet in the Master Pricing file or may need to be added as new product mappings.
