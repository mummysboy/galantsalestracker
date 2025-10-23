/**
 * Product Name Mapping Dictionary
 * Maps various product name formats from different suppliers to canonical names from Master Pricing
 */

export interface ProductMapping {
  itemNumber: string;
  canonicalName: string;
  alternateNames: string[];
  category?: string;
  alpineProductCodes?: string[]; // Alpine-specific product codes
  petesProductCodes?: string[]; // Pete's Coffee product codes (CLARA'S brand)
  keheProductCodes?: string[]; // KeHE UPC codes (CLARA'S KITCHEN & BENNY'S brands)
  vistarProductCodes?: string[]; // Vistar GFO product codes
}

/**
 * Master product mapping dictionary
 * This maps all product variations to their canonical names from the Master 2025 Pricing file
 */
export const PRODUCT_MAPPINGS: ProductMapping[] = [
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
  
  // Breakfast Burritos
  {
    itemNumber: '321',
    canonicalName: 'Uncured Bacon Breakfast Burrito',
    alternateNames: [
      'GAL BURR BRKFST BACON',
      'GLNT BACON BREAKF BURRITO',
      'BACON BREAKFAST BURRITO',
      'BACON BRKFST BURRITO',
      "CLARA'S Uncured Bacon Breakfast Burrito",
      'BURRITO BRKFST BCN EGG CHS',
      'BurritoUncured Bacon Breakfast',
      'MH400002',
    ],
    category: 'Breakfast Burrito',
    alpineProductCodes: ['999983'],
    petesProductCodes: ['59975'],
    keheProductCodes: ['611665888003']
  },
  {
    itemNumber: '341',
    canonicalName: 'Chile Verde Breakfast Burrito',
    alternateNames: [
      'GAL BURR BRKFST VERDE',
      'GLNT CHILI VERDE BFA BRTO',
      'CHILI VERDE BREAKFAST BURRITO',
      'CHILLE VERDE BREAKFAST BURRITO',
      'VERDE BREAKFAST BURRITO',
      "CLARA'S Chille Verde Breakfast Burrito",
      'WRAP BRKFST CHILE EGG CHS',
      'BURRITO CHILE VERDE BRKFT',
      'Burrito Chile Verde Breakfast',
      'MH400003',
    ],
    category: 'Breakfast Burrito',
    alpineProductCodes: ['999988'],
    petesProductCodes: ['59977'],
    keheProductCodes: ['611665888010', '611665901023']
  },
  {
    itemNumber: '331',
    canonicalName: 'Sausage Breakfast Burrito',
    alternateNames: [
      'GAL BURR BRKFST SAUSAGE',
      'GLNT SAUSAGE BRKFST BRRTO',
      'SAUSAGE BRKFST BURRITO',
      'SAUSAGE BURRITO',
      "CLARA'S Sausage Breakfast Burrito",
      'WRAP BRKFST SAUSGE EGG CH',
      'MH400001',
    ],
    category: 'Breakfast Burrito',
    alpineProductCodes: ['999989'],
    petesProductCodes: ['59976'],
    keheProductCodes: ['611665888027']
  },
  {
    itemNumber: '361',
    canonicalName: 'Black Bean Breakfast Burrito',
    alternateNames: [
      'GLNT BEAN & CHEESE BURRTO',
      'BEAN AND CHEESE BURRITO',
      'BLACK BEAN BREAKFAST BURRITO',
      'BLACK BEAN BURRITO',
      'BLK BEAN BREAKFAST BURRITO', // MHD name
      'BURRITO BREAKFAST',
      'BURRITO BEAN CHEESE',
      'MH400011',
    ],
    category: 'Breakfast Burrito',
    keheProductCodes: ['611665888126', '611665901047']
  },
  {
    itemNumber: '311',
    canonicalName: 'Chorizo Breakfast Burrito',
    alternateNames: [
      'GAL BURR BFST CHORIZO',
      'GLNT CHORIZO BRKFST BRRTO',
      'GLNT CHORIZO BRKFST', // Troia truncated name
      'CHORIZO BREAKFAST BURRITO',
      'CHORIZO BRKFST BURRITO',
      'BURRITO BRKFST CHORIZO',
      'Burrito Chorizo Breakfast',
      'MH400006',
    ],
    category: 'Breakfast Burrito',
    alpineProductCodes: ['999987'],
    keheProductCodes: ['611665888119']
  },
  {
    itemNumber: '901',
    canonicalName: 'Plant Based Breakfast Burrito',
    alternateNames: [
      'PLANT BASED BREAKFAST BURRITO',
      'PLANT BASED BURRITO',
      'VEGAN BREAKFAST BURRITO',
      'BURRITO BEAN CHSE PLNTBSD',
      'MH400008',
    ],
    category: 'Breakfast Burrito',
    keheProductCodes: ['611665888140']
  },
  {
    itemNumber: '902',
    canonicalName: 'Plant Based Sausage Breakfast Burrito',
    alternateNames: [
      'GLNT VEGN SSGE BRKFST BRT',
      'VEGAN SAUSAGE BREAKFAST BURRITO',
      'PLANT BASED SAUSAGE BREAKFAST BURRITO',
      'VEGAN SSAGE BURRITO',
      'BFAST BURRITO VEGAN SAUSAGE', // MHD name
      'MH400123',
    ],
    category: 'Breakfast Burrito'
  },
  
  // Wraps
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
    itemNumber: '811',
    canonicalName: 'Chicken Bacon Ranch Wrap',
    alternateNames: [
      'GAL WRAP CHIC BAC RAN',
      'Wrap Chicken Bacon Ranch',
      'GLNT CHICKEN BACON RANCH',
      'CHICKEN BACON RANCH BURRITO',
      'CHICKEN BACON RANCH WRAP',
      'CHKN BACON RANCH WRAP',
      'WRAP CHICKEN BACON RANCH',
      'MH400014',
    ],
    category: 'Wrap',
    alpineProductCodes: ['183981'],
    keheProductCodes: ['611665888089']
  },
  {
    itemNumber: '451',
    canonicalName: 'Chicken Curry Wrap',
    alternateNames: [
      'GLNT CHICKEN CURRY BURRTO',
      'CHICKEN CURRY BURRITO',
      'CHICKEN CURRY WRAP',
      'CHKN CURRY WRAP',
      'WRAP CHICKEN CURRY',
      'BURRITO CHICKEN COCONUT CURRY', // MHD name
      'MH400121',
    ],
    category: 'Wrap',
    keheProductCodes: ['611665901009']
  },
  {
    itemNumber: '461',
    canonicalName: 'Spicy Thai Style Chicken Wrap',
    alternateNames: [
      'Wrap Spicy Thai Chicken',
      'SPICY THAI CHICKEN WRAP',
      'THAI STYLE CHICKEN WRAP',
      'SPICY THAI WRAP',
      'MH402007',
    ],
    category: 'Wrap'
  },
  
  // Burritos (Non-Breakfast)
  {
    itemNumber: '392',
    canonicalName: 'Plant Based Bean Burrito',
    alternateNames: [
      'PLANT BASED BEAN BURRITO',
      'VEGAN BEAN BURRITO',
      'MH400009',
    ],
    category: 'Burrito'
  },
  {
    itemNumber: '511',
    canonicalName: 'Bean & Cheese Burrito',
    alternateNames: [
      'GLNT BEAN & CHEESE BURRTO',
      'BEAN AND CHEESE BURRITO',
      'BEAN & CHEESE BURRITO',
      'BURRITO CHICKN CHEES BEAN',
      'MH400171',
    ],
    category: 'Burrito',
    keheProductCodes: ['611665901054']
  },
  {
    itemNumber: '471',
    canonicalName: 'Chicken Chile Burrito',
    alternateNames: [
      'CHICKEN CHILE BURRITO',
      'CHKN CHILE BURRITO',
      'MH400015',
    ],
    category: 'Burrito'
  },
  {
    itemNumber: '531',
    canonicalName: 'Steak & Cheese Burrito',
    alternateNames: [
      'GLNT STEAK AND CHESE BRTO',
      'STEAK AND CHEESE BURRITO',
      'STEAK & CHEESE BURRITO',
      'MH400122',
    ],
    category: 'Burrito'
  },

  // Missing Wraps from Master List
  {
    itemNumber: '411',
    canonicalName: 'Chicken Florentine Wrap',
    alternateNames: [
      'CHICKEN FLORENTINE WRAP',
      'CHICKEN FLORENTINE BURRITO',
      'CHKN FLORENTINE WRAP',
      'MH400013',
    ],
    category: 'Wrap'
  },
  {
    itemNumber: '421',
    canonicalName: 'Chicken Parmesan Wrap',
    alternateNames: [
      'CHICKEN PARMESAN WRAP',
      'CHICKEN PARM WRAP',
      'CHKN PARM WRAP',
      'CHICKEN WRAP PARMESAN', // MHD name
      'MH400014',
    ],
    category: 'Wrap'
  },
  {
    itemNumber: '431',
    canonicalName: 'Chicken Bacon Ranch Wrap',
    alternateNames: [
      'CHICKEN BACON RANCH WRAP',
      'CHICKEN BACON RANCH BURRITO',
      'CHKN BACON RANCH WRAP',
      'MH400015',
    ],
    category: 'Wrap'
  },
  {
    itemNumber: '441',
    canonicalName: 'Spicy Thai Style Chicken Wrap',
    alternateNames: [
      'SPICY THAI STYLE CHICKEN WRAP',
      'THAI CHICKEN WRAP',
      'SPICY THAI WRAP',
      'CHICKEN WRAP SPICY THAI', // MHD name
      'MH400016',
    ],
    category: 'Wrap'
  },
  {
    itemNumber: '521',
    canonicalName: 'Chicken Chile Burrito',
    alternateNames: [
      'CHICKEN CHILE BURRITO',
      'CHICKEN CHILI BURRITO',
      'CHKN CHILE BURRITO',
      'MH400017',
    ],
    category: 'Burrito'
  },
  
  // Paramount Piroshki
  {
    itemNumber: '211',
    canonicalName: 'Beef & Cheese Piroshki',
    alternateNames: [
      'BEEF & CHEESE PIROSHKI',
      'BEEF CHEESE PIROSHKI',
      'PIROSHKI BEEF CHEESE',
      'PIROSHKI BEEF & CHEESE WRAPPED', // MHD name
      'PIROSHKI BEEF WRAPPED', // MHD name
      'Beef & Cheese Piroshki',
      'Beef and Cheese Piroshki', // MHD variation with "and"
    ],
    category: 'Piroshki'
  },
  {
    itemNumber: '213',
    canonicalName: 'Beef & Cheese Piroshki (retail pack)',
    alternateNames: [
      'BEEF & CHEESE PIROSHKI (RETAIL PACK)',
      'BEEF CHEESE PIROSHKI RETAIL',
      'PIROSHKI BEEF CHEESE RETAIL',
      'Beef & Cheese Piroshki (retail pack)',
      'Beef and Cheese Piroshki (retail pack)', // MHD variation with "and"
    ],
    category: 'Piroshki'
  },

  // Missing Products from Master List
  {
    itemNumber: '903',
    canonicalName: 'Plant Based Bean Burrito',
    alternateNames: [
      'PLANT BASED BEAN BURRITO',
      'VEGAN BEAN BURRITO',
      'PLANT BEAN BURRITO',
      'VEGAN BEAN & CHEESE BURRITO', // MHD name
      'MH400018',
    ],
    category: 'Burrito'
  },
  {
    itemNumber: '910',
    canonicalName: 'Chimichuri Beef Empanada',
    alternateNames: [
      'CHIMICHURI BEEF EMPANADA',
      'BEEF EMPANADA',
      'CHIMICHURI EMPANADA',
      'MH400019',
    ],
    category: 'Empanada'
  },
  {
    itemNumber: '911',
    canonicalName: 'Chicken Empanada',
    alternateNames: [
      'CHICKEN EMPANADA',
      'CHKN EMPANADA',
      'MH400020',
    ],
    category: 'Empanada'
  },
  {
    itemNumber: '912',
    canonicalName: 'Mushroom & Cheese Empanada',
    alternateNames: [
      'MUSHROOM & CHEESE EMPANADA',
      'MUSHROOM CHEESE EMPANADA',
      'MUSH & CHEESE EMPANADA', // MHD name
      'MH400021',
    ],
    category: 'Empanada'
  },
  {
    itemNumber: '611',
    canonicalName: 'Jumbo Beef Frank Bagel Dog',
    alternateNames: [
      'GAL BAGEL DOG BEEF',
      'GAL BAGEL DOG BEEF FRANK',
      'JUMBO BEEF FRANK BAGEL DOG',
      'BEEF FRANK BAGEL DOG',
      'BEEF BAGEL DOG',
      'BAGEL DOG BEEF JUMBO', // MHD name
      'Bagel Dog Beef Frank',
      'BEEF JUMBO BAGEL DOG',
      'BEEF FRANK BAGEL DOGS',
      'Bagel Dog Bf Frnk W/ Ppy Sd', // Vistar abbreviation
      'MH400022',
      'MH404001',
    ],
    category: 'Bagel Dog',
    alpineProductCodes: ['999978', '183922'],
    keheProductCodes: ['611665100013', '611665200010'],
    vistarProductCodes: ['GFO10001']
  },
  {
    itemNumber: '612',
    canonicalName: 'Jumbo Polish Sausage Bagel Dog',
    alternateNames: [
      'GAL BAGEL DOG POLISH',
      'GAL BAGEL DOG POLISH SSG',
      'JUMBO POLISH SAUSAGE BAGEL DOG',
      'POLISH SAUSAGE BAGEL DOG',
      'POLISH BAGEL DOG',
      'BAGEL DOG POLISH JUMBO WRAPPED', // MHD name
      'Bagel Dog Polish Sausage',
      'SAUSAGE POLISH BAGEL DOGS',
      'MH400023',
      'MH404003',
    ],
    category: 'Bagel Dog',
    alpineProductCodes: ['999979', '183923'],
    keheProductCodes: ['611665200218']
  },
  {
    itemNumber: '280',
    canonicalName: 'Beef & Cheddar Handpie',
    alternateNames: [
      'BEEF & CHEDDAR HANDPIE',
      'BEEF CHEDDAR HANDPIE',
      'MH400024',
    ],
    category: 'Handpie'
  },
  {
    itemNumber: '281',
    canonicalName: 'Chicken Pot Pie Handpie',
    alternateNames: [
      'CHICKEN POT PIE HANDPIE',
      'CHICKEN POT PIE',
      'MH400025',
    ],
    category: 'Handpie'
  },
  {
    itemNumber: '282',
    canonicalName: 'Pepperoni Pizza Handpie',
    alternateNames: [
      'PEPPERONI PIZZA HANDPIE',
      'PEPPERONI PIZZA',
      'MH400026',
    ],
    category: 'Handpie'
  },
  {
    itemNumber: '283',
    canonicalName: 'Spinach & Four Cheese Handpie',
    alternateNames: [
      'SPINACH & FOUR CHEESE HANDPIE',
      'SPINACH FOUR CHEESE HANDPIE',
      'PIROSHKI SPINACH & CHEESE WRPD', // MHD name
      'MH400027',
    ],
    category: 'Handpie'
  },
  {
    itemNumber: '913',
    canonicalName: 'Caprese Sandwich',
    alternateNames: [
      'CAPRESE SANDWICH',
      'CAPRESE',
      'MH400028',
    ],
    category: 'Sandwich'
  },
  {
    itemNumber: '914',
    canonicalName: 'Muffaletta Sandwich',
    alternateNames: [
      'MUFFALETTA SANDWICH',
      'MUFFALETTA',
      'MH400029',
    ],
    category: 'Sandwich'
  },

  // Benny's Brand
  {
    itemNumber: '621',
    canonicalName: "Benny's Beef Frank Bagel Dogs",
    alternateNames: [
      "BENNY'S BEEF FRANK BAGEL DOGS",
      "BENNY'S BEEF BAGEL DOGS",
      "BENNY BEEF BAGEL DOG",
      'MH400030',
    ],
    category: 'Bagel Dog',
    vistarProductCodes: ['GFO12001']
  },
  {
    itemNumber: '622',
    canonicalName: "Benny's Polish Sausage Bagel Dogs",
    alternateNames: [
      "BENNY'S POLISH SAUSAGE BAGEL DOGS",
      "BENNY'S POLISH BAGEL DOGS",
      "BENNY POLISH BAGEL DOG",
      'MH400031',
    ],
    category: 'Bagel Dog'
  },
  {
    itemNumber: '623',
    canonicalName: "Benny's Jalapeno & Cheddar Bagel Dogs",
    alternateNames: [
      "BENNY'S JALAPENO & CHEDDAR BAGEL DOGS",
      "BENNY'S JALAPENO CHEDDAR BAGEL DOGS",
      "BENNY JALAPENO BAGEL DOG",
      'MH400032',
    ],
    category: 'Bagel Dog'
  },

  // MHD-specific products - Calzone items with correct Master Pricing item numbers and names
  {
    itemNumber: '131', // Correct item number from Master Pricing
    canonicalName: 'Italian Combo Calzone', // Exact name from Master Pricing
    alternateNames: [
      'CALZONE ITALIAN COMBO WRAPPED',
      'ITALIAN COMBO CALZONE',
      'ITALIAN COMBO CALZONE WRAPPED',
      'Calzone Italian Combo Wrapped', // MHD name
      'ITALIAN COMBO CALZONE WRAPPED',
      'CALZONE ITALIAN COMBO',
      'ITALIAN COMBO CALZONE WRAP',
    ],
    category: 'Calzone'
  },
  {
    itemNumber: '111', // Correct item number from Master Pricing
    canonicalName: 'Pesto Mushroom Calzone', // Exact name from Master Pricing
    alternateNames: [
      'CALZONE PESTO MUSHROOM WRAPPED',
      'PESTO MUSHROOM CALZONE',
      'PESTO MUSHROOM CALZONE WRAPPED',
      'Calzone Pesto Mushroom Wrapped', // MHD name
      'PESTO MUSHROOM CALZONE WRAP',
      'CALZONE PESTO MUSHROOM',
      'PESTO MUSHROOM CALZONE WRAP',
    ],
    category: 'Calzone'
  },
  {
    itemNumber: '141', // Correct item number from Master Pricing
    canonicalName: 'Chicken Fajita Calzone', // Exact name from Master Pricing
    alternateNames: [
      'CHICKEN FAJITA WRAPPED CALZONE',
      'CHICKEN FAJITA CALZONE',
      'Chicken Fajita Wrapped Calzone', // MHD name
      'CHICKEN FAJITA CALZONE WRAPPED',
      'CALZONE CHICKEN FAJITA',
      'CHICKEN FAJITA CALZONE WRAP',
    ],
    category: 'Calzone'
  },
  {
    itemNumber: '122', // Correct item number from Master Pricing
    canonicalName: 'Spinach Feta Calzone', // Exact name from Master Pricing
    alternateNames: [
      'CALZONE SPINACH FETA WRAPPED',
      'SPINACH FETA CALZONE',
      'Calzone Spinach Feta Wrapped', // MHD name
      'SPINACH FETA CALZONE WRAPPED',
      'CALZONE SPINACH FETA',
      'SPINACH FETA CALZONE WRAP',
    ],
    category: 'Calzone'
  },
  {
    itemNumber: '994', // Placeholder item number
    canonicalName: 'Bagel Dog Turkey Jumbo Wrapped',
    alternateNames: [
      'BAGEL DOG TURKEY JUMBO WRAPPED',
      'TURKEY JUMBO BAGEL DOG',
    ],
    category: 'Bagel Dog'
  },
  
  // Breakfast Sandwiches
  {
    itemNumber: '841',
    canonicalName: 'Turkey Sausage Breakfast Sandwich',
    alternateNames: [
      'GAL SAND SSG TURKEY',
      'GLNT TURKEY SSAGE SANDWCH',
      'GLNT TURKEY SSAGE', // Troia truncated name
      'TURKEY SAUSAGE SANDWICH',
      'TURKEY SSAGE SANDWICH',
      'TURKEY SAUSAGE BFAST SANDWICH', // MHD name
      "CLARA'S Breakfast Sandwich-Turkey",
      'Sandwich Breakfast Turkey',
      'MH400106',
    ],
    category: 'Breakfast Sandwich',
    alpineProductCodes: ['999986'],
    petesProductCodes: ['59986']
  },
  {
    itemNumber: '831',
    canonicalName: 'Pesto Provolone Breakfast Sandwich',
    alternateNames: [
      'GAL SAND PROV PESTO',
      'GLNT PSTO PRV BFST SNDWCH',
      'PROVENCAL PESTO SANDWICH',
      'PESTO PROVENCAL SANDWICH',
      'PESTO PROVOLONE SANDWICH',
      'BREAKFAST WRAP SAUSAGE', // MHD name
      "CLARA'S Breakfast Sandwich-Pesto",
      'SANDWICH BRKFST PEST PROV',
      'Sandwhich Brkfst Pesto Provol',
      'MH400107',
    ],
    category: 'Breakfast Sandwich',
    alpineProductCodes: ['999985'],
    petesProductCodes: ['59985'],
    keheProductCodes: ['611665900095']
  },
  {
    itemNumber: '811',
    canonicalName: 'Bacon Breakfast Sandwich',
    alternateNames: [
      'GAL SAND BRKFST BACON',
      'GLNT BACON BREAKF SANDWCH',
      'BACON BREAKFAST SANDWICH',
      'BACON BRKFST SANDWICH',
      'BACON BREAKFAST WRAP', // MHD name
      "CLARA'S Breakfast Sandwich-Bacon",
      'SANDWICH BREAKFAST BACON',
      'Sandwich Breakfast Bacon',
      'MH400102',
    ],
    category: 'Breakfast Sandwich',
    alpineProductCodes: ['999982'],
    petesProductCodes: ['59987'],
    keheProductCodes: ['611665900101']
  },
  {
    itemNumber: '821',
    canonicalName: 'Chorizo Breakfast Sandwich',
    alternateNames: [
      'GAL SAND BRKFST CHORIZO',
      'GLNT CHORIZO BFAST SNDWCH',
      'CHORIZO BREAKFAST SANDWICH',
      'CHORIZO BRKFST SANDWICH',
      'BREAKFAST WRAP GREEN CHILIES', // MHD name
      "CLARA'S Breakfast Sandwich-Chorizo",
      'SANDWICH BREAKFST CHORIZO',
      'Sandwhich Chorizo Breakfast',
      'MH400105',
    ],
    category: 'Breakfast Sandwich',
    alpineProductCodes: ['999984'],
    petesProductCodes: ['59984'],
    keheProductCodes: ['611665900118']
  },
  {
    itemNumber: '851',
    canonicalName: 'Chicken Sausage Breakfast Sandwich',
    alternateNames: [
      'CHICKEN SAUSAGE SANDWICH',
      'CHKN SAUSAGE SANDWICH',
      'MH400108',
    ],
    category: 'Breakfast Sandwich'
  },
  
  // Piroshkies
  {
    itemNumber: '721',
    canonicalName: 'Beef & Cheese Piroshkies',
    alternateNames: [
      'Piroshkies Beef & Cheese',
      'BEEF & CHEESE PIROSHKIES',
      'BEEF CHEESE PIROSHKIES',
      'PIROSHKIES BEEF CHEESE',
    ],
    category: 'Piroshkies'
  },
  
  // Empanadas
  {
    itemNumber: '711',
    canonicalName: 'Chimichurri Beef Empanada',
    alternateNames: [
      'CHIMICHURRI BEEF EMPANADA',
      'BEEF EMPANADA',
      'MH405001',
    ],
    category: 'Empanada'
  },
  {
    itemNumber: '721',
    canonicalName: 'Chicken Empanada',
    alternateNames: [
      'CHICKEN EMPANADA',
      'CHKN EMPANADA',
      'MH405002',
    ],
    category: 'Empanada'
  },
  {
    itemNumber: '731',
    canonicalName: 'Mushroom & Cheese Empanada',
    alternateNames: [
      'MUSHROOM CHEESE EMPANADA',
      'MUSHROOM & CHEESE EMPANADA',
      'MH405003',
    ],
    category: 'Empanada'
  },
  
  
  // Handpies
  {
    itemNumber: '741',
    canonicalName: 'Beef & Cheddar Handpie',
    alternateNames: [
      'BEEF CHEDDAR HANDPIE',
      'BEEF & CHEDDAR HANDPIE',
      'MH407001',
    ],
    category: 'Handpie'
  },
  {
    itemNumber: '751',
    canonicalName: 'Chicken Pot Pie Handpie',
    alternateNames: [
      'CHICKEN POT PIE HANDPIE',
      'CHICKEN HANDPIE',
      'MH407002',
    ],
    category: 'Handpie'
  },
  {
    itemNumber: '761',
    canonicalName: 'Pepperoni Pizza Handpie',
    alternateNames: [
      'PEPPERONI PIZZA HANDPIE',
      'PEPPERONI HANDPIE',
      'MH407003',
    ],
    category: 'Handpie'
  },
  {
    itemNumber: '771',
    canonicalName: 'Spinach & Four Cheese Handpie',
    alternateNames: [
      'SPINACH FOUR CHEESE HANDPIE',
      'SPINACH & FOUR CHEESE HANDPIE',
      'MH407004',
    ],
    category: 'Handpie'
  },
  
  // Sandwiches
  {
    itemNumber: '781',
    canonicalName: 'Caprese Sandwich',
    alternateNames: [
      'CAPRESE SANDWICH',
      'MH408001',
    ],
    category: 'Sandwich'
  },
  {
    itemNumber: '791',
    canonicalName: 'Muffaletta Sandwich',
    alternateNames: [
      'MUFFALETTA SANDWICH',
      'MUFFALETTA',
      'MH408002',
    ],
    category: 'Sandwich'
  },
  
  // Benny's Bagel Dogs
  {
    itemNumber: '512',
    canonicalName: "Benny's Beef Frank Bagel Dogs",
    alternateNames: [
      "BENNY'S BEEF FRANK BAGEL DOGS",
      "BENNYS BEEF FRANK BAGEL DOGS",
      "BENNY'S BEEF BAGEL DOGS",
      'MH404011',
    ],
    category: 'Bagel Dog'
  },
  {
    itemNumber: '522',
    canonicalName: "Benny's Polish Sausage Bagel Dogs",
    alternateNames: [
      "BENNY'S POLISH SAUSAGE BAGEL DOGS",
      "BENNYS POLISH SAUSAGE BAGEL DOGS",
      "BENNY'S POLISH BAGEL DOGS",
      'MH404013',
    ],
    category: 'Bagel Dog'
  },
  {
    itemNumber: '531',
    canonicalName: "Benny's Jalapeno & Cheddar Bagel Dogs",
    alternateNames: [
      'GAL BAGEL DOG JALA CHS',
      'Bagel Dog Jalapeno Cheddar',
      'JALAPENO CHEESE BAGEL DOG',
      'JALAPENO CHS BAGEL DOG',
      "BENNY'S JALAPENO CHEDDAR BAGEL DOGS",
      "BENNY'S JALAPENO & CHEDDAR BAGEL DOGS",
      'DOGS BAGEL JALEPENO CHDDR',
      'MH404004',
    ],
    category: 'Bagel Dog',
    alpineProductCodes: ['183924'],
    keheProductCodes: ['611665200225']
  },
  
  // Piroshki
  {
    itemNumber: '611R',
    canonicalName: 'Beef & Cheese Piroshki (retail pack)',
    alternateNames: [
      'BEEF CHEESE PIROSHKI RETAIL',
      'BEEF & CHEESE PIROSHKI RETAIL',
      'BEEF & CHEESE PIROSHKI (RETAIL PACK)',
      'MH406016',
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
    category: 'Other',
    alpineProductCodes: ['184016']
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
    
    // Map Alpine product codes to the canonical name
    if (mapping.alpineProductCodes) {
      for (const alpineCode of mapping.alpineProductCodes) {
        lookup.set(alpineCode, mapping.canonicalName);
      }
    }
    
  // Map Pete's product codes to the canonical name
  if (mapping.petesProductCodes) {
    for (const petesCode of mapping.petesProductCodes) {
      lookup.set(petesCode, mapping.canonicalName);
    }
  }

    // Map KeHE UPC codes to the canonical name
    if (mapping.keheProductCodes) {
      for (const keheCode of mapping.keheProductCodes) {
        lookup.set(keheCode, mapping.canonicalName);
      }
    }

    // Map Vistar GFO codes to the canonical name
    if (mapping.vistarProductCodes) {
      for (const vistarCode of mapping.vistarProductCodes) {
        lookup.set(vistarCode, mapping.canonicalName);
      }
    }
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
 * Get item number from Alpine vendor code (the left-side code on invoice)
 * @param alpineVendorCode The Alpine vendor code (e.g., "183981", "999982", "999986")
 * @returns Our internal item number (e.g., "321", "431", "811")
 */
export function getItemNumberFromAlpineCode(alpineVendorCode: string): string | undefined {
  if (!alpineVendorCode) return undefined;
  
  // Find the mapping that contains this Alpine vendor code
  const mapping = PRODUCT_MAPPINGS.find(m => 
    m.alpineProductCodes && m.alpineProductCodes.includes(alpineVendorCode)
  );
  return mapping ? mapping.itemNumber : undefined;
}

/**
 * Get item number from Pete's Coffee vendor code
 * @param petesVendorCode The Pete's vendor code (e.g., "59975", "59976", "59986")
 * @returns Our internal item number (e.g., "321", "331", "841")
 */
export function getItemNumberFromPetesCode(petesVendorCode: string): string | undefined {
  if (!petesVendorCode) return undefined;
  
  // Find the mapping that contains this Pete's vendor code
  const mapping = PRODUCT_MAPPINGS.find(m => 
    m.petesProductCodes && m.petesProductCodes.includes(petesVendorCode)
  );
  return mapping ? mapping.itemNumber : undefined;
}

/**
 * Get item number from Vistar GFO product code
 * @param vistarProductCode The Vistar GFO code (e.g., "GFO12001", "GFO10001")
 * @returns Our internal item number (e.g., "621", "611")
 */
export function getItemNumberFromVistarCode(vistarProductCode: string): string | undefined {
  if (!vistarProductCode) return undefined;
  
  // Find the mapping that contains this Vistar product code
  const mapping = PRODUCT_MAPPINGS.find(m => 
    m.vistarProductCodes && m.vistarProductCodes.includes(vistarProductCode)
  );
  return mapping ? mapping.itemNumber : undefined;
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
  
  // Add Alpine product codes if present
  if (mapping.alpineProductCodes) {
    for (const alpineCode of mapping.alpineProductCodes) {
      lookup.set(alpineCode, mapping.canonicalName);
    }
  }
  
  // Add Pete's product codes if present
  if (mapping.petesProductCodes) {
    for (const petesCode of mapping.petesProductCodes) {
      lookup.set(petesCode, mapping.canonicalName);
    }
  }

  // Add KeHE UPC codes if present
  if (mapping.keheProductCodes) {
    for (const keheCode of mapping.keheProductCodes) {
      lookup.set(keheCode, mapping.canonicalName);
    }
  }

  // Add Vistar GFO codes if present
  if (mapping.vistarProductCodes) {
    for (const vistarCode of mapping.vistarProductCodes) {
      lookup.set(vistarCode, mapping.canonicalName);
    }
  }
}

/**
 * Get the item number for a canonical product name
 */
export function getItemNumberForProduct(canonicalName: string): string | undefined {
  const mapping = PRODUCT_MAPPINGS.find(m => m.canonicalName === canonicalName);
  return mapping?.itemNumber;
}

/**
 * Get the item number from a KeHe UPC code
 */
export function getItemNumberFromKeHeUPC(keheUPC: string): string | undefined {
  const mapping = PRODUCT_MAPPINGS.find(m => 
    m.keheProductCodes && m.keheProductCodes.includes(keheUPC)
  );
  return mapping?.itemNumber;
}

const productMappingUtils = {
  mapToCanonicalProductName,
  getAllCanonicalProductNames,
  getProductByItemNumber,
  getProductByCanonicalName,
  getProductsByCategory,
  getAllCategories,
  addProductMapping,
  getItemNumberForProduct,
  PRODUCT_MAPPINGS
};

export default productMappingUtils;
