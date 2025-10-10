# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

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

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

## Google Sheets integration (append on upload + quarterly CSV view)

You can push every upload into a Google Sheet and automatically maintain a quarterly CSV-style tab that mirrors your quarterly file. The app already sends rows when you upload (both CSV and Alpine TXT) if you set two environment variables:

- `REACT_APP_GS_WEBAPP_URL`
- `REACT_APP_GS_TOKEN`

Follow these steps to set up the Google Apps Script receiver and the two tabs:

1) Create a Google Sheet
- Create a new spreadsheet (e.g., "SalesTracker Data").
- Leave tabs empty; the script will create/update `AllData` and `Quarterly_CSV_View`.

2) Add the Apps Script
- In the Sheet, go to Extensions → Apps Script.
- Delete any default code and paste the script below.
- Replace `TOKEN_VALUE` with a long random string. Keep it secret.

```javascript
// Apps Script for receiving upload rows and building a quarterly CSV-like view

const TOKEN = 'TOKEN_VALUE'; // set this to the same value as REACT_APP_GS_TOKEN
const RAW_SHEET_NAME = 'AllData';
const QUARTER_VIEW_SHEET_NAME = 'Quarterly_CSV_View';

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

    // Rebuild quarterly view for the latest year present in the data
    rebuildQuarterlyView(ss);
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

function rebuildQuarterlyView(ss) {
  const raw = getOrCreateSheet(ss, RAW_SHEET_NAME);
  const lastRow = raw.getLastRow();
  if (lastRow < 2) {
    // No data
    const view = getOrCreateSheet(ss, QUARTER_VIEW_SHEET_NAME);
    view.clear();
    view.getRange(1, 1, 1, 6).setValues([[
      'Customer', 'Product', 'Q1', 'Q2', 'Q3', 'Q4'
    ]]);
    view.setFrozenRows(1);
    return;
  }

  const values = raw.getRange(2, 1, lastRow - 1, 8).getValues();
  // Build map: key = year|customer|product, vals = q1..q4 quantities
  const totalsByKey = {};
  const years = new Set();

  for (let i = 0; i < values.length; i++) {
    const [dateStr, customer, product, quantity] = [values[i][0], values[i][1], values[i][2], values[i][3]];
    if (!dateStr || !customer || !product) continue;
    const d = new Date(dateStr);
    if (isNaN(d)) continue;
    const year = d.getFullYear();
    years.add(year);
    const month = d.getMonth() + 1; // 1..12
    const q = Math.ceil(month / 3); // 1..4
    const key = year + '|' + customer + '|' + product;
    if (!totalsByKey[key]) totalsByKey[key] = [0, 0, 0, 0];
    totalsByKey[key][q - 1] += toNumber(quantity);
  }

  // Choose the latest year present in the data for the CSV-like view
  const latestYear = Array.from(years).sort().pop();

  const rows = [['Customer', 'Product', 'Q1', 'Q2', 'Q3', 'Q4']];
  Object.keys(totalsByKey)
    .filter(k => String(k).startsWith(String(latestYear) + '|'))
    .sort()
    .forEach(k => {
      const parts = k.split('|');
      const customer = parts[1];
      const product = parts[2];
      const qs = totalsByKey[k];
      rows.push([customer, product, qs[0], qs[1], qs[2], qs[3]]);
    });

  const view = getOrCreateSheet(ss, QUARTER_VIEW_SHEET_NAME);
  view.clear();
  view.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  view.setFrozenRows(1);
  view.getRange(1, 7).setValue('Year: ' + latestYear); // Optional note
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
- The script appends them to `AllData` and then rebuilds `Quarterly_CSV_View` to match the quarterly CSV format:
  - Columns: `Customer, Product, Q1, Q2, Q3, Q4`
  - Values: summed Quantity per quarter for the latest year present in the data.
- Every new upload appends and updates the quarterly view automatically.

6) Customization (optional)
- To build by a specific year instead of the latest: change how `latestYear` is computed.
- To include revenue columns, adapt `rebuildQuarterlyView` to accumulate revenue separately and add columns.
- If you want multiple views (e.g., per year), create additional tabs like `Quarterly_2024`, `Quarterly_2025` inside `rebuildQuarterlyView`.

Troubleshooting
- If nothing appears: confirm the token matches, the deployment is a Web app, and the URL is correct.
- If uploads are blocked by CORS: the app uses a simple `no-cors` POST, which the script accepts; no extra headers are required.
- If numbers look wrong: ensure Quantity and Revenue columns in `AllData` are numeric; the script coerces them where possible.
