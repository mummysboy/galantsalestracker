export interface InvoiceRecord {
  customerName: string;
  productName: string;
  quantity: number;
  revenue: number;
  date: string;
  invoiceNumber?: string;
}

export interface ParsedCSVData {
  records: InvoiceRecord[];
  metadata: {
    totalRecords: number;
    uniqueCustomers: number;
    uniqueProducts: number;
    dateRange: {
      earliest: string | null;
      latest: string | null;
    };
    totalRevenue: number;
    totalQuantity: number;
  };
}

export interface CSVParseError {
  row: number;
  column: string;
  value: string;
  message: string;
}

/**
 * Parse CSV data and convert to invoice records
 * @param csvContent Raw CSV content as string
 * @param options Configuration options for parsing
 * @returns Parsed data with metadata
 */
export function parseInvoiceCSV(
  csvContent: string,
  options: {
    columnMappings: {
      customerColumn: string;
      productColumn: string;
      quantityColumn: string;
      revenueColumn: string;
      dateColumn?: string;
      invoiceColumn?: string;
    };
    defaultDate?: string;
    currencySymbol?: string;
    delimiter?: string;
  }
): { data: ParsedCSVData; errors: CSVParseError[] } {
  const {
    columnMappings,
    defaultDate = new Date().toISOString().split('T')[0],
    currencySymbol = '$',
    delimiter = ','
  } = options;

  const lines = csvContent.trim().split('\n');
  const errors: CSVParseError[] = [];
  const records: InvoiceRecord[] = [];

  if (lines.length < 2) {
    errors.push({
      row: 0,
      column: 'file',
      value: 'CSV',
      message: 'CSV file must have at least a header row and one data row'
    });
    return { data: { records: [], metadata: createEmptyMetadata() }, errors };
  }

  // Parse header row
  const headers = parseCSVLine(lines[0], delimiter);
  const customerIndex = headers.findIndex(h => 
    h.toLowerCase().includes(columnMappings.customerColumn.toLowerCase()) ||
    h.toLowerCase().includes('customer') ||
    h.toLowerCase().includes('client')
  );
  const productIndex = headers.findIndex(h => 
    h.toLowerCase().includes(columnMappings.productColumn.toLowerCase()) ||
    h.toLowerCase().includes('product') ||
    h.toLowerCase().includes('item')
  );
  const quantityIndex = headers.findIndex(h => 
    h.toLowerCase().includes(columnMappings.quantityColumn.toLowerCase()) ||
    h.toLowerCase().includes('quantity') ||
    h.toLowerCase().includes('qty') ||
    h.toLowerCase().includes('cases')
  );
  const revenueIndex = headers.findIndex(h => 
    h.toLowerCase().includes(columnMappings.revenueColumn.toLowerCase()) ||
    h.toLowerCase().includes('revenue') ||
    h.toLowerCase().includes('amount') ||
    h.toLowerCase().includes('value') ||
    h.toLowerCase().includes('total')
  );
  const dateIndex = columnMappings.dateColumn ? headers.findIndex(h => 
    h.toLowerCase().includes(columnMappings.dateColumn!.toLowerCase()) ||
    h.toLowerCase().includes('date') ||
    h.toLowerCase().includes('invoice')
  ) : -1;
  const invoiceIndex = (() => {
    const target = columnMappings.invoiceColumn?.toLowerCase();
    return headers.findIndex(h => {
      const hl = h.toLowerCase();
      return (
        (target ? hl.includes(target) : false) ||
        hl === 'invoice' ||
        hl === 'invoice #' ||
        hl === 'invoice number' ||
        hl.includes('invoice') ||
        hl === 'inv' ||
        hl.includes('inv #')
      );
    });
  })();

  // Validate required columns
  if (customerIndex === -1) {
    errors.push({
      row: 1,
      column: 'header',
      value: 'Customer column',
      message: 'Could not find customer column. Please ensure column names contain "customer", "client", or match your specified mapping.'
    });
  }
  if (productIndex === -1) {
    errors.push({
      row: 1,
      column: 'header',
      value: 'Product column',
      message: 'Could not find product column. Please ensure column names contain "product", "item", or match your specified mapping.'
    });
  }
  if (quantityIndex === -1) {
    errors.push({
      row: 1,
      column: 'header',
      value: 'Quantity column',
      message: 'Could not find quantity column. Please ensure column names contain "quantity", "qty", "cases", or match your specified mapping.'
    });
  }
  if (revenueIndex === -1) {
    errors.push({
      row: 1,
      column: 'header',
      value: 'Revenue column',
      message: 'Could not find revenue column. Please ensure column names contain "revenue", "amount", "value", "total", or match your specified mapping.'
    });
  }

  if (errors.length > 0) {
    return { data: { records: [], metadata: createEmptyMetadata() }, errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue; // Skip empty rows

    try {
      const columns = parseCSVLine(row, delimiter);
      
      // Extract values
      const customerName = cleanString(columns[customerIndex]);
      const productName = cleanString(columns[productIndex]);
      const quantityStr = columns[quantityIndex];
      const revenueStr = columns[revenueIndex];
      const dateStr = dateIndex >= 0 ? columns[dateIndex] : defaultDate;
      const invoiceNumberStr = invoiceIndex >= 0 ? columns[invoiceIndex] : '';

      // Validate and parse quantity
      if (!customerName) {
        errors.push({
          row: i + 1,
          column: headers[customerIndex],
          value: customerName,
          message: 'Customer name is required'
        });
        continue;
      }

      if (!productName) {
        errors.push({
          row: i + 1,
          column: headers[productIndex],
          value: productName,
          message: 'Product name is required'
        });
        continue;
      }

      const quantity = parseNumericValue(quantityStr);
      if (quantity === null || quantity < 0) {
        errors.push({
          row: i + 1,
          column: headers[quantityIndex],
          value: quantityStr || '',
          message: 'Quantity must be a valid positive number'
        });
        continue;
      }

      const revenue = parseCurrencyValue(revenueStr, currencySymbol);
      if (revenue === null || revenue < 0) {
        errors.push({
          row: i + 1,
          column: headers[revenueIndex],
          value: revenueStr || '',
          message: 'Revenue must be a valid positive currency amount'
        });
        continue;
      }

      const date = parseDate(dateStr);
      if (!date) {
        errors.push({
          row: i + 1,
          column: headers[dateIndex] || 'Date',
          value: dateStr || '',
          message: 'Date must be in a valid format (YYYY-MM-DD, MM/DD/YYYY, etc.)'
        });
        continue;
      }

      records.push({
        customerName,
        productName,
        quantity,
        revenue,
        date,
        invoiceNumber: cleanString(invoiceNumberStr) || undefined
      });

    } catch (error) {
      errors.push({
        row: i + 1,
        column: 'general',
        value: row.substring(0, 50) + '...',
        message: `Error parsing row: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  // Generate metadata
  const metadata = generateMetadata(records);

  return { data: { records, metadata }, errors };
}

/**
 * Parse BiRite-specific CSV format from your sample data
 */
export function parseBiRiteCSV(csvContent: string): { data: ParsedCSVData; errors: CSVParseError[] } {
  const lines = csvContent.trim().split('\n');
  const errors: CSVParseError[] = [];
  const records: InvoiceRecord[] = [];

  // Skip the first few summary rows and find the actual data
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('SUM of') || lines[i].includes('Customer')) {
      dataStartIndex = i + 1;
      break;
    }
  }

  if (dataStartIndex === -1) {
    errors.push({
      row: 0,
      column: 'file',
      value: 'BiRite CSV',
      message: 'Could not find data section in BiRite CSV format'
    });
    return { data: { records: [], metadata: createEmptyMetadata() }, errors };
  }

  // Process data rows
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.includes('Total') || line === ',') continue;

    const columns = line.split(',');
    if (columns.length < 5) continue;

    const customerName = columns[0].trim().replace(/^"|"$/g, '');
    const productName = columns[1].trim().replace(/^"|"$/g, '');

    // Skip if no customer or product
    if (!customerName || !productName) continue;

    // Parse quarterly data (Q1, Q2, Q3)
    const quarters = [
      { quarter: 'Q1', months: ['01', '02', '03'], date: '2024-03-15' },
      { quarter: 'Q2', months: ['04', '05', '06'], date: '2024-06-15' },
      { quarter: 'Q3', months: ['07', '08', '09'], date: '2024-09-15' }
    ];

    for (let q = 0; q < quarters.length; q++) {
      const qtyStr = columns[q + 2]?.trim();
      if (!qtyStr || qtyStr === '') continue;

      const quantity = parseInt(qtyStr);
      if (isNaN(quantity) || quantity <= 0) continue;

      // Estimate revenue based on typical beverage pricing ($4.50-$4.75)
      const revenue = quantity * 4.50;

      records.push({
        customerName,
        productName,
        quantity,
        revenue: Math.round(revenue * 100) / 100,
        date: quarters[q].date
      });
    }
  }

  const metadata = generateMetadata(records);
  return { data: { records, metadata }, errors };
}

// Helper functions

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function cleanString(str: string): string {
  return str.trim().replace(/^"|"$/g, '');
}

function parseNumericValue(str: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseCurrencyValue(str: string, currencySymbol: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[,\s]/g, '').replace(currencySymbol, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(str: string): string | null {
  if (!str) return null;

  const clean = str.trim().replace(/"/g, '');

  // Already normalized YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // MM/DD/YYYY or M/D/YYYY
  const mdyyyySlash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const m1 = clean.match(mdyyyySlash);
  if (m1) {
    const mm = m1[1].padStart(2, '0');
    const dd = m1[2].padStart(2, '0');
    const yyyy = m1[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // YYYY/MM/DD
  const yyyyslash = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;
  const m2 = clean.match(yyyyslash);
  if (m2) {
    const yyyy = m2[1];
    const mm = m2[2].padStart(2, '0');
    const dd = m2[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // MM-DD-YYYY or M-D-YYYY
  const mdyyyyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const m3 = clean.match(mdyyyyDash);
  if (m3) {
    const mm = m3[1].padStart(2, '0');
    const dd = m3[2].padStart(2, '0');
    const yyyy = m3[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // Last resort: construct UTC to avoid timezone shifts
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function generateMetadata(records: InvoiceRecord[]) {
  if (records.length === 0) {
    return createEmptyMetadata();
  }

  const customers = new Set(records.map(r => r.customerName));
  const products = new Set(records.map(r => r.productName));
  const dates = records.map(r => r.date).filter(d => d);
  const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0);
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);

  return {
    totalRecords: records.length,
    uniqueCustomers: customers.size,
    uniqueProducts: products.size,
    dateRange: {
      earliest: dates.length > 0 ? dates.sort()[0] : null,
      latest: dates.length > 0 ? dates.sort().reverse()[0] : null
    },
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalQuantity
  };
}

function createEmptyMetadata() {
  return {
    totalRecords: 0,
    uniqueCustomers: 0,
    uniqueProducts: 0,
    dateRange: { earliest: null, latest: null },
    totalRevenue: 0,
    totalQuantity: 0
  };
}
