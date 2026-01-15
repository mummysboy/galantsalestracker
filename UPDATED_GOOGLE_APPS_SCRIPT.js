const TOKEN = "asrdfgasertfawdsatfqwrasdf";
const SPREADSHEET_ID = "17lLApxgIRcSasKIKlvc1Nqw8oYdsIheXbZbsM0kRRag";

const ALPINE_SHEET_NAME = "Alpine";
const PETES_SHEET_NAME = "Pete's Coffee";
const KEHE_SHEET_NAME = "KeHe";
const VISTAR_SHEET_NAME = "Vistar";
const TONYS_SHEET_NAME = "Tony's Fine Foods";
const TROIA_SHEET_NAME = "Troia Foods";
const MHD_SHEET_NAME = "Mike Hudson";
const DOT_SHEET_NAME = "DOT Foods";
const SPROUTS_SHEET_NAME = "Sprouts";
const LOGS_SHEET_NAME = "Logs";

function doGet() {
  return ContentService.createTextOutput("UP");
}


function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    if (!body || body.token !== TOKEN)
      return ContentService.createTextOutput("Unauthorized");
    
    // Handle DELETE action
    if (body.action === "delete") {
      return handleDeleteRequest(body);
    }
    
    // Handle normal ADD/MERGE action (existing logic)
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) return ContentService.createTextOutput("No rows");

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const alpineSheet = getOrCreateSheet(ss, ALPINE_SHEET_NAME);
    const petesSheet = getOrCreateSheet(ss, PETES_SHEET_NAME);
    const keheSheet = getOrCreateSheet(ss, KEHE_SHEET_NAME);
    const vistarSheet = getOrCreateSheet(ss, VISTAR_SHEET_NAME);
    const tonysSheet = getOrCreateSheet(ss, TONYS_SHEET_NAME);
    const troiaSheet = getOrCreateSheet(ss, TROIA_SHEET_NAME);
    const mhdSheet = getOrCreateSheet(ss, MHD_SHEET_NAME);
    const dotSheet = getOrCreateSheet(ss, DOT_SHEET_NAME);
    const sproutsSheet = getOrCreateSheet(ss, SPROUTS_SHEET_NAME);
    const logs = getOrCreateSheet(ss, LOGS_SHEET_NAME);

    // Headers are set dynamically in rebuildMonthlyViewFor function
    // No need for static raw data headers since we only create monthly views
    ensureHeader(logs, [
      "Timestamp",
      "TotalRows",
      "AlpineRows",
      "PetesRows",
      "KeHeRows",
      "VistarRows",
      "TonysRows",
      "TroiaRows",
      "MhdRows",
      "AddedAlpine",
      "AddedPetes",
      "AddedKeHe",
      "AddedVistar",
      "AddedTonys",
      "AddedTroia",
      "AddedMhd",
      "AddedDot",
      "AddedSprouts",
      "Note",
    ]);

    const normalized = rows.map(normalizeRow);
    const isAlpine = (r) =>
      String(r[6] || "")
        .toLowerCase()
        .includes("alpine");
    const isPetes = (r) =>
      String(r[6] || "")
        .toLowerCase()
        .includes("pete");
    const isKeHe = (r) => {
      const source = String(r[6] || "").toLowerCase();
      const customer = String(r[1] || "").toLowerCase();
      // Check if it's KeHe but NOT Sprouts (Sprouts will be filtered separately)
      return source.includes("kehe") && !customer.includes("sprouts");
    };
    const isVistar = (r) =>
      String(r[6] || "")
        .toLowerCase()
        .includes("vistar");
    const isTonys = (r) =>
      String(r[6] || "")
        .toLowerCase()
        .includes("tony");
    const isTroia = (r) =>
      String(r[6] || "")
        .toLowerCase()
        .includes("troia");
    const isMhd = (r) =>
      String(r[6] || "")
        .toLowerCase()
        .includes("mhd") ||
      String(r[6] || "")
        .toLowerCase()
        .includes("mike hudson");
    const isDot = (r) => {
      const source = String(r[7] || "").toLowerCase(); // Source is in column 7
      const invoiceId = String(r[6] || "").toLowerCase(); // Also check invoiceId column 6
      return source.includes("dot") || invoiceId.includes("dot");
    };
    const isSprouts = (r) => {
      const source = String(r[6] || "").toLowerCase();
      const customer = String(r[1] || "").toLowerCase();
      return source.includes("kehe") && customer.includes("sprouts");
    };

    const alpineRows = normalized.filter(isAlpine);
    const petesRows = normalized.filter(isPetes);
    const keheRows = normalized.filter(isKeHe);
    const vistarRows = normalized.filter(isVistar);
    const tonysRows = normalized.filter(isTonys);
    const troiaRows = normalized.filter(isTroia);
    const mhdRows = normalized.filter(isMhd);
    const dotRows = normalized.filter(isDot);
    const sproutsRows = normalized.filter(isSprouts);

    const addedAlpine = mergeAndRebuild(alpineSheet, alpineRows);
    const addedPetes = mergeAndRebuild(petesSheet, petesRows);
    const addedKeHe = mergeAndRebuild(keheSheet, keheRows);
    const addedVistar = mergeAndRebuild(vistarSheet, vistarRows);
    const addedTonys = mergeAndRebuild(tonysSheet, tonysRows, true); // Pass true to enable Tony's special handling
    const addedTroia = mergeAndRebuild(troiaSheet, troiaRows);
    const addedMhd = mergeAndRebuild(mhdSheet, mhdRows);
    const addedDot = mergeAndRebuild(dotSheet, dotRows);
    const addedSprouts = mergeAndRebuild(sproutsSheet, sproutsRows, false, true); // Pass true for KeHe-style DC filtering

    logs.appendRow([
      new Date().toISOString(),
      normalized.length,
      alpineRows.length,
      petesRows.length,
      keheRows.length,
      vistarRows.length,
      tonysRows.length,
      troiaRows.length,
      mhdRows.length,
      dotRows.length,
      sproutsRows.length,
      addedAlpine,
      addedPetes,
      addedKeHe,
      addedVistar,
      addedTonys,
      addedTroia,
      addedMhd,
      addedDot,
      addedSprouts,
      "doPost",
    ]);

    return ContentService.createTextOutput(
      `OK: Alpine +${addedAlpine}, Pete's Coffee +${addedPetes}, KeHe +${addedKeHe}, Vistar +${addedVistar}, Tony's +${addedTonys}, Troia +${addedTroia}, MHD +${addedMhd}, DOT +${addedDot}, Sprouts +${addedSprouts}, skipped ${
        normalized.length -
        addedAlpine -
        addedPetes -
        addedKeHe -
        addedVistar -
        addedTonys -
        addedTroia -
        addedMhd -
        addedDot -
        addedSprouts
      }`
    );
  } catch (err) {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const logs = getOrCreateSheet(ss, LOGS_SHEET_NAME);
      ensureHeader(logs, [
        "Timestamp",
        "TotalRows",
        "AlpineRows",
        "PetesRows",
        "KeHeRows",
        "VistarRows",
        "TonysRows",
        "TroiaRows",
        "MhdRows",
        "DotRows",
        "SproutsRows",
        "AddedAlpine",
        "AddedPetes",
        "AddedKeHe",
        "AddedVistar",
        "AddedTonys",
        "AddedTroia",
        "AddedMhd",
        "AddedDot",
        "AddedSprouts",
        "Note",
      ]);
      logs.appendRow([
        new Date().toISOString(),
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        "Error: " + err,
      ]);
    } catch (_ignore) {}
    return ContentService.createTextOutput("Error: " + err);
  }
}

function handleDeleteRequest(body) {
  try {
    const distributor = String(body.distributor || "").toUpperCase();
    const period = String(body.period || "").trim();
    
    if (!distributor || !period) {
      return ContentService.createTextOutput("Invalid: distributor and period required");
    }
    
    // Map distributor to sheet name
    const distributorToSheet = {
      'ALPINE': ALPINE_SHEET_NAME,
      'PETES': PETES_SHEET_NAME,
      'KEHE': KEHE_SHEET_NAME,
      'VISTAR': VISTAR_SHEET_NAME,
      'TONYS': TONYS_SHEET_NAME,
      'TROIA': TROIA_SHEET_NAME,
      'MHD': MHD_SHEET_NAME,
      'DOT': DOT_SHEET_NAME,
      'SPROUTS': SPROUTS_SHEET_NAME
    };
    
    const sheetName = distributorToSheet[distributor];
    if (!sheetName) {
      return ContentService.createTextOutput("Error: Invalid distributor");
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getOrCreateSheet(ss, sheetName);
    const logs = getOrCreateSheet(ss, LOGS_SHEET_NAME);
    
    // Get existing raw data
    const existingData = getRawData(sheet);
    
    // Filter out records for the specified period
    const deletedCount = existingData.filter(row => {
      const dateStr = row[0]; // date is first column
      return dateStr.startsWith(period);
    }).length;
    
    const filteredData = existingData.filter(row => {
      const dateStr = row[0];
      return !dateStr.startsWith(period);
    });
    
    // Store updated raw data
    storeRawData(sheet, filteredData);
    
    // Rebuild the view with remaining data
    rebuildMonthlyViewFor(sheet, filteredData);
    
    // Log the deletion
      ensureHeader(logs, [
        "Timestamp",
        "TotalRows",
        "AlpineRows",
        "PetesRows",
        "KeHeRows",
        "VistarRows",
        "TonysRows",
        "TroiaRows",
        "MhdRows",
        "DotRows",
        "SproutsRows",
        "AddedAlpine",
        "AddedPetes",
        "AddedKeHe",
        "AddedVistar",
        "AddedTonys",
        "AddedTroia",
        "AddedMhd",
        "AddedDot",
        "AddedSprouts",
        "Note",
      ]);
      logs.appendRow([
        new Date().toISOString(),
        filteredData.length,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        `DELETE: ${distributor} / ${period} (removed ${deletedCount} rows)`,
      ]);
    
    return ContentService.createTextOutput(
      `OK: Deleted ${deletedCount} rows for ${distributor} / ${period}`
    );
  } catch (err) {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const logs = getOrCreateSheet(ss, LOGS_SHEET_NAME);
      logs.appendRow([
        new Date().toISOString(),
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        "Error in delete: " + err,
      ]);
    } catch (_ignore) {}
    return ContentService.createTextOutput("Error: " + err);
  }
}

function mergeAndRebuild(sheet, newRows, isTonysFormat, useDCFiltering) {
  if (!newRows || newRows.length === 0) {
    // If no new data, just rebuild from existing raw data
    const existingData = getRawData(sheet);
    rebuildMonthlyViewFor(sheet, existingData, isTonysFormat, useDCFiltering);
    return 0;
  }

  // Get existing raw data
  const existingData = getRawData(sheet);
  
  // Merge strategy: Replace data for the same date/customer/product combination
  const dataMap = new Map();
  
  // Add existing data to map
  existingData.forEach(row => {
    const key = row[0] + '|' + row[1] + '|' + row[2] + '|' + row[3]; // date|customer|product|productCode
    dataMap.set(key, row);
  });
  
  // Add/replace with new data
  let addedCount = 0;
  newRows.forEach(row => {
    const key = row[0] + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (!dataMap.has(key)) {
      addedCount++;
    }
    dataMap.set(key, row);
  });
  
  // Convert back to array
  const mergedData = Array.from(dataMap.values());
  
  // Store the raw data
  storeRawData(sheet, mergedData);
  
  // Rebuild the view
  rebuildMonthlyViewFor(sheet, mergedData, isTonysFormat, useDCFiltering);
  
  return addedCount;
}

function getRawData(sheet) {
  const props = PropertiesService.getScriptProperties();
  const key = 'raw_' + sheet.getName();
  const stored = props.getProperty(key);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

function storeRawData(sheet, data) {
  const props = PropertiesService.getScriptProperties();
  const key = 'raw_' + sheet.getName();
  // Script properties have a 9KB limit per property, so we need to handle large datasets
  // For very large data, we'll store only recent data (last 2 years)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  const filteredData = data.filter(row => {
    const d = new Date(row[0]);
    return d >= twoYearsAgo;
  });
  
  try {
    props.setProperty(key, JSON.stringify(filteredData));
  } catch (e) {
    // If still too large, truncate to most recent year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearData = data.filter(row => {
      const d = new Date(row[0]);
      return d >= oneYearAgo;
    });
    props.setProperty(key, JSON.stringify(oneYearData));
  }
}

function rebuildMonthlyViewFor(sheet, dataRows, isTonysFormat, useDCFiltering) {
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

  // Build monthly summary data
  const monthlyTotals = {}; // key = YYYY-MM
  const customersByMonth = {}; // key = YYYY-MM, value = Set of customers
  const years = new Set();

  // Build map: key = year|customer|product
  const totalsByKey = {};
  const customerData = {}; // key = year|customer

  for (let i = 0; i < values.length; i++) {
    const [dateStr, customer, product, productCode, quantity, revenue] = values[i];
    if (!dateStr || !customer || !product) continue;
    const d = new Date(dateStr);
    if (isNaN(d)) continue;
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1..12
    years.add(year);

    const monthKey = year + "-" + ("0" + month).slice(-2);

    // Track monthly totals
    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = { quantity: 0, revenue: 0 };
    }
    monthlyTotals[monthKey].quantity += toNumber(quantity);
    monthlyTotals[monthKey].revenue += toNumber(revenue);

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
        revenues: Array(12).fill(0),
        productCode: productCode || '',
      };
    }
    totalsByKey[key].quantities[month - 1] += toNumber(quantity);
    totalsByKey[key].revenues[month - 1] += toNumber(revenue);

    // Track customer-level totals
    const custKey = year + "|" + customer;
    if (!customerData[custKey]) {
      customerData[custKey] = {
        quantities: Array(12).fill(0),
        revenues: Array(12).fill(0),
        products: new Set(),
      };
    }
    customerData[custKey].quantities[month - 1] += toNumber(quantity);
    customerData[custKey].revenues[month - 1] += toNumber(revenue);
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

  // Total revenue row
  const totalRevenueRow = ["Total Revenue"];
  let yearTotalRev = 0;
  for (let m = 1; m <= 12; m++) {
    const monthKey = latestYear + "-" + ("0" + m).slice(-2);
    const rev = (monthlyTotals[monthKey] || {}).revenue || 0;
    totalRevenueRow.push("$" + rev.toFixed(2));
    yearTotalRev += rev;
  }
  totalRevenueRow.push("$" + yearTotalRev.toFixed(2));
  sheet.getRange(currentRow, 1, 1, 14).setValues([totalRevenueRow]);
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
      const formattedNames = formatCustomerNamesWithVendorContext(newCustomerNames[m]);
      const noteText = "New Customers:\n" + formattedNames;
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
    const uniqueNew = [...new Set(allNewCustomers)];
    const formattedNames = formatCustomerNamesWithVendorContext(uniqueNew);
    sheet.getRange(currentRow, 14).setNote("All New Customers:\n" + formattedNames);
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
      const formattedNames = formatCustomerNamesWithVendorContext(lostCustomerNames[m]);
      const noteText = "Lost Customers:\n" + formattedNames;
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
    const uniqueLost = [...new Set(allLostCustomers)];
    const formattedNames = formatCustomerNamesWithVendorContext(uniqueLost);
    sheet.getRange(currentRow, 14).setNote("All Lost Customers:\n" + formattedNames);
  }
  currentRow++;

  currentRow += 2; // spacing

  // BUILD PIVOT TABLE SECTION: CUSTOMERS AND PRODUCTS
  sheet
    .getRange(currentRow, 1)
    .setValue("SALES BY CUSTOMER & PRODUCT - " + latestYear);
  sheet.getRange(currentRow, 1, 1, 14).mergeAcross();
  sheet
    .getRange(currentRow, 1)
    .setFontWeight("bold")
    .setFontSize(14)
    .setBackground("#ea4335")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center");
  currentRow++;
  currentRow++; // spacing

  // Column headers (add Code column)
  const pivotHeaders = [
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
    .getRange(currentRow, 1, 1, pivotHeaders.length)
    .setValues([pivotHeaders]);
  sheet
    .getRange(currentRow, 1, 1, pivotHeaders.length)
    .setFontWeight("bold")
    .setBackground("#fbbc04")
    .setHorizontalAlignment("center");
  currentRow++;

  // Set row group control position to show +/- buttons in left margin
  try {
    sheet.setRowGroupControlPosition(SpreadsheetApp.GroupControlPosition.BEFORE);
  } catch (e) {
    // Control position setting may fail on some sheet types, continue
  }

  // Group data by customer and detect sub-vendors
  // For Tony's: Create separate sections for North, Reed, and Moreno
  // For KeHe/Sprouts with DC filtering: Group by DC/Warehouse instead of Sub District
  const customerHierarchy = {}; // main customer -> sub-vendors
  const tonysSections = {}; // For Tony's: "North", "Reed", "Moreno" -> customers

  Object.keys(totalsByKey)
    .filter((k) => String(k).startsWith(String(latestYear) + "|"))
    .forEach((k) => {
      const parts = k.split("|");
      let fullCustomerName = parts[1];
      const product = parts[2];
      const productCode = parts[3] || '';  // Extract product code
      
      // Special handling for Tony's: Detect North, Reed, Moreno sections
      if (isTonysFormat) {
        let sectionName = null;
        let displayCustomerName = fullCustomerName;
        
        // Check if customer name starts with "TONY'S FINE FOODS - "
        if (fullCustomerName.toUpperCase().includes("TONY'S FINE FOODS")) {
          const upperName = fullCustomerName.toUpperCase();
          if (upperName.includes(" - REED")) {
            sectionName = "REED";
            // Extract customer name after "TONY'S FINE FOODS - REED - " or similar
            const parts = fullCustomerName.split(/TONY'S FINE FOODS\s*-\s*REED\s*-?/i);
            displayCustomerName = parts.length > 1 ? parts[1].trim() : fullCustomerName.replace(/TONY'S FINE FOODS\s*-\s*REED\s*-?/i, '').trim();
          } else if (upperName.includes(" - NORTH")) {
            sectionName = "NORTH";
            const parts = fullCustomerName.split(/TONY'S FINE FOODS\s*-\s*NORTH\s*-?/i);
            displayCustomerName = parts.length > 1 ? parts[1].trim() : fullCustomerName.replace(/TONY'S FINE FOODS\s*-\s*NORTH\s*-?/i, '').trim();
          } else if (upperName.includes("MORENO")) {
            // For MORENO, keep "TONY'S FINE FOODS MORENO" as the section name if present
            sectionName = "TONY'S FINE FOODS MORENO";
            // Extract customer name after "TONY'S FINE FOODS MORENO - " or similar
            if (upperName.includes(" - ")) {
              const parts = fullCustomerName.split(/TONY'S FINE FOODS\s*MORENO\s*-?/i);
              displayCustomerName = parts.length > 1 ? parts[1].trim() : fullCustomerName.replace(/TONY'S FINE FOODS\s*MORENO\s*-?/i, '').trim();
            } else {
              // If no sub-customer, this is the main MORENO entry
              displayCustomerName = fullCustomerName;
            }
          }
        }
        
        if (sectionName) {
          // Initialize section if needed
          if (!tonysSections[sectionName]) {
            tonysSections[sectionName] = {};
          }
          
          // Use displayCustomerName (without North/Reed prefix) as the customer
          const mainCustomer = displayCustomerName || "UNKNOWN";
          if (!tonysSections[sectionName][mainCustomer]) {
            tonysSections[sectionName][mainCustomer] = {
              hasSubVendors: false,
              subVendors: {},
              directProducts: [],
            };
          }
          
          // For now, treat as direct product (can be enhanced later if needed)
          tonysSections[sectionName][mainCustomer].directProducts.push({
            fullName: displayCustomerName,
            product: product,
            productCode: productCode,
            quantities: totalsByKey[k].quantities,
            revenues: totalsByKey[k].revenues,
          });
          return; // Skip normal processing for Tony's
        }
      }
      
      // Special handling for DC filtering (KeHe/Sprouts)
      // NOTE: DC/Warehouse filtering requires the DC information from Column AA of the raw CSV
      // Currently, normalized rows don't include DC data. To enable full DC filtering:
      // 1. Update KeHe parser to extract DC/Warehouse (Column AA) and include it in the record
      // 2. Update normalizeRow to preserve DC data (add as column 9 or in customer name)
      // 3. Group by DC/Warehouse instead of Sub District here
      // For now, we'll process using existing sub-vendor hierarchy (which may include some location info)
      if (useDCFiltering) {
        // Future enhancement: Group by DC/Warehouse when available
        // Example: Group "Sprouts - Denver" by DC, then by store
      }

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
        };
      }

      if (subVendor) {
        // This is a sub-vendor
        customerHierarchy[mainCustomer].hasSubVendors = true;
        if (!customerHierarchy[mainCustomer].subVendors[subVendor]) {
          customerHierarchy[mainCustomer].subVendors[subVendor] = [];
        }
        customerHierarchy[mainCustomer].subVendors[subVendor].push({
          fullName: fullCustomerName,
          product: product,
          productCode: productCode,  // Include product code
          quantities: totalsByKey[k].quantities,
          revenues: totalsByKey[k].revenues,
        });
      } else {
        // Direct product under main customer
        customerHierarchy[mainCustomer].directProducts.push({
          fullName: fullCustomerName,
          product: product,
          productCode: productCode,  // Include product code
          quantities: totalsByKey[k].quantities,
          revenues: totalsByKey[k].revenues,
        });
      }
    });

  // For Tony's: Process sections separately
  if (isTonysFormat && Object.keys(tonysSections).length > 0) {
    // Clear customerHierarchy and rebuild from tonysSections
    Object.keys(customerHierarchy).forEach(k => delete customerHierarchy[k]);
    
    // Create hierarchy with sections as main customers
    // Sort sections: NORTH, REED, then MORENO (or any custom order)
    const sectionOrder = ["NORTH", "REED", "TONY'S FINE FOODS MORENO"];
    const sortedSections = Object.keys(tonysSections).sort((a, b) => {
      const aIdx = sectionOrder.indexOf(a);
      const bIdx = sectionOrder.indexOf(b);
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
      if (aIdx >= 0) return -1;
      if (bIdx >= 0) return 1;
      return a.localeCompare(b);
    });
    
    sortedSections.forEach(sectionName => {
      const sectionCustomers = tonysSections[sectionName];
      const sectionDisplayName = "► " + sectionName;
      
      customerHierarchy[sectionDisplayName] = {
        hasSubVendors: true,
        subVendors: {},
        directProducts: [],
      };
      
      Object.keys(sectionCustomers).sort().forEach(customerName => {
        const customerData = sectionCustomers[customerName];
        if (customerData.directProducts.length > 0) {
          customerHierarchy[sectionDisplayName].subVendors[customerName] = customerData.directProducts;
        }
      });
    });
  }

  // Sort main customers alphabetically
  const sortedMainCustomers = Object.keys(customerHierarchy).sort();

  // Store group information to create after all rows are written
  const customerGroupInfo = [];
  const subVendorGroupInfo = [];

  // Alternate row colors for better readability
  const customerColors = [
    "#fff3e0",
    "#e3f2fd",
    "#f3e5f5",
    "#e8f5e9",
    "#fce4ec",
  ];
  let colorIndex = 0;

  sortedMainCustomers.forEach((mainCustomer, customerIndex) => {
    const hierarchy = customerHierarchy[mainCustomer];
    const customerColor = customerColors[colorIndex % customerColors.length];
    colorIndex++;

    // Add date header before first customer
    if (customerIndex === 0) {
      sheet.getRange(currentRow, 1).setValue(latestYear);
      sheet
        .getRange(currentRow, 1)
        .setFontWeight("bold")
        .setFontSize(12)
        .setBackground("#404040")
        .setFontColor("#ffffff");
      currentRow++;
      currentRow++; // spacing
    }

    // Calculate main customer total (sum of all sub-vendors and direct products)
    let mainCustomerTotals = Array(12).fill(0);
    let mainCustomerRevenues = Array(12).fill(0);

    // Add up all sub-vendor quantities and revenues
    Object.keys(hierarchy.subVendors).forEach((subVendor) => {
      hierarchy.subVendors[subVendor].forEach((item) => {
        for (let m = 0; m < 12; m++) {
          mainCustomerTotals[m] += item.quantities[m];
          mainCustomerRevenues[m] += item.revenues[m];
        }
      });
    });

    // Add up direct product quantities and revenues
    hierarchy.directProducts.forEach((item) => {
      for (let m = 0; m < 12; m++) {
        mainCustomerTotals[m] += item.quantities[m];
        mainCustomerRevenues[m] += item.revenues[m];
      }
    });

    const mainTotal = mainCustomerTotals.reduce((a, b) => a + b, 0);
    const mainRevTotal = mainCustomerRevenues.reduce((a, b) => a + b, 0);

    // Store customer section start for native row grouping
    const customerHeaderRow = currentRow;

    // Main customer row (bold, colored) - Cases
    // This row will remain visible when collapsed
    const mainRow = [mainCustomer + " (Cases)", ...mainCustomerTotals, mainTotal];
    sheet.getRange(currentRow, 1, 1, 14).setValues([mainRow]);
    sheet
      .getRange(currentRow, 1, 1, 14)
      .setBackground(customerColor)
      .setFontWeight("bold")
      .setFontSize(12);
    sheet.getRange(currentRow, 1).setFontColor("#000000");
    currentRow++;

    // Main customer revenue row
    const mainRevRow = ["  $ Revenue", ...mainCustomerRevenues.map(r => "$" + r.toFixed(2)), "$" + mainRevTotal.toFixed(2)];
    sheet.getRange(currentRow, 1, 1, 14).setValues([mainRevRow]);
    sheet
      .getRange(currentRow, 1, 1, 14)
      .setBackground(customerColor)
      .setFontWeight("bold")
      .setFontSize(10);
    sheet.getRange(currentRow, 1).setFontColor("#000000");
    currentRow++;

    // Detail rows start here (these will be grouped and collapsed by default)
    const customerDetailStart = currentRow;

    if (hierarchy.hasSubVendors) {
      // This customer has sub-vendors - show them
      const sortedSubVendors = Object.keys(hierarchy.subVendors).sort();

      sortedSubVendors.forEach((subVendor) => {
        // Calculate sub-vendor total
        let subVendorTotals = Array(12).fill(0);
        let subVendorRevenues = Array(12).fill(0);
        hierarchy.subVendors[subVendor].forEach((item) => {
          for (let m = 0; m < 12; m++) {
            subVendorTotals[m] += item.quantities[m];
            subVendorRevenues[m] += item.revenues[m];
          }
        });
        const subTotal = subVendorTotals.reduce((a, b) => a + b, 0);
        const subRevTotal = subVendorRevenues.reduce((a, b) => a + b, 0);

        // Store sub-vendor section start for native row grouping
        const subVendorHeaderRow = currentRow;

        // Sub-vendor row (indented once, semi-bold) - Cases
        // This row will remain visible when the main customer is expanded
        const subVendorRow = [
          "  " + subVendor + " (Cases)",
          ...subVendorTotals,
          subTotal,
        ];
        sheet.getRange(currentRow, 1, 1, 14).setValues([subVendorRow]);
        sheet
          .getRange(currentRow, 1, 1, 14)
          .setBackground("#fafafa")
          .setFontWeight("bold")
          .setFontSize(10);
        sheet.getRange(currentRow, 1).setFontColor("#1565c0");
        currentRow++;

        // Sub-vendor revenue row
        const subRevRow = [
          "    $ Revenue",
          ...subVendorRevenues.map(r => "$" + r.toFixed(2)),
          "$" + subRevTotal.toFixed(2),
        ];
        sheet.getRange(currentRow, 1, 1, 14).setValues([subRevRow]);
        sheet
          .getRange(currentRow, 1, 1, 14)
          .setBackground("#fafafa")
          .setFontWeight("normal")
          .setFontSize(9);
        sheet.getRange(currentRow, 1).setFontColor("#1565c0");
        currentRow++;

        const subVendorDetailStart = currentRow;

        // Products under this sub-vendor (indented twice)
        const products = hierarchy.subVendors[subVendor].sort((a, b) =>
          a.product.localeCompare(b.product)
        );
        products.forEach((prod) => {
          // Quantity row
          const prodTotal = prod.quantities.reduce((a, b) => a + b, 0);
          const prodRow = [
            "      • " + prod.product + " (Cases)",
            ...prod.quantities,
            prodTotal,
          ];
          sheet.getRange(currentRow, 1, 1, 14).setValues([prodRow]);
          sheet.getRange(currentRow, 1, 1, 14).setBackground("#ffffff");
          sheet
            .getRange(currentRow, 1)
            .setFontColor("#424242")
            .setFontStyle("italic");

          // Highlight cells with values > 0
          for (let col = 2; col <= 13; col++) {
            if (prod.quantities[col - 2] > 0) {
              sheet.getRange(currentRow, col).setBackground("#e8f5e9"); // light green
            }
          }
          currentRow++;

          // Revenue row
          const revTotal = prod.revenues.reduce((a, b) => a + b, 0);
          const revRow = [
            "        $ Revenue",
            ...prod.revenues.map(r => "$" + r.toFixed(2)),
            "$" + revTotal.toFixed(2),
          ];
          sheet.getRange(currentRow, 1, 1, 14).setValues([revRow]);
          sheet.getRange(currentRow, 1, 1, 14).setBackground("#f5f5f5");
          sheet
            .getRange(currentRow, 1)
            .setFontColor("#666666")
            .setFontSize(9)
            .setFontStyle("italic");

          // Highlight revenue cells with values > 0
          for (let col = 2; col <= 13; col++) {
            if (prod.revenues[col - 2] > 0) {
              sheet.getRange(currentRow, col).setBackground("#e3f2fd"); // light blue
            }
          }
          currentRow++;
        });

        // Store sub-vendor group info for native row group creation
        if (currentRow > subVendorDetailStart) {
          const numSubVendorDetailRows = currentRow - subVendorDetailStart;
          subVendorGroupInfo.push({
            startRow: subVendorDetailStart,
            numRows: numSubVendorDetailRows,
            headerRow: subVendorHeaderRow,
            subVendorName: subVendor,
            detailStart: subVendorDetailStart,
            detailEnd: currentRow - 1
          });
          // Remove in-cell arrow - native row groups will handle expand/collapse
          const subHeaderCell = sheet.getRange(subVendorHeaderRow, 1);
          subHeaderCell.setValue("  " + subVendor + " (Cases)");
          // Clear any old notes
          subHeaderCell.clearNote();
        } else {
          // No products for this sub-vendor
          sheet.getRange(subVendorHeaderRow, 1).setValue("  " + subVendor + " (Cases)");
        }
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
          "    • " + prod.product + " (Cases)",
          ...prod.quantities,
          prodTotal,
        ];
        sheet.getRange(currentRow, 1, 1, 14).setValues([prodRow]);
        sheet.getRange(currentRow, 1, 1, 14).setBackground("#ffffff");
        sheet
          .getRange(currentRow, 1)
          .setFontColor("#424242")
          .setFontStyle("italic");

        // Highlight cells with values > 0
        for (let col = 2; col <= 13; col++) {
          if (prod.quantities[col - 2] > 0) {
            sheet.getRange(currentRow, col).setBackground("#e8f5e9"); // light green
          }
        }
        currentRow++;

        // Revenue row
        const revTotal = prod.revenues.reduce((a, b) => a + b, 0);
        const revRow = [
          "      $ Revenue",
          ...prod.revenues.map(r => "$" + r.toFixed(2)),
          "$" + revTotal.toFixed(2),
        ];
        sheet.getRange(currentRow, 1, 1, 14).setValues([revRow]);
        sheet.getRange(currentRow, 1, 1, 14).setBackground("#f5f5f5");
        sheet
          .getRange(currentRow, 1)
          .setFontColor("#666666")
          .setFontSize(9)
          .setFontStyle("italic");

        // Highlight revenue cells with values > 0
        for (let col = 2; col <= 13; col++) {
          if (prod.revenues[col - 2] > 0) {
            sheet.getRange(currentRow, col).setBackground("#e3f2fd"); // light blue
          }
        }
        currentRow++;
      });
    }

    // Create native row group for customer details (groups must be created after all rows are written)
    if (currentRow > customerDetailStart) {
      const numDetailRows = currentRow - customerDetailStart;
      customerGroupInfo.push({
        startRow: customerDetailStart,
        numRows: numDetailRows,
        headerRow: customerHeaderRow,
        customerName: mainCustomer,
        detailStart: customerDetailStart,
        detailEnd: currentRow - 1
      });
      // Remove in-cell arrow - native row groups will handle expand/collapse
      const headerCell = sheet.getRange(customerHeaderRow, 1);
      headerCell.setValue(mainCustomer + " (Cases)");
      // Clear any old notes
      headerCell.clearNote();
    } else {
      // No details
      sheet.getRange(customerHeaderRow, 1).setValue(mainCustomer + " (Cases)");
    }

    // Blank row between main customers
    currentRow++;
  });

  // Auto-resize columns
  for (let col = 1; col <= 14; col++) {
    sheet.autoResizeColumn(col);
  }

  // Set column widths for better appearance
  sheet.setColumnWidth(1, 250); // Customer/Product column wider

  // Create native row groups and collapse them by default
  // Native row groups will handle expand/collapse automatically via +/- buttons in left margin

  Logger.log("Creating row groups for " + sheet.getName() + ". Customer groups: " + customerGroupInfo.length + ", Sub-vendor groups: " + subVendorGroupInfo.length);

  // Create customer row groups
  customerGroupInfo.forEach((groupInfo, index) => {
    try {
      if (groupInfo.detailStart && groupInfo.detailEnd && groupInfo.detailEnd >= groupInfo.detailStart) {
        const numRows = groupInfo.detailEnd - groupInfo.detailStart + 1;
        if (numRows > 0) {
          Logger.log("Creating customer group " + index + ": rows " + groupInfo.detailStart + "-" + groupInfo.detailEnd + " (" + numRows + " rows)");
          // Create the row group
          const range = sheet.getRange(groupInfo.detailStart, 1, numRows, sheet.getLastColumn());
          range.shiftRowGroupDepth(1);

          // Collapse the group by default
          try {
            const group = sheet.getRowGroup(groupInfo.detailStart, numRows);
            if (group) {
              group.collapse();
              Logger.log("Collapsed customer group " + index);
            } else {
              Logger.log("Warning: Could not get group object for customer group " + index);
            }
          } catch (collapseErr) {
            Logger.log("Failed to collapse customer group " + index + ": " + collapseErr);
          }
        }
      }
    } catch (e) {
      Logger.log("Failed to create customer group " + index + ": " + e);
    }
  });

  // Create sub-vendor row groups
  subVendorGroupInfo.forEach((groupInfo, index) => {
    try {
      if (groupInfo.detailStart && groupInfo.detailEnd && groupInfo.detailEnd >= groupInfo.detailStart) {
        const numRows = groupInfo.detailEnd - groupInfo.detailStart + 1;
        if (numRows > 0) {
          Logger.log("Creating sub-vendor group " + index + ": rows " + groupInfo.detailStart + "-" + groupInfo.detailEnd + " (" + numRows + " rows)");
          // Create the row group
          const range = sheet.getRange(groupInfo.detailStart, 1, numRows, sheet.getLastColumn());
          range.shiftRowGroupDepth(1);

          // Collapse the group by default
          try {
            const group = sheet.getRowGroup(groupInfo.detailStart, numRows);
            if (group) {
              group.collapse();
              Logger.log("Collapsed sub-vendor group " + index);
            } else {
              Logger.log("Warning: Could not get group object for sub-vendor group " + index);
            }
          } catch (collapseErr) {
            Logger.log("Failed to collapse sub-vendor group " + index + ": " + collapseErr);
          }
        }
      }
    } catch (e) {
      Logger.log("Failed to create sub-vendor group " + index + ": " + e);
    }
  });

  Logger.log("Row group creation completed for " + sheet.getName());
}

// Debug function to check current sheet state
function debugSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log("Sheet not found: " + sheetName);
    return "Sheet not found";
  }

  const lastRow = sheet.getLastRow();
  Logger.log("Sheet: " + sheetName + ", Last row: " + lastRow);

  // Check for row groups
  let groupCount = 0;
  for (let row = 1; row <= lastRow; row++) {
    try {
      const group = sheet.getRowGroup(row, 1);
      if (group) {
        groupCount++;
        Logger.log("Found group at row " + row + ": collapsed=" + group.isCollapsed());
      }
    } catch (e) {
      // No group at this row
    }
  }

  Logger.log("Total row groups found: " + groupCount);

  // Check control position
  try {
    const controlPos = sheet.getRowGroupControlPosition();
    Logger.log("Row group control position: " + controlPos);
  } catch (e) {
    Logger.log("Could not get control position: " + e);
  }

  return "Debug complete - check logs for sheet " + sheetName;
}

// Simple test function to verify row groups work
function testRowGroups() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const testSheet = getOrCreateSheet(ss, "TestRowGroups");

  // Clear and set up test data
  testSheet.clear();
  testSheet.setRowGroupControlPosition(SpreadsheetApp.GroupControlPosition.BEFORE);

  // Write test data
  const testData = [
    ["Main Section 1"],
    ["Detail 1"],
    ["Detail 2"],
    ["Main Section 2"],
    ["Detail 3"],
    ["Detail 4"]
  ];

  testSheet.getRange(1, 1, testData.length, 1).setValues(testData);

  // Create row groups
  try {
    // Group rows 2-3 under row 1
    const range1 = testSheet.getRange(2, 1, 2, 1);
    range1.shiftRowGroupDepth(1);
    const group1 = testSheet.getRowGroup(2, 2);
    if (group1) group1.collapse();

    // Group rows 5-6 under row 4
    const range2 = testSheet.getRange(5, 1, 2, 1);
    range2.shiftRowGroupDepth(1);
    const group2 = testSheet.getRowGroup(5, 2);
    if (group2) group2.collapse();

    Logger.log("Test row groups created successfully");
    return "Test completed - check TestRowGroups sheet";
  } catch (e) {
    Logger.log("Test failed: " + e);
    return "Test failed: " + e;
  }
}

// Helper function to manually create row groups on any sheet
// Usage: Run this function from the script editor with a sheet name
// Example: createRowGroupsForSheet("Tony's Fine Foods")
function createRowGroupsForSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log("Sheet not found: " + sheetName);
    return "Sheet not found";
  }
  
  Logger.log("Starting row group creation for: " + sheetName);
  
  // Set control position
  try {
    sheet.setRowGroupControlPosition(SpreadsheetApp.GroupControlPosition.BEFORE);
    Logger.log("Control position set");
  } catch (e) {
    Logger.log("Could not set control position: " + e);
  }
  
  // Find customer rows (rows with "▼" or "►" in column A that are summary rows)
  const lastRow = sheet.getLastRow();
  let groupsCreated = 0;
  
  for (let row = 12; row <= lastRow; row++) {
    try {
      const cellValue = sheet.getRange(row, 1).getValue();
      if (typeof cellValue === 'string' && (cellValue.includes('▼') || cellValue.includes('►'))) {
        // This might be a customer header row
        // Look for detail rows below it (rows that start with "  →" or "    •")
        let detailStartRow = row + 2; // Skip revenue row
        let detailEndRow = detailStartRow;
        
        // Find where the details end (next customer or blank row)
        for (let checkRow = detailStartRow; checkRow <= Math.min(row + 50, lastRow); checkRow++) {
          const checkValue = sheet.getRange(checkRow, 1).getValue();
          if (!checkValue || checkValue === '') break;
          // Check if it's a detail row (indented)
          if (typeof checkValue === 'string' && (checkValue.startsWith('  ') || checkValue.startsWith('    '))) {
            detailEndRow = checkRow;
          } else if (typeof checkValue === 'string' && (checkValue.includes('▼') || checkValue.includes('►'))) {
            // Found next customer, stop here
            break;
          }
        }
        
        if (detailEndRow >= detailStartRow && detailEndRow < lastRow) {
          const numRows = detailEndRow - detailStartRow + 1;
          try {
            const range = sheet.getRange(detailStartRow, 1, numRows, sheet.getLastColumn());
            range.shiftRowGroupDepth(1);
            groupsCreated++;
            Logger.log(`Created group for row ${row}: rows ${detailStartRow}-${detailEndRow}`);
            
            // Try to collapse
            try {
              const group = sheet.getRowGroup(detailStartRow, numRows);
              if (group) {
                group.collapse();
              }
            } catch (collapseErr) {
              // Continue
            }
          } catch (groupErr) {
            Logger.log(`Failed to create group for row ${row}: ${groupErr}`);
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }
  
  Logger.log(`Created ${groupsCreated} row groups`);
  return `Created ${groupsCreated} row groups`;
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
  const productCode = String(r[3] || "").trim();  // Add product code
  const quantity = toNumber(r[4]);
  const revenue = toNumber(r[5]);
  const invoiceId = String(r[6] || "").trim();
  const source = String(r[7] || "").trim();
  const uploadedAt = String(r[8] || new Date().toISOString());
  return [
    date,
    customer,
    product,
    productCode,
    quantity,
    revenue,
    invoiceId,
    source,
    uploadedAt,
  ];
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

// Format customer names with vendor context for hierarchical data
// Groups customers by distributor/vendor and displays as "Distributor → Customer"
function formatCustomerNamesWithVendorContext(customerNames) {
  if (!customerNames || customerNames.length === 0) {
    return "";
  }
  
  const grouped = {}; // vendor -> [customers]
  const standalone = [];
  
  // Separate hierarchical and standalone customers
  customerNames.forEach(custName => {
    if (custName.includes(" - ")) {
      // Hierarchical: split into vendor and customer
      const parts = custName.split(" - ");
      const mainVendor = parts[0].trim();
      const subCustomer = parts.slice(1).join(" - ").trim();
      if (!grouped[mainVendor]) {
        grouped[mainVendor] = [];
      }
      grouped[mainVendor].push(subCustomer);
    } else {
      // Standalone customer
      standalone.push(custName);
    }
  });
  
  // Build formatted display
  const displayParts = [];
  
  // Add standalone customers first (sorted)
  standalone.sort().forEach(c => {
    displayParts.push(c);
  });
  
  // Add hierarchical customers grouped by vendor
  Object.keys(grouped).sort().forEach(vendor => {
    grouped[vendor].sort().forEach(subCust => {
      displayParts.push(`${vendor} → ${subCust}`);
    });
  });
  
  return displayParts.join("\n");
}
