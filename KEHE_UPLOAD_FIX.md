# KeHe Report Upload Display Fix

## Problem #1: Data Not Displaying After Upload
When uploading a KeHe report, the data was not appearing in the dashboard. The data was being saved to localStorage and DynamoDB correctly, but the user had to manually switch to the KeHe distributor to see the uploaded data.

### Root Cause
After uploading data for a specific distributor, the Dashboard component was only:
1. ✅ Saving the data to the state
2. ✅ Setting the selected month to the newest uploaded period
3. ❌ **NOT** switching the `selectedDistributor` to match the uploaded data

### Solution
Modified all seven data upload handler functions to automatically switch the `selectedDistributor` after a successful upload.

---

## Problem #2: Data Not Being Read After Being Pushed
Even after data was saved to DynamoDB, it wasn't being properly read back. This was because critical fields were being lost.

### Root Cause
The data flow was:
1. **Parse CSV** → Creates records with fields: customerName, productName, **accountName**, **customerId**, **itemNumber**, **size**, **weightLbs**, etc.
2. **Save to DynamoDB** → Only saved 8 core fields, **losing the rest**
3. **Load from DynamoDB** → Only loaded those 8 fields, **leaving important data empty**
4. **Display** → Couldn't display KeHe sub-customer hierarchy properly without accountName

Specifically:
- **accountName** (KeHe sub-customer) - LOST ❌
- **customerId** - LOST ❌
- **itemNumber** - LOST ❌
- **size** - LOST ❌
- **weightLbs** - LOST ❌

### Solution
Updated **all 7 distributors' data handlers** to:
1. **Save to DynamoDB**: Include all fields (accountName, customerId, itemNumber, size, weightLbs)
2. **Load from DynamoDB**: Restore all fields back to AlpineSalesRecord format

```typescript
// Before: Only saved core fields
const salesRecords = data.records.map(record => ({
  distributor: 'KEHE',
  period: record.period,
  customerName: record.customerName,
  productName: record.productName,
  productCode: record.productCode,
  cases: record.cases,
  revenue: record.revenue,
  // ... missing accountName, customerId, etc!
}));

// After: Saves all fields
const salesRecords = data.records.map(record => ({
  distributor: 'KEHE',
  period: record.period,
  customerName: record.customerName,
  productName: record.productName,
  productCode: record.productCode,
  cases: record.cases,
  revenue: record.revenue,
  accountName: record.accountName,      // ✅ Now saved
  customerId: record.customerId,        // ✅ Now saved
  itemNumber: record.itemNumber,        // ✅ Now saved
  size: record.size,                    // ✅ Now saved
  weightLbs: record.weightLbs,          // ✅ Now saved
}));
```

---

## Complete Fix Summary

### Updated Functions (7 total)
1. **handleAlpineDataParsed** - Auto-switches to ALPINE + saves all fields
2. **handlePetesDataParsed** - Auto-switches to PETES + saves all fields
3. **handleKeHeDataParsed** - Auto-switches to KEHE + saves all fields
4. **handleVistarDataParsed** - Auto-switches to VISTAR + saves all fields
5. **handleTonysDataParsed** - Auto-switches to TONYS + saves all fields
6. **handleTroiaDataParsed** - Auto-switches to TROIA + saves all fields
7. **handleMhdDataParsed** - Auto-switches to MHD + saves all fields

### User Experience Improvement
Now when you upload a KeHe (or any other distributor's) report:
1. ✅ The file is processed
2. ✅ **ALL data fields are saved to localStorage and DynamoDB**
3. ✅ Dashboard automatically switches to show that distributor's data
4. ✅ The newest uploaded period is automatically selected
5. ✅ **You immediately see your uploaded data with all details preserved**
6. ✅ **Data persists correctly across page refreshes**

### Files Modified
- `src/Dashboard.tsx` - Updated 7 data handler functions with auto-switching and complete field preservation

### Testing
Build confirmed successful with no errors or warnings.

To test:
1. Click "Upload Data"
2. Select a KeHe (or other) CSV file
3. Click "Process Files"
4. The dashboard should automatically switch to showing that distributor's data for the uploaded period
5. Refresh the page - data should still be there
