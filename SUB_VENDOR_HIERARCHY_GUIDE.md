# Sub-Vendor Hierarchy Guide

## How Sub-Vendors Are Detected

The script automatically detects sub-vendors when your customer names contain:
- **Dash separator**: `"Customer - Location"` 
- **Colon separator**: `"Customer: Location"`

### Examples:

✅ **Will be grouped:**
```
Whole Foods - San Francisco
Whole Foods - Oakland  
Whole Foods - Berkeley
→ All grouped under "Whole Foods"
```

✅ **Also works:**
```
Starbucks: Downtown
Starbucks: Airport
Starbucks: Mall
→ All grouped under "Starbucks"
```

✅ **Multiple levels:**
```
Target - Northern California - San Jose
Target - Northern California - Oakland
→ Main: "Target"
→ Sub: "Northern California - San Jose"
→ Sub: "Northern California - Oakland"
```

❌ **Will NOT be grouped (no separator):**
```
Whole Foods SF
Whole Foods Oakland
→ Treated as two separate customers
```

---

## Visual Display Hierarchy

### Example 1: Customer WITH Sub-Vendors

```
┌───────────────────────────────┬─────┬─────┬─────┬─────┬───────┐
│ Customer / Product            │ Jan │ Feb │ Mar │ ... │ Total │
├───────────────────────────────┼─────┼─────┼─────┼─────┼───────┤
│ Whole Foods                   │ 150 │ 165 │ 180 │ ... │ 1980  │ ← MAIN CUSTOMER (Bold, colored bg)
│   📍 San Francisco            │  50 │  55 │  60 │ ... │  660  │ ← SUB-VENDOR (Semi-bold, gray bg)
│       • Galant Almond         │  20 │  22 │  25 │ ... │  270  │ ← PRODUCT (Italic, white bg, green if >0)
│       • Galant Cashew         │  15 │  16 │  18 │ ... │  195  │
│       • Galant Vanilla        │  15 │  17 │  17 │ ... │  195  │
│   📍 Oakland                  │  50 │  55 │  60 │ ... │  660  │ ← SUB-VENDOR
│       • Galant Almond         │  20 │  22 │  25 │ ... │  270  │ ← PRODUCT
│       • Galant Hazelnut       │  30 │  33 │  35 │ ... │  390  │
│   📍 Berkeley                 │  50 │  55 │  60 │ ... │  660  │ ← SUB-VENDOR
│       • Galant Cashew         │  25 │  28 │  30 │ ... │  330  │ ← PRODUCT
│       • Galant Vanilla        │  25 │  27 │  30 │ ... │  330  │
└───────────────────────────────┴─────┴─────┴─────┴─────┴───────┘
```

**Key Features:**
- 🏢 **Main Customer** ("Whole Foods") shows TOTAL across all sub-vendors
- 📍 **Sub-Vendors** (locations) show their individual totals
- 🎯 **Products** are listed under each sub-vendor
- ✅ **Auto-calculated**: Main customer total = sum of all sub-vendors

---

### Example 2: Customer WITHOUT Sub-Vendors

```
┌───────────────────────────────┬─────┬─────┬─────┬─────┬───────┐
│ Customer / Product            │ Jan │ Feb │ Mar │ ... │ Total │
├───────────────────────────────┼─────┼─────┼─────┼─────┼───────┤
│ Pete's Coffee                 │ 100 │ 110 │ 120 │ ... │ 1320  │ ← MAIN CUSTOMER (Bold, colored bg)
│     • Galant Almond           │  40 │  44 │  48 │ ... │  528  │ ← PRODUCT (Italic, white bg)
│     • Galant Cashew           │  30 │  33 │  36 │ ... │  396  │
│     • Galant Hazelnut         │  30 │  33 │  36 │ ... │  396  │
└───────────────────────────────┴─────┴─────┴─────┴─────┴───────┘
```

**Key Features:**
- 🏢 **Main Customer** shows their total
- 🎯 **Products** listed directly (no sub-vendors)
- Simple, flat structure when no locations exist

---

## Color Coding

| Level | Appearance | Background | Font |
|-------|------------|------------|------|
| **Main Customer** | Bold, large | Pastel color (orange/blue/purple/green/pink) | Black, size 12 |
| **Sub-Vendor** | Bold with 📍 | Light gray (#fafafa) | Blue (#1565c0), size 10 |
| **Product** | Italic with • | White (#ffffff) | Gray (#424242) |
| **Sales Cell** | - | Light green (#e8f5e9) when > 0 | - |

---

## Benefits of This Structure

### ✅ For Analysis:
1. **See total business per main customer** at a glance
2. **Compare performance across locations** easily
3. **Identify which locations buy which products**
4. **Spot trends** (is one location growing while another shrinks?)

### ✅ For Reporting:
1. **Roll-up totals** automatically calculated
2. **Drill-down details** available for each location
3. **Clean hierarchy** makes it easy to understand

### ✅ For Planning:
1. **Identify underperforming locations**
2. **See product preferences by location**
3. **Plan targeted sales strategies**

---

## Real-World Examples

### Scenario 1: Retail Chain
```
Target                              1,000 cases total
  📍 Target - San Jose                300 cases
      • Galant Almond                 150
      • Galant Vanilla                150
  📍 Target - Oakland                 400 cases
      • Galant Almond                 200
      • Galant Cashew                 200
  📍 Target - Berkeley                300 cases
      • Galant Vanilla                300
```

**Insight**: Oakland location buys 40% of total Target volume!

---

### Scenario 2: Coffee Shop Chain
```
Blue Bottle                         600 cases total
  📍 SF Financial District           200 cases
  📍 SF Ferry Building               250 cases
  📍 Oakland                         150 cases
```

**Insight**: Ferry Building location is the top performer!

---

### Scenario 3: Distributor Network
```
UNFI                                2,500 cases total
  📍 UNFI: Northern California      1,200 cases
  📍 UNFI: Southern California        800 cases
  📍 UNFI: Pacific Northwest          500 cases
```

**Insight**: Northern CA is 48% of UNFI business!

---

## How to Format Your Customer Names

### ✅ Recommended Format:

**For store locations:**
```
CustomerName - Location
Examples:
  - Whole Foods - San Francisco
  - Safeway - Oakland Downtown
  - Trader Joe's - Berkeley
```

**For regional divisions:**
```
CustomerName: Region
Examples:
  - UNFI: NorCal
  - KeHe: West Coast
  - Target: Bay Area
```

**For complex hierarchies:**
```
CustomerName - Region - Specific Location
Examples:
  - Starbucks - California - SF Downtown
  - Costco - West - San Jose
```

---

## Automatic Processing

✅ **The script automatically:**
1. Detects the separator (" - " or ": ")
2. Groups sub-vendors under main customer
3. Calculates totals at each level
4. Applies proper formatting and colors
5. Sorts everything alphabetically

✅ **No manual configuration needed!**
- Just name your customers consistently
- The script handles the rest

---

## Migration Tips

### If Your Current Data Has Inconsistent Naming:

**Before upload, standardize your customer names:**

❌ Inconsistent:
```
Whole Foods SF
Whole Foods - Oakland
WholeFoods Berkeley
```

✅ Consistent:
```
Whole Foods - San Francisco
Whole Foods - Oakland
Whole Foods - Berkeley
```

**This ensures proper grouping and hierarchy display!**

---

## Questions?

**Q: What if I don't use " - " or ": " in my customer names?**
A: No problem! Customers without these separators will display normally (without sub-vendor hierarchy).

**Q: Can I mix formats?**
A: Yes! Some customers can have sub-vendors, others don't need to.

**Q: What if I have more than 2 levels?**
A: The script takes everything after the first separator as the sub-vendor name. For example:
- "Target - NorCal - San Jose" → Main: "Target", Sub: "NorCal - San Jose"

**Q: Will this break my existing data?**
A: No! Existing customer names without separators work exactly as before.


