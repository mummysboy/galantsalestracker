/**
 * Product Name Mapping Dictionary
 * Maps various product name formats from different suppliers to canonical names from Master Pricing
 */

export interface ProductMapping {
  itemNumber: string;
  canonicalName: string;
  alternateNames: string[];
  category?: string;
}

/**
 * Master product mapping dictionary
 * This maps all product variations to their canonical names from the Master 2025 Pricing file
 */
export const PRODUCT_MAPPINGS: ProductMapping[] = [
  // Breakfast Burritos
  {
    itemNumber: '321',
    canonicalName: 'Uncured Bacon Breakfast Burrito',
    alternateNames: [
      'GAL BURR BRKFST BACON',
      'GLNT BACON BREAKF BURRITO',
      'BACON BREAKFAST BURRITO',
      'BACON BRKFST BURRITO',
      'MH400002', // MHD code
    ],
    category: 'Breakfast Burrito'
  },
  {
    itemNumber: '341',
    canonicalName: 'Chile Verde Breakfast Burrito',
    alternateNames: [
      'GAL BURR BRKFST VERDE',
      'GLNT CHILI VERDE BFA BRTO',
      'CHILI VERDE BREAKFAST BURRITO',
      'VERDE BREAKFAST BURRITO',
      'MH400003',
    ],
    category: 'Breakfast Burrito'
  },
  {
    itemNumber: '331',
    canonicalName: 'Sausage Breakfast Burrito',
    alternateNames: [
      'GAL BURR BRKFST SAUSAGE',
      'GLNT SAUSAGE BRKFST BRRTO',
      'SAUSAGE BRKFST BURRITO',
      'SAUSAGE BURRITO',
      'MH400001',
    ],
    category: 'Breakfast Burrito'
  },
  {
    itemNumber: '311',
    canonicalName: 'Chorizo Breakfast Burrito',
    alternateNames: [
      'GAL BURR BFST CHORIZO',
      'GLNT CHORIZO BRKFST BRRTO',
      'CHORIZO BREAKFAST BURRITO',
      'CHORIZO BRKFST BURRITO',
      'MH400006',
    ],
    category: 'Breakfast Burrito'
  },
  {
    itemNumber: '361',
    canonicalName: 'Black Bean Breakfast Burrito',
    alternateNames: [
      'GLNT BEAN & CHEESE BURRTO',
      'BEAN AND CHEESE BURRITO',
      'BLACK BEAN BREAKFAST BURRITO',
      'BLACK BEAN BURRITO',
      'MH400011',
    ],
    category: 'Breakfast Burrito'
  },
  
  // Breakfast Sandwiches
  {
    itemNumber: '211',
    canonicalName: 'Bacon Breakfast Sandwich',
    alternateNames: [
      'GAL SAND BRKFST BACON',
      'GLNT BACON BREAKF SANDWCH',
      'BACON BREAKFAST SANDWICH',
      'BACON BRKFST SANDWICH',
      'MH400102',
    ],
    category: 'Breakfast Sandwich'
  },
  {
    itemNumber: '213',
    canonicalName: 'Chorizo Breakfast Sandwich',
    alternateNames: [
      'GAL SAND BRKFST CHORIZO',
      'GLNT CHORIZO BFAST SNDWCH',
      'CHORIZO BREAKFAST SANDWICH',
      'CHORIZO BRKFST SANDWICH',
      'MH400105',
    ],
    category: 'Breakfast Sandwich'
  },
  
  // Lunch Wraps
  {
    itemNumber: '411',
    canonicalName: 'Chicken Florentine Wrap',
    alternateNames: [
      'CHICKEN FLORENTINE WRAP',
      'CHKN FLORENTINE WRAP',
      'MH402000',
    ],
    category: 'Wrap'
  },
  {
    itemNumber: '421',
    canonicalName: 'Chicken Parmesean Wrap',
    alternateNames: [
      'CHICKEN PARMESEAN WRAP',
      'CHICKEN PARMESAN WRAP',
      'CHKN PARMESEAN WRAP',
      'MH402002',
    ],
    category: 'Wrap'
  },
  {
    itemNumber: '431',
    canonicalName: 'BBQ Pulled Pork Wrap',
    alternateNames: [
      'BBQ PULLED PORK WRAP',
      'PULLED PORK WRAP',
      'BBQ PORK WRAP',
      'MH402005',
    ],
    category: 'Wrap'
  },
  {
    itemNumber: '441',
    canonicalName: 'Turkey Sausage Breakfast Sandwich',
    alternateNames: [
      'GAL SAND SSG TURKEY',
      'GLNT TURKEY SSAGE SANDWCH',
      'TURKEY SAUSAGE SANDWICH',
      'TURKEY SSAGE SANDWICH',
      'MH400106',
    ],
    category: 'Breakfast Sandwich'
  },
  {
    itemNumber: '451',
    canonicalName: 'Provencal Pesto Breakfast Sandwich',
    alternateNames: [
      'GAL SAND PROV PESTO',
      'GLNT PSTO PRV BFST SNDWCH',
      'PROVENCAL PESTO SANDWICH',
      'PESTO PROVENCAL SANDWICH',
      'MH400107',
    ],
    category: 'Breakfast Sandwich'
  },
  
  // Bagel Dogs
  {
    itemNumber: '511',
    canonicalName: 'Beef Frank Bagel Dog',
    alternateNames: [
      'GAL BAGEL DOG BEEF',
      'GAL BAGEL DOG BEEF FRANK',
      'BEEF BAGEL DOG',
      'BEEF FRANK BAGEL DOG',
      'MH404001',
    ],
    category: 'Bagel Dog'
  },
  {
    itemNumber: '521',
    canonicalName: 'Polish Sausage Bagel Dog',
    alternateNames: [
      'GAL BAGEL DOG POLISH',
      'GAL BAGEL DOG POLISH SSG',
      'POLISH BAGEL DOG',
      'POLISH SAUSAGE BAGEL DOG',
      'MH404003',
    ],
    category: 'Bagel Dog'
  },
  {
    itemNumber: '531',
    canonicalName: 'Jalapeno Cheese Bagel Dog',
    alternateNames: [
      'GAL BAGEL DOG JALA CHS',
      'JALAPENO CHEESE BAGEL DOG',
      'JALAPENO CHS BAGEL DOG',
      'MH404004',
    ],
    category: 'Bagel Dog'
  },
  
  // Piroshki
  {
    itemNumber: '611',
    canonicalName: 'Beef & Cheese Piroshki',
    alternateNames: [
      'GAL PIROSHKI BEEF CHS N/S',
      'BEEF CHEESE PIROSHKI',
      'BEEF & CHEESE PIROSHKI',
      'MH406015',
    ],
    category: 'Piroshki'
  },
  {
    itemNumber: '612',
    canonicalName: 'Beef & Mushroom Piroshki',
    alternateNames: [
      'GAL PIROSHKI BF MUSH  N/S',
      'BEEF MUSHROOM PIROSHKI',
      'BEEF & MUSHROOM PIROSHKI',
      'MH406022',
    ],
    category: 'Piroshki'
  },
  {
    itemNumber: '621',
    canonicalName: 'Potato & Cheese Piroshki',
    alternateNames: [
      'POTATO CHEESE PIROSHKI',
      'POTATO & CHEESE PIROSHKI',
      'MH406039',
    ],
    category: 'Piroshki'
  },
  {
    itemNumber: '622',
    canonicalName: 'Potato & Mushroom Piroshki',
    alternateNames: [
      'POTATO MUSHROOM PIROSHKI',
      'POTATO & MUSHROOM PIROSHKI',
      'MH406046',
    ],
    category: 'Piroshki'
  },
  {
    itemNumber: '623',
    canonicalName: 'Spinach & Cheese Piroshki',
    alternateNames: [
      'SPINACH CHEESE PIROSHKI',
      'SPINACH & CHEESE PIROSHKI',
    ],
    category: 'Piroshki'
  },
  
  // Breakfast Folds
  {
    itemNumber: '371',
    canonicalName: 'Whole Wheat Spinach Feta Breakfast Fold',
    alternateNames: [
      'SPINACH FETA BREAKFAST FOLD',
      'WW SPINACH FETA FOLD',
      'WHOLE WHEAT SPINACH FETA FOLD',
      'MH400012',
    ],
    category: 'Breakfast Fold'
  },
  
  // Additional Items
  {
    itemNumber: '811',
    canonicalName: 'Chicken Bacon Ranch Burrito',
    alternateNames: [
      'GLNT CHICKEN BACON RANCH',
      'CHICKEN BACON RANCH BURRITO',
      'CHKN BACON RANCH BURRITO',
      'MH400014',
    ],
    category: 'Burrito'
  },
  {
    itemNumber: '821',
    canonicalName: 'Chicken Curry Burrito',
    alternateNames: [
      'GLNT CHICKEN CURRY BURRTO',
      'CHICKEN CURRY BURRITO',
      'CHKN CURRY BURRITO',
      'MH400121',
    ],
    category: 'Burrito'
  },
  {
    itemNumber: '831',
    canonicalName: 'Steak and Cheese Burrito',
    alternateNames: [
      'GLNT STEAK AND CHESE BRTO',
      'STEAK AND CHEESE BURRITO',
      'STEAK & CHEESE BURRITO',
      'MH400122',
    ],
    category: 'Burrito'
  },
  {
    itemNumber: '841',
    canonicalName: 'Vegan Sausage Breakfast Burrito',
    alternateNames: [
      'GLNT VEGN SSGE BRKFST BRT',
      'VEGAN SAUSAGE BREAKFAST BURRITO',
      'VEGAN SSAGE BURRITO',
      'MH400123',
    ],
    category: 'Breakfast Burrito'
  },
  {
    itemNumber: '851',
    canonicalName: 'Bean & Cheese Burrito',
    alternateNames: [
      'GLNT BEAN & CHEESE BURRTO',
      'BEAN AND CHEESE BURRITO',
      'BEAN & CHEESE BURRITO',
      'MH400171',
    ],
    category: 'Burrito'
  },
  
  // Additional MHD codes (unknown product names - to be mapped)
  {
    itemNumber: 'MH4069',
    canonicalName: 'MHD Product 4069',
    alternateNames: ['MH4069'],
    category: 'Unknown'
  },
  {
    itemNumber: 'MH4096',
    canonicalName: 'MHD Product 4096',
    alternateNames: ['MH4096'],
    category: 'Unknown'
  },
  {
    itemNumber: 'MH4097',
    canonicalName: 'MHD Product 4097',
    alternateNames: ['MH4097'],
    category: 'Unknown'
  },
  {
    itemNumber: 'MH7014',
    canonicalName: 'MHD Product 7014',
    alternateNames: ['MH7014'],
    category: 'Unknown'
  },
  
  // Misc
  {
    itemNumber: '901',
    canonicalName: 'Sample Kit',
    alternateNames: [
      'GAL SAMPLE KIT',
      'SAMPLE KIT',
      'GALANT SAMPLE KIT',
    ],
    category: 'Other'
  },
  {
    itemNumber: '902',
    canonicalName: 'Miscellaneous',
    alternateNames: [
      'GALANT MISC',
      'MISC',
      'MISCELLANEOUS',
    ],
    category: 'Other'
  },
];

/**
 * Create a reverse lookup map from alternate names to canonical names
 */
const createReverseLookup = (): Map<string, string> => {
  const lookup = new Map<string, string>();
  
  for (const mapping of PRODUCT_MAPPINGS) {
    // Map the canonical name to itself
    lookup.set(normalizeProductName(mapping.canonicalName), mapping.canonicalName);
    
    // Map all alternate names to the canonical name
    for (const altName of mapping.alternateNames) {
      lookup.set(normalizeProductName(altName), mapping.canonicalName);
    }
    
    // Also map the item number
    lookup.set(mapping.itemNumber, mapping.canonicalName);
  }
  
  return lookup;
};

/**
 * Normalize product name for comparison (remove extra spaces, convert to uppercase, etc.)
 */
function normalizeProductName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s&]/g, '') // Remove special characters except & 
    .trim();
}

// Create the reverse lookup map once
const PRODUCT_LOOKUP = createReverseLookup();

/**
 * Map a product name from any format to its canonical name
 * @param productName The product name from any data source
 * @returns The canonical product name from Master Pricing, or the original name if no mapping exists
 */
export function mapToCanonicalProductName(productName: string): string {
  if (!productName) return productName;
  
  const normalized = normalizeProductName(productName);
  const canonical = PRODUCT_LOOKUP.get(normalized);
  
  if (canonical) {
    return canonical;
  }
  
  // If no exact match, try partial matching for common patterns
  const entries = Array.from(PRODUCT_LOOKUP.entries());
  for (const [key, value] of entries) {
    // Check if the normalized name contains key terms
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Return original name if no mapping found (log for future mapping)
  console.log('[Product Mapping] No mapping found for:', productName);
  return productName;
}

/**
 * Get all unique canonical product names
 */
export function getAllCanonicalProductNames(): string[] {
  return PRODUCT_MAPPINGS.map(m => m.canonicalName).sort();
}

/**
 * Get product mapping by item number
 */
export function getProductByItemNumber(itemNumber: string): ProductMapping | undefined {
  return PRODUCT_MAPPINGS.find(m => m.itemNumber === itemNumber);
}

/**
 * Get product mapping by canonical name
 */
export function getProductByCanonicalName(canonicalName: string): ProductMapping | undefined {
  return PRODUCT_MAPPINGS.find(m => m.canonicalName === canonicalName);
}

/**
 * Search for products by category
 */
export function getProductsByCategory(category: string): ProductMapping[] {
  return PRODUCT_MAPPINGS.filter(m => m.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  const categories = PRODUCT_MAPPINGS
    .map(m => m.category)
    .filter((cat): cat is string => cat !== undefined && cat !== null);
  return Array.from(new Set(categories)).sort();
}

/**
 * Add a new product mapping dynamically (for products discovered in the data)
 */
export function addProductMapping(mapping: ProductMapping): void {
  PRODUCT_MAPPINGS.push(mapping);
  
  // Update the lookup map
  const lookup = PRODUCT_LOOKUP;
  lookup.set(normalizeProductName(mapping.canonicalName), mapping.canonicalName);
  for (const altName of mapping.alternateNames) {
    lookup.set(normalizeProductName(altName), mapping.canonicalName);
  }
  lookup.set(mapping.itemNumber, mapping.canonicalName);
}

export default {
  mapToCanonicalProductName,
  getAllCanonicalProductNames,
  getProductByItemNumber,
  getProductByCanonicalName,
  getProductsByCategory,
  getAllCategories,
  addProductMapping,
  PRODUCT_MAPPINGS
};

