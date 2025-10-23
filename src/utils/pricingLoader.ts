import * as XLSX from 'xlsx';

export interface PricingData {
  itemNumber: string;
  productDescription: string;
  caseWeight: number; // Weight in pounds
  pack: number;
  size: string; // Size per unit (e.g., "6 oz", "4.5 oz")
  caseCost: number; // Case cost in dollars
  unitCost: number; // Unit cost in dollars
}

export interface PricingDatabase {
  byItemNumber: Map<string, PricingData>;
  byProductName: Map<string, PricingData>;
}

/**
 * Parse the Master 2025 Pricing Excel file to extract weight and product information
 */
export async function loadPricingData(): Promise<PricingDatabase> {
  try {
    // Try to load the pricing file from the public directory first
    let response;
    try {
      response = await fetch('/SalesData/Master 2025 Pricing (1).xlsx');
    } catch (e) {
      // If that fails, try the root directory
      response = await fetch('/Master 2025 Pricing (1).xlsx');
    }
    
    if (!response.ok) {
      console.warn('Could not load Master Pricing file, using fallback weights');
      return createFallbackPricingData();
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Use the "FOB Distributor" sheet as it has the most complete pricing data
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('fob distributor')) || 
                     workbook.SheetNames.find(name => name.toLowerCase().includes('shelflife')) || 
                     workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][];
    
    const byItemNumber = new Map<string, PricingData>();
    const byProductName = new Map<string, PricingData>();
    
    // Header row is row 1 based on our analysis
    const headerRowIdx = 1;
    const headers = rows[headerRowIdx].map(h => String(h || '').trim());
    
    // Column indices based on FOB Distributor sheet:
    // A=0: Item #, E=4: Product Description, H=7: Case Wt., F=5: Pack, G=6: Size, J=9: Case Cost, K=10: Unit Cost
    const itemNumberIdx = 0; // Column A
    const productDescIdx = 4; // Column E  
    const caseWeightIdx = 7;  // Column H (Case Wt.)
    const packIdx = 5;        // Column F
    const sizeIdx = 6;       // Column G
    const caseCostIdx = 9;   // Column J (Case Cost)
    const unitCostIdx = 10;  // Column K (Unit Cost)
    
    console.log('Master Pricing headers:', headers);
    console.log('Column H (Case Wt.):', headers[caseWeightIdx]);
    
    // Parse data rows starting from row 2 (after header and brand row)
    for (let r = 2; r < rows.length; r++) {
      const row = rows[r] || [];
      
      // Skip empty rows or brand headers
      if (row.every(cell => !cell || String(cell).trim() === '') || 
          String(row[0] || '').toLowerCase().includes('brand')) {
        continue;
      }
      
      const itemNumber = String(row[itemNumberIdx] || '').trim();
      const productDescription = String(row[productDescIdx] || '').trim();
      const caseWeight = parseFloat(String(row[caseWeightIdx] || '0')) || 0;
      const pack = parseInt(String(row[packIdx] || '0')) || 0;
      const size = String(row[sizeIdx] || '').trim();
      const caseCost = parseFloat(String(row[caseCostIdx] || '0')) || 0;
      const unitCost = parseFloat(String(row[unitCostIdx] || '0')) || 0;
      
      if (itemNumber && productDescription && caseWeight > 0) {
        const pricingData: PricingData = {
          itemNumber,
          productDescription,
          caseWeight,
          pack,
          size,
          caseCost,
          unitCost
        };
        
        byItemNumber.set(itemNumber, pricingData);
        byProductName.set(productDescription.toLowerCase().trim(), pricingData);
        
        // Debug logging for sandwiches
        if (productDescription.toLowerCase().includes('sandwich')) {
          console.log(`Loaded sandwich: ${itemNumber} - ${productDescription} - ${caseWeight} lbs`);
        }
      }
    }
    
    console.log(`Loaded ${byItemNumber.size} pricing records from Master Pricing file`);
    console.log(`Sandwich records: ${Array.from(byItemNumber.values()).filter(p => p.productDescription.toLowerCase().includes('sandwich')).length}`);
    
    // Debug: Check for specific MHD products including Calzone
    const mhdProducts = [
      'Beef & Cheese Piroshki', 
      'Jumbo Beef Frank Bagel Dog', 
      'Jumbo Polish Sausage Bagel Dog',
      'Italian Combo Calzone',
      'Pesto Mushroom Calzone',
      'Chicken Fajita Calzone',
      'Spinach Feta Calzone'
    ];
    mhdProducts.forEach(product => {
      const found = byProductName.get(product.toLowerCase());
      if (found) {
        console.log(`✅ Found Master Pricing for ${product}:`, {
          itemNumber: found.itemNumber,
          caseWeight: found.caseWeight,
          caseCost: found.caseCost
        });
      } else {
        console.log(`❌ NOT FOUND in Master Pricing: ${product}`);
      }
    });
    
    return { byItemNumber, byProductName };
    
  } catch (error) {
    console.error('Error loading Master Pricing file:', error);
    console.log('Falling back to hardcoded pricing data');
    return createFallbackPricingData();
  }
}

/**
 * Create fallback pricing data for common Pete's Coffee products
 */
function createFallbackPricingData(): PricingDatabase {
  const fallbackData: PricingData[] = [
    // Burritos and Wraps (6 lbs per case, ~$33.60 case cost, ~$2.80 unit cost)
    { itemNumber: '321', productDescription: 'Uncured Bacon Breakfast Burrito', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 33.60, unitCost: 2.80 },
    { itemNumber: '331', productDescription: 'Sausage Breakfast Burrito', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 33.60, unitCost: 2.80 },
    { itemNumber: '341', productDescription: 'Chile Verde Breakfast Burrito', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 33.60, unitCost: 2.80 },
    { itemNumber: '361', productDescription: 'Black Bean Breakfast Burrito', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 33.60, unitCost: 2.80 },
    { itemNumber: '311', productDescription: 'Chorizo Breakfast Burrito', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 33.60, unitCost: 2.80 },
    { itemNumber: '411', productDescription: 'Chicken Florentine Wrap', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 33.60, unitCost: 2.80 },
    { itemNumber: '421', productDescription: 'Chicken Parmesean Wrap', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 33.60, unitCost: 2.80 },
    { itemNumber: '431', productDescription: 'Chicken Bacon Ranch Wrap', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 33.60, unitCost: 2.80 },
    { itemNumber: '441', productDescription: 'Spicy Thai Style Chicken Wrap', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 33.60, unitCost: 2.80 },
    { itemNumber: '451', productDescription: 'Coconut Curry Burrito', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 33.60, unitCost: 2.80 },
    
    // Sandwiches (3.75 lbs per case, ~$25.20 case cost, ~$2.10 unit cost) - Pete's Coffee item numbers
    { itemNumber: '841', productDescription: 'Turkey Sausage Breakfast Sandwich', caseWeight: 3.75, pack: 12, size: '5 oz', caseCost: 25.20, unitCost: 2.10 },
    { itemNumber: '831', productDescription: 'Pesto Provolone Breakfast Sandwich', caseWeight: 3.75, pack: 12, size: '4 oz', caseCost: 25.20, unitCost: 2.10 },
    { itemNumber: '811', productDescription: 'Bacon Breakfast Sandwich', caseWeight: 3.75, pack: 12, size: '4 oz', caseCost: 25.20, unitCost: 2.10 },
    { itemNumber: '821', productDescription: 'Chorizo Breakfast Sandwich', caseWeight: 3.75, pack: 12, size: '5 oz', caseCost: 25.20, unitCost: 2.10 },
    
    // Piroshki (4 lbs per case, $26.40 case cost, $2.20 unit cost) - from Master Pricing
    { itemNumber: '211', productDescription: 'Beef & Cheese Piroshki', caseWeight: 4, pack: 12, size: '6 oz', caseCost: 26.40, unitCost: 2.20 },
    
    // Bagel Dogs (6 lbs per case, $30.00 case cost, $2.50 unit cost) - from Master Pricing
    { itemNumber: '611', productDescription: 'Jumbo Beef Frank Bagel Dog', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 30.00, unitCost: 2.50 },
    { itemNumber: '612', productDescription: 'Jumbo Polish Sausage Bagel Dog', caseWeight: 6, pack: 12, size: '8 oz', caseCost: 30.00, unitCost: 2.50 },
    
    // Calzone products (6.75 lbs per case, $37.20 case cost, $3.10 unit cost) - from Master Pricing
    { itemNumber: '131', productDescription: 'Italian Combo Calzone', caseWeight: 6.75, pack: 12, size: '8 oz', caseCost: 37.20, unitCost: 3.10 },
    { itemNumber: '111', productDescription: 'Pesto Mushroom Calzone', caseWeight: 6.75, pack: 12, size: '8 oz', caseCost: 37.20, unitCost: 3.10 },
    { itemNumber: '141', productDescription: 'Chicken Fajita Calzone', caseWeight: 6.75, pack: 12, size: '8 oz', caseCost: 37.20, unitCost: 3.10 },
    { itemNumber: '122', productDescription: 'Spinach Feta Calzone', caseWeight: 6.75, pack: 12, size: '8 oz', caseCost: 37.20, unitCost: 3.10 },
  ];
  
  const byItemNumber = new Map<string, PricingData>();
  const byProductName = new Map<string, PricingData>();
  
  fallbackData.forEach(data => {
    byItemNumber.set(data.itemNumber, data);
    byProductName.set(data.productDescription.toLowerCase().trim(), data);
  });
  
  console.log(`Using fallback pricing data for ${fallbackData.length} products`);
  console.log('Fallback sandwich data:', fallbackData.filter(p => p.productDescription.toLowerCase().includes('sandwich')));
  return { byItemNumber, byProductName };
}

/**
 * Get product size in ounces from the size string
 */
export function getProductSizeInOunces(pricingDb: PricingDatabase, itemNumber?: string, productName?: string): number {
  // Try to find by item number first
  if (itemNumber) {
    const pricing = pricingDb.byItemNumber.get(itemNumber);
    if (pricing) {
      return parseSizeToOunces(pricing.size);
    }
  }
  
  // Try to find by product name
  if (productName) {
    const normalizedName = productName.toLowerCase().trim();
    
    // Try exact match first
    let pricing = pricingDb.byProductName.get(normalizedName);
    if (pricing) {
      return parseSizeToOunces(pricing.size);
    }
    
    // Try partial matching for common variations
    const partialMatches = Array.from(pricingDb.byProductName.entries()).filter(([name, _]) => {
      const nameWords = name.split(/\s+/);
      const productWords = normalizedName.split(/\s+/);
      return nameWords.some(word => productWords.includes(word)) || 
             productWords.some(word => nameWords.includes(word));
    });
    
    if (partialMatches.length > 0) {
      // Use the first partial match
      const [, matchedPricing] = partialMatches[0];
      return parseSizeToOunces(matchedPricing.size);
    }
    
    // Smart defaults based on product type
    if (normalizedName.includes('burrito') || normalizedName.includes('wrap')) {
      return 8; // Default 8 oz for burritos/wraps
    } else if (normalizedName.includes('sandwich')) {
      return 4.5; // Default 4.5 oz for sandwiches
    } else if (normalizedName.includes('piroshki')) {
      return 6; // Default 6 oz for piroshki
    }
  }
  
  // Default fallback size
  return 6; // Default 6 oz
}

/**
 * Parse size string to ounces (e.g., "6 oz" -> 6, "4.5 oz" -> 4.5)
 */
function parseSizeToOunces(sizeStr: string): number {
  if (!sizeStr) return 6; // Default fallback
  
  const sizeStrLower = sizeStr.toLowerCase().trim();
  
  // Look for patterns like "6 oz", "4.5 oz", "6oz", etc.
  const match = sizeStrLower.match(/(\d+(?:\.\d+)?)\s*oz/);
  if (match) {
    return parseFloat(match[1]);
  }
  
  // If no "oz" found, try to parse just the number
  const numberMatch = sizeStrLower.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    return parseFloat(numberMatch[1]);
  }
  
  return 6; // Default fallback
}

/**
 * Get product pricing information (case cost and unit cost)
 */
export function getProductPricing(pricingDb: PricingDatabase, itemNumber?: string, productName?: string): { caseCost: number; unitCost: number } {
  // Try to find by item number first
  if (itemNumber) {
    const pricing = pricingDb.byItemNumber.get(itemNumber);
    if (pricing) {
      return { caseCost: pricing.caseCost, unitCost: pricing.unitCost };
    }
  }
  
  // Try to find by product name
  if (productName) {
    const normalizedName = productName.toLowerCase().trim();
    
    // Try exact match first
    let pricing = pricingDb.byProductName.get(normalizedName);
    if (pricing) {
      return { caseCost: pricing.caseCost, unitCost: pricing.unitCost };
    }
    
    // Try partial matching for common variations
    const partialMatches = Array.from(pricingDb.byProductName.entries()).filter(([name, _]) => {
      const nameWords = name.split(/\s+/);
      const productWords = normalizedName.split(/\s+/);
      return nameWords.some(word => productWords.includes(word)) || 
             productWords.some(word => nameWords.includes(word));
    });
    
    if (partialMatches.length > 0) {
      // Use the first partial match
      const [, matchedPricing] = partialMatches[0];
      return { caseCost: matchedPricing.caseCost, unitCost: matchedPricing.unitCost };
    }
    
    // Smart defaults based on product type
    if (normalizedName.includes('burrito') || normalizedName.includes('wrap')) {
      return { caseCost: 33.60, unitCost: 2.80 }; // Default burrito/wrap pricing
    } else if (normalizedName.includes('sandwich')) {
      return { caseCost: 25.20, unitCost: 2.10 }; // Default sandwich pricing
    }
  }
  
  // Default fallback pricing
  return { caseCost: 30.00, unitCost: 2.50 };
}

/**
 * Get weight in pounds for a product based on item number or product name
 */
export function getProductWeight(pricingDb: PricingDatabase, itemNumber?: string, productName?: string): number {
  console.log(`Getting weight for itemNumber: ${itemNumber}, productName: ${productName}`);
  
  // Try item number first (most accurate)
  if (itemNumber && pricingDb.byItemNumber.has(itemNumber)) {
    const data = pricingDb.byItemNumber.get(itemNumber)!;
    console.log(`Found weight by item number ${itemNumber}: ${data.caseWeight} lbs`);
    return data.caseWeight;
  }
  
  // Fall back to product name matching
  if (productName) {
    const normalizedName = productName.toLowerCase().trim();
    
    // Try exact match first
    if (pricingDb.byProductName.has(normalizedName)) {
      const data = pricingDb.byProductName.get(normalizedName)!;
      console.log(`Found weight by exact product name: ${data.caseWeight} lbs`);
      return data.caseWeight;
    }
    
    // Try partial matching for common variations
    const productEntries = Array.from(pricingDb.byProductName.entries());
    for (const [key, data] of productEntries) {
      if ((key.includes('burrito') && normalizedName.includes('burrito')) ||
          (key.includes('wrap') && normalizedName.includes('wrap')) ||
          (key.includes('sandwich') && normalizedName.includes('sandwich'))) {
        // Additional matching logic for similar products
        if ((key.includes('bacon') && normalizedName.includes('bacon')) ||
            (key.includes('sausage') && normalizedName.includes('sausage')) ||
            (key.includes('chile') && normalizedName.includes('chile')) ||
            (key.includes('verde') && normalizedName.includes('verde')) ||
            (key.includes('chorizo') && normalizedName.includes('chorizo')) ||
            (key.includes('black bean') && normalizedName.includes('black bean')) ||
            (key.includes('turkey') && normalizedName.includes('turkey')) ||
            (key.includes('pesto') && normalizedName.includes('pesto')) ||
            (key.includes('provolone') && normalizedName.includes('provolone'))) {
          console.log(`Found weight by partial match: ${data.caseWeight} lbs`);
          return data.caseWeight;
        }
      }
    }
  }
  
  // Default weight for unknown products
  // Sandwiches are typically lighter (3.75 lbs), burritos/wraps are heavier (6 lbs)
  const defaultWeight = productName && productName.toLowerCase().includes('sandwich') ? 3.75 : 6;
  console.log(`Using default weight: ${defaultWeight} lbs for ${productName}`);
  return defaultWeight;
}
