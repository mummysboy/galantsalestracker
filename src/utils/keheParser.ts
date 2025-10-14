import * as XLSX from 'xlsx';
import { AlpineSalesRecord } from './alpineParser';
import { mapToCanonicalProductName } from './productMapping';

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

  // Find header row (should contain "Customer Name" or "Retailer Name", and "Product Description", etc.)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    const joined = row.map(c => String(c || '').toLowerCase()).join(' ');
    if ((joined.includes('customer name') || joined.includes('retailer name')) && joined.includes('product description')) {
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

  // Find column indices - try by name first, then fall back to fixed positions
  // Level 1: Column B (index 1) - Retailer Name
  // Level 2: Column C (index 2) - Customer Name  
  // Level 3: Column N (index 13) - Individual Product Data
  let retailerNameIdx = headersLc.findIndex(h => h.includes('retailer name'));
  let customerNameIdx = headersLc.findIndex(h => h.includes('customer name'));
  
  // Fall back to fixed positions if not found by name
  if (retailerNameIdx === -1) retailerNameIdx = 1; // Column B
  if (customerNameIdx === -1) customerNameIdx = 2; // Column C
  
  
  // Also find other useful columns
  const productDescIdx = headersLc.findIndex(h => h.includes('product description'));
  const brandNameIdx = headersLc.findIndex(h => h.includes('brand name'));
  const productSizeIdx = headersLc.findIndex(h => h.includes('product size'));
  const uomIdx = headersLc.findIndex(h => h === 'uom');
  const currentYearQtyIdx = headersLc.findIndex(h => h.includes('current') && h.includes('year') && h.includes('qty'));
  const currentYearCostIdx = headersLc.findIndex(h => h.includes('current') && h.includes('year') && h.includes('cost'));
  const upcIdx = headersLc.findIndex(h => h === 'upc');
  const addressBookNumberIdx = headersLc.findIndex(h => h.includes('address') && h.includes('book') && h.includes('number'));
  
  // Look for additional company name columns
  const companyNameIdx = headersLc.findIndex(h => h.includes('company') && h.includes('name'));
  const storeNameIdx = headersLc.findIndex(h => h.includes('store') && h.includes('name'));
  const locationNameIdx = headersLc.findIndex(h => h.includes('location') && h.includes('name'));
  
  // Find Column N - try by position 13 (N is 14th column, index 13)
  // Look for product-related data in column N
  const productDataColIdx = 13; // Column N

  const records: AlpineSalesRecord[] = [];
  
  // Parse data rows (start after header row)
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    
    // Skip empty rows
    if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }

    // Extract data using the 3-level hierarchy (as displayed to user):
    // Level 1: Column B (index 1) - Retailer Name
    // Level 2: Column C (index 2) - Customer Name  
    // Level 3: Column N (index 13) - Individual Product Data
    
    const retailerName = String(row[retailerNameIdx] || '').trim(); // Column B
    const customerName = String(row[customerNameIdx] || '').trim(); // Column C
    
    // Try to get product data from Column N (index 13)
    const productDataFromN = productDataColIdx < row.length ? String(row[productDataColIdx] || '').trim() : '';
    
    // Also extract other useful data
    const productDesc = productDescIdx >= 0 ? String(row[productDescIdx] || '').trim() : '';
    const brandName = brandNameIdx >= 0 ? String(row[brandNameIdx] || '').trim() : '';
    const productSize = productSizeIdx >= 0 ? String(row[productSizeIdx] || '').trim() : '';
    const uom = uomIdx >= 0 ? String(row[uomIdx] || '').trim() : '';
    const qty = currentYearQtyIdx >= 0 ? toNumber(row[currentYearQtyIdx]) : 0;
    const cost = currentYearCostIdx >= 0 ? toNumber(row[currentYearCostIdx]) : 0;
    const upc = upcIdx >= 0 ? String(row[upcIdx] || '').trim() : '';
    const addressBookNumber = addressBookNumberIdx >= 0 ? String(row[addressBookNumberIdx] || '').trim() : '';
    
    // Extract full company name if available (for Level 2 display)
    const companyName = companyNameIdx >= 0 ? String(row[companyNameIdx] || '').trim() : '';
    const storeName = storeNameIdx >= 0 ? String(row[storeNameIdx] || '').trim() : '';
    const locationName = locationNameIdx >= 0 ? String(row[locationNameIdx] || '').trim() : '';

    // Skip rows without essential data - be more flexible about which columns are required
    if (!retailerName || (qty === 0 && cost === 0)) {
      continue;
    }
    
    // Determine the best company name to display (Level 2: Customer Name from Column C or derived)
    const fullCompanyName = companyName || storeName || locationName || customerName || 'Unknown Customer';
    
    // For Level 3, use Column N data, fallback to product description
    const finalProductName = productDataFromN || productDesc || brandName || 'Unknown Product';

    // Build size string
    const sizeStr = productSize && uom ? `${productSize} ${uom}` : (productSize || uom || '');
    
    const record: AlpineSalesRecord = {
      customerName: retailerName, // Level 1: Retailer Name (Column B)
      productName: mapToCanonicalProductName(finalProductName), // Level 3: Product Data (Column N) - normalized
      size: sizeStr || undefined,
      cases: Math.round(qty),
      pieces: 0,
      revenue: Math.round(cost * 100) / 100,
      period,
      productCode: upc || undefined,
      customerId: addressBookNumber || undefined,
      accountName: fullCompanyName, // Level 2: Customer Name (Column C or derived)
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



