/**
 * Analyze Master Pricing file structure to understand product mappings
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

function analyzeMasterPricing(filePath: string) {
  try {
    const wb = XLSX.readFile(filePath);
    console.log('Sheets in workbook:', wb.SheetNames);
    console.log('\n---\n');
    
    for (const sheetName of wb.SheetNames) {
      console.log(`\nAnalyzing sheet: ${sheetName}`);
      const ws = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
      
      console.log(`Total rows: ${rows.length}`);
      
      // Show first 10 rows
      console.log('\nFirst 10 rows:');
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        console.log(`Row ${i}:`, rows[i]);
      }
      
      // Try to detect header row
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i] || [];
        const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
        if (nonEmpty >= 3) {
          console.log(`\nPotential header at row ${i}:`, row);
          if (headerRowIdx === -1) headerRowIdx = i;
        }
      }
      
      if (headerRowIdx >= 0) {
        const headers = (rows[headerRowIdx] || []).map(c => String(c || '').trim());
        console.log(`\nDetected headers at row ${headerRowIdx}:`);
        headers.forEach((h, idx) => {
          if (h) console.log(`  Column ${String.fromCharCode(65 + idx)} (${idx}): ${h}`);
        });
        
        // Show a few sample data rows
        console.log('\nSample data rows:');
        for (let r = headerRowIdx + 1; r < Math.min(headerRowIdx + 6, rows.length); r++) {
          const row = rows[r] || [];
          console.log(`Row ${r}:`);
          headers.forEach((h, idx) => {
            if (h && row[idx]) {
              console.log(`  ${h}: ${row[idx]}`);
            }
          });
          console.log('');
        }
      }
      
      console.log('\n=== End of sheet analysis ===\n');
    }
  } catch (error) {
    console.error('Error analyzing Master Pricing file:', error);
  }
}

// Run analysis
if (require.main === module) {
  const masterPath = path.join(__dirname, '../../Master 2025 Pricing (1).xlsx');
  console.log('Analyzing:', masterPath);
  console.log('');
  analyzeMasterPricing(masterPath);
}

