# How to Update Your Google Apps Script

## What's New? 🎉

Your Google Sheets will now display data in a **beautiful pivot table format** with:

✅ **Top Metrics Section:**
- Total Cases per month
- New Customers count per month (green highlighting)
- Lost Customers count per month (red highlighting)

✅ **Customer Tracking Detail Section:** ⭐ NEW!
- **Actual names** of new customers each month
- **Actual names** of lost customers each month  
- Sub-vendors tracked separately (e.g., "Whole Foods - Oakland" vs "Whole Foods - SF")
- Color-coded: Green for new, Red for lost
- Alphabetically sorted

✅ **Pivot Table Section:**
- Companies grouped with color coding
- Products nested under each company
- Monthly breakdown (Jan-Dec)
- Green highlights on cells with sales
- Total column showing yearly totals

## Step-by-Step Update Instructions

### 1. Open Your Google Sheet
Go to: https://docs.google.com/spreadsheets/d/17lLApxgIRcSasKIKlvc1Nqw8oYdsIheXbZbsM0kRRag/edit

### 2. Open Apps Script Editor
- Click **Extensions** → **Apps Script**

### 3. Replace the Code
- **Select ALL** the existing code (Ctrl+A or Cmd+A)
- **Delete it**
- **Open the file** `UPDATED_GOOGLE_APPS_SCRIPT.js` in your SalesTracker folder
- **Copy ALL** the code from that file
- **Paste it** into the Apps Script editor

### 4. Save
- Click the **Save** icon (💾) or press Ctrl+S / Cmd+S
- The script will automatically validate

### 5. Test It!
- Upload any sales data through your SalesTracker app
- Check your Google Sheet
- You should now see:
  - `Monthly_Alpine_CSV_View` (instead of Quarterly)
  - `Monthly_Petes_CSV_View`
  - `Monthly_KeHe_CSV_View`
  - `Monthly_Vistar_CSV_View`

## What You'll See

### Before (Old Quarterly View):
```
Customer     | Product          | Q1  | Q2  | Q3  | Q4
ABC Coffee   | Galant Almond    | 150 | 180 | 200 | 220
```

### After (New Monthly Pivot View):

**Top Metrics Section:**
```
Metric           | Jan | Feb | Mar | ... | Total
Total Cases      | 50  | 55  | 60  | ... | 750
New Customers    | 2   | 1   | 3   | ... | 18    (GREEN)
Lost Customers   | 0   | 1   | 0   | ... | 5     (RED)
```

**Customer Tracking Detail Section:** ⭐ NEW!
```
✅ NEW CUSTOMERS:
Jan:  Blue Bottle - Ferry Building, Whole Foods - Oakland
Feb:  Safeway - Downtown
Mar:  Target - San Jose, Trader Joe's - Berkeley

❌ LOST CUSTOMERS:
Feb:  Local Cafe - Downtown
Apr:  Pete's Coffee - Airport
```

**Pivot Table Section:**
```
Customer / Product         | Jan | Feb | Mar | ... | Total
ABC Coffee Shop            | 50  | 55  | 60  | ... | 750   (BOLD, colored bg)
  Galant Almond           | 20  | 22  | 25  | ... | 300   (indented, italic)
  Galant Cashew           | 15  | 16  | 18  | ... | 225
  Galant Vanilla          | 15  | 17  | 17  | ... | 225

XYZ Grocery               | 45  | 48  | 50  | ... | 698   (BOLD, different color)
  Galant Almond          | 25  | 28  | 30  | ... | 458
  Galant Hazelnut        | 20  | 20  | 20  | ... | 240
```

## Key Features

### 🎨 Color Coding:
- **Blue header** - Main title
- **Green header** - Metrics section
- **Yellow header** - Pivot table headers
- **Alternating pastel colors** - Each customer (orange, blue, purple, green, pink)
- **Light green cells** - Products that sold in that month
- **Light green background** - New customers row
- **Light red background** - Lost customers row

### 📊 Data Organization:
- **Main customers** are in **BOLD** with colored backgrounds
- **Sub-vendors** (locations/branches) shown with 📍 icon, indented once
- **Products** are **indented and italicized** with • bullet
- **Blank rows** separate customer groups
- **Frozen headers** stay visible when scrolling
- **Auto-sized columns** for better readability

### 🏢 Sub-Vendor Support:
- Automatically detects customer locations/branches
- Groups "Customer - Location" or "Customer: Location" patterns
- Shows 3-level hierarchy: Main Customer → Sub-Vendor → Products
- Calculates totals at each level
- Example: "Whole Foods - Oakland" groups under "Whole Foods"

### 📈 Business Insights:
- **Track customer growth/churn** month by month
- **See total volume** for each month
- **Identify buying patterns** for each customer
- **Spot seasonal trends** across products

## Troubleshooting

### The old quarterly tabs are still there
- That's normal! Delete them manually if you want
- The new monthly tabs will appear after your next upload

### I don't see the new tabs
- Make sure you saved the script
- Try uploading new data through the app
- Check the "Logs" sheet for any errors

### Colors aren't showing
- The colors apply automatically when data is uploaded
- If you copied/pasted old code, make sure you got ALL of it

### New/Lost customers show zeros or "No new/lost customers"
- This is normal for the first upload or if there's no churn
- New customers: First appearance in the year
- Lost customers: Didn't order this month but did last month
- Data will populate as you upload more months

### Customer names showing with full paths (e.g., "Whole Foods - Oakland")
- This is correct! Sub-vendors are tracked separately
- Each location is treated as its own entity for tracking
- Main customer totals still roll up properly in pivot table

## Need the Code Again?

The updated script is saved in your project folder as:
`UPDATED_GOOGLE_APPS_SCRIPT.js`

## Questions?

Refer to:
- `PIVOT_TABLE_LAYOUT_GUIDE.md` - Visual guide with examples
- `GOOGLE_SHEETS_MONTHLY_MIGRATION.md` - Migration details
- `README.md` - General documentation

---

**Ready? Go update your script and enjoy your new pivot table view! 🚀**

