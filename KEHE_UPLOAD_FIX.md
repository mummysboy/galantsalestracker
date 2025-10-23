# KeHe Report Upload Display Fix

## Problem
When uploading a KeHe report, the data was not appearing in the dashboard. The data was being saved to localStorage and DynamoDB correctly, but the user had to manually switch to the KeHe distributor to see the uploaded data.

## Root Cause
After uploading data for a specific distributor (e.g., KeHe, Alpine, Pete's, etc.), the Dashboard component was only:
1. ✅ Saving the data to the state (currentKeHeData, currentAlpineData, etc.)
2. ✅ Setting the selected month to the newest uploaded period
3. ❌ **NOT** switching the `selectedDistributor` to match the uploaded data

This meant the dashboard remained on whatever distributor was previously selected (usually "All Businesses" or "Alpine"), and the user's newly uploaded data wasn't visible.

## Solution
Modified all six data upload handler functions in `src/Dashboard.tsx` to automatically switch the `selectedDistributor` after a successful upload:

### Updated Functions:
1. **handleAlpineDataParsed** - Now sets `selectedDistributor` to 'ALPINE'
2. **handlePetesDataParsed** - Now sets `selectedDistributor` to 'PETES'
3. **handleKeHeDataParsed** - Now sets `selectedDistributor` to 'KEHE'
4. **handleVistarDataParsed** - Now sets `selectedDistributor` to 'VISTAR'
5. **handleTonysDataParsed** - Now sets `selectedDistributor` to 'TONYS'
6. **handleTroiaDataParsed** - Now sets `selectedDistributor` to 'TROIA'
7. **handleMhdDataParsed** - Now sets `selectedDistributor` to 'MHD'

### Example of Change:
```typescript
// Before
const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
if (newestUploadedPeriod) {
  setSelectedMonth(newestUploadedPeriod);
}

// After
const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
if (newestUploadedPeriod) {
  setSelectedMonth(newestUploadedPeriod);
  setSelectedDistributor('KEHE');  // or 'ALPINE', 'PETES', etc.
}
```

## User Experience Improvement
Now when you upload a KeHe (or any other distributor's) report:
1. The file is processed ✅
2. Data is saved to localStorage and DynamoDB ✅
3. **Dashboard automatically switches to show that distributor's data** ✅
4. The newest uploaded period is automatically selected ✅
5. You immediately see your uploaded data without manual steps ✅

## Files Modified
- `src/Dashboard.tsx` - Updated all 7 data handler functions

## Testing
Build confirmed successful with no errors or warnings.

To test:
1. Click "Upload Data"
2. Select a KeHe (or other) CSV file
3. Click "Process Files"
4. The dashboard should automatically switch to showing KeHe data for the uploaded period
