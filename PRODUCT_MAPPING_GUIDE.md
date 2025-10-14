# Product Name Mapping Guide

## Overview

The Sales Tracker now includes a **Product Name Mapping System** that automatically standardizes product descriptions across all data sources. This ensures consistent reporting and analysis regardless of how different suppliers name the same products.

## Why Product Mapping?

Different suppliers use different naming conventions for the same products:

- **Alpine**: "GAL BURR BRKFST BACON"
- **MHD**: "MH400002"
- **KeHE**: "GLNT BACON BREAKF BURRITO"
- **Master Pricing**: "Uncured Bacon Breakfast Burrito" ✅ (Canonical Name)

Without mapping, these would appear as 4 different products in your dashboard, making analysis difficult and inaccurate.

## How It Works

1. **Canonical Names**: The Master Pricing file (`Master 2025 Pricing (1).xlsx`) contains the official product names
2. **Mapping Dictionary**: Located in `src/utils/productMapping.ts`, maps all variants to canonical names
3. **Automatic Application**: All parsers (Alpine, KeHE, Pete's, Tony's, Vistar, MHD) automatically apply mapping when loading data
4. **Consistent Dashboard**: All reports and charts now use uniform product names

## Product Mapping Structure

Each product mapping includes:

```typescript
{
  itemNumber: '321',                    // From Master Pricing
  canonicalName: 'Uncured Bacon Breakfast Burrito',  // Official name
  alternateNames: [                     // All variations found in sales data
    'GAL BURR BRKFST BACON',
    'GLNT BACON BREAKF BURRITO',
    'BACON BREAKFAST BURRITO',
    'MH400002',
  ],
  category: 'Breakfast Burrito'         // Product category
}
```

## Current Mappings

The system currently maps **32 products** across these categories:

### Breakfast Burritos
- Uncured Bacon Breakfast Burrito (321)
- Chile Verde Breakfast Burrito (341)
- Sausage Breakfast Burrito (331)
- Chorizo Breakfast Burrito (311)
- Black Bean Breakfast Burrito (361)
- Vegan Sausage Breakfast Burrito (841)

### Breakfast Sandwiches
- Bacon Breakfast Sandwich (211)
- Chorizo Breakfast Sandwich (213)
- Turkey Sausage Breakfast Sandwich (441)
- Provencal Pesto Breakfast Sandwich (451)

### Wraps
- Chicken Florentine Wrap (411)
- Chicken Parmesean Wrap (421)
- BBQ Pulled Pork Wrap (431)

### Bagel Dogs
- Beef Frank Bagel Dog (511)
- Polish Sausage Bagel Dog (521)
- Jalapeno Cheese Bagel Dog (531)

### Piroshki
- Beef & Cheese Piroshki (611)
- Beef & Mushroom Piroshki (612)
- Potato & Cheese Piroshki (621)
- Potato & Mushroom Piroshki (622)
- Spinach & Cheese Piroshki (623)

### Other Items
- Whole Wheat Spinach Feta Breakfast Fold (371)
- Chicken Bacon Ranch Burrito (811)
- Chicken Curry Burrito (821)
- Steak and Cheese Burrito (831)
- Bean & Cheese Burrito (851)
- Sample Kit (901)

## Adding New Product Mappings

When you add new products to your Master Pricing file or encounter new product names in sales data:

### Step 1: Identify Unmapped Products

Run the mapping analysis tool:

```bash
npm run analyze-products
# or
npx tsx src/utils/buildProductMappings.ts
```

This generates:
- `product-mapping-analysis.json` - Full analysis
- `unmapped-products-code.txt` - Template code for new mappings

### Step 2: Add Mapping to `productMapping.ts`

Open `src/utils/productMapping.ts` and add a new entry to the `PRODUCT_MAPPINGS` array:

```typescript
{
  itemNumber: 'XXX',  // Item number from Master Pricing
  canonicalName: 'Your Official Product Name',
  alternateNames: [
    'VARIANT NAME 1',
    'VARIANT NAME 2',
    'SUPPLIER CODE ABC123',
  ],
  category: 'Breakfast Burrito' // or appropriate category
},
```

### Step 3: Test the Mapping

```bash
npm start
```

Upload your sales files and verify that the product names are now unified in the dashboard.

## Maintenance Scripts

### Extract Product Names
Extracts all unique product names from sales data files:

```bash
npx tsx src/utils/extractProductNames.ts
```

Output: `product-names-extraction.json`

### Analyze Product Mappings
Identifies unmapped products and suggests mappings:

```bash
npx tsx src/utils/buildProductMappings.ts
```

Outputs:
- `product-mapping-analysis.json` - Complete analysis
- `unmapped-products-code.txt` - Code templates for unmapped products

### Analyze Master Pricing Structure
Examines the Master Pricing file structure:

```bash
npx tsx src/utils/analyzeMasterPricing.ts
```

Shows headers, columns, and sample data to help with mapping.

## Best Practices

1. **Regular Updates**: Run mapping analysis monthly when uploading new sales data
2. **Consistent Naming**: Use the exact names from Master Pricing as canonical names
3. **Document Variants**: Add all known variants to `alternateNames` for each product
4. **Categories**: Keep categories consistent (Breakfast Burrito, Wrap, Piroshki, etc.)
5. **Item Numbers**: Always include the official item number from Master Pricing

## Troubleshooting

### Problem: Product appears multiple times in dashboard

**Solution**: The product hasn't been mapped yet. Run `buildProductMappings.ts` to identify it, then add mapping.

### Problem: Product name doesn't match Master Pricing

**Solution**: Check that the canonical name in `productMapping.ts` exactly matches Master Pricing.

### Problem: MHD product codes not mapping

**Solution**: MHD uses different codes. Map the MHD code (e.g., MH400002) as an alternate name to the canonical product.

### Problem: New supplier with different naming convention

**Solution**: 
1. Extract their product names using `extractProductNames.ts`
2. Match them to Master Pricing products
3. Add as alternate names in `productMapping.ts`
4. Update the appropriate parser if needed

## Technical Details

### Normalization Algorithm

The mapping system normalizes product names by:
1. Converting to uppercase
2. Removing extra spaces
3. Removing special characters (except &)
4. Trimming whitespace

Example:
```
"GAL BURR BRKFST BACON  " → "GAL BURR BRKFST BACON"
"Uncured  Bacon Burrito!" → "UNCURED BACON BURRITO"
```

### Integration Points

Product mapping is applied in these parsers:
- `alpineParser.ts` - Alpine TXT files
- `keheParser.ts` - KeHE Excel files
- `petesParser.ts` - Pete's Excel files
- `tonysParser.ts` - Tony's Excel files
- `vistarParser.ts` - Vistar Excel files
- `mhdParser.ts` - MHD Excel files

### Performance

- Mapping lookup: O(1) constant time using Map
- No impact on dashboard performance
- Mappings loaded once at startup

## Files Reference

- **`src/utils/productMapping.ts`** - Main mapping dictionary and functions
- **`src/utils/extractProductNames.ts`** - Extract product names from files
- **`src/utils/buildProductMappings.ts`** - Analyze and suggest new mappings
- **`src/utils/analyzeMasterPricing.ts`** - Examine Master Pricing file structure
- **`Master 2025 Pricing (1).xlsx`** - Source of truth for canonical names
- **`public/SalesData/`** - Sales data files with various product name formats

## Support

If you encounter issues with product mapping:

1. Check the console logs - unmapped products are logged with `[Product Mapping] No mapping found for:`
2. Run the analysis tools to identify the issue
3. Verify the Master Pricing file contains the product
4. Check that alternate names are correctly spelled in `productMapping.ts`

## Future Enhancements

Potential improvements to the mapping system:

- [ ] Web UI for managing mappings (no code editing required)
- [ ] Automatic fuzzy matching suggestions
- [ ] Import/export mappings to Excel
- [ ] Product mapping history and audit log
- [ ] Mapping confidence scores
- [ ] Multi-language product name support

