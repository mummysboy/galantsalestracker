# Visual Reference: Expandable Sections

## The Actual Look & Feel

### Google Sheets Row Grouping Controls

When you open a sheet with row grouping, you'll see this on the **LEFT MARGIN**:

```
    ┌─────────────────────────────────────────────────────────┐
    │ - 1 2 3 ▼ Customer / Product           Jan  Feb  Mar ... │
    │         ▼ Alpine Foods (Cases)         30   40   50     │
    │         [-] ▼ Store A - Downtown       10   15   20     │
    │             • Coffee Beans             5    7    10     │
    │             • Pastries                 5    8    10     │
    │         [+] ▼ Store B - North          20   25   30     │
    │             • (hidden - collapsed)                       │
    │                                                          │
    │         [-] ▼ KeHe Supplier (Cases)    25   30   35     │
    │         [+]  ▶ Sub Vendor X (Cases)    15   18   22     │
    └─────────────────────────────────────────────────────────┘
     ↑       ↑  ↑  ↑
     │       │  │  └─ Grouping indicators
     │       │  └──── Level 3 (individual rows)
     │       └─────── Level 2 (sub-vendors)
     └────────────── Level 1 (main customer)
```

## What Those Controls Mean

### The Symbols

```
[-]  = Click to COLLAPSE this group
      The [-] changes to [+] after collapsing
      
[+]  = Click to EXPAND this group
      The [+] changes to [-] after expanding
      
▼    = Visual indicator that section is EXPANDED
      (appears in the cell content itself)
      
▶    = Visual indicator that section is COLLAPSED
      (appears in the cell content itself)
      
•    = Individual data row (not collapsible)
```

## Three-Level Hierarchy

### Before Grouping (EXPANDED)

```
[-] ▼ Alpine Foods (Cases)              30   40   50   Total: 520
    [+] ▼ Store A - Downtown            10   15   20   Total: 180
        • Coffee Beans (Cases)           5    7    10   Total: 90
        • Pastries (Cases)               5    8    10   Total: 90
    [-] ▼ Store B - North                20   25   30   Total: 340
        • Whole Beans                   15   18   22   Total: 240
        • Ground Coffee                  5    7    8    Total: 100
        
[+] ▼ KeHe Supplier (Cases)              40   50   60   Total: 600
    (Click [+] to expand)
```

### After Collapsing Main Customer

```
[+] ▼ Alpine Foods (Cases)              30   40   50   Total: 520
    (All sub-vendors hidden)
    
[+] ▼ KeHe Supplier (Cases)              40   50   60   Total: 600
    (Still collapsed)
```

### Partial Collapse (Main Expanded, One Sub-Vendor Collapsed)

```
[-] ▼ Alpine Foods (Cases)              30   40   50   Total: 520
    [+] ▶ Store A - Downtown            10   15   20   Total: 180
        (Products hidden)
    [-] ▼ Store B - North                20   25   30   Total: 340
        • Whole Beans                   15   18   22   Total: 240
        • Ground Coffee                  5    7    8    Total: 100
```

## Complete Example: Multi-Level Navigation

### Starting State (All Expanded)

```
MONTHLY SALES OVERVIEW - 2025
Metric          Jan    Feb    Mar   ...
Total Cases     150    175    200
New Customers   3      2      4
Lost Customers  1      0      2

▼ NEW & LOST CUSTOMERS DETAIL - 2025 (Click group controls)
[-] NEW CUSTOMERS:
    January:    Store A, Store B, Restaurant XYZ
    February:   Cafe Z
    March:      Market 1, Market 2, Market 3

PRODUCT BREAKDOWN BY CUSTOMER - 2025
[-] ▼ Alpine Foods (Cases)              30   40   50
    [-] ▼ Store A (Cases)               10   15   20
        • Coffee Beans                  5    7    10
        • Pastries                      5    8    10
    [+] ▼ Store B (Cases)               20   25   30
    
[-] ▼ KeHe (Cases)                      40   50   60
    [+] ▼ Route A (Cases)               20   25   30
    [+] ▼ Route B (Cases)               20   25   30
```

### Step 1: Collapse Everything

Click each main [-] button:

```
[+] ▼ Alpine Foods (Cases)              30   40   50
[+] ▼ KeHe (Cases)                      40   50   60
```

Now you see just the summary!

### Step 2: Expand Just Alpine

Click [+] next to Alpine:

```
[-] ▼ Alpine Foods (Cases)              30   40   50
    [+] ▼ Store A (Cases)               10   15   20
    [+] ▼ Store B (Cases)               20   25   30
[+] ▼ KeHe (Cases)                      40   50   60
```

### Step 3: Expand One Sub-Vendor

Click [+] next to Store A:

```
[-] ▼ Alpine Foods (Cases)              30   40   50
    [-] ▼ Store A (Cases)               10   15   20
        • Coffee Beans                  5    7    10
        • Pastries                      5    8    10
    [+] ▼ Store B (Cases)               20   25   30
[+] ▼ KeHe (Cases)                      40   50   60
```

Perfect! You can see detail for Store A while keeping Store B and KeHe collapsed.

## Real-World Use Cases

### Use Case 1: Executive Dashboard View

**Goal:** Show only main vendor summaries

```
[+] ▼ Alpine Foods (Cases)              30   40   50    Total: 520
[+] ▼ KeHe (Cases)                      40   50   60    Total: 600
[+] ▼ Vistar (Cases)                    20   25   30    Total: 300
[+] ▼ Pete's Coffee (Cases)             15   18   22    Total: 200
```

All details hidden - just see totals. Perfect for presentations!

### Use Case 2: Regional Manager View

**Goal:** Show vendors expanded, but individual products hidden

```
[-] ▼ Alpine Foods (Cases)              30   40   50
    [+] ▼ Store A (Cases)               10   15   20
    [+] ▼ Store B (Cases)               20   25   30
[-] ▼ KeHe (Cases)                      40   50   60
    [+] ▼ Route 1 (Cases)               20   25   30
    [+] ▼ Route 2 (Cases)               20   25   30
```

See where products are coming from, but not every SKU.

### Use Case 3: Analyst Deep Dive

**Goal:** See everything expanded

```
[-] ▼ Alpine Foods (Cases)              30   40   50
    [-] ▼ Store A (Cases)               10   15   20
        • Coffee Beans                  5    7    10
        • Pastries                      5    8    10
    [-] ▼ Store B (Cases)               20   25   30
        • Whole Beans                  15   18   22
        • Ground Coffee                 5    7    8
```

Every level visible for detailed analysis.

## How It Actually Works (Behind the Scenes)

### What Google Sheets Does

When the script runs:

```
1. Script builds sheet rows:
   Row 50: "Alpine Foods"              ← Header (main customer)
   Row 51: "Store A"                   ← Sub-header (sub-vendor)
   Row 52: "Coffee Beans"              ← Data row
   Row 53: "Pastries"                  ← Data row
   Row 54: "Store B"                   ← Sub-header (sub-vendor)
   Row 55: "Ground Coffee"             ← Data row

2. Script creates row groups:
   Group 1: Rows 51-55 (all sub-vendors and products)
   Group 2: Rows 52-53 (just products under Store A)
   Group 3: Rows 55 (just products under Store B)

3. Google Sheets renders:
   - [+] buttons appear on left
   - Control levels shown as 1, 2, 3
   - Click buttons to hide/show groups
```

### Why the Try-Catch?

```javascript
try {
  sheet.getRowGroup(startRow, rowCount).setControlPosition(
    sheet.ControlPosition.BEFORE
  );
} catch (e) {
  // Feature not available - data shows anyway
}
```

The try-catch means:
- ✅ If row grouping works → You see +/- buttons
- ✅ If it fails → Data still shows, just no buttons
- ✅ No crash, no data loss

## Mobile & Tablet View

On mobile devices:

```
Landscape mode:           Portrait mode:
┌─────────────────┐      ┌──────────┐
│ - 1 2 3 ▼ Prod. │      │▼ Prod.   │
│    • Item 1     │      │ • Item 1 │
│    • Item 2     │      │ • Item 2 │
└─────────────────┘      └──────────┘

[+/- buttons still work, but are small]
```

The +/- buttons are still clickable on mobile, though a bit small.

## Troubleshooting Visually

### Symptom: No +/- buttons visible

```
What you see:
  ▼ Alpine Foods (Cases)              30   40   50
    ▼ Store A (Cases)                 10   15   20
    • Coffee Beans                    5    7    10

What should show:
  [-] ▼ Alpine Foods (Cases)          30   40   50
      [+] ▼ Store A (Cases)           10   15   20
          • Coffee Beans              5    7    10
  
  ^ These +/- buttons are missing
```

**Solution:** Refresh page, try different browser, or use manual hide/show

### Symptom: Buttons exist but don't respond

```
You see:
  [-] ▼ Alpine Foods (Cases)          30   40   50
      [+] ▼ Store A (Cases)           10   15   20

But clicking [-] doesn't collapse

Solutions:
- Refresh the page
- Check permissions (can you edit the sheet?)
- Try a different browser
```

### Symptom: Grouping disappeared after editing

```
After you manually edited rows, grouping broke

What happened:
- Manual edits inside groups can break grouping
- Solution: Re-run the data upload to rebuild
- Or: Upload empty/minimal data, then re-upload full data
```

---

**Summary:** These expandable sections transform your data from overwhelming to navigable. Users can zoom in/out on detail level they need. 🎯
