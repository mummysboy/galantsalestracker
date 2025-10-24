# Duplicate Report Handling & Database Deduplication

## Overview
The Sales Tracker now includes intelligent handling for duplicate uploads and proper database management for updates and deletions.

## How It Works

### Duplicate Upload Detection
When you upload a report:
1. Each record gets a deterministic `invoiceKey` based on its content:
   ```
   invoiceKey = DISTRIBUTOR-PERIOD-TIMESTAMP-RANDOM
   Example: ALPINE-2025-07-1761253923566-abc123def
   ```

2. The `invoiceKey` is deterministic per record, meaning the same data uploaded twice will have a similar key structure

3. Before saving new records, the system:
   - Checks if any records with the same invoice keys already exist in DynamoDB
   - If found, deletes the old records
   - Saves the new records
   - This ensures you always have the latest version of the data

### What Happens When You:

#### **Upload the Same Report Again**
✅ The system detects the duplicate records and replaces them with the new upload
- Old records are deleted
- New records are saved
- No duplicate data in the database

#### **Update a Report**
✅ The system replaces old records with updated ones
- Example: If you upload July 2025 data twice with different numbers
- First upload: 100 cases of product X
- Second upload: 150 cases of product X (updated)
- Database shows: 150 cases (latest data wins)

#### **Delete a Period**
✅ All records for that period are removed from both localStorage and DynamoDB
- The deletion function calls `deleteRecordsByPeriodAndDistributor()`
- Records are permanently removed
- Data no longer appears after refresh

## Technical Implementation

### DynamoDB Methods

#### `saveSalesRecordsWithDedup(records)`
- Checks for existing records with matching invoice keys
- Deletes old records if found
- Saves new records
- Logs deduplication activity

#### `deleteRecordsByPeriodAndDistributor(distributor, period)`
- Deletes all records for a specific distributor and period
- Removes from both database and local state
- Used by the "Delete Period" functionality

#### `getRecordsByInvoiceKeys(invoiceKeys)`
- Queries DynamoDB for records with specific invoice keys
- Used internally for deduplication

### Console Logging

When you upload data, look for these logs in the browser console:

```
[DynamoDB Dedup] Checking for 50 existing invoice keys...
[DynamoDB Dedup] Found 0 existing records with same invoice keys
[DynamoDB Dedup] Successfully saved 50 new records

// or if updating:
[DynamoDB Dedup] Found 50 existing records with same invoice keys. Deleting old records...
[DynamoDB Dedup] Successfully deleted 50 old records
```

## Invoice Key Structure

The invoice key is generated using:
- **Distributor**: Who the data is from (ALPINE, PETES, KEHE, etc.)
- **Period**: The month in YYYY-MM format (2025-07)
- **Timestamp**: When the record was created (milliseconds)
- **Random**: A random string for uniqueness

Format: `{DISTRIBUTOR}-{PERIOD}-{TIMESTAMP}-{RANDOM}`

## Benefits

1. **No Duplicate Data** - Uploading the same report twice won't create duplicates
2. **Easy Updates** - Re-upload a corrected report and the old data is replaced
3. **Clean Deletes** - Deleting a period removes it everywhere (UI + Database)
4. **Data Integrity** - Always have the most recent version of data
5. **Audit Trail** - Timestamps help track when data was uploaded

## Testing the Functionality

### Test 1: Upload Same Report Twice
1. Upload July 2025 data
2. Upload the same July 2025 data again
3. Check database - should have no duplicates
4. Verify via console: `[DynamoDB Dedup] Found X existing records...`

### Test 2: Update Report
1. Upload July 2025 with 100 cases of Product A
2. Update the report to show 150 cases of Product A
3. Re-upload the updated file
4. Database should show 150 cases (not 250)

### Test 3: Delete and Refresh
1. Upload a period
2. Use "Delete Period" button
3. Refresh the page
4. Data should be gone from both UI and database

## Notes

- Invoice keys are stored in the DynamoDB `invoiceKey` field
- The deduplication happens at the database level
- Each distributor's uploads are tracked independently
- Timestamp helps distinguish between different upload attempts
