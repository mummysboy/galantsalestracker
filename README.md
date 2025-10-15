# Galant Foods Sales Tracker

A comprehensive sales tracking dashboard with automatic product name normalization across multiple suppliers.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## 🎯 Key Features

- **Multi-Supplier Support**: Alpine, KeHE, Pete's, Tony's, Vistar, and MHD
- **Product Name Mapping**: Automatic standardization of product descriptions
- **Period Comparison**: Track sales trends across months
- **Customer Analysis**: Detailed customer-level reporting
- **MHD Integration**: Full support for MHD quarterly reports

## 📚 Documentation

- **[Product Mapping Guide](PRODUCT_MAPPING_GUIDE.md)** - Comprehensive guide to the product mapping system
- **[Product Mapping Quickstart](PRODUCT_MAPPING_QUICKSTART.md)** - Quick reference for common tasks
- **[Product Mapping Examples](PRODUCT_MAPPING_EXAMPLE.md)** - Before/after examples
- **[Implementation Summary](PRODUCT_MAPPING_IMPLEMENTATION_SUMMARY.md)** - Technical overview
- **[Usage Guide](USAGE_GUIDE.md)** - Dashboard usage instructions
- **[MHD Integration](MHD_INTEGRATION_SUMMARY.md)** - MHD-specific documentation

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run analyze-products`

Analyzes sales data to identify unmapped products and suggests mappings.

Generates:
- `product-mapping-analysis.json` - Complete analysis
- `unmapped-products-code.txt` - Code templates for new mappings

### `npm run extract-products`

Extracts all unique product names from sales data files.

Output: `product-names-extraction.json`

### `npm run analyze-master-pricing`

Examines the Master Pricing file structure to help with product mapping.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## 🔄 Product Name Mapping

The Sales Tracker includes an automatic product name mapping system that standardizes product descriptions across all suppliers.

### Why It Matters

Different suppliers use different names for the same products:
- Alpine: `GAL BURR BRKFST BACON`
- MHD: `MH400002`
- KeHE: `GLNT BACON BREAKF BURRITO`

All automatically map to: **`Uncured Bacon Breakfast Burrito`** (from Master Pricing)

### Quick Start

1. **No setup required** - Product mapping works automatically!
2. **Upload sales data** - Product names are standardized on import
3. **View unified reports** - All dashboards show consistent names

### Adding New Products

```bash
# 1. Identify unmapped products
npm run analyze-products

# 2. Edit src/utils/productMapping.ts to add mappings
# 3. Restart dashboard
npm start
```

See **[Product Mapping Quickstart](PRODUCT_MAPPING_QUICKSTART.md)** for details.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

## Google Sheets integration (append on upload + monthly CSV view)

You can push every upload into a Google Sheet and automatically maintain a monthly CSV-style tab that mirrors your monthly data. The app already sends rows when you upload (both CSV and Alpine TXT) if you set two environment variables:

- `REACT_APP_GS_WEBAPP_URL`
- `REACT_APP_GS_TOKEN`

Follow these steps to set up the Google Apps Script receiver and the two tabs:

1) Create a Google Sheet
- Create a new spreadsheet (e.g., "SalesTracker Data").
- Leave tabs empty; the script will create/update `AllData` and `Monthly_CSV_View`.

2) Add the Apps Script
- In the Sheet, go to Extensions → Apps Script.
- Delete any default code and paste the script below.
- Replace `TOKEN_VALUE` with a long random string. Keep it secret.

```javascript
// Apps Script for receiving upload rows and building a monthly CSV-like view

const TOKEN = 'TOKEN_VALUE'; // set this to the same value as REACT_APP_GS_TOKEN
const RAW_SHEET_NAME = 'AllData';
const MONTHLY_VIEW_SHEET_NAME = 'Monthly_CSV_View';

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (!body || body.token !== TOKEN) {
      return ContentService.createTextOutput('Unauthorized');
    }
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return ContentService.createTextOutput('No rows');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const raw = getOrCreateSheet(ss, RAW_SHEET_NAME);
    ensureHeader(raw, [
      'Date',
      'Customer',
      'Product',
      'Quantity',
      'Revenue',
      'InvoiceId',
      'Source',
      'UploadedAt'
    ]);

    const normalized = rows.map(normalizeRow);
    if (normalized.length) {
      const startRow = Math.max(raw.getLastRow() + 1, 2);
      raw.getRange(startRow, 1, normalized.length, 8).setValues(normalized);
    }

    // Rebuild monthly view for the latest year present in the data
    rebuildMonthlyView(ss);
    return ContentService.createTextOutput('OK');
  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err);
  }
}

function getOrCreateSheet(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function ensureHeader(sh, header) {
  const firstRow = sh.getRange(1, 1, 1, header.length).getValues()[0];
  const needs = firstRow.some((v, i) => v !== header[i]);
  if (needs) {
    sh.clear();
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.setFrozenRows(1);
  }
}

function normalizeRow(r) {
  // Expected incoming order from the app:
  // [date, customer, product, quantity, revenue, invoiceId, sourceFileName, uploadedAt]
  const date = toYmd(r[0]);
  const customer = String(r[1] || '').trim();
  const product = String(r[2] || '').trim();
  const quantity = toNumber(r[3]);
  const revenue = toNumber(r[4]);
  const invoiceId = String(r[5] || '').trim();
  const source = String(r[6] || '').trim();
  const uploadedAt = String(r[7] || new Date().toISOString());
  return [date, customer, product, quantity, revenue, invoiceId, source, uploadedAt];
}

function toYmd(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return '';
  const y = d.getFullYear();
  const m = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  return y + '-' + m + '-' + day;
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function rebuildMonthlyView(ss) {
  const raw = getOrCreateSheet(ss, RAW_SHEET_NAME);
  const lastRow = raw.getLastRow();
  if (lastRow < 2) {
    // No data
    const view = getOrCreateSheet(ss, MONTHLY_VIEW_SHEET_NAME);
    view.clear();
    view.getRange(1, 1, 1, 14).setValues([[
      'Customer', 'Product', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]]);
    view.setFrozenRows(1);
    return;
  }

  const values = raw.getRange(2, 1, lastRow - 1, 8).getValues();
  
  // Build monthly summary data (for top section)
  const monthlyTotals = {}; // key = YYYY-MM, value = {quantity, revenue, customers, products}
  const years = new Set();
  
  // Build map: key = year|customer|product, vals = 12 months quantities and revenues
  const totalsByKey = {};
  
  for (let i = 0; i < values.length; i++) {
    const [dateStr, customer, product, quantity, revenue] = [values[i][0], values[i][1], values[i][2], values[i][3], values[i][4]];
    if (!dateStr || !customer || !product) continue;
    const d = new Date(dateStr);
    if (isNaN(d)) continue;
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1..12
    years.add(year);
    
    // Track monthly summary
    const monthKey = year + '-' + ('0' + month).slice(-2);
    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = {
        quantity: 0,
        revenue: 0,
        customers: new Set(),
        products: new Set()
      };
    }
    monthlyTotals[monthKey].quantity += toNumber(quantity);
    monthlyTotals[monthKey].revenue += toNumber(revenue);
    monthlyTotals[monthKey].customers.add(customer);
    monthlyTotals[monthKey].products.add(product);
    
    // Track product-level data
    const key = year + '|' + customer + '|' + product;
    if (!totalsByKey[key]) {
      totalsByKey[key] = {
        quantities: Array(12).fill(0),
        revenues: Array(12).fill(0)
      };
    }
    totalsByKey[key].quantities[month - 1] += toNumber(quantity);
    totalsByKey[key].revenues[month - 1] += toNumber(revenue);
  }

  // Choose the latest year present in the data for the CSV-like view
  const latestYear = Array.from(years).sort().pop();
  
  const view = getOrCreateSheet(ss, MONTHLY_VIEW_SHEET_NAME);
  view.clear();
  
  // BUILD TOP SECTION: MONTHLY REPORT SUMMARY
  let currentRow = 1;
  
  // Title row
  view.getRange(currentRow, 1).setValue('MONTHLY REPORT SUMMARY - ' + latestYear);
  view.getRange(currentRow, 1, 1, 14).mergeAcross();
  view.getRange(currentRow, 1).setFontWeight('bold').setFontSize(14).setBackground('#4285f4').setFontColor('#ffffff');
  currentRow++;
  
  // Empty row for spacing
  currentRow++;
  
  // Monthly summary headers
  const summaryHeaders = ['Month', 'Total Quantity', 'Total Revenue', 'Unique Customers', 'Unique Products'];
  view.getRange(currentRow, 1, 1, summaryHeaders.length).setValues([summaryHeaders]);
  view.getRange(currentRow, 1, 1, summaryHeaders.length).setFontWeight('bold').setBackground('#e8f0fe');
  currentRow++;
  
  // Monthly summary data rows
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let m = 1; m <= 12; m++) {
    const monthKey = latestYear + '-' + ('0' + m).slice(-2);
    const data = monthlyTotals[monthKey] || { quantity: 0, revenue: 0, customers: new Set(), products: new Set() };
    view.getRange(currentRow, 1, 1, 5).setValues([[
      monthNames[m - 1] + ' ' + latestYear,
      data.quantity,
      data.revenue,
      data.customers.size,
      data.products.size
    ]]);
    // Format revenue as currency
    view.getRange(currentRow, 3).setNumberFormat('$#,##0.00');
    currentRow++;
  }
  
  // Add total row
  let totalQty = 0, totalRev = 0;
  const allCustomers = new Set(), allProducts = new Set();
  Object.keys(monthlyTotals).forEach(mk => {
    if (mk.startsWith(String(latestYear))) {
      const data = monthlyTotals[mk];
      totalQty += data.quantity;
      totalRev += data.revenue;
      data.customers.forEach(c => allCustomers.add(c));
      data.products.forEach(p => allProducts.add(p));
    }
  });
  view.getRange(currentRow, 1, 1, 5).setValues([['TOTAL', totalQty, totalRev, allCustomers.size, allProducts.size]]);
  view.getRange(currentRow, 1, 1, 5).setFontWeight('bold').setBackground('#fce8b2');
  view.getRange(currentRow, 3).setNumberFormat('$#,##0.00');
  currentRow++;
  
  // Empty rows for spacing
  currentRow += 2;
  
  // BUILD BOTTOM SECTION: DETAILED PRODUCT DATA
  view.getRange(currentRow, 1).setValue('DETAILED PRODUCT DATA BY MONTH - ' + latestYear);
  view.getRange(currentRow, 1, 1, 14).mergeAcross();
  view.getRange(currentRow, 1).setFontWeight('bold').setFontSize(12).setBackground('#34a853').setFontColor('#ffffff');
  currentRow++;
  
  // Empty row
  currentRow++;
  
  // Product data headers
  const dataHeaderRow = ['Customer', 'Product', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  view.getRange(currentRow, 1, 1, dataHeaderRow.length).setValues([dataHeaderRow]);
  view.getRange(currentRow, 1, 1, dataHeaderRow.length).setFontWeight('bold').setBackground('#e8f0fe');
  view.setFrozenRows(currentRow); // Freeze up to and including the data header row
  currentRow++;
  
  // Product data rows
  const productRows = [];
  Object.keys(totalsByKey)
    .filter(k => String(k).startsWith(String(latestYear) + '|'))
    .sort()
    .forEach(k => {
      const parts = k.split('|');
      const customer = parts[1];
      const product = parts[2];
      const monthlyQtys = totalsByKey[k].quantities;
      productRows.push([customer, product, ...monthlyQtys]);
    });
  
  if (productRows.length > 0) {
    view.getRange(currentRow, 1, productRows.length, 14).setValues(productRows);
  }
  
  // Auto-resize columns for better readability
  for (let col = 1; col <= 14; col++) {
    view.autoResizeColumn(col);
  }
}
```

3) Deploy the script
- Click Deploy → New deployment → Web app.
- Description: "SalesTracker Receiver".
- Execute as: Me. Who has access: Anyone.
- Click Deploy and copy the Web app URL.

4) Configure environment variables
- In Netlify (Site settings → Build & deploy → Environment):
  - `REACT_APP_GS_WEBAPP_URL` = the Web app URL you copied.
  - `REACT_APP_GS_TOKEN` = the same token string you set in the script.
- For local dev, you can create a `.env` file in the project root:
  - `REACT_APP_GS_WEBAPP_URL=https://script.google.com/macros/s/.../exec`
  - `REACT_APP_GS_TOKEN=your-secret-token`
  - Restart `npm start` to pick up changes.

5) How it works
- When you upload a CSV in the app (or process Alpine TXT), the app sends rows shaped like:
  - `[Date, Customer, Product, Quantity, Revenue, InvoiceId, Source, UploadedAt]`
- The script appends them to `AllData` and then rebuilds `Monthly_CSV_View` with two sections:
  
  **Top Section - Monthly Report Summary:**
  - A summary table showing for each month:
    - Total Quantity
    - Total Revenue (formatted as currency)
    - Number of Unique Customers
    - Number of Unique Products
  - Includes a TOTAL row at the bottom
  - Color-coded with professional formatting
  
  **Bottom Section - Detailed Product Data:**
  - Columns: `Customer, Product, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec`
  - Values: summed Quantity per month for the latest year present in the data
  - Each customer/product combination gets its own row
  
- Every new upload appends to `AllData` and updates the monthly view automatically.

6) Customization (optional)
- To build by a specific year instead of the latest: change how `latestYear` is computed in `rebuildMonthlyView`.
- To show revenue instead of quantity in the product data section: change `monthlyQtys` to use `totalsByKey[k].revenues`.
- If you want multiple views (e.g., per year), create additional tabs like `Monthly_2024`, `Monthly_2025` inside `rebuildMonthlyView`.
- To adjust colors/formatting: modify the `setBackground()` and `setFontColor()` calls.

Troubleshooting
- If nothing appears: confirm the token matches, the deployment is a Web app, and the URL is correct.
- If uploads are blocked by CORS: the app uses a simple `no-cors` POST, which the script accepts; no extra headers are required.
- If numbers look wrong: ensure Quantity and Revenue columns in `AllData` are numeric; the script coerces them where possible.
- If the monthly summary looks incomplete: ensure your data has proper dates in YYYY-MM-DD format.
