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

function doGet() {
  return ContentService.createTextOutput("UP");
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    if (!body || body.token !== TOKEN)
      return ContentService.createTextOutput("Unauthorized");
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
    const isKeHe = (r) =>
      String(r[6] || "")
        .toLowerCase()
        .includes("kehe");
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

    const alpineRows = normalized.filter(isAlpine);
    const petesRows = normalized.filter(isPetes);
    const keheRows = normalized.filter(isKeHe);
    const vistarRows = normalized.filter(isVistar);
    const tonysRows = normalized.filter(isTonys);
    const troiaRows = normalized.filter(isTroia);
    const mhdRows = normalized.filter(isMhd);

    const addedAlpine = mergeAndRebuild(alpineSheet, alpineRows);
    const addedPetes = mergeAndRebuild(petesSheet, petesRows);
    const addedKeHe = mergeAndRebuild(keheSheet, keheRows);
    const addedVistar = mergeAndRebuild(vistarSheet, vistarRows);
    const addedTonys = mergeAndRebuild(tonysSheet, tonysRows);
    const addedTroia = mergeAndRebuild(troiaSheet, troiaRows);
    const addedMhd = mergeAndRebuild(mhdSheet, mhdRows);

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
      addedAlpine,
      addedPetes,
      addedKeHe,
      addedVistar,
      addedTonys,
      addedTroia,
      addedMhd,
      "doPost",
    ]);

    return ContentService.createTextOutput(
      `OK: Alpine +${addedAlpine}, Pete's Coffee +${addedPetes}, KeHe +${addedKeHe}, Vistar +${addedVistar}, Tony's +${addedTonys}, Troia +${addedTroia}, MHD +${addedMhd}, skipped ${
        normalized.length -
        addedAlpine -
        addedPetes -
        addedKeHe -
        addedVistar -
        addedTonys -
        addedTroia -
        addedMhd
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
        "AddedAlpine",
        "AddedPetes",
        "AddedKeHe",
        "AddedVistar",
        "AddedTonys",
        "AddedTroia",
        "AddedMhd",
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
        "Error: " + err,
      ]);
    } catch (_ignore) {}
    return ContentService.createTextOutput("Error: " + err);
  }
}

function mergeAndRebuild(sheet, newRows) {
  if (!newRows || newRows.length === 0) {
    // If no new data, just rebuild from existing raw data
    const existingData = getRawData(sheet);
    rebuildMonthlyViewFor(sheet, existingData);
    return 0;
  }

  // Get existing raw data
  const existingData = getRawData(sheet);
  
  // Merge strategy: Replace data for the same date/customer/product combination
  const dataMap = new Map();
  
  // Add existing data to map
  existingData.forEach(row => {
    const key = row[0] + '|' + row[1] + '|' + row[2]; // date|customer|product
    dataMap.set(key, row);
  });
  
  // Add/replace with new data
  let addedCount = 0;
  newRows.forEach(row => {
    const key = row[0] + '|' + row[1] + '|' + row[2];
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
  rebuildMonthlyViewFor(sheet, mergedData);
  
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
  ];

  // Build monthly summary data
  const monthlyTotals = {}; // key = YYYY-MM
  const customersByMonth = {}; // key = YYYY-MM, value = Set of customers
  const years = new Set();

  // Build map: key = year|customer|product
  const totalsByKey = {};
  const customerData = {}; // key = year|customer

  for (let i = 0; i < values.length; i++) {
    const [dateStr, customer, product, quantity, revenue] = values[i];
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

    // Track product-level data by customer
    const key = year + "|" + customer + "|" + product;
    if (!totalsByKey[key]) {
      totalsByKey[key] = {
        quantities: Array(12).fill(0),
        revenues: Array(12).fill(0),
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
  const detailSectionStart = currentRow;
  
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

  // Create collapsible group for the detail section
  if (currentRow > detailContentStart) {
    sheet.getRowGroup(detailContentStart, currentRow - 1, true).collapse();
  }

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

  // Column headers
  const pivotHeaders = [
    "Customer / Product",
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

  // Group data by customer and detect sub-vendors
  // Sub-vendors are detected by patterns like "Customer - Location" or "Customer: Location"
  const customerHierarchy = {}; // main customer -> sub-vendors

  Object.keys(totalsByKey)
    .filter((k) => String(k).startsWith(String(latestYear) + "|"))
    .forEach((k) => {
      const parts = k.split("|");
      const fullCustomerName = parts[1];
      const product = parts[2];

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
          quantities: totalsByKey[k].quantities,
          revenues: totalsByKey[k].revenues,
        });
      } else {
        // Direct product under main customer
        customerHierarchy[mainCustomer].directProducts.push({
          fullName: fullCustomerName,
          product: product,
          quantities: totalsByKey[k].quantities,
          revenues: totalsByKey[k].revenues,
        });
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

  sortedMainCustomers.forEach((mainCustomer) => {
    const hierarchy = customerHierarchy[mainCustomer];
    const customerColor = customerColors[colorIndex % customerColors.length];
    colorIndex++;

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

    // Main customer row (bold, colored) - Cases
    const mainRow = ["▼ " + mainCustomer + " (Cases)", ...mainCustomerTotals, mainTotal];
    sheet.getRange(currentRow, 1, 1, 14).setValues([mainRow]);
    sheet
      .getRange(currentRow, 1, 1, 14)
      .setBackground(customerColor)
      .setFontWeight("bold")
      .setFontSize(12);
    sheet.getRange(currentRow, 1).setFontColor("#000000");
    const customerHeaderRow = currentRow;
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

        // Sub-vendor row (indented once, semi-bold) - Cases
        const subVendorRow = [
          "  → " + subVendor + " (Cases)",
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

    // Create collapsible group for this customer's details
    if (currentRow > customerDetailStart) {
      sheet.getRowGroup(customerDetailStart, currentRow - 1, true).collapse();
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
  const quantity = toNumber(r[3]);
  const revenue = toNumber(r[4]);
  const invoiceId = String(r[5] || "").trim();
  const source = String(r[6] || "").trim();
  const uploadedAt = String(r[7] || new Date().toISOString());
  return [
    date,
    customer,
    product,
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
