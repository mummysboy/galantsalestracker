import * as XLSX from 'xlsx';
import { AlpineSalesRecord } from './alpineParser';
import { mapToCanonicalProductName, getItemNumberFromPetesCode } from './productMapping';

export interface ParsedPetesData {
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
  // e.g., "Petes 6.25 sales Claras.xlsx" -> 2025-06
  const m = fileName.match(/(\d{1,2})\.(\d{2})/);
  if (m) {
    const mm = m[1].padStart(2, '0');
    return `20${m[2]}-${mm}`;
  }
  // fallback current month (UTC)
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function normalizePeriodFromDateLike(value: any, fallbackPeriod: string): string {
  if (!value) return fallbackPeriod;
  try {
    if (typeof value === 'string') {
      const s = value.trim();
      // YYYY-MM or YYYY-MM-DD
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(s)) {
        return s.slice(0, 7);
      }
      // MM/DD/YYYY or M/D/YY
      const mdyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (mdyyyy) {
        const mm = mdyyyy[1].padStart(2, '0');
        const yyyy = mdyyyy[3].length === 2 ? `20${mdyyyy[3]}` : mdyyyy[3];
        return `${yyyy}-${mm}`;
      }
    }
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      return `${yyyy}-${mm}`;
    }
  } catch (_e) {}
  return fallbackPeriod;
}

function chooseColumn(headers: string[], candidates: string[]): number {
  const lc = (headers || []).map(h => String(h ?? '').trim().toLowerCase());
  const cand = (candidates || []).filter(Boolean).map(c => String(c).toLowerCase());
  return lc.findIndex(h => typeof h === 'string' && h.length > 0 && cand.some(c => h.indexOf(c) !== -1));
}

function chooseRevenueColumn(headers: string[]): number {
  const lc = (headers || []).map(h => String(h ?? '').trim().toLowerCase());
  // Prefer explicit currency columns for line items; DO NOT use Balance for line rows
  const strongCandidates = ['revenue', 'sales', 'amount', 'ext', 'extended', 'net', 'net sales', 'dollars', '$'];
  for (let i = 0; i < lc.length; i++) {
    const h = lc[i];
    if (!h) continue;
    const isCount = h.includes('qty') || h.includes('quantity') || h.includes('cases') || h.includes('units') || h.includes('count');
    if (isCount) continue;
    // exclude likely non-dollar monetary fields
    const isBad = h.includes('balance') || h.includes('tax') || h.includes('crv') || h.includes('deposit');
    if (isBad) continue;
    if (strongCandidates.some(c => h.includes(c))) return i;
  }
  // Accept 'total' if it does not refer to counts
  for (let i = 0; i < lc.length; i++) {
    const h = lc[i];
    if (!h) continue;
    const isCount = h.includes('qty') || h.includes('quantity') || h.includes('cases') || h.includes('units') || h.includes('count');
    if (isCount) continue;
    if (h.includes('total')) return i;
  }
  return -1;
}

function excelSerialToISODate(value: number): string | null {
  if (typeof value !== 'number' || !isFinite(value)) return null;
  // Heuristic range for Excel date serials
  if (value < 20000 || value > 60000) return null;
  const base = Date.UTC(1899, 11, 30); // Excel epoch
  const ms = base + Math.round(value) * 86400000;
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function parsePetesXLSX(file: File): Promise<ParsedPetesData> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // First row as headers
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
  if (!rows || rows.length === 0) {
    return {
      records: [],
      metadata: {
        supplier: "PETE'S COFFEE",
        periods: [],
        customers: [],
        products: [],
        totalRevenue: 0,
        totalCases: 0,
        periodRevenue: {}
      }
    };
  }

  // Try to detect Claras-style header row (strict mapping): Account/Account Name, Memo/Description, Qty/Cases, Ext/Amount
  const normalizeHeader = (v: any) => String(v ?? '').trim().toLowerCase();
  const hasClarasHeaders = (hdrs: string[]) => {
    const h = hdrs.map(normalizeHeader);
    const hasAccount = h.some(x => x === 'account' || x === 'account name' || x === 'customer' || x === 'store' || x === 'account#' || x === 'acct' || x === 'acct name');
    const hasMemo = h.some(x => x === 'memo' || x === 'description' || x === 'item' || x === 'product');
    const hasQty = h.some(x => x === 'qty' || x === 'quantity' || x === 'cases' || x === 'units');
    const hasExt = h.some(x => x === 'ext' || x === 'amount' || x === 'extended' || x === 'sales' || x === '$');
    return hasAccount && hasMemo && hasQty && hasExt;
  };

  // Find a plausible header row: prefer Claras strict match; otherwise fall back to heuristic pattern
  let headerRowIdx = 0;
  let clarifiedMode = false;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i] || [];
    const headersProbe = (row || []).map(c => String(c || '').trim());
    if (hasClarasHeaders(headersProbe)) {
      headerRowIdx = i;
      clarifiedMode = true;
      break;
    }
  }
  if (!clarifiedMode) {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i] || [];
      const joined = row.map(c => String(c || '').toLowerCase()).join(' ');
      if (/(customer|account|store).*(product|item|description)/.test(joined)) {
        headerRowIdx = i;
        break;
      }
    }
  }

  const headers = (rows[headerRowIdx] || []).map(c => String(c || '').trim());
  const headersLc = headers.map(h => String(h ?? '').trim().toLowerCase());
  // Map columns: in Claras mode, favor exact header matches first
  const idxOf = (names: string[]) => {
    const lc = headers.map(h => normalizeHeader(h));
    for (let i = 0; i < lc.length; i++) {
      if (names.includes(lc[i])) return i;
    }
    return -1;
  };
  const customerIdx = clarifiedMode
    ? (() => {
        const exact = idxOf(['account name', 'account', 'customer', 'store', 'acct name', 'account#', 'acct']);
        return exact >= 0 ? exact : chooseColumn(headers, ['name', 'customer', 'account', 'store']);
      })()
    : chooseColumn(headers, ['name', 'customer', 'account', 'store']);
  const productIdx = clarifiedMode
    ? (() => {
        const exact = idxOf(['memo', 'description', 'item', 'product']);
        return exact >= 0 ? exact : chooseColumn(headers, ['memo', 'product', 'item', 'description']);
      })()
    : chooseColumn(headers, ['memo', 'product', 'item', 'description']);
  const qtyIdx = clarifiedMode
    ? (() => {
        const exact = idxOf(['qty', 'quantity', 'cases', 'units']);
        return exact >= 0 ? exact : chooseColumn(headers, ['qty', 'quantity', 'cases', 'units']);
      })()
    : chooseColumn(headers, ['qty', 'quantity', 'cases', 'units']);
  const revenueIdx = clarifiedMode
    ? (() => {
        const exact = idxOf(['ext', 'amount', 'extended', 'sales', '$']);
        return exact >= 0 ? exact : chooseRevenueColumn(headers);
      })()
    : chooseRevenueColumn(headers);
  const priceIdx = clarifiedMode
    ? (() => {
        const exact = idxOf(['price', 'unit price', 'u/p', 'unit', 'each', 'cost']);
        return exact >= 0 ? exact : chooseColumn(headers, ['price', 'unit', 'each', 'u/p', 'unit price', 'cost']);
      })()
    : chooseColumn(headers, ['price', 'unit', 'each', 'u/p', 'unit price', 'cost']);
  const dateIdx = clarifiedMode
    ? (() => {
        const exact = idxOf(['date', 'period', 'month']);
        return exact >= 0 ? exact : chooseColumn(headers, ['date', 'period', 'month']);
      })()
    : chooseColumn(headers, ['date', 'period', 'month']);
  const codeIdx = clarifiedMode
    ? (() => {
        const exact = idxOf(['code', 'sku', 'item #', 'item#', 'product code']);
        return exact >= 0 ? exact : chooseColumn(headers, ['code', 'sku', 'item #', 'item#', 'product code']);
      })()
    : chooseColumn(headers, ['code', 'sku', 'item #', 'item#', 'product code']);

  // Detect a dedicated Balance column for reported totals (not per-line amounts)
  const balanceIdx = (() => {
    for (let i = 0; i < headersLc.length; i++) {
      const h = headersLc[i];
      if (!h) continue;
      if (h.includes('balance') || h.includes('balance due')) return i;
    }
    return -1;
  })();

  // Attempt to detect a sheet-level customer name if not present in row data
  let sheetLevelCustomer: string | null = null;
  if (customerIdx === -1) {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i] || [];
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] ?? '').trim();
        const lc = cell.toLowerCase();
        // Patterns like "Customer:", "Account:", "Store:"
        const m = cell.match(/^(Customer|Account|Store|Acct|Account Name)\s*[:#-]?\s*(.+)$/i);
        if (m && m[2]) {
          sheetLevelCustomer = m[2].trim();
          break;
        }
        // If a cell contains something like "Account Name" followed by a value in the next cell
        if (/(customer|account|store|account name)/i.test(lc)) {
          const next = String(row[j + 1] ?? '').trim();
          if (next) {
            sheetLevelCustomer = next;
            break;
          }
        }
      }
      if (sheetLevelCustomer) break;
    }
  }

  const fallbackPeriod = detectPeriodFromFileName(file.name || '');

  const records: AlpineSalesRecord[] = [];
  let reportedTotalCases: number | null = null;
  let reportedTotalRevenue: number | null = null;
  let currentProductCode: string | null = null; // Track Pete's product code from grouped headers
  
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    
    // Check if this row is a product code header: "59975 (CLARA'S Uncured Bacon Breakfast Burrito 12/8oz)"
    // These headers appear in any column and signal the start of a new product section
    let isProductCodeHeader = false;
    for (let col = 0; col < row.length; col++) {
      const cellValue = String(row[col] ?? '').trim();
      const codeMatch = cellValue.match(/^(\d{5,6})\s*\((.+?)\)$/);
      if (codeMatch) {
        currentProductCode = codeMatch[1]; // Extract Pete's product code
        isProductCodeHeader = true;
        break; // Found the product code, no need to check other columns
      }
    }
    
    // Skip to next row if this is a product code header - it's not a data row
    if (isProductCodeHeader) continue;
    
    // Skip row if clearly empty
    if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;

    let customerName = String(customerIdx >= 0 ? (row[customerIdx] ?? '') : (sheetLevelCustomer ?? '')).trim();
    
    // Clean up customer name - extract only the actual customer name if it contains concatenated data
    if (customerName.includes(':')) {
      // If customer name contains a colon, take the part after the colon (e.g., "Employee Purchases:jose Olea" -> "jose Olea")
      const parts = customerName.split(':');
      customerName = parts[parts.length - 1].trim();
    }
    
    // Additional cleanup for common concatenation patterns
    customerName = customerName.replace(/^(Employee Purchases|Staff|Internal|Admin)[:\s]*/i, '').trim();
    
    // Ensure we only use data from the designated customer column, not concatenated data
    if (customerName && customerIdx >= 0) {
      // Double-check that we're using the correct column value
      const rawCustomerValue = String(row[customerIdx] ?? '').trim();
      if (rawCustomerValue !== customerName && !customerName.includes(rawCustomerValue)) {
        // If there's a mismatch, prefer the raw column value
        customerName = rawCustomerValue;
      }
    }
    
    const productName = String(productIdx >= 0 ? (row[productIdx] ?? '') : '').trim();
    // Detect totals even if product/customer columns are blank by scanning all cells for total-like labels
    const rowTextJoined = row.map(c => String(c ?? '').toLowerCase()).join(' ');
    const looksLikeTotalRow = /(^|\s)(total|subtotal|grand total|balance|balance due)(:)?(\s|$)/.test(rowTextJoined);
    if (!productName || looksLikeTotalRow) {
      // Capture reported bottom-line totals if present in the same qty/revenue columns
      if (qtyIdx >= 0) {
        const q = toNumber(row[qtyIdx]);
        if (isFinite(q) && q !== 0) reportedTotalCases = q;
      }
      // Prefer a dedicated Balance column; fall back to revenue column in total rows
      if (balanceIdx >= 0) {
        const bal = toNumber(row[balanceIdx]);
        if (isFinite(bal) && bal !== 0) reportedTotalRevenue = Math.round(bal * 100) / 100;
      } else if (revenueIdx >= 0) {
        const rev = toNumber(row[revenueIdx]);
        if (isFinite(rev) && rev !== 0) reportedTotalRevenue = Math.round(rev * 100) / 100;
      }
      if (looksLikeTotalRow) {
        continue; // skip summary/total rows
      }
      // If no product name but not a total line, skip the row entirely
      if (!productName) continue;
    }

    // Note: include CRV/deposits/taxes/fees/freight in revenue totals to match reports

    const quantityVal = qtyIdx >= 0 ? row[qtyIdx] : 0;
    let revenueVal = revenueIdx >= 0 ? row[revenueIdx] : 0;
    let dateVal = dateIdx >= 0 ? row[dateIdx] : undefined;
    if (typeof dateVal === 'number') {
      const iso = excelSerialToISODate(dateVal);
      if (iso) dateVal = iso;
    }
    const codeVal = codeIdx >= 0 ? row[codeIdx] : '';

    const period = normalizePeriodFromDateLike(dateVal, fallbackPeriod);
    const rawQty = toNumber(quantityVal);
    const cases = Math.round(rawQty);
    let revenue = Math.round(toNumber(revenueVal) * 100) / 100;
    // If revenue is missing or likely mis-identified, try unit price × quantity
    if ((!revenue || revenue === cases) && priceIdx >= 0) {
      const unitPrice = toNumber(row[priceIdx]);
      if (unitPrice && rawQty) {
        revenue = Math.round(unitPrice * rawQty * 100) / 100;
      }
    }

    // Try to map by Pete's product code first, then fall back to description
    let mappedProductName = productName;
    let ourItemNumber: string | undefined = undefined;
    let pack: number | undefined = undefined;
    let sizeOz: number | undefined = undefined;
    
    if (currentProductCode) {
      // Try mapping by Pete's code
      const codeMapping = mapToCanonicalProductName(currentProductCode);
      if (codeMapping !== currentProductCode) {
        // Code was successfully mapped
        mappedProductName = codeMapping;
        // Get our internal item number from Pete's code
        ourItemNumber = getItemNumberFromPetesCode(currentProductCode);
        
        // Set pack and size based on Pete's product code
        // Burritos: 12/8oz cases
        if (['59975', '59976', '59977'].includes(currentProductCode)) {
          pack = 12;
          sizeOz = 8;
        }
        // Sandwiches: 12/cs (count varies by product)
        else if (['59984', '59985', '59986', '59987'].includes(currentProductCode)) {
          pack = 12;
          sizeOz = undefined; // Sandwiches don't have standard weight per unit
        }
      } else {
        // Code didn't map, try description
        mappedProductName = mapToCanonicalProductName(productName);
      }
    } else {
      // No Pete's code available, map by description
      mappedProductName = mapToCanonicalProductName(productName);
    }
    
    // Fallback: Set pack and size based on mapped product name if not already set
    if (pack === undefined && sizeOz === undefined) {
      const productNameLower = mappedProductName.toLowerCase();
      
      // Check for burrito products
      if (productNameLower.includes('burrito') && 
          (productNameLower.includes('bacon') || 
           productNameLower.includes('sausage') || 
           productNameLower.includes('chile') || 
           productNameLower.includes('verde'))) {
        pack = 12;
        sizeOz = 8;
      }
      // Check for sandwich products
      else if (productNameLower.includes('sandwich') && 
               (productNameLower.includes('chorizo') || 
                productNameLower.includes('pesto') || 
                productNameLower.includes('turkey') || 
                productNameLower.includes('bacon'))) {
        pack = 12;
        sizeOz = undefined; // Sandwiches don't have standard weight per unit
      }
    }
    
    const rec: AlpineSalesRecord = {
      customerName,
      productName: mappedProductName, // Use mapped canonical name
      cases,
      pieces: 0,
      revenue,
      period,
      productCode: currentProductCode || (codeVal ? String(codeVal) : undefined), // Use Pete's code if available
      itemNumber: ourItemNumber, // Our internal item number (321, 331, etc.)
      pack: pack, // Pack size for weight calculation
      sizeOz: sizeOz, // Size in ounces for weight calculation
      excludeFromTotals: true, // Pete's is a sub-distributor; exclude to avoid double-counting
    };
    records.push(rec);
  }

  // Reconcile to reported bottom-line totals by adding a synthetic adjustment record
  let computedRevenue = records.reduce((s, r) => s + r.revenue, 0);
  let computedCases = records.reduce((s, r) => s + r.cases, 0);
  if (reportedTotalRevenue !== null || reportedTotalCases !== null) {
    const period = records.length > 0 ? records[0].period : fallbackPeriod;
    const revTarget = reportedTotalRevenue !== null ? reportedTotalRevenue : computedRevenue;
    const casesTarget = reportedTotalCases !== null ? Math.round(reportedTotalCases) : computedCases;
    const revDiff = Math.round((revTarget - computedRevenue) * 100) / 100;
    const casesDiff = Math.round(casesTarget - computedCases);
    if (Math.abs(revDiff) > 0.009 || casesDiff !== 0) {
      // Add adjustment record with proper customer name from existing data
      const existingCustomer = records.length > 0 ? records[0].customerName : 'Unknown Customer';
      records.push({
        customerName: existingCustomer,
        productName: 'Sheet Bottom-Line Adjustment',
        cases: casesDiff,
        pieces: 0,
        revenue: revDiff,
        period,
        productCode: 'ADJ',
        excludeFromTotals: true, // Pete's is a sub-distributor; exclude to avoid double-counting
        isAdjustment: true, // Mark as adjustment record so it doesn't appear as a product
      });
      // Update computed totals to match targets
      computedRevenue = revTarget;
      computedCases = casesTarget;
    }
  }

  const customers = Array.from(new Set(records.map(r => r.customerName)));
  const products = Array.from(new Set(records.map(r => r.productName)));
  const periods = Array.from(new Set(records.map(r => r.period))).sort();
  const totalRevenue = Math.round(computedRevenue * 100) / 100;
  const totalCases = computedCases;
  const periodRevenue: Record<string, number> = {};
  records.forEach(r => {
    periodRevenue[r.period] = (periodRevenue[r.period] || 0) + r.revenue;
  });

  return {
    records,
    metadata: {
      supplier: "PETE'S COFFEE",
      periods,
      customers,
      products,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCases,
      periodRevenue
    }
  };
}


