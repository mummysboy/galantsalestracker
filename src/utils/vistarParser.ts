import * as XLSX from 'xlsx';
import { AlpineSalesRecord } from './alpineParser';
import { mapToCanonicalProductName } from './productMapping';

export interface ParsedVistarData {
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

function parsePeriodFromReport(reportValue: any): string {
  // Report format: 6.2024 (month.year) or 1.2025
  const str = String(reportValue || '').trim();
  const match = str.match(/(\d+)\.(\d{4})/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const year = match[2];
    return `${year}-${month}`;
  }
  // Fallback to current month
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export async function parseVistarCSV(file: File): Promise<ParsedVistarData> {
  const text = await file.text();
  const lines = text.split('\n');
  const rows: string[][] = lines.map(line => {
    // Simple CSV parsing - split by comma but handle quoted fields
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });

  if (!rows || rows.length === 0) {
    return {
      records: [],
      metadata: {
        supplier: 'VISTAR',
        periods: [],
        customers: [],
        products: [],
        totalRevenue: 0,
        totalCases: 0,
        periodRevenue: {}
      }
    };
  }

  const allRecords: AlpineSalesRecord[] = [];

  // Find header row (should contain "OPCO Desc", "Customer Desc", "Item Description", etc.)
  // In CSV format, it's typically line 2 (index 1)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    const joined = row.map(c => String(c || '').toLowerCase()).join(' ');
    if (joined.includes('opco desc') && joined.includes('customer desc') && joined.includes('item description')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    return {
      records: [],
      metadata: {
        supplier: 'VISTAR',
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

  // Find column indices
  const reportIdx = headersLc.findIndex(h => h === 'report');
  const opcoDescIdx = headersLc.findIndex(h => h === 'opco desc');
  const customerDescIdx = headersLc.findIndex(h => h === 'customer desc');
  const itemDescIdx = headersLc.findIndex(h => h === 'item description');
  const brandIdx = headersLc.findIndex(h => h === 'brand');
  const qtyShpIdx = headersLc.findIndex(h => h === 'qty shp');
  const costIdx = headersLc.findIndex(h => h === 'cost');
  const itemIdIdx = headersLc.findIndex(h => h === 'item id');
  const customerIdIdx = headersLc.findIndex(h => h === 'customer id');
  const packIdx = headersLc.findIndex(h => h === 'pack');
  const sizePerOzIdx = headersLc.findIndex(h => h === 'size per oz');

  // Detect period from filename or first data row
  // Vistar CSV filename format: GALANT_YYYYMMDD.CSV
  let period = '';
  const filenameMatch = file.name.match(/(\d{4})(\d{2})\d{2}/);
  if (filenameMatch) {
    period = `${filenameMatch[1]}-${filenameMatch[2]}`;
  } else {
    // Fallback to current month
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    period = `${yyyy}-${mm}`;
  }

  // Parse data rows
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    
    // Skip empty rows
    if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }

    const opcoDesc = opcoDescIdx >= 0 ? String(row[opcoDescIdx] || '').trim() : '';
    const customerDesc = customerDescIdx >= 0 ? String(row[customerDescIdx] || '').trim() : '';
    const itemDesc = itemDescIdx >= 0 ? String(row[itemDescIdx] || '').trim() : '';
    const brand = brandIdx >= 0 ? String(row[brandIdx] || '').trim() : '';
    const qty = qtyShpIdx >= 0 ? toNumber(row[qtyShpIdx]) : 0;
    const cost = costIdx >= 0 ? toNumber(row[costIdx]) : 0;
    const itemId = itemIdIdx >= 0 ? String(row[itemIdIdx] || '').trim() : '';
    const customerId = customerIdIdx >= 0 ? String(row[customerIdIdx] || '').trim() : '';
    const pack = packIdx >= 0 ? String(row[packIdx] || '').trim() : '';
    const sizePerOz = sizePerOzIdx >= 0 ? String(row[sizePerOzIdx] || '').trim() : '';

    // Skip rows without essential data
    if (!opcoDesc || !customerDesc || (qty === 0 && cost === 0)) {
      continue;
    }

    // Build product name and size
    const finalProductName = itemDesc || brand || 'Unknown Product';
    const sizeStr = pack && sizePerOz ? `${pack}pk x ${sizePerOz}oz` : (pack || sizePerOz || '');

    const record: AlpineSalesRecord = {
      customerName: opcoDesc, // Level 1: OPCO Desc (e.g., "Vistar Illinois")
      productName: mapToCanonicalProductName(finalProductName), // Level 3: Item Description - normalized
      size: sizeStr || undefined,
      cases: Math.round(qty),
      pieces: 0,
      revenue: Math.round(cost * 100) / 100,
      period,
      productCode: itemId || undefined,
      customerId: customerId || undefined,
      accountName: customerDesc, // Level 2: Customer Desc (e.g., "MONSTER VENDING LLC")
    };

    allRecords.push(record);
  }

  // Calculate metadata
  const customers = Array.from(new Set(allRecords.map(r => r.customerName)));
  const products = Array.from(new Set(allRecords.map(r => r.productName)));
  const periods = Array.from(new Set(allRecords.map(r => r.period))).sort();
  const totalRevenue = allRecords.reduce((sum, r) => sum + r.revenue, 0);
  const totalCases = allRecords.reduce((sum, r) => sum + r.cases, 0);
  const periodRevenue: Record<string, number> = {};
  allRecords.forEach(r => {
    periodRevenue[r.period] = (periodRevenue[r.period] || 0) + r.revenue;
  });

  return {
    records: allRecords,
    metadata: {
      supplier: 'VISTAR',
      periods,
      customers,
      products,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCases,
      periodRevenue
    }
  };
}

