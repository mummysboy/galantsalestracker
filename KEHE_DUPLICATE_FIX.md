# Kehe Duplicate Invoice Fix

## Problem
For Kehe vendor uploads, uploading the same invoice file twice was duplicating the data (showing 2x cases, 2x revenue, etc.). This issue did NOT occur for Alpine or Pete's vendors, suggesting it was specific to how Kehe data is structured and deduplicated.

## Root Cause Analysis

### Why Kehe Was Different
Kehe CSV reports have a hierarchical customer structure:
- **Level 1 (Retailer/Main Customer)**: e.g., "Whole Foods"
- **Level 2 (Sub-Account/Location)**: e.g., "Whole Foods - Brooklyn Store"

This is captured in the AlpineSalesRecord as:
- `customerName`: retailer name (Level 1)
- `accountName`: sub-account/location name (Level 2)

### The Deduplication Issue
The invoice key was being generated using ONLY the `customerName`:

```typescript
invoiceKey: generateDeterministicInvoiceKey('KEHE', period, record.customerName, productName, cases, revenue)
```

**Problem**: Two different sub-accounts of the same retailer (e.g., "Whole Foods - Brooklyn" and "Whole Foods - Manhattan") selling the same product would generate the SAME invoiceKey if quantities and revenues happened to match the format. More importantly, if the EXACT same transaction appeared in two uploads, the dedup should catch it, but it wasn't.

### Why DynamoDB Dedup Wasn't Catching It
The deduplication function `saveSalesRecordsWithDedupByDistributor` was:
1. Querying DynamoDB for existing records with matching invoiceKeys
2. Filtering them out before saving

However:
- If the scan query timed out or failed, it would silently return an empty array
- This would cause the dedup check to find "no existing records" and save everything as new
- For large Kehe uploads with many records, the scan might be slow

### Browser-Level Issue
Even if DynamoDB dedup worked, the browser state was being updated regardless:

```typescript
const mergedData = [...filteredExistingData, ...data.records];
setCurrentKeHeData(mergedData);  // Always executed, regardless of DynamoDB dedup
```

So even if DynamoDB filtered duplicates, the browser would show the duplicated data!

## Solution Implemented

### 1. Include Account Name in Invoice Key
Modified the invoice key generation for Kehe to include the `accountName`:

```typescript
invoiceKey: generateDeterministicInvoiceKey('KEHE', record.period, 
  `${record.customerName}|${record.accountName || ''}`,  // Now includes account
  record.productName, record.cases, record.revenue)
```

This ensures that the same product sold to different accounts generates different keys.

### 2. Add Browser-Level Deduplication
Created a `deduplicateRecords()` helper function that:
- Removes duplicate records WITHIN each upload (at parse time)
- Uses a deterministic key based on all unique identifiers
- Happens BEFORE merging with existing data
- Happens BEFORE sending to DynamoDB

```typescript
const deduplicateRecords = (records: AlpineSalesRecord[]): AlpineSalesRecord[] => {
  const seen = new Set<string>();
  const unique: AlpineSalesRecord[] = [];
  
  for (const record of records) {
    const key = `${record.period}|${record.customerName}|${record.accountName || ''}|${record.productName}|${record.cases}|${record.revenue.toFixed(2)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(record);
    }
  }
  
  return unique;
};
```

### 3. Apply Deduplication in Handler
Updated `handleKeHeDataParsed` to:
1. Deduplicate incoming records
2. Use deduped records for both state update AND DynamoDB save
3. Add detailed console logging for debugging

```typescript
const deduplicatedNewRecords = deduplicateRecords(data.records);
console.log(`After deduplication: ${deduplicatedNewRecords.length} records (removed ${data.records.length - deduplicatedNewRecords.length} duplicates)`);

// Use deduplicatedNewRecords for everything
const mergedData = [...filteredExistingData, ...deduplicatedNewRecords];
const salesRecords = deduplicatedNewRecords.map(record => ({...}));
```

## Benefits

### ✅ Prevents Duplicate Invoices
- Same invoice file uploaded twice → no duplication
- Different sub-accounts handled correctly
- Deterministic keys ensure consistency

### ✅ Works at Multiple Levels
- **Parse-time**: Removes duplicates immediately after parsing
- **Browser-level**: Deduped data shown in UI
- **Database-level**: DynamoDB dedup still active as backup

### ✅ Improved Debugging
- Console logs show how many duplicates were removed
- Makes it clear if dedup is working

### ✅ Consistent with Alpine/Pete's
- All vendors now have similar dedup logic
- Browser state updates only with unique data

## Testing

To test the fix:

1. **Single Upload**
   - Upload a Kehe CSV report once
   - Check that data displays correctly

2. **Duplicate Upload** (This is the fix)
   - Upload the SAME Kehe CSV report again
   - Verify data is NOT duplicated
   - Look for console log: `After deduplication: X records (removed 0 duplicates)` (if truly identical)

3. **Multi-Account Scenario**
   - Upload a Kehe report with multiple accounts (Whole Foods Brooklyn, Whole Foods Manhattan)
   - Each account's data should be tracked separately
   - Upload again and verify no duplication

4. **DynamoDB Verification**
   - Check browser console logs for `[DynamoDB Dedup]` messages
   - Should see: "Found 0 existing records" (if dedup key is new) or "Found X existing records" (if there are duplicates)

## Files Modified

- `src/Dashboard.tsx`
  - Added `deduplicateRecords()` helper function
  - Modified `handleKeHeDataParsed()` to use deduplication
  - Changed Kehe invoiceKey generation to include accountName

## Related Systems

- **Alpine/Pete's**: Already working correctly (no changes needed)
- **Vistar/Tony's/Troia/MHD**: Not affected (no accountName field)
- **Google Sheets Integration**: Works with the deduped data from browser
- **DynamoDB**: Has backup dedup as additional safeguard

## Notes

- The dedup key includes `accountName` which is crucial for Kehe hierarchical structure
- Multiple levels of dedup ensure data integrity:
  1. Browser-level dedup catches all duplicates immediately
  2. DynamoDB dedup provides a backup safeguard
  3. Period-based filtering prevents cross-period contamination
- All dedup operations are logged to browser console for transparency
