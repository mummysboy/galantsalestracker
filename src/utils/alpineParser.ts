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
  
  // Detect header column positions based on the header titles line (mirrors June format)
  let headerPositions: {
    itemStart: number;
    descriptionStart: number;
    sizeStart: number;
    casesStart: number;
    piecesStart: number;
    netLbsStart: number;
    salesStart: number;
    mfgStart: number;
  } | null = null;
  const headerTitlesLine = lines.find(line =>
    line.includes('DESCRIPTION') && line.includes('SIZE') && line.includes('SALES') && line.includes('MFG ITEM #')
  );
  if (headerTitlesLine) {
    headerPositions = {
      itemStart: (headerTitlesLine.indexOf('#') !== -1 ? headerTitlesLine.indexOf('#') : 0),
      descriptionStart: headerTitlesLine.indexOf('DESCRIPTION'),
      sizeStart: headerTitlesLine.indexOf('SIZE'),
      casesStart: headerTitlesLine.indexOf('CASES'),
      piecesStart: headerTitlesLine.indexOf('PIECES'),
      netLbsStart: headerTitlesLine.indexOf('NET LBS'),
      salesStart: headerTitlesLine.indexOf('SALES'),
      mfgStart: headerTitlesLine.indexOf('MFG ITEM #')
    };
  }

  
  // Look for period information in the header (normalize via UTC to avoid TZ differences)
  const headerLine = lines.find(line => line.includes('FROM :') && line.includes('THRU'));
  let period = reportDate;
  if (headerLine) {
    const match = headerLine.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/g);
    if (match && match.length >= 2) {
      const [, toDate] = match;
      const [month, day, year] = toDate.includes('/') ? toDate.split('/') : ['', '', ''];
      if (month && year) {
        const yyyy = year.length === 2 ? `20${year}` : year;
        // Create a UTC date to avoid timezone shifts
        const d = new Date(Date.UTC(parseInt(yyyy, 10), parseInt(month, 10) - 1, parseInt(day || '1', 10)));
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const yyyyStr = String(d.getUTCFullYear());
        period = `${yyyyStr}-${mm}`;
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
    // Updated regex to handle 4–6 digit customer prefixes (e.g., 60127-001, 120075-001)
    const customerMatch = line.match(/^\s*(\d{4,6}-\d{3})\s+(.+)/);
    if (customerMatch) {
      const [, customerId, customerDescription] = customerMatch;
      currentCustomer = customerDescription.trim();
      currentCustomerId = customerId.trim();
      currentCustomers.push(currentCustomer);
      continue;
    }

    // Check if this is a product line (indented) and parse using fixed columns if available
    if (originalLine.startsWith('    ') && /^\s+\d+/.test(originalLine) && currentCustomer) {
      const lineForParse = originalLine;

      // Prefer header-sliced parsing to mirror June exactly
      if (headerPositions) {
        const h = headerPositions;
        const slice = (start: number, end: number) =>
          (lineForParse.length > start ? lineForParse.slice(start, end).trim() : '').trim();

        const itemNumber = slice(h.itemStart, h.descriptionStart).split(/\s+/).filter(Boolean).pop() || '';
        const description = slice(h.descriptionStart, h.sizeStart);
        const size = slice(h.sizeStart, h.casesStart) || slice(h.sizeStart, h.piecesStart); // some rows may omit CASES
        const casesStr = slice(h.casesStart, h.piecesStart);
        const piecesStr = slice(h.piecesStart, h.netLbsStart);
        const netLbsStr = slice(h.netLbsStart, h.salesStart);
        let salesStr = slice(h.salesStart, h.mfgStart);
        const mfg = slice(h.mfgStart, undefined as unknown as number); // to end

        // Normalize trailing minus on sales
        if (salesStr.endsWith('-')) salesStr = '-' + salesStr.slice(0, -1);

        const parseNum = (v: string) => {
          const t = v.replace(/,/g, '').trim();
          if (!t || t === '.') return 0;
          return parseFloat(t) || 0;
        };

        const record: AlpineSalesRecord = {
          period,
          customerName: currentCustomer,
          productName: description,
          size: size,
          customerId: currentCustomerId,
          productCode: itemNumber,
          cases: parseInt(casesStr || '0') || 0,
          pieces: parseNum(piecesStr),
          netLbs: parseNum(netLbsStr),
          revenue: parseNum(salesStr),
          mfgItemNumber: mfg
        };

        records.push(record);
        if (!currentProducts.includes(record.productName)) currentProducts.push(record.productName);
        continue;
      }

      // Regex-first approach to mirror June format with optional numeric columns
      // 1:itemNumber 2:productName 3:size 4:cases? 5:pieces? 6:netLbs? 7:sales 8:mfgItem# (rest)
      // Allow size to be either "12 CT", "12/8 OZ", tokenized alt, or a bare number like "1"
      const productRegex = /^\s*(\d+)\s+(.+?)\s+((?:\d+(?:\/\d+)?\s*(?:CT|OZ))|(?:\d+))\s*(\d+)?\s*(\d+(?:\.\d+)?)?\s*(\d+(?:\.\d+)?)?\s*([\d.]+-?)\s*(.*)$/;
      let match = lineForParse.match(productRegex);

      if (!match) {
        // Fallback: allow size tokens like "12/8 OZ" split in tokens (same capture intent)
        const altRegex = /^\s*(\d+)\s+(.+?)\s+(\d+(?:\/\d+)?)\s*(CT|OZ)\s*(\d+)?\s*(\d+(?:\.\d+)?)?\s*(\d+(?:\.\d+)?)?\s*([\d.]+-?)\s*(.*)$/;
        const m = lineForParse.match(altRegex);
        if (m) {
          // Rebuild to productRegex groups
          match = [
            m[0],           // full
            m[1],           // itemNumber
            m[2],           // productName
            `${m[3]} ${m[4]}`, // size combined
            m[5],           // cases
            m[6],           // pieces
            m[7],           // netLbs
            m[8],           // sales
            m[9] || ''      // mfg
          ] as unknown as RegExpMatchArray;
        }
      }

      if (match) {
        const [, itemNumber, productNameRaw, sizeRaw, casesRaw, piecesRaw, netLbsRaw, salesRaw, mfgRaw] = match;
        const normalizeNum = (v?: string) => {
          if (!v) return 0;
          let t = v.trim();
          if (t.endsWith('-')) t = '-' + t.slice(0, -1);
          return parseFloat(t) || 0;
        };

        const record: AlpineSalesRecord = {
          period: period,
          customerName: currentCustomer,
          productName: productNameRaw.trim(),
          size: sizeRaw.trim(),
          customerId: currentCustomerId,
          productCode: itemNumber.trim(),
          cases: parseInt(casesRaw || '0') || 0,
          pieces: normalizeNum(piecesRaw),
          netLbs: normalizeNum(netLbsRaw),
          revenue: normalizeNum(salesRaw),
          mfgItemNumber: (mfgRaw || '').trim()
        };

        records.push(record);
        if (!currentProducts.includes(record.productName)) {
          currentProducts.push(record.productName);
        }
        continue;
      }

      // If regex parsing fails entirely, skip the line to avoid mis-mapping columns
      continue;
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
