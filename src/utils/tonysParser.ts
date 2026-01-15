import * as XLSX from 'xlsx';
import { AlpineSalesRecord } from './alpineParser';
import { mapToCanonicalProductName, getItemNumberForProduct, getItemNumberFromDotCode } from './productMapping';
import { loadPricingData, getProductWeight } from './pricingLoader';
import { loadMasterPricingData, MasterPricingProduct } from './masterPricingLoader';

export interface ParsedTonysData {
  records: AlpineSalesRecord[];
  metadata: {
    supplier: string;
    periods: string[];
    customers: string[];
    products: string[];
    totalRevenue: number;
    totalCases: number;
    periodRevenue: Record<string, number>;
  };
}

function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  
  // If it's already a number, return it as-is (Excel might have already converted "(1)" to -1)
  if (typeof value === 'number') {
    return isFinite(value) ? value : 0;
  }
  
  const str = String(value).trim();
  
  // Values in parentheses like "(1)" represent negative numbers in accounting
  // They should subtract from totals (be treated as -1, not 0 or +1)
  // Check for parentheses - handle both "(1)" format and cases with whitespace
  const isParenNegative = /^\s*\([^)]+\)\s*$/.test(str) || str.startsWith('(') && str.endsWith(')');
  
  // Remove parentheses, dollar signs, commas, and whitespace
  const cleaned = str.replace(/[()$,%\s]/g, '');
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) return 0;
  
  // If it was in parentheses, return negative; otherwise return positive
  return isParenNegative ? -num : num;
}

function parsePeriodFromHeader(headerText: string): string {
  // Parse from format like "Quantity shipped\rJul 25 to Jul 25" or "Jul 25 to Jul 25"
  // Extract month and year
  const match = headerText.match(/([A-Za-z]+)\s+(\d{2})/);
  if (match) {
    const monthStr = match[1];
    const yearShort = match[2];
    
    // Convert month name to number
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const month = monthMap[monthStr.substring(0, 3)];
    if (month) {
      // Convert 2-digit year to 4-digit year
      const year = parseInt(yearShort, 10) >= 50 ? `19${yearShort}` : `20${yearShort}`;
      return `${year}-${month}`;
    }
  }
  
  // Fallback to current month
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export async function parseTonysXLSX(file: File): Promise<ParsedTonysData> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Parse all rows
  // Use raw: true to get actual cell values
  // Excel typically stores "(1)" formatted numbers as -1 (negative number with parentheses format)
  // If stored as text, it will come through as string "(1)" which our toNumber function handles
  const rows: [[string], ...any[][]] = XLSX.utils.sheet_to_json(ws, { 
    header: 1, 
    raw: true, // Get actual numeric values (Excel converts "(1)" format to -1)
    defval: null
  }) as [[string], ...any[][]];
  
  // Also get formatted values to check if we need to parse parenthetical strings
  const rowsFormatted: [[string], ...any[][]] = XLSX.utils.sheet_to_json(ws, { 
    header: 1, 
    raw: false, // Get formatted display values
    defval: null
  }) as [[string], ...any[][]];
  
  // Debug: Log first few data rows to see how Excel is reading the values
  if (rows.length > 1 && rowsFormatted.length > 1) {
    console.log('[Tony\'s Parser] Sample row data comparison (first 5 data rows with data in column K):', 
      rows.slice(1, Math.min(6, rows.length))
        .map((row, idx) => {
          const formattedRow = rowsFormatted[idx + 1] || [];
          const rawValue = row[10];
          const formattedValue = formattedRow[10];
          const convertedValue = toNumber(rawValue);
          const convertedFromFormatted = toNumber(formattedValue);
          
          // Only log rows where column K has a value
          if (rawValue != null || formattedValue != null) {
            return {
              rowIndex: idx + 1,
              columnK_raw: rawValue,
              columnK_rawType: typeof rawValue,
              columnK_formatted: formattedValue,
              columnK_formattedType: typeof formattedValue,
              convertedFromRaw: convertedValue,
              convertedFromFormatted: convertedFromFormatted,
              isNegative: convertedValue < 0 || convertedFromFormatted < 0,
              hasParenthesesInFormatted: String(formattedValue || '').includes('(')
            };
          }
          return null;
        })
        .filter(x => x !== null)
    );
  }
  if (!rows || rows.length === 0) {
    return {
      records: [],
      metadata: {
        supplier: 'TONYS',
        periods: [],
        customers: [],
        products: [],
        totalRevenue: 0,
        totalCases: 0,
        periodRevenue: {}
      }
    };
  }

  // Load pricing data for weight calculations
  const pricingDb = await loadPricingData();
  
  // Load master pricing data for proper product mapping
  const masterPricingData = await loadMasterPricingData();

  // Header is in row 1 (index 0)
  const headers = (rows[0] || []).map(c => String(c || '').trim());

  // Detect file format based on headers to handle different column layouts
  const is825Format = headers[0] === 'sh Long Description' && headers[1] === 'Warehouse';
  
  let warehouseIdx: number, shipToCustomerIdx: number, storeNameIdx: number;
  
  if (is825Format) {
    // Tonys 8.25 format: Customer in A, Warehouse in B, Store ID in C
    warehouseIdx = 1; // Column B - Warehouse (e.g., "TONY'S FINE FOODS - REED")
    shipToCustomerIdx = 2; // Column C - Ship to Customer (Customer ID/Store Number)
    storeNameIdx = 0; // Column A - sh Long Description (e.g., "RALEY'S #108")
  } else {
    // Standard format: Warehouse in A, Store ID in B, Customer in C
    warehouseIdx = 0; // Column A - Warehouse (e.g., "TONY'S FINE FOODS - REED")
    shipToCustomerIdx = 1; // Column B - Ship to Customer (Customer ID/Store Number)
    storeNameIdx = 2; // Column C - sh Long Description (e.g., "RALEY'S #108")
  }

  const itemNumberIdx = 3; // Column D - Item Number
  const brandCodeIdx = 4; // Column E - Brand Code
  const longDescriptionIdx = 5; // Column F - Long Description (Product name)
  const itemPackIdx = 7; // Column H - Item Pack
  const itemSizeIdx = 8; // Column I - Item Size
  const vendorItemIdx = 9; // Column J - Vendor Item
  
  // Dynamically find the cases/quantity columns by searching for headers containing "quantity", "qty", or "cases"
  // Always prefer column K (index 10) for current period cases as per user requirement
  const headersLc = headers.map(h => h.toLowerCase());
  const findQuantityColumn = (preferredIdx: number, searchPattern?: string): number => {
    // First, check if the preferred column (K = 10) matches the pattern
    if (preferredIdx < headers.length) {
      const preferredHeader = headersLc[preferredIdx];
      if (!searchPattern || preferredHeader.includes('quantity') || preferredHeader.includes('qty') || 
          preferredHeader.includes('cases') || preferredHeader.includes('shipped')) {
        return preferredIdx;
      }
    }
    
    // If preferred column doesn't match, search forward from preferred position
    for (let i = preferredIdx; i < headers.length; i++) {
      const h = headersLc[i];
      if (h.includes('quantity') || h.includes('qty') || h.includes('cases') || h.includes('shipped')) {
        return i;
      }
    }
    
    // Fallback to preferred position (Column K = index 10)
    return preferredIdx;
  };
  
  // Always use column K (index 10) for current period cases - this is the requirement
  const currentPeriodCasesIdx = 10; // Column K - Quantity shipped (current period) - FIXED
  // Verify the header contains quantity/cases info, but use K regardless
  const currentPeriodHeaderCheck = headersLc[currentPeriodCasesIdx] || '';
  if (currentPeriodCasesIdx < headers.length && !currentPeriodHeaderCheck.includes('quantity') && 
      !currentPeriodHeaderCheck.includes('qty') && !currentPeriodHeaderCheck.includes('cases') &&
      !currentPeriodHeaderCheck.includes('shipped')) {
    console.warn('[Tony\'s Parser] Column K does not appear to be a quantity column. Header:', headers[currentPeriodCasesIdx]);
    console.warn('[Tony\'s Parser] All headers:', headers.map((h, i) => `${String.fromCharCode(65 + i)}: ${h}`).join(', '));
  }
  
  const previousPeriodCasesIdx = findQuantityColumn(11); // Column L - Quantity shipped (previous period)
  
  // Find cost/revenue columns
  const findCostColumn = (startIdx: number, formatOffset: number = 0): number => {
    // Search for cost, revenue, or dollar signs
    for (let i = startIdx; i < headers.length; i++) {
      const h = headersLc[i];
      if (h.includes('cost') || h.includes('revenue') || h.includes('$') || h.includes('amount')) {
        return i;
      }
    }
    // Fallback to expected position
    return is825Format ? (startIdx) : (startIdx + formatOffset);
  };
  
  const currentPeriodCostIdx = findCostColumn(is825Format ? 12 : 14, 2); // Column M for 8.25 format, Column O for standard format
  const previousPeriodCostIdx = findCostColumn(is825Format ? 13 : 15, 2); // Column N for 8.25 format, Column P for standard format
  
  // Debug: Log which columns we're using
  console.log('[Tony\'s Parser] Column indices:', {
    currentPeriodCasesIdx,
    currentPeriodCasesHeader: headers[currentPeriodCasesIdx],
    previousPeriodCasesIdx,
    previousPeriodCasesHeader: headers[previousPeriodCasesIdx],
    currentPeriodCostIdx,
    currentPeriodCostHeader: headers[currentPeriodCostIdx],
    previousPeriodCostIdx,
    previousPeriodCostHeader: headers[previousPeriodCostIdx],
    allHeaders: headers.slice(0, 20) // Log first 20 headers for debugging
  });

  // Parse periods from headers
  const currentPeriodHeader = headers[currentPeriodCasesIdx] || '';
  const previousPeriodHeader = headers[previousPeriodCasesIdx] || '';
  const currentPeriod = parsePeriodFromHeader(currentPeriodHeader);
  const previousPeriod = parsePeriodFromHeader(previousPeriodHeader);

  const records: AlpineSalesRecord[] = [];
  let parentheticalValuesExcluded = 0; // Track how many parenthetical values were excluded

  // Parse data rows (start from row 2, index 1)
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    
    // Skip empty rows
    if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }

    // Extract data using the proper hierarchy:
    // Level 1: Column A - Warehouse/Distributor (e.g., "TONY'S FINE FOODS - REED")
    // Level 2: Column C - Customer with Branch (e.g., "RALEY'S #108")
    // Level 3: Column B - Store/Customer ID (e.g., "07010850")
    
    const warehouse = String(row[warehouseIdx] || '').trim();
    const shipToCustomer = String(row[shipToCustomerIdx] || '').trim();
    const storeName = String(row[storeNameIdx] || '').trim();
    
    // Extract product information
    const itemNumber = String(row[itemNumberIdx] || '').trim();
    const brandCode = String(row[brandCodeIdx] || '').trim();
    const longDescription = String(row[longDescriptionIdx] || '').trim();
    const itemPack = String(row[itemPackIdx] || '').trim();
    const itemSize = String(row[itemSizeIdx] || '').trim();
    const vendorItem = String(row[vendorItemIdx] || '').trim();

    // Skip rows without essential data
    if (!warehouse || !storeName) {
      continue;
    }

    // Build product name from brand and description
    const productName = brandCode && longDescription 
      ? `${brandCode} ${longDescription}` 
      : (longDescription || brandCode || 'Unknown Product');

    // Build size string
    const sizeStr = itemPack && itemSize ? `${itemPack}pk x ${itemSize}` : (itemPack || itemSize || '');

    // Extract quantities and revenue for both periods
    // Always use column K (index 10) for current period cases
    // Get both raw and formatted values to handle parenthetical numbers correctly
    const formattedRow = rowsFormatted[r] || [];
    const rawCurrentQty = row[currentPeriodCasesIdx];
    const rawPreviousQty = row[previousPeriodCasesIdx];
    const formattedCurrentQty = formattedRow[currentPeriodCasesIdx];
    const formattedPreviousQty = formattedRow[previousPeriodCasesIdx];
    
    // Use formatted value if it contains parentheses (indicates negative number in accounting format)
    // Otherwise use raw value (Excel may have already converted to -1)
    const currentQtyStr = (formattedCurrentQty && String(formattedCurrentQty).trim().includes('(')) 
      ? formattedCurrentQty 
      : rawCurrentQty;
    const previousQtyStr = (formattedPreviousQty && String(formattedPreviousQty).trim().includes('(')) 
      ? formattedPreviousQty 
      : rawPreviousQty;
    
    const currentQty = toNumber(currentQtyStr);
    const previousQty = toNumber(previousQtyStr);
    const currentRevenue = toNumber(row[currentPeriodCostIdx]);
    const previousRevenue = toNumber(row[previousPeriodCostIdx]);
    
    // Track parenthetical values - check both the formatted value (string format "(1)") and raw value (negative number)
    const hadParentheticalCases = 
      (formattedCurrentQty && String(formattedCurrentQty).trim().includes('(')) ||
      (formattedPreviousQty && String(formattedPreviousQty).trim().includes('(')) ||
      (typeof rawCurrentQty === 'string' && (/^\s*\([^)]+\)\s*$/.test(String(rawCurrentQty).trim()) || 
                                               String(rawCurrentQty).trim().startsWith('('))) ||
      (typeof rawPreviousQty === 'string' && (/^\s*\([^)]+\)\s*$/.test(String(rawPreviousQty).trim()) || 
                                               String(rawPreviousQty).trim().startsWith('('))) ||
      (typeof rawCurrentQty === 'number' && rawCurrentQty < 0) ||
      (typeof rawPreviousQty === 'number' && rawPreviousQty < 0);
    
    // Debug: Log sample data extraction to verify we're reading from the correct columns
    // Also log negative values to debug the (1) issue
    if (records.length < 5 || currentQty < 0 || previousQty < 0) {
      console.log('[Tony\'s Parser] Data extraction:', {
        rowIndex: r,
        warehouse,
        storeName,
        productName,
        columnK_raw: rawCurrentQty,
        columnK_rawType: typeof rawCurrentQty,
        columnK_formatted: formattedCurrentQty,
        columnK_formattedType: typeof formattedCurrentQty,
        columnK_used: currentQtyStr, // The value we're actually using
        columnK_index: currentPeriodCasesIdx,
        currentQty,
        currentQtyIsNegative: currentQty < 0,
        columnL_raw: rawPreviousQty,
        columnL_rawType: typeof rawPreviousQty,
        columnL_formatted: formattedPreviousQty,
        columnL_formattedType: typeof formattedPreviousQty,
        columnL_used: previousQtyStr, // The value we're actually using
        columnL_index: previousPeriodCasesIdx,
        previousQty,
        previousQtyIsNegative: previousQty < 0,
        columnM_value: row[currentPeriodCostIdx],
        columnM_index: currentPeriodCostIdx,
        currentRevenue,
        willCreateCurrentRecord: currentQty !== 0 || currentRevenue !== 0,
        willCreatePreviousRecord: previousQty !== 0 || previousRevenue !== 0
      });
    }
    
    // Log parenthetical values to verify they're being converted correctly
    if (hadParentheticalCases) {
      parentheticalValuesExcluded++;
      if (parentheticalValuesExcluded <= 10) { // Log first 10 to debug
        console.log('[Tony\'s Parser] Parenthetical value converted (should be negative):', {
          rowIndex: r,
          warehouse,
          storeName,
          productName,
          currentQtyRaw: rawCurrentQty,
          currentQtyRawType: typeof rawCurrentQty,
          currentQtyConverted: currentQty,
          previousQtyRaw: rawPreviousQty,
          previousQtyRawType: typeof rawPreviousQty,
          previousQtyConverted: previousQty,
          willCreateRecord: (currentQty !== 0 || currentRevenue !== 0) || (previousQty !== 0 || previousRevenue !== 0)
        });
      }
    }

    // Enhanced product mapping: Try multiple methods to find master pricing product
    let masterProduct: MasterPricingProduct | undefined;
    // Initialize with mapped product name as fallback
    let mappedProductName: string = mapToCanonicalProductName(productName);
    let galantItemNumber: string | undefined;
    
    // Priority 1: Try to find by item number from Tonys report
    if (itemNumber) {
      masterProduct = masterPricingData.itemNumberMap.get(itemNumber);
      if (masterProduct) {
        mappedProductName = masterProduct.productDescription;
        galantItemNumber = masterProduct.itemNumber;
        console.log(`[Tonys] Found master product by item number ${itemNumber}: ${mappedProductName}`);
      }
    }
    
    // Priority 2: Try to find by DOT number (if itemNumber is actually a DOT number)
    if (!masterProduct && itemNumber) {
      const dotMapping = getItemNumberFromDotCode(itemNumber);
      if (dotMapping) {
        masterProduct = masterPricingData.itemNumberMap.get(dotMapping);
        if (masterProduct) {
          mappedProductName = masterProduct.productDescription;
          galantItemNumber = masterProduct.itemNumber;
          console.log(`[Tonys] Found master product by DOT number ${itemNumber} -> item ${dotMapping}: ${mappedProductName}`);
        }
      }
    }
    
    // Priority 3: Try to find by vendor item code
    if (!masterProduct && vendorItem) {
      // Try vendor item as item number
      masterProduct = masterPricingData.itemNumberMap.get(vendorItem);
      if (masterProduct) {
        mappedProductName = masterProduct.productDescription;
        galantItemNumber = masterProduct.itemNumber;
        console.log(`[Tonys] Found master product by vendor item ${vendorItem}: ${mappedProductName}`);
      } else {
        // Try vendor item as DOT number
        const dotMapping = getItemNumberFromDotCode(vendorItem);
        if (dotMapping) {
          masterProduct = masterPricingData.itemNumberMap.get(dotMapping);
          if (masterProduct) {
            mappedProductName = masterProduct.productDescription;
            galantItemNumber = masterProduct.itemNumber;
            console.log(`[Tonys] Found master product by vendor item DOT ${vendorItem} -> item ${dotMapping}: ${mappedProductName}`);
          }
        }
      }
    }
    
    // Priority 4: Map by product name (canonical mapping)
    if (!masterProduct) {
      mappedProductName = mapToCanonicalProductName(productName);
      // Try to get item number from canonical name
      galantItemNumber = getItemNumberForProduct(mappedProductName);
      if (galantItemNumber) {
        masterProduct = masterPricingData.itemNumberMap.get(galantItemNumber);
        if (masterProduct) {
          // Use master pricing description if found
          mappedProductName = masterProduct.productDescription;
          console.log(`[Tonys] Found master product by canonical name mapping: ${mappedProductName} (item ${galantItemNumber})`);
        }
      }
    }
    
    // Priority 5: Fallback to mapped product name without master pricing
    if (!masterProduct) {
      mappedProductName = mapToCanonicalProductName(productName);
      galantItemNumber = getItemNumberForProduct(mappedProductName);
      if (!galantItemNumber) {
        console.log(`[Tonys] No master pricing found for: ${productName} (itemNumber: ${itemNumber}, vendorItem: ${vendorItem})`);
      }
    }
    
    // Use master pricing weight if available, otherwise fall back to pricing loader
    let weightPerCase: number;
    if (masterProduct && masterProduct.caseWeight > 0) {
      weightPerCase = masterProduct.caseWeight;
    } else if (galantItemNumber) {
      weightPerCase = getProductWeight(pricingDb, galantItemNumber, mappedProductName);
    } else {
      weightPerCase = getProductWeight(pricingDb, undefined, mappedProductName);
    }
    
    // Create records for current period if there's data (including negative quantities)
    // Negative quantities like (1) should be included to properly subtract from totals
    if (currentQty !== 0 || currentRevenue !== 0) {
      const totalWeight = Math.round(Math.abs(currentQty)) * weightPerCase; // Use absolute value for weight calculation

      const record: AlpineSalesRecord = {
        customerName: warehouse, // Level 1: Distributor (e.g., "TONY'S FINE FOODS - REED")
        productName: mappedProductName,
        size: sizeStr || undefined,
        cases: Math.round(currentQty), // Round but preserve negative values (e.g., -1 from "(1)")
        pieces: 0,
        revenue: Math.round(currentRevenue * 100) / 100,
        period: currentPeriod,
        productCode: itemNumber || vendorItem || undefined,
        itemNumber: galantItemNumber, // Galant item number from master pricing
        customerId: storeName, // Level 2: Customer with Branch (e.g., "RALEY'S #108")
        accountName: shipToCustomer, // Level 3: Store/Customer ID (e.g., "07010850")
        weightLbs: totalWeight, // Total weight in pounds
      };

      records.push(record);
    }

    // Create records for previous period if there's data (including negative quantities)
    // Negative quantities like (1) should be included to properly subtract from totals
    if (previousQty !== 0 || previousRevenue !== 0) {
      const totalWeight = Math.round(Math.abs(previousQty)) * weightPerCase; // Use absolute value for weight calculation

      const record: AlpineSalesRecord = {
        customerName: warehouse, // Level 1: Distributor (e.g., "TONY'S FINE FOODS - REED")
        productName: mappedProductName,
        size: sizeStr || undefined,
        cases: Math.round(previousQty), // Round but preserve negative values (e.g., -1 from "(1)")
        pieces: 0,
        revenue: Math.round(previousRevenue * 100) / 100,
        period: previousPeriod,
        productCode: itemNumber || vendorItem || undefined,
        itemNumber: galantItemNumber, // Galant item number from master pricing
        customerId: storeName, // Level 2: Customer with Branch (e.g., "RALEY'S #108")
        accountName: shipToCustomer, // Level 3: Store/Customer ID (e.g., "07010850")
        weightLbs: totalWeight, // Total weight in pounds
      };

      records.push(record);
    }
  }

  // Calculate metadata
  const customers = Array.from(new Set(records.map(r => r.customerName)));
  const products = Array.from(new Set(records.map(r => r.productName)));
  const periods = Array.from(new Set(records.map(r => r.period))).sort();
  const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0);
  const totalCases = records.reduce((sum, r) => sum + r.cases, 0);
  const periodRevenue: Record<string, number> = {};
  records.forEach(r => {
    periodRevenue[r.period] = (periodRevenue[r.period] || 0) + r.revenue;
  });

  // Debug: Log parsing summary
  console.log('[Tony\'s Parser] Parsing complete:', {
    totalRecords: records.length,
    totalCases,
    totalRevenue: totalRevenue.toFixed(2),
    periods,
    customersCount: customers.length,
    productsCount: products.length,
    columnK_index: currentPeriodCasesIdx,
    columnK_header: headers[currentPeriodCasesIdx],
    parentheticalValuesExcluded, // Count of values like "(1)" that were excluded
    sampleRecords: records.slice(0, 3).map(r => ({
      customer: r.customerName,
      product: r.productName,
      cases: r.cases,
      revenue: r.revenue,
      period: r.period
    }))
  });

  return {
    records,
    metadata: {
      supplier: 'TONYS',
      periods,
      customers,
      products,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCases,
      periodRevenue
    }
  };
}

