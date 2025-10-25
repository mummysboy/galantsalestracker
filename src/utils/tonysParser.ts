import * as XLSX from 'xlsx';
import { AlpineSalesRecord } from './alpineParser';
import { mapToCanonicalProductName } from './productMapping';
import { loadPricingData, getProductWeight } from './pricingLoader';

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
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const str = String(value).trim();
  const isParenNegative = /^\(.*\)$/.test(str);
  const cleaned = str.replace(/[()$,%\s]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
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
  const rows: [[string], ...any[][]] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as [[string], ...any[][]];
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
  const currentPeriodCasesIdx = 10; // Column K - Quantity shipped (current period)
  const previousPeriodCasesIdx = 11; // Column L - Quantity shipped (previous period)
  const currentPeriodCostIdx = is825Format ? 12 : 14; // Column M for 8.25 format, Column O for standard format
  const previousPeriodCostIdx = is825Format ? 13 : 15; // Column N for 8.25 format, Column P for standard format

  // Parse periods from headers
  const currentPeriodHeader = headers[currentPeriodCasesIdx] || '';
  const previousPeriodHeader = headers[previousPeriodCasesIdx] || '';
  const currentPeriod = parsePeriodFromHeader(currentPeriodHeader);
  const previousPeriod = parsePeriodFromHeader(previousPeriodHeader);

  const records: AlpineSalesRecord[] = [];

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
    const currentQty = toNumber(row[currentPeriodCasesIdx]);
    const previousQty = toNumber(row[previousPeriodCasesIdx]);
    const currentRevenue = toNumber(row[currentPeriodCostIdx]);
    const previousRevenue = toNumber(row[previousPeriodCostIdx]);

    // Calculate mapped product name once for weight lookup
    const mappedProductName = mapToCanonicalProductName(productName);
    
    // Create records for current period if there's data
    if (currentQty > 0 || currentRevenue > 0) {
      // Calculate weight for this product
      const weightPerCase = getProductWeight(pricingDb, undefined, mappedProductName);
      const totalWeight = Math.round(currentQty) * weightPerCase;

      const record: AlpineSalesRecord = {
        customerName: warehouse, // Level 1: Distributor (e.g., "TONY'S FINE FOODS - REED")
        productName: mappedProductName,
        size: sizeStr || undefined,
        cases: Math.round(currentQty),
        pieces: 0,
        revenue: Math.round(currentRevenue * 100) / 100,
        period: currentPeriod,
        productCode: itemNumber || vendorItem || undefined,
        customerId: storeName, // Level 2: Customer with Branch (e.g., "RALEY'S #108")
        accountName: shipToCustomer, // Level 3: Store/Customer ID (e.g., "07010850")
        weightLbs: totalWeight, // Total weight in pounds
      };

      records.push(record);
    }

    // Create records for previous period if there's data
    if (previousQty > 0 || previousRevenue > 0) {
      // Calculate weight for this product
      const weightPerCase = getProductWeight(pricingDb, undefined, mappedProductName);
      const totalWeight = Math.round(previousQty) * weightPerCase;

      const record: AlpineSalesRecord = {
        customerName: warehouse, // Level 1: Distributor (e.g., "TONY'S FINE FOODS - REED")
        productName: mappedProductName,
        size: sizeStr || undefined,
        cases: Math.round(previousQty),
        pieces: 0,
        revenue: Math.round(previousRevenue * 100) / 100,
        period: previousPeriod,
        productCode: itemNumber || vendorItem || undefined,
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

