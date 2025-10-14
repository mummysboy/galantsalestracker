# Product Mapping Quick Reference

## What Is It?

A system that automatically standardizes product names across all your sales data sources, ensuring:
- **Consistent reporting** - Same products always have the same name
- **Accurate aggregation** - Sales from all sources properly combined
- **Cleaner dashboards** - No duplicate products with different names

## How It Works

```
Alpine Report:     "GAL BURR BRKFST BACON"           ──┐
MHD Report:        "MH400002"                         ──┤
KeHE Report:       "GLNT BACON BREAKF BURRITO"       ──┼─→ "Uncured Bacon Breakfast Burrito"
Master Pricing:    "Uncured Bacon Breakfast Burrito" ──┘
```

All variants automatically map to the canonical name from Master Pricing!

## Quick Commands

```bash
# See what products are mapped/unmapped
npm run analyze-products

# Extract all product names from sales files
npm run extract-products

# Examine Master Pricing file structure
npm run analyze-master-pricing

# Start the dashboard
npm start
```

## Adding a New Product Mapping

1. **Identify the product in Master Pricing**
   - Item #: e.g., `321`
   - Product Description: e.g., `Uncured Bacon Breakfast Burrito`

2. **Find all variants in sales data**
   ```bash
   npm run extract-products
   ```

3. **Add to `src/utils/productMapping.ts`**
   ```typescript
   {
     itemNumber: '321',
     canonicalName: 'Uncured Bacon Breakfast Burrito',
     alternateNames: [
       'GAL BURR BRKFST BACON',      // Alpine
       'GLNT BACON BREAKF BURRITO',  // KeHE
       'MH400002',                    // MHD
       'BACON BREAKFAST BURRITO',    // Generic
     ],
     category: 'Breakfast Burrito'
   },
   ```

4. **Test it**
   ```bash
   npm start
   ```

## Current Status

- ✅ **32 products mapped** across all categories
- ✅ **All parsers integrated** (Alpine, KeHE, Pete's, Tony's, Vistar, MHD)
- ✅ **Automatic normalization** on data load
- 📊 **Unified dashboard** showing consistent product names

## Common Product Categories

- **Breakfast Burrito** - Bacon, Sausage, Chorizo, Chile Verde, etc.
- **Breakfast Sandwich** - Bacon, Chorizo, Turkey Sausage, etc.
- **Wrap** - Chicken Florentine, Chicken Parmesean, BBQ Pulled Pork
- **Bagel Dog** - Beef Frank, Polish Sausage, Jalapeno Cheese
- **Piroshki** - Beef & Cheese, Beef & Mushroom, Potato varieties
- **Other** - Sample Kit, Misc items

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Product appears twice | Run `npm run analyze-products` to identify, then add mapping |
| Wrong product name | Check canonical name matches Master Pricing exactly |
| MHD codes not working | Add MHD code to `alternateNames` array |
| New supplier format | Extract names, match to Master Pricing, add mappings |

## File Locations

```
src/utils/
  ├── productMapping.ts          # Main mapping dictionary (EDIT THIS)
  ├── buildProductMappings.ts    # Analysis tool
  ├── extractProductNames.ts     # Name extraction
  └── analyzeMasterPricing.ts    # Master file analyzer

Master 2025 Pricing (1).xlsx     # Source of truth
public/SalesData/                 # Sales files with variants
```

## Example: Complete Workflow

```bash
# 1. Upload new sales data to public/SalesData/
# 2. Analyze for unmapped products
npm run analyze-products

# 3. Open the generated file
open unmapped-products-code.txt

# 4. Edit productMapping.ts to add new mappings
code src/utils/productMapping.ts

# 5. Test in dashboard
npm start

# 6. Upload sales files and verify unified names
```

## Need Help?

See full documentation: `PRODUCT_MAPPING_GUIDE.md`

## Key Benefits

✅ **No manual work** - Mapping happens automatically  
✅ **Consistent data** - Same product = same name everywhere  
✅ **Better insights** - Accurate totals and trends  
✅ **Easy maintenance** - Simple dictionary to update  
✅ **Scalable** - Add new products/suppliers easily  

---

**Last Updated**: October 2025  
**Products Mapped**: 32  
**Suppliers Supported**: 6 (Alpine, KeHE, Pete's, Tony's, Vistar, MHD)

