import * as XLSX from 'xlsx';
import { AlpineSalesRecord } from './alpineParser';

export interface ParsedKeHeData {
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

function detectPeriodFromDateRange(dateRangeStr: string): string {
  // e.g., "1/1/2025 to 1/31/2025" -> "2025-01"
  const match = dateRangeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, month, , year] = match;
    return `${year}-${month.padStart(2, '0')}`;
  }
  // fallback to current month (UTC)
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export async function parseKeHeXLSX(file: File): Promise<ParsedKeHeData> {
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
        supplier: 'KEHE',
        periods: [],
        customers: [],
        products: [],
        totalRevenue: 0,
        totalCases: 0,
        periodRevenue: {}
      }
    };
  }

  // Detect period from Date Range row (row 9 in the example: "1/1/2025 to 1/31/2025")
  let period = '';
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] || [];
    const firstCell = String(row[0] || '').trim();
    if (firstCell === 'Date Range' && row[1]) {
      period = detectPeriodFromDateRange(String(row[1]));
      break;
    }
  }

  // If period not found, try to detect from filename or use current month
  if (!period) {
    const fileNameMatch = file.name.match(/(\d{1,2})\.(\d{2})/);
    if (fileNameMatch) {
      const mm = fileNameMatch[1].padStart(2, '0');
      period = `20${fileNameMatch[2]}-${mm}`;
    } else {
      const d = new Date();
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      period = `${yyyy}-${mm}`;
    }
  }

  // Find header row (should contain "Customer Name", "Product Description", etc.)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    const joined = row.map(c => String(c || '').toLowerCase()).join(' ');
    if (joined.includes('customer name') && joined.includes('product description')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // No header found, return empty
    return {
      records: [],
      metadata: {
        supplier: 'KEHE',
        periods: [period],
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
  const customerNameIdx = headersLc.findIndex(h => h.includes('customer name'));
  const productDescIdx = headersLc.findIndex(h => h.includes('product description'));
  const brandNameIdx = headersLc.findIndex(h => h.includes('brand name'));
  const productSizeIdx = headersLc.findIndex(h => h.includes('product size'));
  const uomIdx = headersLc.findIndex(h => h === 'uom');
  const currentYearQtyIdx = headersLc.findIndex(h => h.includes('current') && h.includes('year') && h.includes('qty'));
  const currentYearCostIdx = headersLc.findIndex(h => h.includes('current') && h.includes('year') && h.includes('cost'));
  const upcIdx = headersLc.findIndex(h => h === 'upc');
  const addressBookNumberIdx = headersLc.findIndex(h => h.includes('address') && h.includes('book') && h.includes('number'));

  const records: AlpineSalesRecord[] = [];
  
  // Parse data rows (start after header row)
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    
    // Skip empty rows
    if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }

    const customerName = customerNameIdx >= 0 ? String(row[customerNameIdx] || '').trim() : '';
    const productDesc = productDescIdx >= 0 ? String(row[productDescIdx] || '').trim() : '';
    const brandName = brandNameIdx >= 0 ? String(row[brandNameIdx] || '').trim() : '';
    const productSize = productSizeIdx >= 0 ? String(row[productSizeIdx] || '').trim() : '';
    const uom = uomIdx >= 0 ? String(row[uomIdx] || '').trim() : '';
    const qty = currentYearQtyIdx >= 0 ? toNumber(row[currentYearQtyIdx]) : 0;
    const cost = currentYearCostIdx >= 0 ? toNumber(row[currentYearCostIdx]) : 0;
    const upc = upcIdx >= 0 ? String(row[upcIdx] || '').trim() : '';
    const addressBookNumber = addressBookNumberIdx >= 0 ? String(row[addressBookNumberIdx] || '').trim() : '';

    // Skip rows without essential data
    if (!customerName || !productDesc || (qty === 0 && cost === 0)) {
      continue;
    }

    // Build full product name with brand
    const fullProductName = brandName 
      ? `${brandName} ${productDesc}`.trim() 
      : productDesc;

    // Build size string
    const sizeStr = productSize && uom ? `${productSize} ${uom}` : (productSize || uom || '');

    const record: AlpineSalesRecord = {
      customerName,
      productName: fullProductName,
      size: sizeStr || undefined,
      cases: Math.round(qty),
      pieces: 0,
      revenue: Math.round(cost * 100) / 100,
      period,
      productCode: upc || undefined,
      customerId: addressBookNumber || undefined,
    };

    records.push(record);
  }

  // Calculate metadata
  const customers = Array.from(new Set(records.map(r => r.customerName)));
  const products = Array.from(new Set(records.map(r => r.productName)));
  const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0);
  const totalCases = records.reduce((sum, r) => sum + r.cases, 0);
  const periodRevenue: Record<string, number> = {};
  records.forEach(r => {
    periodRevenue[r.period] = (periodRevenue[r.period] || 0) + r.revenue;
  });

  return {
    records,
    metadata: {
      supplier: 'KEHE',
      periods: [period],
      customers,
      products,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCases,
      periodRevenue
    }
  };
}

