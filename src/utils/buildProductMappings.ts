/**
 * Build comprehensive product mappings from Master Pricing file and sales data
 * This tool helps identify unmapped products and generate mapping code
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { PRODUCT_MAPPINGS, mapToCanonicalProductName } from './productMapping';

interface MasterProduct {
  itemNumber: string;
  productDescription: string;
  dotNumber?: string;
  pack?: string;
  size?: string;
}

interface UnmappedProduct {
  productName: string;
  sources: string[];
  frequency: number;
}

/**
 * Extract products from Master Pricing file with proper structure
 */
function extractMasterProducts(filePath: string): MasterProduct[] {
  const products: MasterProduct[] = [];
  
  try {
    const wb = XLSX.readFile(filePath);
    
    // Process first sheet (Delivered pricing)
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    
    // Find header row (should be row 1)
    const headers = (rows[1] || []).map(c => String(c || '').trim());
    const headersLc = headers.map(h => h.toLowerCase());
    
    const itemNumIdx = headersLc.findIndex(h => h.includes('item #') || h === 'item #');
    const dotNumIdx = headersLc.findIndex(h => h.includes('dot #') || h === 'dot #');
    const descIdx = headersLc.findIndex(h => h.includes('product description'));
    const packIdx = headersLc.findIndex(h => h === 'pack');
    const sizeIdx = headersLc.findIndex(h => h === 'size');
    
    console.log('Master Pricing columns:', {
      itemNumIdx,
      dotNumIdx,
      descIdx,
      packIdx,
      sizeIdx,
      headers: headers.slice(0, 8)
    });
    
    // Extract products (start from row 3, skip brand header row 2)
    for (let r = 3; r < rows.length; r++) {
      const row = rows[r] || [];
      
      const itemNumber = String(row[itemNumIdx] || '').trim();
      const productDescription = String(row[descIdx] || '').trim();
      
      if (!itemNumber || !productDescription || itemNumber === 'Item #') {
        continue;
      }
      
      products.push({
        itemNumber,
        productDescription,
        dotNumber: dotNumIdx >= 0 ? String(row[dotNumIdx] || '').trim() : undefined,
        pack: packIdx >= 0 ? String(row[packIdx] || '').trim() : undefined,
        size: sizeIdx >= 0 ? String(row[sizeIdx] || '').trim() : undefined,
      });
    }
    
    console.log(`Extracted ${products.length} products from Master Pricing`);
  } catch (error) {
    console.error('Error reading Master Pricing file:', error);
  }
  
  return products;
}

/**
 * Extract all product names from sales data files
 */
function extractSalesProducts(dataDir: string): Map<string, string[]> {
  const productSources = new Map<string, string[]>();
  
  try {
    const files = fs.readdirSync(dataDir);
    
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const ext = path.extname(file).toLowerCase();
      
      if (!['.xlsx', '.xls', '.txt'].includes(ext)) {
        continue;
      }
      
      try {
        if (ext === '.txt') {
          // Handle TXT files (Alpine format)
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('    ') && /^\s+\d+/.test(line)) {
              // Alpine products - try to extract description
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 2) {
                // Skip item number, take description until size or quantity
                const desc = parts.slice(1).join(' ').split(/\d+pk/)[0].trim();
                if (desc.length > 3 && !desc.includes('TOTAL')) {
                  const sources = productSources.get(desc) || [];
                  sources.push(file);
                  productSources.set(desc, sources);
                }
              }
            }
          }
        } else {
          // Handle Excel files
          const wb = XLSX.readFile(filePath);
          const sheetName = wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
          
          // Find header row
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i] || [];
            const joined = row.map(c => String(c || '').toLowerCase()).join(' ');
            if (joined.includes('product') || joined.includes('item') || joined.includes('description')) {
              headerRowIdx = i;
              break;
            }
          }
          
          if (headerRowIdx >= 0) {
            const headers = (rows[headerRowIdx] || []).map(c => String(c || '').trim());
            const headersLc = headers.map(h => h.toLowerCase());
            
            // Find product column
            const productIdx = headersLc.findIndex(h => 
              h.includes('product') || h.includes('item') || h.includes('description') || 
              h.includes('memo') || h.includes('long description')
            );
            
            if (productIdx >= 0) {
              for (let r = headerRowIdx + 1; r < rows.length; r++) {
                const row = rows[r] || [];
                const productName = String(row[productIdx] || '').trim();
                
                if (productName && productName.length > 0 && 
                    !productName.toLowerCase().includes('total') &&
                    !productName.toLowerCase().includes('adjustment') &&
                    !productName.toLowerCase().includes('location:') &&
                    !productName.toLowerCase().includes('product list:')) {
                  const sources = productSources.get(productName) || [];
                  sources.push(file);
                  productSources.set(productName, sources);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
  } catch (error) {
    console.error('Error reading sales data directory:', error);
  }
  
  return productSources;
}

/**
 * Identify unmapped products
 */
function findUnmappedProducts(
  salesProducts: Map<string, string[]>
): UnmappedProduct[] {
  const unmapped: UnmappedProduct[] = [];
  
  // Convert Map to Array for iteration compatibility
  const entries = Array.from(salesProducts.entries());
  for (const [productName, sources] of entries) {
    // Try to map the product
    const canonical = mapToCanonicalProductName(productName);
    
    // If the canonical name is the same as input, it means no mapping was found
    if (canonical === productName) {
      unmapped.push({
        productName,
        sources: Array.from(new Set(sources)),
        frequency: sources.length
      });
    }
  }
  
  return unmapped.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Generate mapping code for unmapped products
 */
function generateMappingCode(
  unmappedProducts: UnmappedProduct[],
  masterProducts: MasterProduct[]
): string {
  let code = '// Additional product mappings - Add these to productMapping.ts\n\n';
  
  for (const unmapped of unmappedProducts) {
    code += `  // TODO: Map "${unmapped.productName}"\n`;
    code += `  // Found in: ${unmapped.sources.join(', ')}\n`;
    code += `  // Frequency: ${unmapped.frequency}\n`;
    
    // Try to find similar products in master
    const similarProducts = masterProducts.filter(mp => {
      const prodLower = unmapped.productName.toLowerCase();
      const descLower = mp.productDescription.toLowerCase();
      
      // Check for common words
      const prodWords = prodLower.split(/\s+/).filter(w => w.length > 3);
      const descWords = descLower.split(/\s+/).filter(w => w.length > 3);
      
      const commonWords = prodWords.filter(w => descWords.includes(w));
      return commonWords.length >= 2;
    });
    
    if (similarProducts.length > 0) {
      code += `  // Possible matches:\n`;
      for (const similar of similarProducts.slice(0, 3)) {
        code += `  //   - ${similar.itemNumber}: ${similar.productDescription}\n`;
      }
    }
    
    code += `  {\n`;
    code += `    itemNumber: 'XXX', // TODO: Fill in item number\n`;
    code += `    canonicalName: 'TODO', // TODO: Fill in canonical name\n`;
    code += `    alternateNames: [\n`;
    code += `      '${unmapped.productName}',\n`;
    code += `    ],\n`;
    code += `    category: 'TODO' // TODO: Fill in category\n`;
    code += `  },\n\n`;
  }
  
  return code;
}

/**
 * Main function to build comprehensive mappings
 */
export function buildProductMappings(
  masterPricingPath: string,
  salesDataDir: string
): {
  masterProducts: MasterProduct[];
  salesProducts: Map<string, string[]>;
  unmappedProducts: UnmappedProduct[];
  mappingCode: string;
} {
  console.log('Building comprehensive product mappings...\n');
  
  console.log('Step 1: Extract products from Master Pricing file');
  const masterProducts = extractMasterProducts(masterPricingPath);
  console.log(`  Found ${masterProducts.length} products in Master Pricing\n`);
  
  console.log('Step 2: Extract products from sales data files');
  const salesProducts = extractSalesProducts(salesDataDir);
  console.log(`  Found ${salesProducts.size} unique product names in sales data\n`);
  
  console.log('Step 3: Identify unmapped products');
  const unmappedProducts = findUnmappedProducts(salesProducts);
  console.log(`  Found ${unmappedProducts.length} unmapped products\n`);
  
  console.log('Step 4: Generate mapping code for unmapped products');
  const mappingCode = generateMappingCode(unmappedProducts, masterProducts);
  
  return {
    masterProducts,
    salesProducts,
    unmappedProducts,
    mappingCode
  };
}

// Run if executed directly
if (require.main === module) {
  const masterPath = path.join(__dirname, '../../Master 2025 Pricing (1).xlsx');
  const salesDir = path.join(__dirname, '../../public/SalesData');
  
  const results = buildProductMappings(masterPath, salesDir);
  
  // Output results
  console.log('\n=== MAPPING ANALYSIS ===\n');
  console.log(`Master Products: ${results.masterProducts.length}`);
  console.log(`Sales Products: ${results.salesProducts.size}`);
  console.log(`Currently Mapped: ${PRODUCT_MAPPINGS.length}`);
  console.log(`Unmapped: ${results.unmappedProducts.length}`);
  
  console.log('\n=== TOP 20 UNMAPPED PRODUCTS ===\n');
  for (const unmapped of results.unmappedProducts.slice(0, 20)) {
    console.log(`  "${unmapped.productName}"`);
    console.log(`    Sources: ${unmapped.sources.join(', ')}`);
    console.log(`    Frequency: ${unmapped.frequency}\n`);
  }
  
  // Write mapping code to file
  const codeOutputPath = path.join(__dirname, '../../unmapped-products-code.txt');
  fs.writeFileSync(codeOutputPath, results.mappingCode);
  console.log(`\nMapping code written to: ${codeOutputPath}`);
  
  // Write full results to JSON
  const jsonOutputPath = path.join(__dirname, '../../product-mapping-analysis.json');
  fs.writeFileSync(jsonOutputPath, JSON.stringify({
    masterProducts: results.masterProducts,
    salesProducts: Object.fromEntries(results.salesProducts),
    unmappedProducts: results.unmappedProducts,
    currentMappings: PRODUCT_MAPPINGS
  }, null, 2));
  console.log(`Full analysis written to: ${jsonOutputPath}`);
}

