import * as XLSX from 'xlsx';
import { AlpineSalesRecord } from './alpineParser';

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
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
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

  // Header is in row 1 (index 0)
  const headers = (rows[0] || []).map(c => String(c || '').trim());
  const headersLc = headers.map(h => h.toLowerCase());

  // Find column indices
  const warehouseIdx = 0; // Column A - Warehouse
  const shipToCustomerIdx = 1; // Column B - Ship to Customer (Customer ID)
  const storeNameIdx = 2; // Column C - sh Long Description (Store Name)
  const itemNumberIdx = 3; // Column D - Item Number
  const brandCodeIdx = 4; // Column E - Brand Code
  const longDescriptionIdx = 5; // Column F - Long Description (Product name)
  const itemPackIdx = 7; // Column H - Item Pack
  const itemSizeIdx = 8; // Column I - Item Size
  const vendorItemIdx = 9; // Column J - Vendor Item

  // Find quantity columns (they contain "Quantity shipped")
  const quantityColumns: Array<{ index: number; period: string }> = [];
  headers.forEach((header, index) => {
    if (header.toLowerCase().includes('quantity shipped')) {
      const period = parsePeriodFromHeader(header);
      quantityColumns.push({ index, period });
    }
  });

  // If no quantity columns found, return empty
  if (quantityColumns.length === 0) {
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

  const records: AlpineSalesRecord[] = [];

  // Parse data rows (start from row 2, index 1)
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    
    // Skip empty rows
    if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }

    // Extract data using the 3-level hierarchy:
    // Level 1: Column A (index 0) - Warehouse
    // Level 2: Column B (index 1) - Ship to Customer (Customer ID)
    // Level 3: Column C (index 2) - sh Long Description (Store Name)
    
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

    // Create a record for each quantity column (period)
    for (const { index, period } of quantityColumns) {
      const qty = toNumber(row[index]);
      
      // Skip if no quantity
      if (qty === 0) {
        continue;
      }

      const record: AlpineSalesRecord = {
        customerName: warehouse, // Level 1: Warehouse
        productName: productName, // Product: Brand + Description
        size: sizeStr || undefined,
        cases: Math.round(qty),
        pieces: 0,
        revenue: 0, // Tony's data doesn't include revenue, set to 0
        period,
        productCode: itemNumber || vendorItem || undefined,
        customerId: shipToCustomer || undefined,
        accountName: storeName, // Level 2/3: Store Name (we'll use this for drill-down)
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

