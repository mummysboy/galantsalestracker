import * as XLSX from 'xlsx';
import { AlpineSalesRecord } from './alpineParser';
import { mapToCanonicalProductName } from './productMapping';
import { loadPricingData, getProductWeight, getProductPricing } from './pricingLoader';

export interface ParsedTroiaData {
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

function detectPeriodFromFileName(fileName: string): string {
  // e.g., "Troia- July 25 Sales.xls" -> 2025-07
  const monthMap: Record<string, string> = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09', 'sept': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
  };
  
  const m = fileName.toLowerCase().match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{2})/);
  if (m) {
    const month = monthMap[m[1]];
    const year = parseInt(m[2], 10) >= 50 ? `19${m[2]}` : `20${m[2]}`;
    return `${year}-${month}`;
  }
  
  // Try date range format in the file: "07/01/2025 THRU 07/31/2025"
  const dateRangeMatch = fileName.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateRangeMatch) {
    const month = dateRangeMatch[1].padStart(2, '0');
    const year = dateRangeMatch[3];
    return `${year}-${month}`;
  }
  
  // fallback current month (UTC)
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function extractPeriodFromReport(rows: any[][]): string | null {
  // Look for date range in first few rows
  // Format: "LOCATION: (All Locations) - FOR DATE RANGE 07/01/2025 THRU 07/31/2025..."
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] || [];
    for (const cell of row) {
      const cellStr = String(cell || '').trim();
      const dateMatch = cellStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+THRU/i);
      if (dateMatch) {
        const month = dateMatch[1].padStart(2, '0');
        const year = dateMatch[3];
        return `${year}-${month}`;
      }
    }
  }
  return null;
}

export async function parseTroiaXLSX(file: File): Promise<ParsedTroiaData> {
  // Load pricing data for weight calculations
  const pricingDb = await loadPricingData();
  
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
  if (!rows || rows.length === 0) {
    return {
      records: [],
      metadata: {
        supplier: 'TROIA',
        periods: [],
        customers: [],
        products: [],
        totalRevenue: 0,
        totalCases: 0,
        periodRevenue: {}
      }
    };
  }

  // Extract period from report or filename
  const period = extractPeriodFromReport(rows) || detectPeriodFromFileName(file.name || '');

  // Find header row - look for "CUST #" and "DESCRIPTION" as indicators
  let headerRowIdx = -1;
  
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] || [];
    const rowStr = row.map(c => String(c || '').trim().toUpperCase()).join('|');
    if (rowStr.includes('CUST #') && rowStr.includes('DESCRIPTION')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // Can't find headers, return empty
    return {
      records: [],
      metadata: {
        supplier: 'TROIA',
        periods: [period],
        customers: [],
        products: [],
        totalRevenue: 0,
        totalCases: 0,
        periodRevenue: {}
      }
    };
  }

  // Parse product column headers
  const headerRow = rows[headerRowIdx] || [];
  
  // Extract product codes and descriptions from the product list rows (4-7)
  const productListRows = rows.slice(4, 8); // Rows 4, 5, 6, 7 contain product list
  const productInfo: { code: string; name: string }[] = [];
  
  productListRows.forEach(row => {
    const cell = String(row[0] || '').trim();
    if (cell) {
      // Handle both "PRODUCT LIST:" row and continuation rows
      let productList = cell;
      if (cell.includes('PRODUCT LIST:')) {
        productList = cell.replace('PRODUCT LIST:', '').trim();
      }
      
      if (productList) {
        const products = productList.split(';');
        
        products.forEach(product => {
          const trimmed = product.trim();
          if (trimmed) {
            // Extract code and name from format "29992-GLNT BACON BREAKF BURRITO 12CT"
            const match = trimmed.match(/^(\d+)-(.+)$/);
            if (match) {
              const [, code, name] = match;
              productInfo.push({ code: code.trim(), name: name.trim() });
            }
          }
        });
      }
    }
  });

  // Build product columns by matching header columns with product info
  const productColumns: { index: number; name: string; code: string }[] = [];
  for (let colIdx = 3; colIdx < headerRow.length; colIdx++) {
    const headerCell = String(headerRow[colIdx] || '').trim();
    
    // Skip if empty or if it's "TOTAL" or "CUST COUNT"
    if (!headerCell || headerCell === 'TOTAL' || headerCell === 'COUNT') {
      break; // Stop when we hit the total column
    }
    
    // Find matching product info for this column
    // The columns correspond to the products in the same order as listed in product list
    const productIndex = colIdx - 3; // First product column is index 3, so subtract 3
    const product = productInfo[productIndex];
    
    if (product) {
      productColumns.push({ 
        index: colIdx, 
        name: product.name,
        code: product.code
      });
    }
  }

  const records: AlpineSalesRecord[] = [];
  
  // Find data rows - start after header row, skip Grand Total row
  const dataStartIdx = headerRowIdx + 1;
  
  for (let r = dataStartIdx; r < rows.length; r++) {
    const row = rows[r] || [];
    
    // Skip empty rows
    if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }
    
    // Column A: Customer #
    // Column B: Empty
    // Column C: Customer Description
    const customerNum = String(row[0] || '').trim();
    const customerName = String(row[2] || '').trim();
    
    // Skip if no customer name or if it's "Grand Total"
    if (!customerName || customerName.toLowerCase().includes('grand total')) {
      continue;
    }
    
    // Parse product quantities
    for (const productCol of productColumns) {
      const qty = toNumber(row[productCol.index]);
      
      // Skip if quantity is 0
      if (qty === 0) {
        continue;
      }
      
      // Calculate weight and revenue using pricing data
      const mappedProductName = mapToCanonicalProductName(productCol.name);
      const weightPerCase = getProductWeight(pricingDb, undefined, mappedProductName);
      const totalWeight = Math.round(qty) * weightPerCase;
      
      // Calculate revenue using Master Pricing data
      const pricing = getProductPricing(pricingDb, undefined, mappedProductName);
      const revenue = Math.round(qty * pricing.caseCost * 100) / 100; // cases × case cost
      
      const record: AlpineSalesRecord = {
        customerName,
        productName: mappedProductName,
        cases: Math.round(qty),
        pieces: 0,
        revenue: revenue, // Calculate revenue from Master Pricing data
        period,
        productCode: productCol.code, // Troia's product code/number from row 1
        customerId: customerNum || undefined,
        excludeFromTotals: false, // Troia is a direct distributor, include in totals
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
      supplier: 'TROIA',
      periods,
      customers,
      products,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCases,
      periodRevenue
    }
  };
}


