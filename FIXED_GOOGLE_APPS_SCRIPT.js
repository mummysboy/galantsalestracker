const TOKEN = "asrdfgasertfawdsatfqwrasdf";
const SPREADSHEET_ID = "17lLApxgIRcSasKIKlvc1Nqw8oYdsIheXbZbsM0kRRag";

const ALPINE_SHEET_NAME = "Alpine";
const PETES_SHEET_NAME = "Pete's Coffee";
const KEHE_SHEET_NAME = "KeHe";
const VISTAR_SHEET_NAME = "Vistar";
const TONYS_SHEET_NAME = "Tony's Fine Foods";
const TROIA_SHEET_NAME = "Troia Foods";
const MHD_SHEET_NAME = "Mike Hudson";
const LOGS_SHEET_NAME = "Logs";
const CUSTOMER_SHEETS_PREFIX = "Customer_";

// Main entry points
function doGet() {
  return ContentService.createTextOutput("Sales Tracker Google Apps Script - UP");
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    if (!body || body.token !== TOKEN) {
      return ContentService.createTextOutput("Unauthorized");
    }
    
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return ContentService.createTextOutput("No rows");
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logs = getOrCreateSheet(ss, LOGS_SHEET_NAME);
    
    // Ensure logs header
    ensureHeader(logs, [
      "Timestamp", "TotalRows", "AlpineRows", "PetesRows", "KeHeRows", 
      "VistarRows", "TonysRows", "TroiaRows", "MhdRows", "AddedAlpine", 
      "AddedPetes", "AddedKeHe", "AddedVistar", "AddedTonys", "AddedTroia", 
      "AddedMhd", "CustomerSheets", "Note"
    ]);

    const normalized = rows.map(normalizeRow);
    
    // Detect vendor based on source field (handles both old and new data structures)
    const vendorRows = {
      alpine: normalized.filter(r => {
        const source = String(r[7] || "").toLowerCase();
        return source.includes("alpine");
      }),
      petes: normalized.filter(r => {
        const source = String(r[7] || "").toLowerCase();
        return source.includes("pete");
      }),
      kehe: normalized.filter(r => {
        const source = String(r[7] || "").toLowerCase();
        return source.includes("kehe");
      }),
      vistar: normalized.filter(r => {
        const source = String(r[7] || "").toLowerCase();
        return source.includes("vistar");
      }),
      tonys: normalized.filter(r => {
        const source = String(r[7] || "").toLowerCase();
        return source.includes("tony");
      }),
      troia: normalized.filter(r => {
        const source = String(r[7] || "").toLowerCase();
        return source.includes("troia");
      }),
      mhd: normalized.filter(r => {
        const source = String(r[7] || "").toLowerCase();
        return source.includes("mhd") || source.includes("mike hudson");
      })
    };

    // Process each vendor
    const results = {};
    const sheetNames = {
      alpine: ALPINE_SHEET_NAME,
      petes: PETES_SHEET_NAME,
      kehe: KEHE_SHEET_NAME,
      vistar: VISTAR_SHEET_NAME,
      tonys: TONYS_SHEET_NAME,
      troia: TROIA_SHEET_NAME,
      mhd: MHD_SHEET_NAME
    };

    for (const [vendor, rows] of Object.entries(vendorRows)) {
      if (rows.length > 0) {
        const sheet = getOrCreateSheet(ss, sheetNames[vendor]);
        results[vendor] = processVendorUpload(sheet, rows);
      } else {
        results[vendor] = 0;
      }
    }

    // Note: Customer breakdowns are now included in vendor sheets instead of separate sheets

    // Log the results
    logs.appendRow([
      new Date().toISOString(),
      normalized.length,
      vendorRows.alpine.length,
      vendorRows.petes.length,
      vendorRows.kehe.length,
      vendorRows.vistar.length,
      vendorRows.tonys.length,
      vendorRows.troia.length,
      vendorRows.mhd.length,
      results.alpine || 0,
      results.petes || 0,
      results.kehe || 0,
      results.vistar || 0,
      results.tonys || 0,
      results.troia || 0,
      results.mhd || 0,
      "Customer breakdowns added to vendor sheets"
    ]);

    const totalAdded = Object.values(results).reduce((sum, count) => sum + count, 0);
    const skipped = normalized.length - totalAdded;

    return ContentService.createTextOutput(
      `OK: Alpine +${results.alpine || 0}, Pete's Coffee +${results.petes || 0}, ` +
      `KeHe +${results.kehe || 0}, Vistar +${results.vistar || 0}, ` +
      `Tony's +${results.tonys || 0}, Troia +${results.troia || 0}, ` +
      `MHD +${results.mhd || 0}, ` +
      `skipped ${skipped}`
    );

  } catch (err) {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const logs = getOrCreateSheet(ss, LOGS_SHEET_NAME);
      ensureHeader(logs, [
        "Timestamp", "TotalRows", "AlpineRows", "PetesRows", "KeHeRows", 
        "VistarRows", "TonysRows", "TroiaRows", "MhdRows", "AddedAlpine", 
        "AddedPetes", "AddedKeHe", "AddedVistar", "AddedTonys", "AddedTroia", 
        "AddedMhd", "CustomerSheets", "Note"
      ]);
      logs.appendRow([
        new Date().toISOString(), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        "Error: " + err.toString()
      ]);
    } catch (_ignore) {}
    return ContentService.createTextOutput("Error: " + err.toString());
  }
}

// Main processing function - handles month-based clearing and replacement
function processVendorUpload(sheet, newRows) {
  if (!newRows || newRows.length === 0) {
    return 0;
  }

  // Detect which months are in the new upload
  const monthsInUpload = new Set();
  newRows.forEach(row => {
    const dateStr = row[0]; // date is in first column
    if (dateStr) {
      const date = new Date(dateStr);
      if (!isNaN(date)) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        monthsInUpload.add(`${year}-${month.toString().padStart(2, '0')}`);
      }
    }
  });

  console.log(`Detected months in upload: ${Array.from(monthsInUpload).join(', ')}`);

  // Get existing data
  const existingData = getRawData(sheet);
  
  // Remove existing data for the months being uploaded
  const filteredExistingData = existingData.filter(row => {
    const dateStr = row[0];
    if (!dateStr) return true;
    
    const date = new Date(dateStr);
    if (isNaN(date)) return true;
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    
    return !monthsInUpload.has(monthKey);
  });

  console.log(`Removed ${existingData.length - filteredExistingData.length} existing rows for months: ${Array.from(monthsInUpload).join(', ')}`);

  // Combine filtered existing data with new data
  const mergedData = [...filteredExistingData, ...newRows];
  
  // Store the merged data
  storeRawData(sheet, mergedData);
  
  // Rebuild the monthly view
  rebuildMonthlyViewFor(sheet, mergedData);
  
  return newRows.length;
}

// Note: Customer sheet functions removed - customer breakdowns are now included in vendor sheets

// Data storage functions
function getRawData(sheet) {
  const props = PropertiesService.getScriptProperties();
  const key = 'raw_' + sheet.getName();
  const stored = props.getProperty(key);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.log(`Error parsing stored data for ${sheet.getName()}: ${e}`);
    return [];
  }
}

function storeRawData(sheet, data) {
  const props = PropertiesService.getScriptProperties();
  const key = 'raw_' + sheet.getName();
  
  try {
    // Store all data without time limits
    props.setProperty(key, JSON.stringify(data));
    console.log(`Stored ${data.length} rows for ${sheet.getName()}`);
  } catch (e) {
    console.log(`Error storing data for ${sheet.getName()}: ${e}`);
    // If still too large, try storing only recent data (last 3 years)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    
    const recentData = data.filter(row => {
      const dateStr = row[0];
      if (!dateStr) return true;
      const date = new Date(dateStr);
      return !isNaN(date) && date >= threeYearsAgo;
    });
    
    try {
      props.setProperty(key, JSON.stringify(recentData));
      console.log(`Stored ${recentData.length} recent rows for ${sheet.getName()} (3-year limit applied)`);
    } catch (e2) {
      console.log(`Failed to store even recent data for ${sheet.getName()}: ${e2}`);
    }
  }
}

// Deletion functions
function clearMonthData(vendor, year, month) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = getSheetNameForVendor(vendor);
  if (!sheetName) {
    console.log(`Unknown vendor: ${vendor}`);
    return;
  }
  
  const sheet = getOrCreateSheet(ss, sheetName);
  const existingData = getRawData(sheet);
  
  const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
  const filteredData = existingData.filter(row => {
    const dateStr = row[0];
    if (!dateStr) return true;
    
    const date = new Date(dateStr);
    if (isNaN(date)) return true;
    
    const rowYear = date.getFullYear();
    const rowMonth = date.getMonth() + 1;
    const rowMonthKey = `${rowYear}-${rowMonth.toString().padStart(2, '0')}`;
    
    return rowMonthKey !== monthKey;
  });
  
  const removedCount = existingData.length - filteredData.length;
  storeRawData(sheet, filteredData);
  rebuildMonthlyViewFor(sheet, filteredData);
  
  console.log(`Cleared ${removedCount} rows for ${vendor} ${monthKey}`);
  return removedCount;
}

function clearVendorData(vendor) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = getSheetNameForVendor(vendor);
  if (!sheetName) {
    console.log(`Unknown vendor: ${vendor}`);
    return;
  }
  
  const sheet = getOrCreateSheet(ss, sheetName);
  const existingData = getRawData(sheet);
  
  storeRawData(sheet, []);
  rebuildMonthlyViewFor(sheet, []);
  
  console.log(`Cleared all ${existingData.length} rows for ${vendor}`);
  return existingData.length;
}

function clearAllData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const vendors = [ALPINE_SHEET_NAME, PETES_SHEET_NAME, KEHE_SHEET_NAME, 
                   VISTAR_SHEET_NAME, TONYS_SHEET_NAME, TROIA_SHEET_NAME, MHD_SHEET_NAME];
  
  let totalCleared = 0;
  vendors.forEach(vendorName => {
    const sheet = getOrCreateSheet(ss, vendorName);
    const existingData = getRawData(sheet);
    totalCleared += existingData.length;
    
    storeRawData(sheet, []);
    rebuildMonthlyViewFor(sheet, []);
  });
  
  console.log(`Cleared all data: ${totalCleared} total rows across all vendors`);
  return totalCleared;
}

function viewUploadedData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const vendors = [
    { name: "Alpine", sheet: ALPINE_SHEET_NAME },
    { name: "Pete's Coffee", sheet: PETES_SHEET_NAME },
    { name: "KeHe", sheet: KEHE_SHEET_NAME },
    { name: "Vistar", sheet: VISTAR_SHEET_NAME },
    { name: "Tony's Fine Foods", sheet: TONYS_SHEET_NAME },
    { name: "Troia Foods", sheet: TROIA_SHEET_NAME },
    { name: "Mike Hudson", sheet: MHD_SHEET_NAME }
  ];
  
  console.log("=== UPLOADED DATA SUMMARY ===");
  
  vendors.forEach(vendor => {
    const sheet = getOrCreateSheet(ss, vendor.sheet);
    const data = getRawData(sheet);
    
    if (data.length === 0) {
      console.log(`${vendor.name}: No data uploaded`);
      return;
    }
    
    // Group by month
    const months = {};
    data.forEach(row => {
      const dateStr = row[0];
      if (!dateStr) return;
      
      const date = new Date(dateStr);
      if (isNaN(date)) return;
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!months[monthKey]) {
        months[monthKey] = 0;
      }
      months[monthKey]++;
    });
    
    console.log(`${vendor.name}: ${data.length} total rows`);
    Object.keys(months).sort().forEach(month => {
      console.log(`  ${month}: ${months[month]} rows`);
    });
  });
  
  return "Check logs for detailed summary";
}

// Helper functions
function getSheetNameForVendor(vendor) {
  const vendorMap = {
    "alpine": ALPINE_SHEET_NAME,
    "pete's coffee": PETES_SHEET_NAME,
    "kehe": KEHE_SHEET_NAME,
    "vistar": VISTAR_SHEET_NAME,
    "tony's fine foods": TONYS_SHEET_NAME,
    "troia foods": TROIA_SHEET_NAME,
    "mike hudson": MHD_SHEET_NAME
  };
  
  const normalizedVendor = vendor.toLowerCase().trim();
  return vendorMap[normalizedVendor] || null;
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
  const date = toYmd(r[0]);
  const customer = String(r[1] || "").trim();
  const product = String(r[2] || "").trim();
  const productCode = String(r[3] || "").trim(); // Vendor code
  const quantity = toNumber(r[4]);
  const invoiceId = String(r[6] || "").trim();
  const source = String(r[7] || "").trim();
  const uploadedAt = String(r[8] || new Date().toISOString());
  
  // Handle both old and new data structures
  // Old: [date, customer, product, productCode, quantity, revenue, invoiceId, source, uploadedAt]
  // New: [date, customer, product, productCode, ourItemCode, quantity, invoiceId, source, uploadedAt]
  let ourItemCode = "";
  if (r.length >= 10) {
    // New structure with ourItemCode
    ourItemCode = String(r[4] || "").trim();
    // Adjust other indices
    const adjustedQuantity = toNumber(r[5]);
    const adjustedInvoiceId = String(r[7] || "").trim();
    const adjustedSource = String(r[8] || "").trim();
    const adjustedUploadedAt = String(r[9] || new Date().toISOString());
    
    return [
      date, customer, product, productCode, ourItemCode, adjustedQuantity, 
      adjustedInvoiceId, adjustedSource, adjustedUploadedAt
    ];
  } else {
    // Old structure without ourItemCode
    return [
      date, customer, product, productCode, ourItemCode, quantity, 
      invoiceId, source, uploadedAt
    ];
  }
}

function toYmd(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  const y = d.getFullYear();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return y + "-" + m + "-" + day;
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(/[$,\\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

// Monthly view rebuilding function (keeping your existing complex logic)
function rebuildMonthlyViewFor(sheet, dataRows) {
  // Clear the sheet and start fresh
  sheet.clear();

  // If no data, create empty structure
  if (!dataRows || dataRows.length === 0) {
    sheet
      .getRange(1, 1, 1, 14)
      .setValues([
        [
          "Customer",
          "Product",
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
      ]);
    sheet.setFrozenRows(1);
    return;
  }

  const values = dataRows;
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  // Build monthly summary data
  const monthlyTotals = {}; // key = YYYY-MM
  const customersByMonth = {}; // key = YYYY-MM, value = Set of customers
  const years = new Set();

  // Build map: key = year|customer|product
  const totalsByKey = {};
  const customerData = {}; // key = year|customer

  for (let i = 0; i < values.length; i++) {
    const [dateStr, customer, product, productCode, ourItemCode, quantity] = values[i];
    if (!dateStr || !customer || !product) continue;
    const d = new Date(dateStr);
    if (isNaN(d)) continue;
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1..12
    years.add(year);

    const monthKey = year + "-" + ("0" + month).slice(-2);

    // Track monthly totals
    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = { quantity: 0 };
    }
    monthlyTotals[monthKey].quantity += toNumber(quantity);

    // Track customers by month
    if (!customersByMonth[monthKey]) {
      customersByMonth[monthKey] = new Set();
    }
    customersByMonth[monthKey].add(customer);

    // Track product-level data by customer (include product code)
    const key = year + "|" + customer + "|" + product + "|" + productCode;
    if (!totalsByKey[key]) {
      totalsByKey[key] = {
        quantities: Array(12).fill(0),
        productCode: productCode || '',
      };
    }
    totalsByKey[key].quantities[month - 1] += toNumber(quantity);

    // Track customer-level totals
    const custKey = year + "|" + customer;
    if (!customerData[custKey]) {
      customerData[custKey] = {
        quantities: Array(12).fill(0),
        products: new Set(),
      };
    }
    customerData[custKey].quantities[month - 1] += toNumber(quantity);
    customerData[custKey].products.add(product);
  }

  const latestYear = Array.from(years).sort().pop();

  // Calculate new and lost customers for each month (including sub-vendors as separate entities)
  const newCustomers = Array(12).fill(0);
  const lostCustomers = Array(12).fill(0);
  const newCustomerNames = {}; // month index -> array of customer names
  const lostCustomerNames = {}; // month index -> array of customer names

  for (let m = 1; m <= 12; m++) {
    const currentMonthKey = latestYear + "-" + ("0" + m).slice(-2);
    const currentCustomers = customersByMonth[currentMonthKey] || new Set();

    newCustomerNames[m - 1] = [];
    lostCustomerNames[m - 1] = [];

    // Check if there's any prior data (in any previous month)
    const hasPriorData = (() => {
      for (let pm = 1; pm < m; pm++) {
        const prevKey = latestYear + "-" + ("0" + pm).slice(-2);
        if (customersByMonth[prevKey] && customersByMonth[prevKey].size > 0) {
          return true;
        }
      }
      return false;
    })();

    // Check if there's any subsequent data (in any future month)
    const hasSubsequentData = (() => {
      for (let fm = m + 1; fm <= 12; fm++) {
        const futureKey = latestYear + "-" + ("0" + fm).slice(-2);
        if (customersByMonth[futureKey] && customersByMonth[futureKey].size > 0) {
          return true;
        }
      }
      return false;
    })();

    // New customers: in current month but not in any previous month of the year
    // BUT only if there's prior data to compare against
    if (hasPriorData) {
      const previousCustomers = new Set();
      for (let pm = 1; pm < m; pm++) {
        const prevKey = latestYear + "-" + ("0" + pm).slice(-2);
        const prevCusts = customersByMonth[prevKey] || new Set();
        prevCusts.forEach((c) => previousCustomers.add(c));
      }
      currentCustomers.forEach((c) => {
        if (!previousCustomers.has(c)) {
          newCustomers[m - 1]++;
          newCustomerNames[m - 1].push(c);
        }
      });
    }

    // Lost customers: in previous month but not in current month
    // BUT only if there's subsequent data to compare against
    if (m > 1 && hasSubsequentData) {
      const prevMonthKey = latestYear + "-" + ("0" + (m - 1)).slice(-2);
      const prevMonthCustomers = customersByMonth[prevMonthKey] || new Set();
      prevMonthCustomers.forEach((c) => {
        if (!currentCustomers.has(c)) {
          lostCustomers[m - 1]++;
          lostCustomerNames[m - 1].push(c);
        }
      });
    }
  }

  sheet.clear();

  // BUILD TOP SECTION: KEY METRICS
  let currentRow = 1;

  // Title row
  sheet
    .getRange(currentRow, 1)
    .setValue("MONTHLY SALES OVERVIEW - " + latestYear);
  sheet.getRange(currentRow, 1, 1, 14).mergeAcross();
  sheet
    .getRange(currentRow, 1)
    .setFontWeight("bold")
    .setFontSize(16)
    .setBackground("#1a73e8")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center");
  currentRow++;
  currentRow++; // spacing

  // Metrics headers
  const metricsHeaders = [
    "Metric",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Total",
  ];
  sheet
    .getRange(currentRow, 1, 1, metricsHeaders.length)
    .setValues([metricsHeaders]);
  sheet
    .getRange(currentRow, 1, 1, metricsHeaders.length)
    .setFontWeight("bold")
    .setBackground("#34a853")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center");
  currentRow++;

  // Total cases row
  const totalCasesRow = ["Total Cases"];
  let yearTotalQty = 0;
  for (let m = 1; m <= 12; m++) {
    const monthKey = latestYear + "-" + ("0" + m).slice(-2);
    const qty = (monthlyTotals[monthKey] || {}).quantity || 0;
    totalCasesRow.push(qty);
    yearTotalQty += qty;
  }
  totalCasesRow.push(yearTotalQty);
  sheet.getRange(currentRow, 1, 1, 14).setValues([totalCasesRow]);
  sheet.getRange(currentRow, 1).setBackground("#e8f0fe").setFontWeight("bold");
  sheet.getRange(currentRow, 2, 1, 13).setBackground("#f8f9fa");
  currentRow++;


  // New customers row
  const newCustRow = ["New Customers", ...newCustomers];
  const totalNew = newCustomers.reduce((a, b) => a + b, 0);
  newCustRow.push(totalNew);
  sheet.getRange(currentRow, 1, 1, 14).setValues([newCustRow]);
  sheet.getRange(currentRow, 1).setBackground("#e8f0fe").setFontWeight("bold");
  sheet.getRange(currentRow, 2, 1, 13).setBackground("#d4edda"); // light green
  
  // Add notes/comments to cells with new customer names
  for (let m = 0; m < 12; m++) {
    if (newCustomerNames[m] && newCustomerNames[m].length > 0) {
      const noteText = "New Customers:\n" + newCustomerNames[m].sort().join("\n");
      sheet.getRange(currentRow, m + 2).setNote(noteText);
    }
  }
  if (totalNew > 0) {
    // Add total note
    const allNewCustomers = [];
    for (let m = 0; m < 12; m++) {
      if (newCustomerNames[m]) {
        allNewCustomers.push(...newCustomerNames[m]);
      }
    }
    const uniqueNew = [...new Set(allNewCustomers)].sort();
    sheet.getRange(currentRow, 14).setNote("All New Customers:\n" + uniqueNew.join("\n"));
  }
  currentRow++;

  // Lost customers row
  const lostCustRow = ["Lost Customers", ...lostCustomers];
  const totalLost = lostCustomers.reduce((a, b) => a + b, 0);
  lostCustRow.push(totalLost);
  sheet.getRange(currentRow, 1, 1, 14).setValues([lostCustRow]);
  sheet.getRange(currentRow, 1).setBackground("#e8f0fe").setFontWeight("bold");
  sheet.getRange(currentRow, 2, 1, 13).setBackground("#f8d7da"); // light red
  
  // Add notes/comments to cells with lost customer names
  for (let m = 0; m < 12; m++) {
    if (lostCustomerNames[m] && lostCustomerNames[m].length > 0) {
      const noteText = "Lost Customers:\n" + lostCustomerNames[m].sort().join("\n");
      sheet.getRange(currentRow, m + 2).setNote(noteText);
    }
  }
  if (totalLost > 0) {
    // Add total note
    const allLostCustomers = [];
    for (let m = 0; m < 12; m++) {
      if (lostCustomerNames[m]) {
        allLostCustomers.push(...lostCustomerNames[m]);
      }
    }
    const uniqueLost = [...new Set(allLostCustomers)].sort();
    sheet.getRange(currentRow, 14).setNote("All Lost Customers:\n" + uniqueLost.join("\n"));
  }
  currentRow++;

  currentRow += 2; // spacing

  // BUILD NEW/LOST CUSTOMERS DETAIL SECTION (COLLAPSIBLE)
  
  sheet
    .getRange(currentRow, 1)
    .setValue("▼ NEW & LOST CUSTOMERS DETAIL - " + latestYear + " (Click to expand/collapse)");
  sheet.getRange(currentRow, 1, 1, 14).mergeAcross();
  sheet
    .getRange(currentRow, 1)
    .setFontWeight("bold")
    .setFontSize(14)
    .setBackground("#9c27b0")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center");
  currentRow++;
  
  const detailContentStart = currentRow;

  // New customers detail
  sheet.getRange(currentRow, 1).setValue("NEW CUSTOMERS:");
  sheet
    .getRange(currentRow, 1)
    .setFontWeight("bold")
    .setFontSize(11)
    .setBackground("#c8e6c9")
    .setFontColor("#1b5e20");
  currentRow++;

  let hasNewCustomers = false;
  for (let m = 0; m < 12; m++) {
    if (newCustomerNames[m] && newCustomerNames[m].length > 0) {
      hasNewCustomers = true;
      const customerList = newCustomerNames[m].sort().join(", ");
      sheet.getRange(currentRow, 1).setValue(monthNames[m] + ":");
      sheet
        .getRange(currentRow, 1)
        .setFontWeight("bold")
        .setBackground("#e8f5e9");
      sheet.getRange(currentRow, 2, 1, 13).setValue(customerList);
      sheet
        .getRange(currentRow, 2, 1, 13)
        .mergeAcross()
        .setWrap(true)
        .setBackground("#f1f8e9");
      currentRow++;
    }
  }

  if (!hasNewCustomers) {
    sheet.getRange(currentRow, 1, 1, 14).setValue("No new customers this year");
    sheet
      .getRange(currentRow, 1, 1, 14)
      .mergeAcross()
      .setFontStyle("italic")
      .setFontColor("#757575");
    currentRow++;
  }

  currentRow++; // spacing

  // Lost customers detail
  sheet.getRange(currentRow, 1).setValue("LOST CUSTOMERS:");
  sheet
    .getRange(currentRow, 1)
    .setFontWeight("bold")
    .setFontSize(11)
    .setBackground("#ffcdd2")
    .setFontColor("#b71c1c");
  currentRow++;

  let hasLostCustomers = false;
  for (let m = 0; m < 12; m++) {
    if (lostCustomerNames[m] && lostCustomerNames[m].length > 0) {
      hasLostCustomers = true;
      const customerList = lostCustomerNames[m].sort().join(", ");
      sheet.getRange(currentRow, 1).setValue(monthNames[m] + ":");
      sheet
        .getRange(currentRow, 1)
        .setFontWeight("bold")
        .setBackground("#ffebee");
      sheet.getRange(currentRow, 2, 1, 13).setValue(customerList);
      sheet
        .getRange(currentRow, 2, 1, 13)
        .mergeAcross()
        .setWrap(true)
        .setBackground("#fff5f5");
      currentRow++;
    }
  }

  if (!hasLostCustomers) {
    sheet
      .getRange(currentRow, 1, 1, 14)
      .setValue("No lost customers this year - Great job!");
    sheet
      .getRange(currentRow, 1, 1, 14)
      .mergeAcross()
      .setFontStyle("italic")
      .setFontColor("#2e7d32");
    currentRow++;
  }

  // Add dropdown functionality for new/lost customers section
  if (currentRow > detailContentStart) {
    try {
      sheet.getRowGroup(detailContentStart, currentRow - detailContentStart).collapse();
    } catch (e) {
      // Row grouping not supported, continue without it
      console.log("Row grouping not available:", e.toString());
    }
  }

  currentRow += 2; // spacing

  // BUILD PRODUCT BREAKDOWN BY CUSTOMER SECTION
  sheet
    .getRange(currentRow, 1)
    .setValue("PRODUCT BREAKDOWN BY CUSTOMER - " + latestYear);
  sheet.getRange(currentRow, 1, 1, 15).mergeAcross();
  sheet
    .getRange(currentRow, 1)
    .setFontWeight("bold")
    .setFontSize(14)
    .setBackground("#ff9800")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center");
  currentRow++;
  currentRow++; // spacing

  // Column headers for product breakdown
  const breakdownHeaders = [
    "Customer / Product",
    "Code",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Total",
  ];
  sheet
    .getRange(currentRow, 1, 1, breakdownHeaders.length)
    .setValues([breakdownHeaders]);
  sheet
    .getRange(currentRow, 1, 1, breakdownHeaders.length)
    .setFontWeight("bold")
    .setBackground("#ffc107")
    .setHorizontalAlignment("center");
  currentRow++;

  // Build customer hierarchy for product breakdown
  const customerHierarchy = {}; // main customer -> sub-vendors

  Object.keys(totalsByKey)
    .filter((k) => String(k).startsWith(String(latestYear) + "|"))
    .forEach((k) => {
      const parts = k.split("|");
      const fullCustomerName = parts[1];
      const product = parts[2];
      const productCode = parts[3] || '';  // Extract product code

      // Detect if this is a sub-vendor (contains " - " or ": ")
      let mainCustomer = fullCustomerName;
      let subVendor = null;

      if (fullCustomerName.includes(" - ")) {
        const subParts = fullCustomerName.split(" - ");
        mainCustomer = subParts[0].trim();
        subVendor = subParts.slice(1).join(" - ").trim();
      } else if (fullCustomerName.includes(": ")) {
        const subParts = fullCustomerName.split(": ");
        mainCustomer = subParts[0].trim();
        subVendor = subParts.slice(1).join(": ").trim();
      }

      // Initialize hierarchy
      if (!customerHierarchy[mainCustomer]) {
        customerHierarchy[mainCustomer] = {
          hasSubVendors: false,
          subVendors: {},
          directProducts: [],
        totalQuantity: Array(12).fill(0),
        };
      }

      if (subVendor) {
        // This is a sub-vendor
        customerHierarchy[mainCustomer].hasSubVendors = true;
        if (!customerHierarchy[mainCustomer].subVendors[subVendor]) {
          customerHierarchy[mainCustomer].subVendors[subVendor] = {
            products: [],
        totalQuantity: Array(12).fill(0),
          };
        }
        customerHierarchy[mainCustomer].subVendors[subVendor].products.push({
          fullName: fullCustomerName,
          product: product,
          productCode: productCode,  // Include product code
          quantities: totalsByKey[k].quantities,
        });
        
        // Add to sub-vendor totals
        for (let m = 0; m < 12; m++) {
        customerHierarchy[mainCustomer].subVendors[subVendor].totalQuantity[m] += totalsByKey[k].quantities[m];
        }
      } else {
        // Direct product under main customer
        customerHierarchy[mainCustomer].directProducts.push({
          fullName: fullCustomerName,
          product: product,
          productCode: productCode,  // Include product code
          quantities: totalsByKey[k].quantities,
        });
      }
      
      // Add to main customer totals
      for (let m = 0; m < 12; m++) {
        customerHierarchy[mainCustomer].totalQuantity[m] += totalsByKey[k].quantities[m];
      }
    });

  // Sort main customers alphabetically
  const sortedMainCustomers = Object.keys(customerHierarchy).sort();

  // Alternate row colors for better readability
  const customerColors = [
    "#fff3e0",
    "#e3f2fd",
    "#f3e5f5",
    "#e8f5e9",
    "#fce4ec",
  ];
  let colorIndex = 0;

  // Build product breakdown by customer
  sortedMainCustomers.forEach((mainCustomer) => {
    const hierarchy = customerHierarchy[mainCustomer];
    const customerColor = customerColors[colorIndex % customerColors.length];
    colorIndex++;

    const mainTotal = hierarchy.totalQuantity.reduce((a, b) => a + b, 0);

    // Main customer header row (collapsible) - Cases
    const mainRow = ["▶ " + mainCustomer + " (Cases)", "", ...hierarchy.totalQuantity, mainTotal];
    sheet.getRange(currentRow, 1, 1, 15).setValues([mainRow]);
    sheet
      .getRange(currentRow, 1, 1, 15)
      .setBackground(customerColor)
      .setFontWeight("bold")
      .setFontSize(12);
    sheet.getRange(currentRow, 1).setFontColor("#000000");
    currentRow++;


    // const customerDetailStart = currentRow; // Removed - no longer needed

    if (hierarchy.hasSubVendors) {
      // This customer has sub-vendors - show them with collapsible sections
      const sortedSubVendors = Object.keys(hierarchy.subVendors).sort();

      sortedSubVendors.forEach((subVendor) => {
        const subVendorData = hierarchy.subVendors[subVendor];
        const subTotal = subVendorData.totalQuantity.reduce((a, b) => a + b, 0);

        // Sub-vendor header row (collapsible) - Cases
        const subVendorRow = [
          "  ▶ " + subVendor + " (Cases)",
          "",
          ...subVendorData.totalQuantity,
          subTotal,
        ];
        sheet.getRange(currentRow, 1, 1, 15).setValues([subVendorRow]);
        sheet
          .getRange(currentRow, 1, 1, 15)
          .setBackground("#fafafa")
          .setFontWeight("bold")
          .setFontSize(10);
        sheet.getRange(currentRow, 1).setFontColor("#1565c0");
        currentRow++;


        // const subVendorDetailStart = currentRow; // Removed - no longer needed

        // Products under this sub-vendor (indented twice)
        const products = subVendorData.products.sort((a, b) =>
          a.product.localeCompare(b.product)
        );
        products.forEach((prod) => {
          // Quantity row
          const prodTotal = prod.quantities.reduce((a, b) => a + b, 0);
          const prodRow = [
            "      • " + prod.product + " (Cases)",
            prod.productCode || '', // Add product code column
            ...prod.quantities,
            prodTotal,
          ];
          sheet.getRange(currentRow, 1, 1, 15).setValues([prodRow]);
          sheet.getRange(currentRow, 1, 1, 15).setBackground("#ffffff");
          sheet
            .getRange(currentRow, 1)
            .setFontColor("#424242")
            .setFontStyle("italic");

          // Highlight cells with values > 0
          for (let col = 3; col <= 14; col++) {
            if (prod.quantities[col - 3] > 0) {
              sheet.getRange(currentRow, col).setBackground("#e8f5e9"); // light green
            }
          }
          currentRow++;

        });

        // Note: Row grouping removed due to API compatibility issues
      });
    } else {
      // No sub-vendors, show direct products
      const products = hierarchy.directProducts.sort((a, b) =>
        a.product.localeCompare(b.product)
      );
      products.forEach((prod) => {
        // Quantity row
        const prodTotal = prod.quantities.reduce((a, b) => a + b, 0);
        const prodRow = [
          "  • " + prod.product + " (Cases)",
          prod.productCode || '', // Add product code column
          ...prod.quantities,
          prodTotal,
        ];
        sheet.getRange(currentRow, 1, 1, 15).setValues([prodRow]);
        sheet.getRange(currentRow, 1, 1, 15).setBackground("#ffffff");
        sheet
          .getRange(currentRow, 1)
          .setFontColor("#424242")
          .setFontStyle("italic");

        // Highlight cells with values > 0
        for (let col = 3; col <= 14; col++) {
          if (prod.quantities[col - 3] > 0) {
            sheet.getRange(currentRow, col).setBackground("#e8f5e9"); // light green
          }
        }
        currentRow++;


      });
    }

    // Note: Row grouping removed due to API compatibility issues

    // Blank row between main customers
    currentRow++;
  });

  // Note: The detailed product breakdown is now handled in the "PRODUCT BREAKDOWN BY CUSTOMER" section above

  // Add customer breakdown section
  addCustomerBreakdownSection(sheet, dataRows, latestYear, currentRow);

  // Auto-resize columns
  for (let col = 1; col <= 15; col++) {
    sheet.autoResizeColumn(col);
  }

  // Set column widths for better appearance
  sheet.setColumnWidth(1, 250); // Customer/Product column wider
  sheet.setColumnWidth(2, 80);  // Product code column
}

// Add customer breakdown section to vendor sheets
function addCustomerBreakdownSection(sheet, dataRows, year, startRow) {
  if (!dataRows || dataRows.length === 0) return;

  let currentRow = startRow;
  currentRow += 2; // spacing

  // BUILD CUSTOMER BREAKDOWN SECTION (matching product breakdown format)
  sheet
    .getRange(currentRow, 1)
    .setValue("CUSTOMER BREAKDOWN BY CASE - " + year);
  sheet.getRange(currentRow, 1, 1, 15).mergeAcross();
  sheet
    .getRange(currentRow, 1)
    .setFontWeight("bold")
    .setFontSize(14)
    .setBackground("#ff9800")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center");
  currentRow++;
  currentRow++; // spacing

  // Column headers (matching product breakdown format)
  const customerHeaders = [
    "Customer / Product",
    "Vendor Code",
    "Our Item#",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Total",
  ];
  sheet
    .getRange(currentRow, 1, 1, customerHeaders.length)
    .setValues([customerHeaders]);
  sheet
    .getRange(currentRow, 1, 1, customerHeaders.length)
    .setFontWeight("bold")
    .setBackground("#ffc107")
    .setHorizontalAlignment("center");
  currentRow++;

  // Build customer-level data with product details
  const customerTotals = {}; // key = customer
  const years = new Set();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    // Handle normalized data structure: [date, customer, product, productCode, ourItemCode, quantity, invoiceId, source, uploadedAt]
    const dateStr = row[0];
    const customer = row[1];
    const product = row[2];
    const productCode = row[3];
    const ourItemCode = row[4] || '';
    const quantity = row[5]; // This is now the correct quantity position
    
    if (!dateStr || !customer) continue;
    const d = new Date(dateStr);
    if (isNaN(d)) continue;
    const rowYear = d.getFullYear();
    const month = d.getMonth() + 1; // 1..12
    years.add(rowYear);

    if (!customerTotals[customer]) {
      customerTotals[customer] = {
        quantities: Array(12).fill(0),
        products: new Map(), // product -> {vendorCode, ourItemCode}
      };
    }
    customerTotals[customer].quantities[month - 1] += toNumber(quantity);
    customerTotals[customer].products.set(product, {
      vendorCode: productCode || '',
      ourItemCode: ourItemCode || ''
    });
  }

  // Sort customers alphabetically
  const sortedCustomers = Object.keys(customerTotals).sort();

  // Alternate row colors for better readability
  const customerColors = [
    "#fff3e0",
    "#e3f2fd",
    "#f3e5f5",
    "#e8f5e9",
    "#fce4ec",
  ];
  let colorIndex = 0;

  // Build customer rows (matching product breakdown format)
  sortedCustomers.forEach(customerName => {
    const customer = customerTotals[customerName];
    const customerColor = customerColors[colorIndex % customerColors.length];
    colorIndex++;

    const mainTotal = customer.quantities.reduce((a, b) => a + b, 0);

    // Main customer header row (Cases) - with dropdown functionality
    const mainRow = ["▶ " + customerName + " (Cases)", "", "", ...customer.quantities, mainTotal];
    sheet.getRange(currentRow, 1, 1, 16).setValues([mainRow]);
    sheet
      .getRange(currentRow, 1, 1, 16)
      .setBackground(customerColor)
      .setFontWeight("bold")
      .setFontSize(12);
    sheet.getRange(currentRow, 1).setFontColor("#000000");
    
    // Add dropdown functionality
    const customerDetailStart = currentRow + 1;
    currentRow++;

    // Main customer revenue row removed - only showing case counts

    // Products under this customer (indented)
    const products = Array.from(customer.products.keys()).sort();
    products.forEach(product => {
      // Get product data for this customer/product combination
      const productQuantities = Array(12).fill(0);
      
      // Sum up quantities for this specific product
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowCustomer = row[1];
        const rowProduct = row[2];
        const quantity = row[5]; // Correct position for normalized data
        
        if (rowCustomer === customerName && rowProduct === product) {
          const d = new Date(row[0]);
          if (!isNaN(d)) {
            const month = d.getMonth();
            productQuantities[month] += toNumber(quantity);
          }
        }
      }

      // Quantity row
      const prodTotal = productQuantities.reduce((a, b) => a + b, 0);
      const productCodes = customer.products.get(product);
      const prodRow = [
        "  • " + product + " (Cases)",
        productCodes.vendorCode || '', // Vendor code
        productCodes.ourItemCode || '', // Our item#
        ...productQuantities,
        prodTotal,
      ];
      sheet.getRange(currentRow, 1, 1, 16).setValues([prodRow]);
      sheet.getRange(currentRow, 1, 1, 16).setBackground("#ffffff");
      sheet
        .getRange(currentRow, 1)
        .setFontColor("#424242")
        .setFontStyle("italic");

      // Highlight cells with values > 0
      for (let col = 4; col <= 15; col++) {
        if (productQuantities[col - 4] > 0) {
          sheet.getRange(currentRow, col).setBackground("#e8f5e9"); // light green
        }
      }
      currentRow++;

      // Revenue row removed - only showing case counts
    });

    // Add dropdown functionality for this customer's products
    if (currentRow > customerDetailStart) {
      try {
        sheet.getRowGroup(customerDetailStart, currentRow - customerDetailStart).collapse();
      } catch (e) {
        // Row grouping not supported, continue without it
        console.log("Row grouping not available:", e.toString());
      }
    }

    // Blank row between main customers
    currentRow++;
  });
}

// Debug function to check vendor detection
function debugVendorDetection() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const alpineSheet = ss.getSheetByName(ALPINE_SHEET_NAME);
  
  if (!alpineSheet) {
    return "Alpine sheet not found";
  }
  
  const data = getRawData(alpineSheet);
  console.log(`Found ${data.length} rows in Alpine sheet`);
  
  if (data.length > 0) {
    console.log("Sample row:", data[0]);
    console.log("Row length:", data[0].length);
    console.log("Source field (index 7):", data[0][7]);
    console.log("Source field (index 8):", data[0][8]);
  }
  
  // Test vendor detection with sample data
  const testData = data.slice(0, 5);
  const normalized = testData.map(normalizeRow);
  
  console.log("Normalized sample:", normalized[0]);
  console.log("Normalized length:", normalized[0].length);
  
  // Test vendor detection
  const vendorRows = {
    alpine: normalized.filter(r => {
      const source = String(r[8] || r[7] || "").toLowerCase();
      console.log("Checking source:", source);
      return source.includes("alpine");
    })
  };
  
  console.log(`Alpine rows found: ${vendorRows.alpine.length}`);
  
  return `Debug complete. Found ${data.length} rows, ${vendorRows.alpine.length} Alpine rows`;
}

// Debug function to test data processing
function debugDataProcessing() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const logs = getOrCreateSheet(ss, LOGS_SHEET_NAME);
  
  // Test with sample data
  const testData = [
    ["2025-01-01", "Test Customer", "Test Product", "TEST123", "OUR123", 10, "INV001", "alpine", "2025-01-01T00:00:00Z"],
    ["2025-01-01", "Test Customer 2", "Test Product 2", "TEST456", 5, "INV002", "kehe", "2025-01-01T00:00:00Z"]
  ];
  
  logs.appendRow([
    new Date().toISOString(),
    "DEBUG TEST",
    "Testing data processing with sample data",
    testData.length + " rows",
    "Debug test completed"
  ]);
  
  return "Debug test completed - check logs sheet";
}

// Test function to manually add customer breakdown to existing sheets
function testCustomerBreakdown() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const alpineSheet = ss.getSheetByName(ALPINE_SHEET_NAME);
  
  if (!alpineSheet) {
    return "Alpine sheet not found";
  }
  
  const data = getRawData(alpineSheet);
  console.log(`Found ${data.length} rows in Alpine sheet`);
  
  if (data.length > 0) {
    console.log("Sample row:", data[0]);
    console.log("Row length:", data[0].length);
  }
  
  // Manually add customer breakdown
  addCustomerBreakdownSection(alpineSheet, data, 2025, 1000); // Start at row 1000
  
  return `Added customer breakdown to Alpine sheet with ${data.length} rows`;
}

// Debug function to check data structure and month assignment
function debugDataStructure() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const alpineSheet = ss.getSheetByName(ALPINE_SHEET_NAME);
  
  if (!alpineSheet) {
    return "Alpine sheet not found";
  }
  
  const data = getRawData(alpineSheet);
  console.log(`Found ${data.length} rows in Alpine sheet`);
  
  if (data.length > 0) {
    console.log("Sample raw row:", data[0]);
    console.log("Raw row length:", data[0].length);
    
    const normalized = data.map(normalizeRow);
    console.log("Sample normalized row:", normalized[0]);
    console.log("Normalized row length:", normalized[0].length);
    
    // Check month distribution
    const monthCounts = {};
    normalized.forEach(row => {
      const dateStr = row[0];
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d)) {
          const month = d.getMonth() + 1;
          monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
      }
    });
    
    console.log("Month distribution:", monthCounts);
    
    // Check quantity values
    const quantities = normalized.map(row => row[5]).filter(q => q > 0);
    console.log("Sample quantities:", quantities.slice(0, 10));
    console.log("Total non-zero quantities:", quantities.length);
  }
  
  return "Debug complete - check console logs";
}

// Note: rebuildCustomerView function removed - customer breakdowns are now included in vendor sheets
