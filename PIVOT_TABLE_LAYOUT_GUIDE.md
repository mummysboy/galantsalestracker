# Pivot Table Layout Guide - Monthly Sales View

## Visual Layout

Your Google Sheets will now display data in a beautiful, color-coded pivot table format:

---

### **Section 1: Top Metrics (Color: Blue Header)**

```
┌──────────────────────────────────────────────────────────────────────┐
│          MONTHLY SALES OVERVIEW - 2025                                │  (Blue #1a73e8)
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┬──────┬──────┬──────┬──────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬───────┐
│ Metric          │ Jan  │ Feb  │ Mar  │ Apr  │ May │ Jun │ Jul │ Aug │ Sep │ Oct │ Nov │ Dec │ Total │  (Green #34a853)
├─────────────────┼──────┼──────┼──────┼──────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼───────┤
│ Total Cases     │ 150  │ 200  │ 175  │ 190  │ 210 │ 225 │ 240 │ 230 │ 220 │ 235 │ 245 │ 250 │ 2570  │  (Gray #f8f9fa)
├─────────────────┼──────┼──────┼──────┼──────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼───────┤
│ New Customers   │  5   │  3   │  2   │  4   │  1  │  2  │  3  │  1  │  2  │  1  │  2  │  1  │   27  │  (Light Green #d4edda)
├─────────────────┼──────┼──────┼──────┼──────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼───────┤
│ Lost Customers  │  0   │  1   │  0   │  2   │  1  │  0  │  1  │  0  │  1  │  0  │  1  │  0  │   7   │  (Light Red #f8d7da)
└─────────────────┴──────┴──────┴──────┴──────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴───────┘
```

**This section shows at a glance:**
- ✅ Total cases sold each month
- ✅ How many NEW customers you gained each month (highlighted in green)
- ✅ How many customers you LOST each month (highlighted in red)

---

### **Section 2: Pivot Table - Customers & Products (Color: Red Header)**

```
┌──────────────────────────────────────────────────────────────────────┐
│          SALES BY CUSTOMER & PRODUCT - 2025                           │  (Red #ea4335)
└──────────────────────────────────────────────────────────────────────┘

┌───────────────────────┬──────┬──────┬──────┬──────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬───────┐
│ Customer / Product    │ Jan  │ Feb  │ Mar  │ Apr  │ May │ Jun │ Jul │ Aug │ Sep │ Oct │ Nov │ Dec │ Total │  (Yellow #fbbc04)
├───────────────────────┼──────┼──────┼──────┼──────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼───────┤
│ ABC Coffee Shop       │  50  │  55  │  60  │  58  │  62 │  65 │  70 │  68 │  66 │  72 │  75 │  78 │  779  │  (Light Orange #fff3e0 - Customer Total Row)
│   Galant Almond       │  20  │  22  │  25  │  23  │  25 │  28 │  30 │  28 │  27 │  30 │  32 │  34 │  324  │  (White bg, green highlight if >0)
│   Galant Cashew       │  15  │  16  │  18  │  17  │  19 │  20 │  22 │  21 │  20 │  23 │  24 │  25 │  240  │
│   Galant Vanilla      │  15  │  17  │  17  │  18  │  18 │  17 │  18 │  19 │  19 │  19 │  19 │  19 │  215  │
│                       │      │      │      │      │     │     │     │     │     │     │     │     │       │  (Blank row for spacing)
│ XYZ Grocery           │  45  │  48  │  50  │  52  │  55 │  58 │  60 │  62 │  64 │  66 │  68 │  70 │  698  │  (Light Blue #e3f2fd - Customer Total Row)
│   Galant Almond       │  25  │  28  │  30  │  32  │  35 │  38 │  40 │  42 │  44 │  46 │  48 │  50 │  458  │  (White bg, green highlight if >0)
│   Galant Hazelnut     │  20  │  20  │  20  │  20  │  20 │  20 │  20 │  20 │  20 │  20 │  20 │  20 │  240  │
│                       │      │      │      │      │     │     │     │     │     │     │     │     │       │  (Blank row for spacing)
│ 123 Market            │  35  │  38  │  40  │  42  │  45 │  48 │  50 │  52 │  54 │  56 │  58 │  60 │  578  │  (Light Purple #f3e5f5 - Customer Total Row)
│   Galant Cashew       │  20  │  22  │  24  │  26  │  28 │  30 │  32 │  34 │  36 │  38 │  40 │  42 │  372  │  (White bg, green highlight if >0)
│   Galant Vanilla      │  15  │  16  │  16  │  16  │  17 │  18 │  18 │  18 │  18 │  18 │  18 │  18 │  206  │
└───────────────────────┴──────┴──────┴──────┴──────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴───────┘
```

**This section shows:**
- 🏢 **Customer names in BOLD** with alternating pastel colors (orange, blue, purple, green, pink)
- 📦 **Products indented below each customer** (in italics, white background)
- ✨ **Cells with sales are highlighted in light green** (#e8f5e9)
- 📊 **Total column on the right** showing yearly totals
- 📏 **Blank rows between customers** for easy visual separation

---

## Color Scheme Summary

| Element | Color | Hex Code |
|---------|-------|----------|
| **Main Title** | Blue | #1a73e8 |
| **Metrics Header** | Green | #34a853 |
| **New Customers** | Light Green | #d4edda |
| **Lost Customers** | Light Red | #f8d7da |
| **Pivot Title** | Red | #ea4335 |
| **Pivot Header** | Yellow | #fbbc04 |
| **Customer 1** | Light Orange | #fff3e0 |
| **Customer 2** | Light Blue | #e3f2fd |
| **Customer 3** | Light Purple | #f3e5f5 |
| **Customer 4** | Light Green | #e8f5e9 |
| **Customer 5** | Light Pink | #fce4ec |
| **Product Cells with Sales** | Light Green | #e8f5e9 |

---

## Key Features

### ✅ Top Section Benefits:
1. **Total Cases**: See monthly volume at a glance
2. **New Customers**: Track customer acquisition by month (green = good!)
3. **Lost Customers**: Identify churn issues by month (red = needs attention!)
4. **Total Column**: See year-to-date totals

### ✅ Pivot Table Benefits:
1. **Grouped by Customer**: Easy to see which customers buy what
2. **Color-Coded Customers**: Each customer has a unique pastel color
3. **Indented Products**: Products are nested under their customer
4. **Green Highlights**: Quickly spot which products sold in which months
5. **Frozen Headers**: Scroll down and headers stay visible
6. **Alphabetically Sorted**: Customers and products in A-Z order
7. **Blank Rows**: Visual breathing room between customer groups

---

## How to Use This Data

### 📈 For Growth Analysis:
- Look at "New Customers" row - which months have the best acquisition?
- Compare "Lost Customers" to see retention trends

### 🎯 For Customer Management:
- Scroll to any customer and see all their products
- Check the Total column to identify your biggest customers
- Look for patterns (do they order every month or sporadically?)

### 📦 For Product Planning:
- See which products are popular across different customers
- Identify seasonal trends by comparing monthly columns
- Green highlights make it easy to spot active selling periods

---

## Updates Automatically

Every time you upload new data through your SalesTracker app, this pivot table rebuilds automatically with the latest information!


