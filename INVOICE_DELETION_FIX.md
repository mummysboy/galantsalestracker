# Invoice Deletion Fix - DynamoDB Integration

## Issue
When you delete an invoice/period, the data is removed from the local browser state but **NOT deleted from the DynamoDB database**. This causes the data to reappear when you refresh the page or on other sessions.

## Root Cause
The `handleDeletePeriod` function in `src/Dashboard.tsx` (line 1545) only deletes from local React state, but never calls the DynamoDB service to actually delete the records from the database.

## Solution
Modify the `handleDeletePeriod` function to call `dynamoDBService.deleteRecordsByPeriodAndDistributor()` before deleting from local state.

## Implementation

### Location
File: `src/Dashboard.tsx`
Function: `handleDeletePeriod` (line 1545)

### Current Code (BUGGY)
```typescript
const handleDeletePeriod = (periodToDelete: string) => {
  // Guard: do not allow deletes in ALL view
  if (selectedDistributor === 'ALL') return;
  if (selectedDistributor === 'ALPINE') {
    const updatedData = currentAlpineData.filter(record => record.period !== periodToDelete);
    setCurrentAlpineData(updatedData);
    // ... more local state deletion ...
  }
  // ... 
};
```

### Fixed Code
Add DynamoDB deletion right after the guard clause:

```typescript
const handleDeletePeriod = (periodToDelete: string) => {
  // Guard: do not allow deletes in ALL view
  if (selectedDistributor === 'ALL') return;
  
  // Delete from DynamoDB first
  const deleteDatabaseRecords = async () => {
    try {
      const distributorMap: Record<string, string> = {
        'ALPINE': 'Alpine',
        'PETES': "Pete's Coffee",
        'KEHE': 'KeHe',
        'VISTAR': 'Vistar',
        'TONYS': "Tony's",
        'TROIA': 'Troia Foods',
        'MHD': 'Mike Hudson'
      };
      
      const distributorName = distributorMap[selectedDistributor];
      if (distributorName) {
        console.log(`[Dashboard] Deleting records from DynamoDB for ${distributorName} / ${periodToDelete}`);
        await dynamoDBService.deleteRecordsByPeriodAndDistributor(distributorName, periodToDelete);
        console.log(`[Dashboard] Successfully deleted records from DynamoDB`);
      }
    } catch (error) {
      console.error('[Dashboard] Error deleting records from DynamoDB:', error);
    }
  };
  
  // Fire the async deletion (don't wait, let it complete in background)
  deleteDatabaseRecords();
  
  // Delete from local state immediately for UI responsiveness
  if (selectedDistributor === 'ALPINE') {
    const updatedData = currentAlpineData.filter(record => record.period !== periodToDelete);
    setCurrentAlpineData(updatedData);
    // ... rest of the local state deletion ...
  }
  // ...
};
```

## Key Points

1. **The distributorMap mapping**: Converts the internal names (ALPINE, PETES, etc.) to the display names used in DynamoDB (Alpine, Pete's Coffee, etc.)

2. **Async operation**: The DynamoDB deletion is async, so we don't wait for it to complete before updating local state. This keeps the UI responsive.

3. **Background deletion**: The database deletion happens in the background while the UI updates immediately from local state.

4. **Error handling**: If the database deletion fails, it logs the error but doesn't break the UI update.

## Service Method Reference

The `dynamoDBService.deleteRecordsByPeriodAndDistributor()` method is defined in `src/services/dynamodb.ts` (line 439):

```typescript
async deleteRecordsByPeriodAndDistributor(distributor: string, period: string): Promise<void> {
  try {
    // Get all sales records for this distributor and period
    const allRecords = await this.getSalesRecordsByDistributor(distributor);
    const recordsToDelete = allRecords.filter(r => r.period === period);

    console.log(`[DynamoDB] Deleting ${recordsToDelete.length} records for ${distributor} / ${period}`);

    // Delete sales records
    const deletePromises = recordsToDelete.map(record =>
      docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `SALES#${distributor}`,
          SK: `${record.period}#${record.id}`,
        },
      }))
    );

    await Promise.all(deletePromises);
    console.log(`[DynamoDB] Successfully deleted ${recordsToDelete.length} records for ${distributor} / ${period}`);
  } catch (error) {
    console.error(`[DynamoDB] Error deleting records for ${distributor} / ${period}:`, error);
    throw error;
  }
}
```

## Testing

After applying the fix:

1. Upload sales data for a period
2. Delete the period using the trash icon in the month dropdown
3. Check the DynamoDB console - records should be deleted
4. Refresh the page - data should NOT reappear
5. Check browser console for logs:
   - `[Dashboard] Deleting records from DynamoDB for [Distributor] / [Period]`
   - `[DynamoDB] Deleting X records for [Distributor] / [Period]`
   - `[Dashboard] Successfully deleted records from DynamoDB`

## Verification Checklist

- [ ] Deletions remove records from DynamoDB database
- [ ] UI updates immediately (before database deletion completes)
- [ ] Page refresh doesn't restore deleted data
- [ ] Console logs show successful DynamoDB deletion
- [ ] Works for all distributors (Alpine, Pete's, KeHe, Vistar, Tony's, Troia, MHD)
- [ ] Multiple sessions see the same deleted state
- [ ] All other delete operations still work correctly

## Related Files

- `src/services/dynamodb.ts` - DynamoDB service with delete methods
- `src/Dashboard.tsx` - Dashboard component with handleDeletePeriod function
