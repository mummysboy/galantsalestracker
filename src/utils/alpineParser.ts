export interface AlpineSalesRecord {
  customerName: string;
  productName: string;
  size?: string;
  cases: number;
  pieces: number;
  netLbs?: number;
  revenue: number;
  mfgItemNumber?: string;
  period: string; // e.g., "2025-06", "2025-07", "2025-08"
  customerId?: string;
  productCode?: string;
}

export interface ParsedAlpineData {
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

/**
 * Parse Alpine TXT sales report files
 * @param txtContent Raw TXT content as string
 * @param reportDate Report date to identify the period (format: YYYY-MM)
 * @returns Parsed Alpine sales data
 */
export function parseAlpineTXT(txtContent: string, reportDate: string): ParsedAlpineData {
  const lines = txtContent.split('\n');
  const records: AlpineSalesRecord[] = [];
  const supplier = 'ALPINE';
  
  
  // Look for period information in the header
  const headerLine = lines.find(line => line.includes('FROM :') && line.includes('THRU'));
  let period = reportDate;
  if (headerLine) {
    const match = headerLine.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/g);
    if (match && match.length >= 2) {
      const [, toDate] = match;
      const [month, day, year] = toDate.includes('/') ? toDate.split('/') : ['', '', ''];
      if (month && year) {
        // Convert to YYYY-MM format
        const fullYear = year.length === 2 ? `20${year}` : year;
        period = `${fullYear}-${month.padStart(2, '0')}`;
      }
    }
  }

  // Find customers and their purchases
  let currentCustomer = '';
  let currentCustomerId = '';
  let currentCustomers: string[] = [];
  let currentProducts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const line = originalLine.trim();
    
    // Skip empty lines and headers
    if (!line || line.startsWith('IT415V') || line.startsWith('SALES RECAP') || 
        line.startsWith('FROM :') || line.startsWith('RUN DATE') || 
        line.startsWith('GALANT GALANT') || line.startsWith('ALPINE') ||
        line.startsWith('DESCRIPTION') || line.startsWith('-----------') ||
        line === 'SALES' || line.includes('MFG ITEM #')) {
      continue;
    }


    // Check if this is a customer line (starts with customer number and description)
    // Updated regex to handle both 4-digit and 5-digit customer numbers
    const customerMatch = line.match(/^\s*(\d{4,5}-\d{3})\s+(.+)/);
    if (customerMatch) {
      const [, customerId, customerDescription] = customerMatch;
      currentCustomer = customerDescription.trim();
      currentCustomerId = customerId.trim();
      currentCustomers.push(currentCustomer);
      continue;
    }

    // Check if this is a product line (indented with spaces at the beginning)
    // Use a more flexible approach to handle variable spacing
    if (originalLine.startsWith('    ') && /^\s+\d+/.test(originalLine) && currentCustomer) {
      // Don't trim the line yet - we need to preserve the original spacing for parsing
      const parts = originalLine.split(/\s+/);
      
      // Look for pattern: itemNumber productName size cases pieces netLbs revenue mfgItemNumber
      // Use the same logic that worked for the June file
      if (parts.length >= 7 && /^\d+$/.test(parts[1])) {
        const itemNumber = parts[1];
        
        // Find the size field (look for patterns like "12 CT", "12/4 OZ", etc.)
        let sizeIndex = -1;
        for (let i = 2; i < parts.length; i++) {
          if (parts[i].match(/^\d+/) && (parts[i+1] === 'CT' || parts[i+1] === 'OZ' || parts[i].includes('/'))) {
            sizeIndex = i;
            break;
          }
        }
        
        if (sizeIndex === -1) continue; // Skip if we can't find size
        
        const productName = parts.slice(2, sizeIndex).join(' ');
        const size = parts[sizeIndex] + (parts[sizeIndex + 1] && (parts[sizeIndex + 1] === 'CT' || parts[sizeIndex + 1] === 'OZ') ? ' ' + parts[sizeIndex + 1] : '');
        
        // Find the cases field (first numeric field after size)
        let casesIndex = sizeIndex + (parts[sizeIndex + 1] && (parts[sizeIndex + 1] === 'CT' || parts[sizeIndex + 1] === 'OZ') ? 2 : 1);
        const cases = parts[casesIndex] || '0';
        
        // Find pieces field (next numeric field)
        let piecesIndex = casesIndex + 1;
        const pieces = parts[piecesIndex] || '0';
        
        // Find revenue field (next numeric field - there's no separate netLbs field)
        let revenueIndex = piecesIndex + 1;
        let revenue = parts[revenueIndex] || '0';
        if (revenue.endsWith('-')) {
          revenue = '-' + revenue.slice(0, -1);
        }
        
        // Find mfg item number (everything after revenue)
        const mfgItemNumber = parts.slice(revenueIndex + 1).join(' ').trim();
        
        // Set netLbs to 0 since it's not in the file format
        const netLbs = '0';
        
        
        const record: AlpineSalesRecord = {
          period: period,
          customerName: currentCustomer,
          productName: productName.trim(),
          size: size.trim(),
          customerId: currentCustomerId,
          productCode: itemNumber.trim(),
          cases: parseInt(cases) || 0,
          pieces: parseFloat(pieces) || 0,
          netLbs: parseFloat(netLbs) || 0,
          revenue: parseFloat(revenue) || 0,
          mfgItemNumber: mfgItemNumber.trim()
        };

        records.push(record);
        
        if (!currentProducts.includes(productName.trim())) {
          currentProducts.push(productName.trim());
        }
        continue;
      }
    }

    // Check if this is a customer total line (skip it)
    if (line.includes('CUSTOMER TOTAL :') || line.includes('RUN TOTALS :')) {
      continue;
    }
  }

  // Calculate metadata
  const totalRevenue = records.reduce((sum, record) => sum + record.revenue, 0);
  const totalCases = records.reduce((sum, record) => sum + record.cases, 0);
  
  const periodRevenue: Record<string, number> = {};
  records.forEach(record => {
    periodRevenue[record.period] = (periodRevenue[record.period] || 0) + record.revenue;
  });


  return {
    records,
    metadata: {
      supplier,
      periods: [period],
      customers: Array.from(new Set(currentCustomers)),
      products: Array.from(new Set(currentProducts)),
      totalRevenue,
      totalCases,
      periodRevenue
    }
  };
}

/**
 * Parse multiple Alpine reports and combine them with period progression
 */
export function parseMultipleAlpineReports(
  reports: Array<{ content: string; period: string }>
): ParsedAlpineData {
  const allRecords: AlpineSalesRecord[] = [];
  const allCustomers = new Set<string>();
  const allProducts = new Set<string>();
  const allPeriods = new Set<string>();

  for (const report of reports) {
    const parsed = parseAlpineTXT(report.content, report.period);
    allRecords.push(...parsed.records);
    parsed.metadata.customers.forEach(c => allCustomers.add(c));
    parsed.metadata.products.forEach(p => allProducts.add(p));
    allPeriods.add(parsed.metadata.periods[0]);
  }

  const totalRevenue = allRecords.reduce((sum, record) => sum + record.revenue, 0);
  const totalCases = allRecords.reduce((sum, record) => sum + record.cases, 0);

  const periodRevenue: Record<string, number> = {};
  allRecords.forEach(record => {
    periodRevenue[record.period] = (periodRevenue[record.period] || 0) + record.revenue;
  });

  return {
    records: allRecords.sort((a, b) => {
      if (a.period !== b.period) return a.period.localeCompare(b.period);
      if (a.customerName !== b.customerName) return a.customerName.localeCompare(b.customerName);
      return a.productName.localeCompare(b.productName);
    }),
    metadata: {
      supplier: 'ALPINE',
      periods: Array.from(allPeriods).sort(),
      customers: Array.from(allCustomers).sort(),
      products: Array.from(allProducts).sort(),
      totalRevenue,
      totalCases,
      periodRevenue
    }
  };
}

/**
 * Analyze customer progression across Alpine periods
 */
export interface CustomerProgressAnalysis {
  customerName: string;
  periods: Array<{
    period: string;
    totalRevenue: number;
    totalCases: number;
    productCount: number;
    topProducts: Array<{ productName: string; revenue: number; cases: number }>;
  }>;
  trends: {
    revenueTrend: 'increasing' | 'decreasing' | 'stable' | 'new';
    caseTrend: 'increasing' | 'decreasing' | 'stable' | 'new';
    productTrend: 'expanding' | 'contracting' | 'stable' | 'new';
    status: 'active' | 'declining' | 'emerging' | 'lost';
  };
}

export function analyzeCustomerProgress(
  records: AlpineSalesRecord[], 
  customerName: string
): CustomerProgressAnalysis {
  const customerRecords = records.filter(r => r.customerName === customerName);
  
  // Group by period
  const periodData: Record<string, AlpineSalesRecord[]> = {};
  customerRecords.forEach(record => {
    if (!periodData[record.period]) {
      periodData[record.period] = [];
    }
    periodData[record.period].push(record);
  });

  const periods = Object.entries(periodData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, records]) => {
      const productRevenue: Record<string, number> = {};
      const productCases: Record<string, number> = {};
      
      records.forEach(record => {
        productRevenue[record.productName] = (productRevenue[record.productName] || 0) + record.revenue;
        productCases[record.productName] = (productCases[record.productName] || 0) + record.cases;
      });

      const topProducts = Object.entries(productRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([productName, revenue]) => ({
          productName,
          revenue,
          cases: productCases[productName]
        }));

      return {
        period,
        totalRevenue: records.reduce((sum, r) => sum + r.revenue, 0),
        totalCases: records.reduce((sum, r) => sum + r.cases, 0),
        productCount: Object.keys(productRevenue).length,
        topProducts
      };
    });

  // Analyze trends
  let revenueTrend: 'increasing' | 'decreasing' | 'stable' | 'new' = 'stable';
  let caseTrend: 'increasing' | 'decreasing' | 'stable' | 'new' = 'stable';
  let productTrend: 'expanding' | 'contracting' | 'stable' | 'new' = 'stable';

  if (periods.length === 1) {
    revenueTrend = 'new';
    caseTrend = 'new';
    productTrend = 'new';
  } else if (periods.length >= 2) {
    const latest = periods[periods.length - 1];
    const previous = periods[periods.length - 2];
    
    const revenueChange = (latest.totalRevenue - previous.totalRevenue) / previous.totalRevenue;
    const caseChange = (latest.totalCases - previous.totalCases) / previous.totalCases;
    const productChange = latest.productCount - previous.productCount;
    
    revenueTrend = revenueChange > 0.1 ? 'increasing' : (revenueChange < -0.1 ? 'decreasing' : 'stable');
    caseTrend = caseChange > 0.1 ? 'increasing' : (caseChange < -0.1 ? 'decreasing' : 'stable');
    productTrend = productChange > 0 ? 'expanding' : (productChange < 0 ? 'contracting' : 'stable');
  }

  let status: 'active' | 'declining' | 'emerging' | 'lost' = 'active';
  if (periods.length === 0) {
    status = 'lost';
  } else if (periods.length === 1 && revenueTrend === 'new') {
    status = 'emerging';
  } else if (revenueTrend === 'decreasing' || caseTrend === 'decreasing') {
    status = 'declining';
  } else if (revenueTrend === 'increasing' || caseTrend === 'increasing') {
    status = 'active';
  }

  return {
    customerName,
    periods,
    trends: {
      revenueTrend,
      caseTrend,
      productTrend,
      status
    }
  };
}
