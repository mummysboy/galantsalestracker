# KeHE Product Code Mapping Solution

## Overview
Successfully implemented KeHE product code mapping to match products by their UPC codes (e.g., 611665888003, 611665900101, 611665200218) in addition to product descriptions. KeHE distributes Galant products under the CLARA'S KITCHEN and BENNY'S BAGEL DOGS brands.

## What Was Implemented

### 1. Enhanced Product Mapping Interface
- Added `keheProductCodes?: string[]` field to the `ProductMapping` interface
- Supports multiple KeHE UPC codes per product (e.g., different pack sizes)

### 2. KeHE Product Code Mappings Added
Updated 18+ products with their KeHE UPC codes:

#### Breakfast Burritos (611665888xxx)
- **611665888003** → Uncured Bacon Breakfast Burrito (Item #321)
- **611665888010** → Chile Verde Breakfast Burrito (Item #341)
- **611665888027** → Sausage Breakfast Burrito (Item #331)
- **611665888089** → Chicken Bacon Ranch Wrap (Item #811)
- **611665888119** → Chorizo Breakfast Burrito (Item #311)
- **611665888126** → Black Bean Breakfast Burrito (Item #361)
- **611665888140** → Plant Based Breakfast Burrito (Item #391)

#### Breakfast Sandwiches (611665900xxx)
- **611665900095** → Pesto Provolone Breakfast Sandwich (Item #451)
- **611665900101** → Bacon Breakfast Sandwich (Item #211)
- **611665900118** → Chorizo Breakfast Sandwich (Item #213)

#### Wraps and Non-Breakfast Burritos (611665901xxx)
- **611665901009** → Chicken Curry Wrap (Item #821)
- **611665901023** → Chile Verde Breakfast Burrito (Item #341) - alternate UPC
- **611665901047** → Black Bean Breakfast Burrito (Item #361) - alternate UPC
- **611665901054** → Bean & Cheese Burrito (Item #851)

#### Bagel Dogs (6116651xxxxx & 6116652xxxxx)
- **611665100013** → Jumbo Beef Frank Bagel Dog (Item #611)
- **611665200010** → Jumbo Beef Frank Bagel Dog (Item #611) - alternate UPC
- **611665200218** → Jumbo Polish Sausage Bagel Dog (Item #612)
- **611665200225** → Benny's Jalapeno & Cheddar Bagel Dogs (Item #531)

### 3. Enhanced KeHE Parser
Updated `src/utils/keheParser.ts` to:
- **Extract KeHE UPC codes from ProductDescription column**
  - Detects 12-digit UPC codes starting with "611665"
  - Maps UPC codes to canonical product names first
  - Falls back to description mapping if UPC doesn't match

- **Improved mapping priority**
  1. Try to match by KeHE UPC code first
  2. If no match, fall back to product description
  3. Store KeHE UPC code in `productCode` field

### 4. Updated Reverse Lookup Functions
- Enhanced `createReverseLookup()` to include KeHE UPC codes in mapping
- Updated `addProductMapping()` to support KeHE codes for new products

## How It Works

### KeHE Report Structure
KeHE reports use UPC codes in the ProductDescription column:
```
EMD,611665888010,CLARAS KITCHEN,WRAP BRKFST CHILE EGG CHS,8.000,OZ,FRESH,FRESH,DELI PREPARED FOODS,SANDWICHES,PREPACK,0,300,$0.00,$720.00
```

### Processing Flow
1. **Extract UPC**: Parser detects "611665888010" from ProductDescription
2. **Map UPC**: Maps UPC to canonical name "Chile Verde Breakfast Burrito"
3. **Extract Data**: Gets customer, quantity, revenue information
4. **Create Record**: Stores UPC in productCode field

### Result
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
- CLARA'S KITCHEN descriptions may vary, but UPC codes remain consistent
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

## Testing Results

### Successfully Mapped Products
✅ **611665888003** → Uncured Bacon Breakfast Burrito  
✅ **611665888010** → Chile Verde Breakfast Burrito  
✅ **611665888027** → Sausage Breakfast Burrito  
✅ **611665888089** → Chicken Bacon Ranch Wrap  
✅ **611665888119** → Chorizo Breakfast Burrito  
✅ **611665888126** → Black Bean Breakfast Burrito  
✅ **611665888140** → Plant Based Breakfast Burrito  
✅ **611665900095** → Pesto Provolone Breakfast Sandwich  
✅ **611665900101** → Bacon Breakfast Sandwich  
✅ **611665900118** → Chorizo Breakfast Sandwich  
✅ **611665901009** → Chicken Curry Wrap  
✅ **611665901023** → Chile Verde Breakfast Burrito  
✅ **611665901047** → Black Bean Breakfast Burrito  
✅ **611665901054** → Bean & Cheese Burrito  
✅ **611665100013** → Jumbo Beef Frank Bagel Dog  
✅ **611665200010** → Jumbo Beef Frank Bagel Dog  
✅ **611665200218** → Jumbo Polish Sausage Bagel Dog  
✅ **611665200225** → Benny's Jalapeno & Cheddar Bagel Dogs  

### Unknown Products (Need Mapping)
❓ **611665106015** - CALZONE ITALIAN COMBO  
❓ **611665106022** - CALZONE CHICKEN FAJITA  

These may be new products not yet in the Master Pricing file or may need to be added as new product mappings.

## Files Modified

1. **`src/utils/productMapping.ts`**
   - Added `keheProductCodes` field to `ProductMapping` interface
   - Added KeHE UPC codes to 18+ products
   - Updated `createReverseLookup()` and `addProductMapping()` functions

2. **`src/utils/keheParser.ts`**
   - Enhanced to extract UPC codes from ProductDescription column
   - Implemented UPC-first mapping priority
   - Store KeHE UPC codes in productCode field

3. **Documentation Files Created**
   - `KEHE_PRODUCT_CODES.md` - Quick reference guide
   - `KEHE_PRODUCT_CODE_MAPPING.md` - Technical implementation details
   - `KEHE_CODES_SOLUTION.md` - Complete solution overview

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
    'WRAP BRKFST CHILE EGG CHS',
  ],
  category: 'Breakfast Burrito',
  keheProductCodes: ['611665888010', '611665901023'] // Add KeHE UPCs here
}
```

### Multiple KeHE UPCs
If KeHE uses multiple UPC codes for the same product (different pack sizes):
```typescript
keheProductCodes: ['611665888010', '611665901023'] // Both map to same product
```

## Status: ✅ COMPLETED

All implementation steps completed:
- ✅ Added `keheProductCodes` field to `ProductMapping` interface
- ✅ Added KeHE UPC codes to all 18+ products in `PRODUCT_MAPPINGS`
- ✅ Updated `createReverseLookup()` to include KeHE codes
- ✅ Enhanced `keheParser.ts` to extract UPC codes from ProductDescription
- ✅ Updated parser to map by UPC code first, description second
- ✅ Tested with KeHE Full POD Vendor.csv

## Related Files

- `/src/utils/productMapping.ts` - Product mapping definitions and lookup
- `/src/utils/keheParser.ts` - KeHE report parser
- `/KEHE_PRODUCT_CODES.md` - Quick reference guide
- `/KEHE_PRODUCT_CODE_MAPPING.md` - Technical implementation details
- `/ALPINE_PRODUCT_CODE_MAPPING.md` - Similar implementation for Alpine
- `/PETES_PRODUCT_CODE_MAPPING.md` - Similar implementation for Pete's

The KeHE product code mapping is now complete and ready for use! 🎉
