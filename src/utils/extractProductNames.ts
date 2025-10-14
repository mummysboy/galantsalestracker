/**
 * Utility script to extract product names from various sales data files
 * Run this to analyze what product descriptions exist across all sources
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface ProductExtraction {
  source: string;
  products: Set<string>;
}

/**
 * Extract products from Master Pricing file
 */
function extractFromMasterPricing(filePath: string): Set<string> {
  const products = new Set<string>();
  
  try {
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
    
    if (headerRowIdx === -1) {
      console.warn('Could not find header row in Master Pricing file');
      return products;
    }
    
    const headers = (rows[headerRowIdx] || []).map(c => String(c || '').trim());
    const headersLc = headers.map(h => h.toLowerCase());
    
    // Find product column
    const productIdx = headersLc.findIndex(h => 
      h.includes('product') || h.includes('item') || h.includes('description') || h.includes('name')
    );
    
    if (productIdx === -1) {
      console.warn('Could not find product column in Master Pricing file');
      return products;
    }
    
    // Extract all product names
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const productName = String(row[productIdx] || '').trim();
      
      if (productName && productName.length > 0) {
        products.add(productName);
      }
    }
    
    console.log(`Extracted ${products.size} products from Master Pricing`);
  } catch (error) {
    console.error('Error reading Master Pricing file:', error);
  }
  
  return products;
}

/**
 * Extract products from sales data files
 */
function extractFromSalesFiles(dataDir: string): Map<string, Set<string>> {
  const fileProducts = new Map<string, Set<string>>();
  
  try {
    const files = fs.readdirSync(dataDir);
    
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const ext = path.extname(file).toLowerCase();
      
      if (!['.xlsx', '.xls', '.txt'].includes(ext)) {
        continue;
      }
      
      const products = new Set<string>();
      
      try {
        if (ext === '.txt') {
          // Handle TXT files (Alpine format)
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          
          for (const line of lines) {
            // Alpine product lines are indented and contain product descriptions
            if (line.startsWith('    ') && /^\s+\d+/.test(line)) {
              // Extract description between item number and size
              const match = line.match(/^\s+\d+\s+(.+?)\s+\d+/);
              if (match) {
                products.add(match[1].trim());
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
                    !productName.toLowerCase().includes('adjustment')) {
                  products.add(productName);
                }
              }
            }
          }
        }
        
        if (products.size > 0) {
          fileProducts.set(file, products);
          console.log(`Extracted ${products.size} products from ${file}`);
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
  } catch (error) {
    console.error('Error reading sales data directory:', error);
  }
  
  return fileProducts;
}

/**
 * Main extraction function
 */
export function extractAllProductNames(
  masterPricingPath: string,
  salesDataDir: string
): {
  masterProducts: Set<string>;
  salesProducts: Map<string, Set<string>>;
  allUnique: Set<string>;
} {
  console.log('Extracting product names from all sources...\n');
  
  const masterProducts = extractFromMasterPricing(masterPricingPath);
  console.log('\n---\n');
  
  const salesProducts = extractFromSalesFiles(salesDataDir);
  console.log('\n---\n');
  
  // Get all unique product names across all sources
  const allUnique = new Set<string>();
  masterProducts.forEach(p => allUnique.add(p));
  salesProducts.forEach(products => products.forEach(p => allUnique.add(p)));
  
  console.log(`\nTotal unique product names across all sources: ${allUnique.size}`);
  console.log(`Master Pricing products: ${masterProducts.size}`);
  console.log(`Sales data products: ${allUnique.size - masterProducts.size} additional variants`);
  
  return {
    masterProducts,
    salesProducts,
    allUnique
  };
}

// If run directly from command line
if (require.main === module) {
  const masterPath = path.join(__dirname, '../../Master 2025 Pricing (1).xlsx');
  const salesDir = path.join(__dirname, '../../public/SalesData');
  
  const results = extractAllProductNames(masterPath, salesDir);
  
  // Output to JSON for analysis
  const output = {
    master: Array.from(results.masterProducts).sort(),
    sales: Object.fromEntries(
      Array.from(results.salesProducts.entries()).map(([file, products]) => 
        [file, Array.from(products).sort()]
      )
    ),
    allUnique: Array.from(results.allUnique).sort()
  };
  
  const outputPath = path.join(__dirname, '../../product-names-extraction.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults written to: ${outputPath}`);
}

