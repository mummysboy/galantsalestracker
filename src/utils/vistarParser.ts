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

export async function parseVistarXLSX(file: File): Promise<ParsedVistarData> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  const allRecords: AlpineSalesRecord[] = [];

  // Process both 2024 and 2025 sheets
  const sheetsToProcess = ['2024', '2025'].filter(sheetName => wb.SheetNames.includes(sheetName));

  for (const sheetName of sheetsToProcess) {
    const ws = wb.Sheets[sheetName];
    
    // Parse all rows
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
    if (!rows || rows.length === 0) {
      continue;
    }

    // Find header row (should contain "OPCO Desc", "Customer Desc", "Item Description", etc.)
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
      continue;
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

    // Parse data rows
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      
      // Skip empty rows
      if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
        continue;
      }

      const reportValue = reportIdx >= 0 ? row[reportIdx] : null;
      const period = parsePeriodFromReport(reportValue);
      
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

