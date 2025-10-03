import { AlpineSalesRecord, CustomerProgressAnalysis } from '../utils/alpineParser';

// Pre-parsed Alpine data from June 2025 TXT file with ALL customers and missing customer data fields
export const alpineData: AlpineSalesRecord[] = [
  // June 2025 (Period: 2025-06) - ALL CUSTOMERS WITH COMPLETE DATA
  
  // 3965-001 COOKS COMPANY PRODUCE INC
  { period: '2025-06', customerName: 'COOKS COMPANY PRODUCE INC', productName: 'GAL SAMPLE KIT', size: '12 CT', customerId: '3965-001', productCode: '184016', cases: 1, pieces: 3.00, netLbs: 3.00, revenue: 0.01, mfgItemNumber: 'GAL SAMPLE' },

  // 60127-001 BIRITE FOODSERVICE DISTRIBUTOR
  { period: '2025-06', customerName: 'BIRITE FOODSERVICE DISTRIBUTOR', productName: 'GAL SAND BRKFST BACON', size: '12/4 OZ', customerId: '60127-001', productCode: '999982', cases: 10, pieces: 30.00, netLbs: 30.00, revenue: 270.00, mfgItemNumber: '811' },

  // 60421-001 BUCHANAN FOOD SERVICE
  { period: '2025-06', customerName: 'BUCHANAN FOOD SERVICE', productName: 'GAL SAMPLE KIT', size: '12 CT', customerId: '60421-001', productCode: '184016', cases: 1, pieces: 3.00, netLbs: 3.00, revenue: 0.01, mfgItemNumber: 'GAL SAMPLE' },
  { period: '2025-06', customerName: 'BUCHANAN FOOD SERVICE', productName: 'GAL SAND SSG TURKEY', size: '12/5 OZ', customerId: '60421-001', productCode: '999986', cases: 1, pieces: 3.75, netLbs: 3.75, revenue: 0.00, mfgItemNumber: '20001' },

  // 90110-001 CAPITOL DISTRIBUTING, INC
  { period: '2025-06', customerName: 'CAPITOL DISTRIBUTING, INC', productName: 'GAL BAGEL DOG BEEF FRANK', size: '12/5 OZ', customerId: '90110-001', productCode: '183922', cases: 10, pieces: 37.50, netLbs: 37.50, revenue: 171.00, mfgItemNumber: '12001' },
  { period: '2025-06', customerName: 'CAPITOL DISTRIBUTING, INC', productName: 'GAL BAGEL DOG JALA CHS', size: '12/5 OZ', customerId: '90110-001', productCode: '183924', cases: 13, pieces: 48.75, netLbs: 48.75, revenue: 222.30, mfgItemNumber: '12022' },

  // 90537-001 COFFEE WAREHOUSE INC., THE
  { period: '2025-06', customerName: 'COFFEE WAREHOUSE INC., THE', productName: 'GAL BAGEL DOG POLISH', size: '12/8 OZ', customerId: '90537-001', productCode: '999979', cases: 17, pieces: 102.00, netLbs: 102.00, revenue: 467.16, mfgItemNumber: '100122' },
  { period: '2025-06', customerName: 'COFFEE WAREHOUSE INC., THE', productName: 'GAL BURR BRKFST BACON', size: '12/8 OZ', customerId: '90537-001', productCode: '999983', cases: 52, pieces: 312.00, netLbs: 312.00, revenue: 1591.20, mfgItemNumber: '321' },
  { period: '2025-06', customerName: 'COFFEE WAREHOUSE INC., THE', productName: 'GAL BURR BRKFST SAUSAGE', size: '12/8 OZ', customerId: '90537-001', productCode: '999989', cases: 42, pieces: 252.00, netLbs: 252.00, revenue: 1285.20, mfgItemNumber: '331' },

  // 90757-001 CORE-MARK, INTERN'L CLACKAMAS
  { period: '2025-06', customerName: 'CORE-MARK, INTERN\'L CLACKAMAS', productName: 'GAL BAGEL DOG BEEF', size: '12/8 OZ', customerId: '90757-001', productCode: '999978', cases: 64, pieces: 384.00, netLbs: 384.00, revenue: -540.55, mfgItemNumber: '100121' },
  { period: '2025-06', customerName: 'CORE-MARK, INTERN\'L CLACKAMAS', productName: 'GAL BAGEL DOG POLISH', size: '12/8 OZ', customerId: '90757-001', productCode: '999979', cases: 80, pieces: 480.00, netLbs: 480.00, revenue: 128.15, mfgItemNumber: '100122' },

  // 90757-002 CORE-MARK INTERN'L SPOKANE
  { period: '2025-06', customerName: 'CORE-MARK INTERN\'L SPOKANE', productName: 'GAL BAGEL DOG BEEF FRANK', size: '12/5 OZ', customerId: '90757-002', productCode: '183922', cases: 5, pieces: 18.75, netLbs: 18.75, revenue: 85.50, mfgItemNumber: '12001' },
  { period: '2025-06', customerName: 'CORE-MARK INTERN\'L SPOKANE', productName: 'GAL BAGEL DOG POLISH SSG', size: '12/5 OZ', customerId: '90757-002', productCode: '183923', cases: 5, pieces: 18.75, netLbs: 18.75, revenue: 85.50, mfgItemNumber: '12021' },

  // 90757-005 CORE-MARK, INTERN'L HAYWARD
  { period: '2025-06', customerName: 'CORE-MARK, INTERN\'L HAYWARD', productName: 'GAL BAGEL DOG JALA CHS', size: '12/5 OZ', customerId: '90757-005', productCode: '183924', cases: 0, pieces: 0, netLbs: 0, revenue: 0.00, mfgItemNumber: '12022' },

  // 90768-001 COTATI BRAND EGGS,INC-COTATI
  { period: '2025-06', customerName: 'COTATI BRAND EGGS,INC-COTATI', productName: 'GAL PIROSHKI BEEF CHS N/S', size: '12/6 OZ', customerId: '90768-001', productCode: '183979', cases: 11, pieces: 49.50, netLbs: 49.50, revenue: 261.36, mfgItemNumber: '211' },
  { period: '2025-06', customerName: 'COTATI BRAND EGGS,INC-COTATI', productName: 'GAL PIROSHKI BF MUSH  N/S', size: '12/6 OZ', customerId: '90768-001', productCode: '184028', cases: 4, pieces: 18.00, netLbs: 18.00, revenue: 95.04, mfgItemNumber: '231' },
  { period: '2025-06', customerName: 'COTATI BRAND EGGS,INC-COTATI', productName: 'GAL BAGEL DOG BEEF', size: '12/8 OZ', customerId: '90768-001', productCode: '999978', cases: 6, pieces: 36.00, netLbs: 36.00, revenue: 164.88, mfgItemNumber: '100121' },
  { period: '2025-06', customerName: 'COTATI BRAND EGGS,INC-COTATI', productName: 'GAL BAGEL DOG POLISH', size: '12/8 OZ', customerId: '90768-001', productCode: '999979', cases: 8, pieces: 48.00, netLbs: 48.00, revenue: 219.84, mfgItemNumber: '100122' },

  // 120075-001 DAIRY FRESH FARMS-PORT ANGELES
  { period: '2025-06', customerName: 'DAIRY FRESH FARMS-PORT ANGELES', productName: 'GAL BAGEL DOG POLISH', size: '12/8 OZ', customerId: '120075-001', productCode: '999979', cases: 4, pieces: 24.00, netLbs: 24.00, revenue: 109.92, mfgItemNumber: '100122' },
  { period: '2025-06', customerName: 'DAIRY FRESH FARMS-PORT ANGELES', productName: 'GAL SAND BRKFST BACON', size: '12/4 OZ', customerId: '120075-001', productCode: '999982', cases: 8, pieces: 24.00, netLbs: 24.00, revenue: 216.00, mfgItemNumber: '811' },
  { period: '2025-06', customerName: 'DAIRY FRESH FARMS-PORT ANGELES', productName: 'GAL BURR BRKFST BACON', size: '12/8 OZ', customerId: '120075-001', productCode: '999983', cases: 4, pieces: 24.00, netLbs: 24.00, revenue: 122.40, mfgItemNumber: '321' },
  { period: '2025-06', customerName: 'DAIRY FRESH FARMS-PORT ANGELES', productName: 'GAL SAND BRKFST CHORIZO', size: '12/5 OZ', customerId: '120075-001', productCode: '999984', cases: 7, pieces: 26.25, netLbs: 26.25, revenue: 191.10, mfgItemNumber: '821' },
  { period: '2025-06', customerName: 'DAIRY FRESH FARMS-PORT ANGELES', productName: 'GAL SAND PROV PESTO', size: '12/4 OZ', customerId: '120075-001', productCode: '999985', cases: 4, pieces: 12.00, netLbs: 12.00, revenue: 108.00, mfgItemNumber: '831' },
  { period: '2025-06', customerName: 'DAIRY FRESH FARMS-PORT ANGELES', productName: 'GAL BURR BRKFST SAUSAGE', size: '12/8 OZ', customerId: '120075-001', productCode: '999989', cases: 8, pieces: 48.00, netLbs: 48.00, revenue: 244.80, mfgItemNumber: '331' },

  // 120085-001 DAIRY VALLEY DISTRIBUTORS
  { period: '2025-06', customerName: 'DAIRY VALLEY DISTRIBUTORS', productName: 'GAL BURR BRKFST BACON', size: '12/8 OZ', customerId: '120085-001', productCode: '999983', cases: 5, pieces: 30.00, netLbs: 30.00, revenue: 153.00, mfgItemNumber: '321' },
  { period: '2025-06', customerName: 'DAIRY VALLEY DISTRIBUTORS', productName: 'GAL BURR BFST CHORIZO', size: '12/8 OZ', customerId: '120085-001', productCode: '999987', cases: 87, pieces: 522.00, netLbs: 522.00, revenue: 2662.20, mfgItemNumber: '311' },
  { period: '2025-06', customerName: 'DAIRY VALLEY DISTRIBUTORS', productName: 'GAL BURR BRKFST VERDE', size: '12/8 OZ', customerId: '120085-001', productCode: '999988', cases: 20, pieces: 120.00, netLbs: 120.00, revenue: 612.00, mfgItemNumber: '341' },

  // 230986-001 HARBOR WHOLESALE GROCERY LACEY
  { period: '2025-06', customerName: 'HARBOR WHOLESALE GROCERY LACEY', productName: 'GAL BAGEL DOG BEEF FRANK', size: '12/5 OZ', customerId: '230986-001', productCode: '183922', cases: 23, pieces: 86.25, netLbs: 86.25, revenue: 393.30, mfgItemNumber: '12001' },
  { period: '2025-06', customerName: 'HARBOR WHOLESALE GROCERY LACEY', productName: 'GAL BAGEL DOG POLISH SSG', size: '12/5 OZ', customerId: '230986-001', productCode: '183923', cases: 56, pieces: 210.00, netLbs: 210.00, revenue: 957.60, mfgItemNumber: '12021' },
  { period: '2025-06', customerName: 'HARBOR WHOLESALE GROCERY LACEY', productName: 'GAL BAGEL DOG JALA CHS', size: '12/5 OZ', customerId: '230986-001', productCode: '183924', cases: 22, pieces: 82.50, netLbs: 82.50, revenue: 376.20, mfgItemNumber: '12022' },

  // 410322-001 GLACIER WHOLESALERS, INC MT
  { period: '2025-06', customerName: 'GLACIER WHOLESALERS, INC MT', productName: 'GAL BAGEL DOG BEEF', size: '12/8 OZ', customerId: '410322-001', productCode: '999978', cases: 3, pieces: 18.00, netLbs: 18.00, revenue: 82.44, mfgItemNumber: '100121' },
  { period: '2025-06', customerName: 'GLACIER WHOLESALERS, INC MT', productName: 'GAL BAGEL DOG POLISH', size: '12/8 OZ', customerId: '410322-001', productCode: '999979', cases: 2, pieces: 12.00, netLbs: 12.00, revenue: 54.96, mfgItemNumber: '100122' },

  // 410435-001 HARBOR WHOLESALE - MDC MODESTO
  { period: '2025-06', customerName: 'HARBOR WHOLESALE - MDC MODESTO', productName: 'GAL BAGEL DOG BEEF FRANK', size: '12/5 OZ', customerId: '410435-001', productCode: '183922', cases: 50, pieces: 187.50, netLbs: 187.50, revenue: 855.00, mfgItemNumber: '12001' },
  { period: '2025-06', customerName: 'HARBOR WHOLESALE - MDC MODESTO', productName: 'GAL BAGEL DOG POLISH SSG', size: '12/5 OZ', customerId: '410435-001', productCode: '183923', cases: 31, pieces: 116.25, netLbs: 116.25, revenue: 530.10, mfgItemNumber: '12021' },
  { period: '2025-06', customerName: 'HARBOR WHOLESALE - MDC MODESTO', productName: 'GAL BAGEL DOG JALA CHS', size: '12/5 OZ', customerId: '410435-001', productCode: '183924', cases: 11, pieces: 41.25, netLbs: 41.25, revenue: 188.10, mfgItemNumber: '12022' },

  // 500304-001 HARBOR WHOLESALE GROCERY ROSEB
  { period: '2025-06', customerName: 'HARBOR WHOLESALE GROCERY ROSEB', productName: 'GAL BAGEL DOG BEEF FRANK', size: '12/5 OZ', customerId: '500304-001', productCode: '183922', cases: 9, pieces: 33.75, netLbs: 33.75, revenue: 153.90, mfgItemNumber: '12001' },
  { period: '2025-06', customerName: 'HARBOR WHOLESALE GROCERY ROSEB', productName: 'GAL BAGEL DOG POLISH SSG', size: '12/5 OZ', customerId: '500304-001', productCode: '183923', cases: 12, pieces: 45.00, netLbs: 45.00, revenue: 205.20, mfgItemNumber: '12021' },
  { period: '2025-06', customerName: 'HARBOR WHOLESALE GROCERY ROSEB', productName: 'GAL BAGEL DOG JALA CHS', size: '12/5 OZ', customerId: '500304-001', productCode: '183924', cases: 11, pieces: 41.25, netLbs: 41.25, revenue: 188.10, mfgItemNumber: '12022' },

  // 500342-001 PETE'S MILK DELIVERY
  { period: '2025-06', customerName: 'PETE\'S MILK DELIVERY', productName: 'GAL BURR BRKFST BACON', size: '12/8 OZ', customerId: '500342-001', productCode: '999983', cases: 25, pieces: 150.00, netLbs: 150.00, revenue: 765.00, mfgItemNumber: '321' },
  { period: '2025-06', customerName: 'PETE\'S MILK DELIVERY', productName: 'GAL SAND BRKFST CHORIZO', size: '12/5 OZ', customerId: '500342-001', productCode: '999984', cases: 6, pieces: 22.50, netLbs: 22.50, revenue: 163.80, mfgItemNumber: '821' },
  { period: '2025-06', customerName: 'PETE\'S MILK DELIVERY', productName: 'GAL SAND PROV PESTO', size: '12/4 OZ', customerId: '500342-001', productCode: '999985', cases: 5, pieces: 15.00, netLbs: 15.00, revenue: 135.00, mfgItemNumber: '831' },
  { period: '2025-06', customerName: 'PETE\'S MILK DELIVERY', productName: 'GAL SAND SSG TURKEY', size: '12/5 OZ', customerId: '500342-001', productCode: '999986', cases: 11, pieces: 41.25, netLbs: 41.25, revenue: 300.30, mfgItemNumber: '20001' },
  { period: '2025-06', customerName: 'PETE\'S MILK DELIVERY', productName: 'GAL BURR BRKFST VERDE', size: '12/8 OZ', customerId: '500342-001', productCode: '999988', cases: 35, pieces: 210.00, netLbs: 210.00, revenue: 1071.00, mfgItemNumber: '341' },
  { period: '2025-06', customerName: 'PETE\'S MILK DELIVERY', productName: 'GAL BURR BRKFST SAUSAGE', size: '12/8 OZ', customerId: '500342-001', productCode: '999989', cases: 17, pieces: 102.00, netLbs: 102.00, revenue: 520.20, mfgItemNumber: '331' },

  // 530042-001 ROGGE PRODUCE
  { period: '2025-06', customerName: 'ROGGE PRODUCE', productName: 'GAL BAGEL DOG BEEF', size: '12/8 OZ', customerId: '530042-001', productCode: '999978', cases: 3, pieces: 18.00, netLbs: 18.00, revenue: 82.44, mfgItemNumber: '100121' },
  { period: '2025-06', customerName: 'ROGGE PRODUCE', productName: 'GAL BURR BRKFST BACON', size: '12/8 OZ', customerId: '530042-001', productCode: '999983', cases: 2, pieces: 12.00, netLbs: 12.00, revenue: 61.20, mfgItemNumber: '321' },
  { period: '2025-06', customerName: 'ROGGE PRODUCE', productName: 'GAL BURR BRKFST SAUSAGE', size: '12/8 OZ', customerId: '530042-001', productCode: '999989', cases: 1, pieces: 6.00, netLbs: 6.00, revenue: 30.60, mfgItemNumber: '331' },

  // 590511-002 STEBO'S FOODSERVICE- LONGVIEW
  { period: '2025-06', customerName: 'STEBO\'S FOODSERVICE- LONGVIEW', productName: 'GAL BURR BRKFST BACON', size: '12/8 OZ', customerId: '590511-002', productCode: '999983', cases: 3, pieces: 18.00, netLbs: 18.00, revenue: 91.80, mfgItemNumber: '321' },

  // 650065-002 UNFI Centralia Div-Frozen
  { period: '2025-06', customerName: 'UNFI Centralia Div-Frozen', productName: 'GAL BAGEL DOG BEEF FRANK', size: '12/5 OZ', customerId: '650065-002', productCode: '183922', cases: 100, pieces: 375.00, netLbs: 375.00, revenue: 1710.00, mfgItemNumber: '12001' },

  // 650075-002 UNFI Stockton Frozen
  { period: '2025-06', customerName: 'UNFI Stockton Frozen', productName: 'GAL BAGEL DOG BEEF FRANK', size: '12/5 OZ', customerId: '650075-002', productCode: '183922', cases: 50, pieces: 187.50, netLbs: 187.50, revenue: 855.00, mfgItemNumber: '12001' },

  // 650325-333 U.R.M. FOOD SERVICE-Frozen
  { period: '2025-06', customerName: 'U.R.M. FOOD SERVICE-Frozen', productName: 'GAL BAGEL DOG POLISH SSG', size: '12/5 OZ', customerId: '650325-333', productCode: '183923', cases: 12, pieces: 45.00, netLbs: 45.00, revenue: 205.20, mfgItemNumber: '12021' },
  { period: '2025-06', customerName: 'U.R.M. FOOD SERVICE-Frozen', productName: 'GAL BAGEL DOG JALA CHS', size: '12/5 OZ', customerId: '650325-333', productCode: '183924', cases: 12, pieces: 45.00, netLbs: 45.00, revenue: 205.20, mfgItemNumber: '12022' },
  { period: '2025-06', customerName: 'U.R.M. FOOD SERVICE-Frozen', productName: 'GALANT MISC', size: '1', customerId: '650325-333', productCode: '183984', cases: 0, pieces: 0, netLbs: 0, revenue: -1750.00, mfgItemNumber: '183984' },
  { period: '2025-06', customerName: 'U.R.M. FOOD SERVICE-Frozen', productName: 'GAL SAND BRKFST CHORIZO', size: '12/5 OZ', customerId: '650325-333', productCode: '999984', cases: 3, pieces: 11.25, netLbs: 11.25, revenue: 81.90, mfgItemNumber: '821' },
  { period: '2025-06', customerName: 'U.R.M. FOOD SERVICE-Frozen', productName: 'GAL SAND SSG TURKEY', size: '12/5 OZ', customerId: '650325-333', productCode: '999986', cases: 1, pieces: 3.75, netLbs: 3.75, revenue: 27.30, mfgItemNumber: '20001' },

  // 680102-000 VERN'S DIST HERMISTON
  { period: '2025-06', customerName: 'VERN\'S DIST HERMISTON', productName: 'GAL BAGEL DOG BEEF FRANK', size: '12/5 OZ', customerId: '680102-000', productCode: '183922', cases: 1, pieces: 3.75, netLbs: 3.75, revenue: 17.10, mfgItemNumber: '12001' },
];

// Customer progression analysis data
export const customerProgressions: Map<string, CustomerProgressAnalysis> = new Map();
