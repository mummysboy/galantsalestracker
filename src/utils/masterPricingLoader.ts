/**
 * Utility to load and parse Master 2025 Pricing data
 */

import * as XLSX from 'xlsx';

export interface MasterPricingProduct {
  itemNumber: string;
  dotNumber?: string;
  caseUPC?: string;
  unitUPCA?: string;
  productDescription: string;
  pack: string;
  size: string;
  caseWeight: number;
  grossWeight: number;
  caseCost: number;
  unitCost: number;
  caseWidth?: number;
  caseLength?: number;
  caseHeight?: number;
  layer?: number;
  height?: number;
}

export interface MasterPricingData {
  products: MasterPricingProduct[];
  productMap: Map<string, MasterPricingProduct>; // Map by product description
  itemNumberMap: Map<string, MasterPricingProduct>; // Map by item number
}

let masterPricingCache: MasterPricingData | null = null;

/**
 * Load Master Pricing data from the Excel file
 */
export async function loadMasterPricingData(): Promise<MasterPricingData> {
  if (masterPricingCache) {
    return masterPricingCache;
  }

  try {
    // Try to load from the build directory first
    const response = await fetch('/SalesData/Master 2025 Pricing (1).xlsx');
    if (!response.ok) {
      throw new Error(`Failed to load Master Pricing file: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Process first sheet (Delivered pricing)
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    
    // Find header row (should be row 1)
    const headers = (rows[1] || []).map(c => String(c || '').trim());
    const headersLc = headers.map(h => h.toLowerCase());
    
    const itemNumIdx = headersLc.findIndex(h => h.includes('item #') || h === 'item #');
    const dotNumIdx = headersLc.findIndex(h => h.includes('dot #') || h === 'dot #');
    const caseUPCIdx = headersLc.findIndex(h => h.includes('case upc') || h.includes('gtin'));
    const unitUPCAIdx = headersLc.findIndex(h => h.includes('unit upca'));
    const descIdx = headersLc.findIndex(h => h.includes('product description'));
    const packIdx = headersLc.findIndex(h => h === 'pack');
    const sizeIdx = headersLc.findIndex(h => h === 'size');
    const caseWtIdx = headersLc.findIndex(h => h.includes('case wt') || h.includes('case\nwt'));
    const grossWtIdx = headersLc.findIndex(h => h.includes('gross\nwt') || h.includes('gross wt'));
    const caseCostIdx = headersLc.findIndex(h => h.includes('case cost'));
    const unitCostIdx = headersLc.findIndex(h => h.includes('unit cost'));
    const caseWidthIdx = headersLc.findIndex(h => h.includes('case width'));
    const caseLengthIdx = headersLc.findIndex(h => h.includes('case length'));
    const caseHeightIdx = headersLc.findIndex(h => h.includes('case height'));
    const layerIdx = headersLc.findIndex(h => h === 'layer');
    const heightIdx = headersLc.findIndex(h => h === 'height');
    
    console.log('Master Pricing columns:', {
      itemNumIdx,
      dotNumIdx,
      caseUPCIdx,
      unitUPCAIdx,
      descIdx,
      packIdx,
      sizeIdx,
      caseWtIdx,
      grossWtIdx,
      caseCostIdx,
      unitCostIdx,
      headers: headers.slice(0, 10)
    });
    
    const products: MasterPricingProduct[] = [];
    const productMap = new Map<string, MasterPricingProduct>();
    const itemNumberMap = new Map<string, MasterPricingProduct>();
    
    // Extract products (start from row 3, skip brand header row 2)
    for (let r = 3; r < rows.length; r++) {
      const row = rows[r] || [];
      
      const itemNumber = String(row[itemNumIdx] || '').trim();
      const productDescription = String(row[descIdx] || '').trim();
      
      if (!itemNumber || !productDescription || itemNumber === 'Item #') {
        continue;
      }
      
      const product: MasterPricingProduct = {
        itemNumber,
        dotNumber: dotNumIdx >= 0 ? String(row[dotNumIdx] || '').trim() : undefined,
        caseUPC: caseUPCIdx >= 0 ? String(row[caseUPCIdx] || '').trim() : undefined,
        unitUPCA: unitUPCAIdx >= 0 ? String(row[unitUPCAIdx] || '').trim() : undefined,
        productDescription,
        pack: packIdx >= 0 ? String(row[packIdx] || '').trim() : '',
        size: sizeIdx >= 0 ? String(row[sizeIdx] || '').trim() : '',
        caseWeight: caseWtIdx >= 0 ? parseFloat(String(row[caseWtIdx] || '0').replace(/[,$]/g, '')) || 0 : 0,
        grossWeight: grossWtIdx >= 0 ? parseFloat(String(row[grossWtIdx] || '0').replace(/[,$]/g, '')) || 0 : 0,
        caseCost: caseCostIdx >= 0 ? parseFloat(String(row[caseCostIdx] || '0').replace(/[,$]/g, '')) || 0 : 0,
        unitCost: unitCostIdx >= 0 ? parseFloat(String(row[unitCostIdx] || '0').replace(/[,$]/g, '')) || 0 : 0,
        caseWidth: caseWidthIdx >= 0 ? parseFloat(String(row[caseWidthIdx] || '0')) || undefined : undefined,
        caseLength: caseLengthIdx >= 0 ? parseFloat(String(row[caseLengthIdx] || '0')) || undefined : undefined,
        caseHeight: caseHeightIdx >= 0 ? parseFloat(String(row[caseHeightIdx] || '0')) || undefined : undefined,
        layer: layerIdx >= 0 ? parseInt(String(row[layerIdx] || '0'), 10) || undefined : undefined,
        height: heightIdx >= 0 ? parseInt(String(row[heightIdx] || '0'), 10) || undefined : undefined,
      };
      
      products.push(product);
      productMap.set(productDescription.toLowerCase(), product);
      itemNumberMap.set(itemNumber, product);
    }
    
    console.log(`Loaded ${products.length} products from Master Pricing`);
    
    masterPricingCache = {
      products,
      productMap,
      itemNumberMap
    };
    
    return masterPricingCache;
  } catch (error) {
    console.error('Error loading Master Pricing data:', error);
    
    // Return empty data structure on error
    const emptyData: MasterPricingData = {
      products: [],
      productMap: new Map(),
      itemNumberMap: new Map()
    };
    
    masterPricingCache = emptyData;
    return emptyData;
  }
}

/**
 * Get Master Pricing product by product description
 */
export async function getMasterPricingProduct(description: string): Promise<MasterPricingProduct | undefined> {
  const data = await loadMasterPricingData();
  return data.productMap.get(description.toLowerCase());
}

/**
 * Get Master Pricing product by item number
 */
export async function getMasterPricingProductByItemNumber(itemNumber: string): Promise<MasterPricingProduct | undefined> {
  const data = await loadMasterPricingData();
  return data.itemNumberMap.get(itemNumber);
}

/**
 * Find Master Pricing product by partial description match
 */
export async function findMasterPricingProduct(description: string): Promise<MasterPricingProduct | undefined> {
  const data = await loadMasterPricingData();
  
  // First try exact match
  let product = data.productMap.get(description.toLowerCase());
  if (product) return product;
  
  // Try to find by item number if description contains a number
  const itemNumberMatch = description.match(/\b(\d{3,4})\b/);
  if (itemNumberMatch) {
    product = data.itemNumberMap.get(itemNumberMatch[1]);
    if (product) return product;
  }
  
  // Try partial match
  const keys = Array.from(data.productMap.keys());
  for (const key of keys) {
    const value = data.productMap.get(key);
    if (value && (key.includes(description.toLowerCase()) || description.toLowerCase().includes(key))) {
      return value;
    }
  }
  
  return undefined;
}
