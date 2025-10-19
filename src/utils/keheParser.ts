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

export async function parseKeHeCSV(file: File): Promise<ParsedKeHeData> {
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

  // Detect period from Date Range - in CSV format, look in the first data row
  let period = '';
  if (rows.length > 1) {
    const firstDataRow = rows[1]; // First row after header
    const dateRangeIdx = firstDataRow.findIndex(cell => 
      String(cell).includes('1/1/2025 to 1/31/2025') || 
      String(cell).includes('Date Range')
    );
    if (dateRangeIdx >= 0) {
      const dateRangeCell = String(firstDataRow[dateRangeIdx]);
      if (dateRangeCell.includes('1/1/2025 to 1/31/2025')) {
        period = detectPeriodFromDateRange(dateRangeCell);
      }
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

  // Find header row - in CSV format, it's the first row
  let headerRowIdx = 0; // CSV header is always the first row

  const headers = (rows[headerRowIdx] || []).map(c => String(c || '').trim());
  const headersLc = headers.map(h => h.toLowerCase());

  // Find column indices - try by name first, then fall back to fixed positions
  // Column 19: RetailerName
  // Column 20: CustomerName  
  // Column 30: ProductDescription
  let retailerNameIdx = headersLc.findIndex(h => h.includes('retailername'));
  let customerNameIdx = headersLc.findIndex(h => h.includes('customername'));
  
  // Fall back to fixed positions if not found by name
  if (retailerNameIdx === -1) retailerNameIdx = 18; // Column 19 (0-indexed)
  if (customerNameIdx === -1) customerNameIdx = 19; // Column 20 (0-indexed)
  
  
  // Also find other useful columns
  let productDescIdx = headersLc.findIndex(h => h.includes('productdescription'));
  let brandNameIdx = headersLc.findIndex(h => h.includes('brandname'));
  let productSizeIdx = headersLc.findIndex(h => h.includes('productsize'));
  let uomIdx = headersLc.findIndex(h => h === 'uom');
  let currentYearQtyIdx = headersLc.findIndex(h => h.includes('currentyearqty'));
  let currentYearCostIdx = headersLc.findIndex(h => h.includes('currentyearcost'));
  let upcIdx = headersLc.findIndex(h => h === 'upc');
  let addressBookNumberIdx = headersLc.findIndex(h => h.includes('addressbooknumber'));
  
  // Look for additional company name columns
  const companyNameIdx = headersLc.findIndex(h => h.includes('company') && h.includes('name'));
  const storeNameIdx = headersLc.findIndex(h => h.includes('store') && h.includes('name'));
  const locationNameIdx = headersLc.findIndex(h => h.includes('location') && h.includes('name'));

  // Fall back to fixed positions if not found by name
  if (productDescIdx === -1) productDescIdx = 29; // Column 30 (0-indexed)
  if (brandNameIdx === -1) brandNameIdx = 28; // Column 29 (0-indexed)  
  if (upcIdx === -1) upcIdx = 27; // Column 28 (0-indexed)
  if (currentYearQtyIdx === -1) currentYearQtyIdx = 37; // Column 38 (0-indexed) - CurrentYearQTY
  if (currentYearCostIdx === -1) currentYearCostIdx = 39; // Column 40 (0-indexed) - CurrentYearCost
  if (productSizeIdx === -1) productSizeIdx = 30; // Column 31 (0-indexed) - ProductSize
  if (addressBookNumberIdx === -1) addressBookNumberIdx = 20; // Column 21 (0-indexed)
  
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

    // Extract data using the correct CSV column structure:
    // Column 19: RetailerName
    // Column 20: CustomerName  
    // Column 30: ProductDescription
    
    const retailerName = String(row[retailerNameIdx] || '').trim(); // Column 19
    const customerName = String(row[customerNameIdx] || '').trim(); // Column 20
    
    // Get product data from ProductDescription column
    const productDataFromN = productDescIdx < row.length ? String(row[productDescIdx] || '').trim() : '';
    
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
    
    // Extract KeHE UPC code from ProductDescription column
    // KeHE reports use UPC codes in the ProductDescription field (e.g., "611665888010")
    let keheUPC = '';
    let finalProductName = productDataFromN || productDesc || brandName || 'Unknown Product';
    
    // Check if the ProductDescription contains a KeHE UPC code (12-digit number starting with 611665)
    const upcMatch = finalProductName.match(/^611665\d{6}$/);
    if (upcMatch) {
      keheUPC = upcMatch[0];
      // If we found a UPC, try to map it to canonical name first
      const mappedFromUPC = mapToCanonicalProductName(keheUPC);
      if (mappedFromUPC !== keheUPC) {
        // UPC was successfully mapped to canonical name
        finalProductName = mappedFromUPC;
      } else {
        // UPC didn't map, keep original product name and try mapping by description
        finalProductName = mapToCanonicalProductName(finalProductName);
      }
    } else {
      // No UPC found, map by description
      finalProductName = mapToCanonicalProductName(finalProductName);
    }

    // Build size string
    const sizeStr = productSize && uom ? `${productSize} ${uom}` : (productSize || uom || '');
    
    const record: AlpineSalesRecord = {
      customerName: retailerName, // Level 1: Retailer Name (Column B)
      productName: finalProductName, // Level 3: Product Data (Column N) - normalized
      size: sizeStr || undefined,
      cases: Math.round(qty / 12),
      pieces: 0,
      revenue: Math.round(cost * 100) / 100,
      period,
      productCode: keheUPC || upc || undefined, // Use KeHE UPC if available, fallback to original UPC
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



