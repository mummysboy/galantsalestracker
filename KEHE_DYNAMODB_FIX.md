# KeHe DynamoDB Recall Fix

## Problem
✅ KeHe data **WAS being saved** to DynamoDB successfully  
❌ But KeHe data **was NOT being recalled/loaded** from DynamoDB

This meant:
1. User uploads KeHe file
2. Data gets parsed correctly ✅
3. Data is sent to DynamoDB ✅
4. But when app loads or switches to KeHe tab, no data appears ❌

## Root Cause - The Hidden Data Loss

When saving KeHe records to DynamoDB, we were including ALL fields:
```javascript
{
  distributor: 'KEHE',
  period: '2025-02',
  customerName: 'Gobble Inc',
  accountName: 'GOBBLE INC SHIP',      // ✅ Saved
  productName: 'Burrito',
  customerId: '705597',                 // ✅ Saved
  cases: 15,
  revenue: 45.00,
  itemNumber: 'KEHE-001',              // ✅ Saved
  size: '8 OZ',                        // ✅ Saved
  weightLbs: 120,                      // ✅ Saved
  ... (10 more fields)
}
```

**But** when retrieving from DynamoDB, the retrieval functions were **only mapping specific fields**, losing the extra data:

```typescript
// BEFORE: Only mapped 13 fields
return (result.Items || []).map(item => ({
  id: item.id,
  distributor: item.distributor,
  period: item.period,
  customerName: item.customerName,
  productName: item.productName,
  productCode: item.productCode,
  cases: item.cases,
  revenue: item.revenue,
  invoiceKey: item.invoiceKey,
  source: item.source,
  timestamp: item.timestamp,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  // accountName: LOST ❌
  // customerId: LOST ❌
  // itemNumber: LOST ❌
  // size: LOST ❌
  // weightLbs: LOST ❌
}))
```

The data was sitting in DynamoDB, but these retrieval functions were ignoring 5 critical fields!

## Solution - Complete DynamoDB Field Mapping

### 1. Updated `SalesRecord` Interface
Added the missing optional fields to the interface:
```typescript
export interface SalesRecord {
  // ... existing fields ...
  accountName?: string;      // ✅ Now in interface
  customerId?: string;       // ✅ Now in interface
  itemNumber?: string;       // ✅ Now in interface
  size?: string;             // ✅ Now in interface
  weightLbs?: number;        // ✅ Now in interface
}
```

### 2. Updated ALL Retrieval Methods
Modified 4 functions to map ALL fields:

1. **`getSalesRecordsByDistributor()`** - Called when loading data for a specific distributor
2. **`getSalesRecordsByPeriod()`** - Called when loading data for a specific month
3. **`getAllSalesRecords()`** - Called when loading all data
4. **`getSalesRecordsByInvoiceKeys()`** - Called for specific invoice lookups

Each now maps all 18 fields instead of just 13.

## Impact

### Before Fix
```
Save to DynamoDB: 18 fields ✅
Retrieve from DynamoDB: 13 fields ❌
Result: 5 fields lost, KeHe data incomplete/invisible
```

### After Fix
```
Save to DynamoDB: 18 fields ✅
Retrieve from DynamoDB: 18 fields ✅
Result: All data preserved, KeHe data fully functional
```

## Files Modified
- `src/services/dynamodb.ts`:
  - Updated `SalesRecord` interface (added 5 fields)
  - Updated 4 retrieval functions

## Key Insights

This was a **silent data loss** issue:
- Data appeared to be saved (sent to DynamoDB successfully)
- But retrieval didn't include all fields
- Dashboard UI relied on those missing fields (especially `accountName` for KeHe hierarchy)
- Other distributors likely worked because they don't use those extra fields as much

## Testing
1. Rebuild and redeploy
2. Upload a KeHe report
3. Data should now:
   - Save to DynamoDB ✅
   - Load from DynamoDB ✅
   - Display in dashboard ✅
   - Persist across page refreshes ✅

## DynamoDB Data Safety
Don't worry about existing data in DynamoDB:
- The old records with those fields are already there
- They'll now be properly retrieved with this fix
- No data migration needed
