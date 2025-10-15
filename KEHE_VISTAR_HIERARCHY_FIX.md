# KeHe & Vistar Hierarchical Display Fix

## Problem
KeHe and Vistar data in Google Sheets was not displaying the proper vendor → customer → product hierarchy. It was only showing a flat list of customers and products, losing the important context of which customers belong to which vendors/retailers.

## Solution
Updated the KeHe and Vistar upload components to send hierarchical customer names in the format `"Vendor - Customer"`. The Google Apps Script already had logic to detect this pattern and display it hierarchically.

## How It Works Now

### KeHe Data Structure:
**Before Fix:**
```
Customer Name: "Whole Foods"
Product: "Organic Hummus"
```

**After Fix:**
```
Customer Name: "Whole Foods - San Francisco Store #123"
Product: "Organic Hummus"
```

### Vistar Data Structure:
**Before Fix:**
```
Customer Name: "Vistar Illinois"
Product: "Chips"
```

**After Fix:**
```
Customer Name: "Vistar Illinois - MONSTER VENDING LLC"
Product: "Chips"
```

## Google Sheets Display

The Google Apps Script detects the `" - "` separator and creates a 3-level hierarchy:

### Example: KeHe Sheet
```
SALES BY CUSTOMER & PRODUCT - 2025

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Whole Foods                        Jan  Feb  Mar  Apr  May  Jun  ...  Total
  📍 San Francisco Store #123      
      • Organic Hummus              10   12   15   18   20   22   ...   143
      • Quinoa Salad                 5    6    7    8    9   10   ...    67
  📍 Berkeley Store #456
      • Organic Hummus               8    9   10   11   12   13   ...    89
      • Vegan Wraps                  3    4    5    6    7    8    ...    45

Safeway                            Jan  Feb  Mar  Apr  May  Jun  ...  Total
  📍 Oakland Location
      • Deli Salads                 20   22   25   28   30   32   ...   211
```

### Example: Vistar Sheet
```
SALES BY CUSTOMER & PRODUCT - 2025

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vistar Illinois                    Jan  Feb  Mar  Apr  May  Jun  ...  Total
  📍 MONSTER VENDING LLC
      • Chips - Variety Pack        100  105  110  115  120  125  ...   875
      • Cookies - Chocolate Chip     50   55   60   65   70   75   ...   475
  📍 ABC VENDING SERVICES
      • Chips - Variety Pack         80   85   90   95  100  105  ...   655

Vistar Northern California         Jan  Feb  Mar  Apr  May  Jun  ...  Total
  📍 ACME VENDING INC
      • Energy Drinks - Red Bull     30   32   35   38   40   42   ...   287
```

## Visual Formatting

The Google Sheets display uses:
- **Bold, colored background** for main vendors/retailers
- **📍 Icon + bold text** for sub-vendors/customers (indented once)
- **• Icon + italic text** for products (indented twice)
- **Alternating colors** for different vendors for easy visual separation
- **Green highlight** for cells with sales data

## Files Modified

### Frontend (React App):
1. `src/components/KeHeReportUpload.tsx`
   - Lines 58-80: Updated to send hierarchical customer names
   
2. `src/components/VistarReportUpload.tsx`
   - Lines 58-80: Updated to send hierarchical customer names

### Backend (Google Apps Script):
- No changes needed - existing logic already handles hierarchy detection (lines 674-686)

## Technical Details

### Frontend Changes:
```javascript
// Build hierarchical customer name: "Vendor - Customer"
const hierarchicalCustomer = r.accountName && r.accountName !== r.customerName
  ? `${r.customerName} - ${r.accountName}`
  : r.customerName;
```

This code:
1. Checks if `accountName` exists and is different from `customerName`
2. If yes, combines them with " - " separator
3. If no, uses just `customerName` (for vendors without sub-customers)

### Google Apps Script Logic:
```javascript
if (fullCustomerName.includes(" - ")) {
  const subParts = fullCustomerName.split(" - ");
  mainCustomer = subParts[0].trim();
  subVendor = subParts.slice(1).join(" - ").trim();
}
```

This code:
1. Detects the " - " separator in customer names
2. Splits into main customer (vendor) and sub-vendor (customer)
3. Displays them hierarchically with proper indentation and styling

## Testing Steps

### 1. Upload KeHe Report
1. Go to "KeHe Distributor Reports" section
2. Upload a KeHe Excel file
3. Process the file
4. Check Google Sheets "KeHe" tab

**Expected Result:**
- Retailer names (e.g., "Whole Foods", "Safeway") shown in bold with colored background
- Customer/location names indented with 📍 icon
- Products further indented with • icon

### 2. Upload Vistar Report
1. Go to "Vistar Distributor Reports" section
2. Upload a Vistar Excel file
3. Process the file
4. Check Google Sheets "Vistar" tab

**Expected Result:**
- OPCO names (e.g., "Vistar Illinois") shown in bold with colored background
- Customer names indented with 📍 icon
- Products further indented with • icon

### 3. Verify Totals
- Main vendor rows should show sum of all sub-vendors
- Sub-vendor rows should show sum of all products
- All monthly totals should be accurate

## Benefits

### 📊 Better Data Organization
- Clear hierarchy: Vendor → Customer → Product
- Easy to see which customers belong to which vendors
- Grouped data is easier to analyze

### 🎨 Visual Clarity
- Color-coded vendor sections
- Icons for quick recognition (📍 for locations, • for products)
- Proper indentation shows relationships

### 📈 Better Business Insights
- Track performance by vendor region (e.g., "Vistar Illinois" vs "Vistar Northern California")
- Identify top-performing customer locations within each retailer
- Compare product performance across different vendor territories

### 🔍 Easier Navigation
- Quickly find specific vendors in the sheet
- Scan sub-vendors at a glance
- Drill down to product details when needed

## Deployment

### 1. Build and Deploy Frontend:
```bash
npm install
npm run build
# Deploy to Netlify or your hosting service
```

### 2. Test:
1. Upload KeHe report with multiple retailers/customers
2. Upload Vistar report with multiple OPCO regions/customers
3. Verify hierarchical display in Google Sheets
4. Check that totals roll up correctly at each level

## Notes

- The hierarchy is automatically detected based on the " - " separator
- If a vendor has no sub-customers, it will display normally without sub-levels
- The same logic works for both KeHe and Vistar (and any other vendor using this format)
- Monthly totals are calculated at all levels (vendor, sub-vendor, and product)

## Example Data Flow

### KeHe:
1. **Excel File**: Retailer = "Whole Foods", Customer = "Store #123 - San Francisco"
2. **Parser**: Creates record with `customerName: "Whole Foods"`, `accountName: "Store #123 - San Francisco"`
3. **Upload Component**: Combines to `"Whole Foods - Store #123 - San Francisco"`
4. **Google Sheets**: Displays as:
   - **Whole Foods** (main)
     - 📍 **Store #123 - San Francisco** (sub)

### Vistar:
1. **Excel File**: OPCO = "Vistar Illinois", Customer = "MONSTER VENDING LLC"
2. **Parser**: Creates record with `customerName: "Vistar Illinois"`, `accountName: "MONSTER VENDING LLC"`
3. **Upload Component**: Combines to `"Vistar Illinois - MONSTER VENDING LLC"`
4. **Google Sheets**: Displays as:
   - **Vistar Illinois** (main)
     - 📍 **MONSTER VENDING LLC** (sub)

## Summary

KeHe and Vistar data will now display with proper vendor → customer → product hierarchy in Google Sheets, making it much easier to understand and analyze sales data by vendor region and customer location! 🎉

