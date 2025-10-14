import * as XLSX from 'xlsx';
import { AlpineSalesRecord } from './alpineParser';
import { mapToCanonicalProductName } from './productMapping';

export interface ParsedMhdData {
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

// Map month names to numbers
const monthMap: Record<string, number> = {
  'jan': 1, 'january': 1,
  'feb': 2, 'february': 2,
  'mar': 3, 'march': 3,
  'apr': 4, 'april': 4,
  'may': 5,
  'jun': 6, 'june': 6,
  'jul': 7, 'july': 7,
  'aug': 8, 'august': 8,
  'sep': 9, 'sept': 9, 'september': 9,
  'oct': 10, 'october': 10,
  'nov': 11, 'november': 11,
  'dec': 12, 'december': 12
};

function detectYearFromData(rows: any[][], headers: string[], fileName?: string): string {
  const yearsFound: string[] = [];
  
  // Try to find year from filename first (most reliable)
  if (fileName) {
    const fileYearMatch = fileName.match(/20\d{2}/);
    if (fileYearMatch) {
      yearsFound.push(fileYearMatch[0]);
    }
  }
  
  // Try to find year from header row or nearby cells
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    for (let j = 0; j < Math.min(row.length, 10); j++) {
      const cell = String(row[j] || '').trim();
      
      // Look for patterns like "Q4 2024" or "2024" with context
      const yearMatches = cell.match(/20\d{2}/g);
      if (yearMatches) {
        yearsFound.push(...yearMatches);
      }
    }
  }
  
  if (yearsFound.length > 0) {
    // If we found years, use the most common one, or the earliest one
    const yearCounts = new Map<string, number>();
    yearsFound.forEach(year => {
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    });
    
    // Get the year that appears most frequently
    let mostCommonYear = yearsFound[0];
    let maxCount = 0;
    yearCounts.forEach((count, year) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonYear = year;
      }
    });
    
    console.log('MHD Parser - Years detected:', {
      allYears: yearsFound,
      counts: Object.fromEntries(yearCounts),
      selected: mostCommonYear
    });
    
    return mostCommonYear;
  }
  
  // Default to current year
  return new Date().getFullYear().toString();
}

// Detect which columns correspond to which months
interface MonthColumn {
  month: number;
  year: string;
  period: string; // YYYY-MM format
  qtyIdx: number;
  revenueIdx: number;
}

function detectMonthColumns(headers: string[], headersLc: string[], year: string): MonthColumn[] {
  const monthColumns: MonthColumn[] = [];
  
  // Track which columns we've already assigned
  const usedIndices = new Set<number>();
  
  // Look for month names in headers
  for (let i = 0; i < headers.length; i++) {
    if (usedIndices.has(i)) continue;
    
    const h = headersLc[i];
    const hOrig = headers[i];
    
    // Check if this header contains a month name
    let foundMonth: number | null = null;
    for (const [monthName, monthNum] of Object.entries(monthMap)) {
      if (h.includes(monthName)) {
        foundMonth = monthNum;
        break;
      }
    }
    
    if (foundMonth !== null) {
      const month = foundMonth;
      const period = `${year}-${month.toString().padStart(2, '0')}`;
      
      // Determine if this is a qty or revenue column
      const isQty = h.includes('qty') || h.includes('quantity') || h.includes('cases') || 
                    h.includes('units') || h.includes('usage') || h.includes('count');
      const isRevenue = h.includes('sales') || h.includes('revenue') || h.includes('$') || 
                        h.includes('dollar') || h.includes('amount') || h.includes('cost') ||
                        hOrig.includes('$');
      
      // Find or create entry for this month
      let monthEntry = monthColumns.find(mc => mc.month === month);
      if (!monthEntry) {
        monthEntry = {
          month,
          year,
          period,
          qtyIdx: -1,
          revenueIdx: -1
        };
        monthColumns.push(monthEntry);
      }
      
      // Assign column to qty or revenue
      if (isQty && monthEntry.qtyIdx === -1) {
        monthEntry.qtyIdx = i;
        usedIndices.add(i);
      } else if (isRevenue && monthEntry.revenueIdx === -1) {
        monthEntry.revenueIdx = i;
        usedIndices.add(i);
      } else if (monthEntry.qtyIdx === -1) {
        // If no specific indicator, assume qty if we don't have it yet
        monthEntry.qtyIdx = i;
        usedIndices.add(i);
      } else if (monthEntry.revenueIdx === -1) {
        // Otherwise assume revenue
        monthEntry.revenueIdx = i;
        usedIndices.add(i);
      }
    }
  }
  
  // Sort by month
  monthColumns.sort((a, b) => a.month - b.month);
  
  return monthColumns;
}

export async function parseMhdXLSX(file: File): Promise<ParsedMhdData> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Parse all rows
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
  if (!rows || rows.length === 0) {
    return {
      records: [],
      metadata: {
        supplier: 'MHD',
        periods: [],
        customers: [],
        products: [],
        totalRevenue: 0,
        totalCases: 0,
        periodRevenue: {}
      }
    };
  }

  // Find header row (should contain meaningful column headers)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    const joined = row.map(c => String(c || '').toLowerCase()).join(' ');
    // Look for common headers in sales reports
    if ((joined.includes('customer') || joined.includes('account') || joined.includes('retailer')) || 
        (joined.includes('product') || joined.includes('item') || joined.includes('description'))) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // Try to find the first row with multiple non-empty cells as header
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i] || [];
      const nonEmptyCells = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
      if (nonEmptyCells >= 3) {
        headerRowIdx = i;
        break;
      }
    }
  }

  if (headerRowIdx === -1) {
    return {
      records: [],
      metadata: {
        supplier: 'MHD',
        periods: [],
        customers: [],
        products: [],
        totalRevenue: 0,
        totalCases: 0,
        periodRevenue: {}
      }
    };
  }

  const headers = (rows[headerRowIdx] || []).map(c => String(c || '').trim());
  const headersLc = headers.map(h => h.toLowerCase());

  // Detect year from file data and filename
  const year = detectYearFromData(rows.slice(0, headerRowIdx + 1), headers, file.name);
  
  // Detect monthly columns
  const monthColumns = detectMonthColumns(headers, headersLc, year);
  
  console.log('MHD Parser - Detected month columns:', monthColumns);

  // Find column indices for entity data (non-month specific)
  
  // First, find the "Customer" column specifically
  let customerIdx = headersLc.findIndex(h => h === 'customer');
  if (customerIdx === -1) {
    // Try variations
    customerIdx = headersLc.findIndex(h => 
      h === 'customer name' || 
      h === 'customername' ||
      (h.includes('customer') && !h.includes('ship') && !h.includes('id') && !h.includes('number'))
    );
  }
  
  // Level 1: Main customer/account column - use the Customer column
  let level1Idx = customerIdx;
  if (level1Idx === -1) {
    // Fallback to other customer-related columns
    level1Idx = headersLc.findIndex(h => 
      h.includes('retailer') || h.includes('banner') || h.includes('chain') || h.includes('account')
    );
  }
  if (level1Idx === -1) level1Idx = 0; // Ultimate fallback to first column
  
  // Level 2: Sub-customer/location/store column (different from Customer column)
  let level2Idx = headersLc.findIndex((h, idx) => 
    idx !== level1Idx && (
      h.includes('location') || 
      h.includes('store') || 
      h.includes('ship to') || 
      h.includes('ship-to') ||
      h.includes('site') ||
      h === 'name' ||
      (h.includes('customer') && h.includes('name'))
    )
  );
  if (level2Idx === -1 || level2Idx === level1Idx) {
    // Try to find a second name-related column
    for (let i = 0; i < headersLc.length; i++) {
      if (i !== level1Idx && (headersLc[i].includes('name') || headersLc[i].includes('location'))) {
        level2Idx = i;
        break;
      }
    }
  }
  
  // Level 3: Product column - look for specific product-related headers
  let productIdx = headersLc.findIndex(h => 
    h === 'product' || 
    h === 'product name' || 
    h === 'productname' ||
    h === 'item' ||
    h === 'item name' ||
    h === 'item description' ||
    h.includes('product description') ||
    h.includes('description')
  );
  
  // If not found, look for any column with "product" or "item" that's not already used
  if (productIdx === -1) {
    productIdx = headersLc.findIndex((h, idx) => 
      idx !== level1Idx && idx !== level2Idx && (
        h.includes('product') || 
        h.includes('item') || 
        h.includes('sku')
      )
    );
  }
  
  // Last resort: find a text column after level2
  if (productIdx === -1) {
    const startIdx = Math.max(level1Idx, level2Idx >= 0 ? level2Idx : level1Idx) + 1;
    for (let i = startIdx; i < headers.length; i++) {
      // Skip month columns and numeric-looking columns
      const h = headersLc[i];
      const isMonthCol = Object.keys(monthMap).some(month => h.includes(month));
      const isNumericCol = h.includes('qty') || h.includes('quantity') || 
                           h.includes('sales') || h.includes('revenue') || 
                           h.includes('$') || h.includes('amount');
      
      if (!isMonthCol && !isNumericCol && headers[i].length > 0) {
        productIdx = i;
        break;
      }
    }
  }
  
  console.log('MHD Parser - Column mapping:', {
    fileName: file.name,
    headers: headers.slice(0, 15),
    level1Idx,
    level1Header: headers[level1Idx],
    level2Idx,
    level2Header: level2Idx >= 0 ? headers[level2Idx] : 'N/A',
    productIdx,
    productHeader: productIdx >= 0 ? headers[productIdx] : 'N/A'
  });

  // Additional columns
  const productCodeIdx = headersLc.findIndex(h => 
    h.includes('code') || h.includes('sku') || h.includes('upc') || h.includes('item #')
  );
  const customerIdIdx = headersLc.findIndex(h => 
    h.includes('id') || h.includes('number') || h.includes('account #')
  );
  const sizeIdx = headersLc.findIndex(h => 
    h.includes('size') || h.includes('pack') || h.includes('oz') || h.includes('unit')
  );

  const records: AlpineSalesRecord[] = [];
  
  // Parse data rows (start after header row)
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    
    // Skip empty rows
    if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }

    // Extract entity data (shared across all months)
    const level1Name = level1Idx >= 0 ? String(row[level1Idx] || '').trim() : '';
    const level2Name = level2Idx >= 0 && level2Idx !== level1Idx ? String(row[level2Idx] || '').trim() : '';
    const productName = productIdx >= 0 ? String(row[productIdx] || '').trim() : '';
    const productCode = productCodeIdx >= 0 ? String(row[productCodeIdx] || '').trim() : '';
    const customerId = customerIdIdx >= 0 ? String(row[customerIdIdx] || '').trim() : '';
    const size = sizeIdx >= 0 ? String(row[sizeIdx] || '').trim() : '';

    // Skip rows without essential data
    if (!level1Name && !productName) {
      continue;
    }
    
    // Determine the best names for each level
    const finalLevel1 = level1Name || 'Unknown Retailer';
    const finalLevel2 = level2Name || level1Name || 'Unknown Location';
    const finalProduct = productName || 'Unknown Product';

    // Create one record per month that has data
    for (const monthCol of monthColumns) {
      const qty = monthCol.qtyIdx >= 0 ? toNumber(row[monthCol.qtyIdx]) : 0;
      const revenue = monthCol.revenueIdx >= 0 ? toNumber(row[monthCol.revenueIdx]) : 0;
      
      // Skip if no data for this month
      if (qty === 0 && revenue === 0) {
        continue;
      }

      const record: AlpineSalesRecord = {
        customerName: finalLevel1, // Level 1: Main customer/retailer
        productName: mapToCanonicalProductName(finalProduct), // Level 3: Product - normalized
        size: size || undefined,
        cases: Math.round(qty),
        pieces: 0,
        revenue: Math.round(revenue * 100) / 100,
        period: monthCol.period, // Use the month-specific period
        productCode: productCode || undefined,
        customerId: customerId || undefined,
        accountName: finalLevel2, // Level 2: Sub-customer/location
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

  console.log('MHD Parser Results:', {
    recordCount: records.length,
    periods,
    customers: customers.length,
    products: products.length,
    sampleRecords: records.slice(0, 3)
  });

  return {
    records,
    metadata: {
      supplier: 'MHD',
      periods,
      customers,
      products,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCases,
      periodRevenue
    }
  };
}
