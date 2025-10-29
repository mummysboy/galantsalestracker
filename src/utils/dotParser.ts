import { AlpineSalesRecord } from './alpineParser';
import { mapToCanonicalProductName, getItemNumberFromDotCode, PRODUCT_MAPPINGS } from './productMapping';

// Helper function to safely parse numbers
function toNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = parseFloat(String(val).trim());
  return isNaN(num) ? 0 : num;
}

export async function parseDotCSV(file: File): Promise<{ records: AlpineSalesRecord[] }> {
  const text = await file.text();
  const lines = text.split('\n').map(l => l.trim());
  
  // Parse header
  const headerLine = lines[0];
  if (!headerLine) {
    throw new Error('Empty CSV file');
  }
  
  const headers = headerLine.split('\t').map(h => h.trim().toLowerCase());
  
  // Debug: Log header columns to identify column T
  console.log('[DOT Parser] Headers:', headers.map((h, i) => `${String.fromCharCode(65 + i)}: ${h}`).join(', '));
  
  // Find column indices
  const dateRangeIdx = headers.findIndex(h => h.includes('date range'));
  const customerNameIdx = headers.findIndex(h => h.includes('customer name'));
  const itemDescIdx = headers.findIndex(h => h.includes('item full description') || h.includes('item description'));
  const customerItemIdx = headers.findIndex(h => h.includes('customer item') && h.includes('#'));
  const dotIdIdx = headers.findIndex(h => h === 'dot #');
  const mfgIdx = headers.findIndex(h => h === 'mfg #');
  const dollarsIdx = headers.findIndex(h => h === 'dollars');
  const grossWtIdx = headers.findIndex(h => h.includes('item gross wt'));
  const netWtIdx = headers.findIndex(h => h.includes('item net wt'));
  
  // Find column T - prioritize index 19 (column T in Excel), but validate it
  // Column T should contain the total cases quantity
  let columnTIdx = 19; // Start with column T (index 19, 20th letter)
  const columnTHeaderAt19 = headers[19]?.toLowerCase() || '';
  
  // Check if column 19 has a quantity-related header
  const isColumn19Quantity = columnTHeaderAt19 && (
    columnTHeaderAt19.includes('qty') || 
    columnTHeaderAt19.includes('case') || 
    columnTHeaderAt19.includes('quantity')
  );
  
  // If column 19 doesn't exist or doesn't look like a quantity column, search by name
  if (headers.length <= 19 || !isColumn19Quantity) {
    console.warn(`[DOT Parser] Column T (index 19) header is "${columnTHeaderAt19 || 'missing'}". Searching for quantity column by name...`);
    
    // Search for quantity/cases column by header name
    const foundIdx = headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('qty') || lower.includes('case') || lower.includes('quantity') || 
             lower.includes('qty received') || lower.includes('qty ordered') ||
             lower.includes('total qty') || lower.includes('total quantity');
    });
    
    if (foundIdx !== -1) {
      columnTIdx = foundIdx;
      console.log(`[DOT Parser] Found quantity column at index ${foundIdx} with header "${headers[foundIdx]}"`);
    } else {
      // Use column 19 anyway (as requested by user: "it should calculate the total from column T")
      columnTIdx = 19;
      console.warn(`[DOT Parser] No quantity column found by name. Using column T (index 19) with header "${columnTHeaderAt19 || 'N/A'}"`);
    }
  } else {
    console.log(`[DOT Parser] Column T (index 19) header "${columnTHeaderAt19}" confirmed as quantity column.`);
  }
  
  const columnTHeader = headers[columnTIdx]?.toLowerCase() || '';
  console.log('[DOT Parser] Using column index:', columnTIdx, `(Excel column ${String.fromCharCode(65 + columnTIdx)}), Header:`, columnTHeader || 'N/A');
  
  if (customerNameIdx === -1 || itemDescIdx === -1 || dollarsIdx === -1) {
    throw new Error('Missing required columns in CSV');
  }
  
  // Parse date range from first data row
  let period = '2024-01';
  const rows = lines.slice(1).filter(line => line.length > 0);
  
  if (rows.length > 0 && dateRangeIdx >= 0) {
    const firstDataLine = rows[0].split('\t');
    const dateRangeStr = dateRangeIdx < firstDataLine.length 
      ? String(firstDataLine[dateRangeIdx] || '').trim() 
      : '';
    
    // Parse date range like "2024-01-01 to 2024-01-31" 
    const match = dateRangeStr.match(/(\d{4})-(\d{2})-/);
    if (match) {
      const year = match[1];
      const month = match[2];
      period = `${year}-${month}`;
    }
  }
  
  const records: AlpineSalesRecord[] = [];
  
  // Parse data rows
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r].split('\t');
    
    // Skip empty rows
    if (row.every(cell => !cell || String(cell).trim() === '')) {
      continue;
    }
    
    const customerName = customerNameIdx >= 0 ? String(row[customerNameIdx] || '').trim() : '';
    const itemDesc = itemDescIdx >= 0 ? String(row[itemDescIdx] || '').trim() : '';
    const revenue = dollarsIdx >= 0 ? toNumber(row[dollarsIdx]) : 0;
    const customerItemCode = customerItemIdx >= 0 ? String(row[customerItemIdx] || '').trim() : '';
    const dotId = dotIdIdx >= 0 ? String(row[dotIdIdx] || '').trim() : '';
    const mfgCode = mfgIdx >= 0 ? String(row[mfgIdx] || '').trim() : '';
    
    // Get weight from column - prefer net weight, fallback to gross weight
    const grossWt = grossWtIdx >= 0 ? toNumber(row[grossWtIdx]) : 0;
    const netWt = netWtIdx >= 0 ? toNumber(row[netWtIdx]) : 0;
    
    // Use column T for cases - this is the source of truth
    // Column T should contain the total cases (may be negative for returns)
    const rawColumnTValue = row.length > columnTIdx ? String(row[columnTIdx] || '').trim() : '';
    const cases = row.length > columnTIdx ? toNumber(row[columnTIdx]) : 0;
    
    // Enhanced debug logging to show calculation details
    if (r < 5 || cases !== 0) {
      console.log(`[DOT Parser] Row ${r}:`, {
        customerName: customerName.substring(0, 30),
        itemDesc: itemDesc.substring(0, 30),
        columnTIndex: columnTIdx,
        columnTExcelLetter: String.fromCharCode(65 + columnTIdx),
        columnTRawValue: rawColumnTValue,
        columnTParsedValue: cases,
        revenue: revenue,
        rowLength: row.length,
        allRowValues: row.slice(Math.max(0, columnTIdx - 2), columnTIdx + 3).map((v, i) => 
          `${String.fromCharCode(65 + columnTIdx - 2 + i)}: "${v}"`
        ).join(', ')
      });
    }
    
    // Skip rows without essential data
    // Allow negative cases and revenue (returns/credits) - only skip if both are zero
    if (!customerName || !itemDesc || (cases === 0 && revenue === 0)) {
      continue;
    }
    
    // Get total weight from column T (item net wt or item gross wt)
    // Column T contains total weight for the line item - preserves negative values for returns
    let totalWeightLbs: number | undefined = undefined;
    if (netWt !== 0 || grossWt !== 0) {
      totalWeightLbs = netWt !== 0 ? netWt : grossWt;
      
      // Ensure weight sign matches cases sign for correct subtraction from totals
      // If cases is negative (return), weight must also be negative
      if (cases !== 0 && totalWeightLbs !== 0) {
        const weightSign = Math.sign(totalWeightLbs);
        const casesSign = Math.sign(cases);
        // If cases is negative (return) but weight is positive, make weight negative
        // This ensures negative cases subtract weight from totals correctly
        if (casesSign < 0 && weightSign > 0) {
          totalWeightLbs = -Math.abs(totalWeightLbs);
        }
      }
    }
    
    // Try to map by DOT product code first, then fall back to description
    let canonicalProductName = mapToCanonicalProductName(dotId || '');
    // If the DOT code didn't map, try the MFG code
    if (canonicalProductName === (dotId || '')) {
      canonicalProductName = mapToCanonicalProductName(mfgCode || '');
    }
    // If still no mapping, try the product description
    if (canonicalProductName === (mfgCode || '') || !canonicalProductName) {
      canonicalProductName = mapToCanonicalProductName(itemDesc);
    }
    
    // Get our internal item number from the DOT product code if available
    let ourItemNumber = getItemNumberFromDotCode(dotId);
    // If not found by DOT code, try by MFG code via canonical name lookup
    if (!ourItemNumber) {
      const mapping = PRODUCT_MAPPINGS.find(m => m.canonicalName === canonicalProductName);
      ourItemNumber = mapping ? mapping.itemNumber : undefined;
    }
    
    const record: AlpineSalesRecord = {
      period,
      customerName,
      productName: canonicalProductName,
      productCode: dotId || mfgCode || customerItemCode,
      cases,
      pieces: 0,
      revenue,
      excludeFromTotals: true, // DOT data should not be included in Total calculations
      weightLbs: totalWeightLbs,
      itemNumber: ourItemNumber,
      isAdjustment: false,
    };
    
    records.push(record);
  }
  
  // Aggregate records by customer, product, and period to combine multiple transactions
  // This ensures column T values are properly summed when there are multiple rows
  const aggregatedRecords = new Map<string, AlpineSalesRecord>();
  
  records.forEach(record => {
    const key = `${record.customerName}|${record.productName}|${record.period}`;
    
    if (aggregatedRecords.has(key)) {
      // Combine with existing record - sum cases and revenue from column T
      const existing = aggregatedRecords.get(key)!;
      existing.cases += record.cases; // Sum cases from column T
      existing.revenue = Math.round((existing.revenue + record.revenue) * 100) / 100;
      existing.pieces += record.pieces;
      if (record.weightLbs !== undefined) {
        existing.weightLbs = (existing.weightLbs || 0) + record.weightLbs;
      }
    } else {
      // Create new aggregated record
      aggregatedRecords.set(key, { ...record });
    }
  });
  
  const finalRecords = Array.from(aggregatedRecords.values());
  
  console.log(`[DOT Parser] Aggregated ${records.length} raw records into ${finalRecords.length} unique records`);
  console.log(`[DOT Parser] Total cases from column T: ${finalRecords.reduce((sum, r) => sum + r.cases, 0)}`);
  
  return { records: finalRecords };
}
