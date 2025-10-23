# Quick Test: Verify DynamoDB Data Push

## 30-Second Test

### Step 1: Start the App
```bash
cd /Users/isaachirsch/Desktop/GalantCo/SalesTracker
npm start
```
The app opens on `http://localhost:3000`

### Step 2: Open Browser Console
- Press `F12` to open Developer Tools
- Click on "Console" tab
- Keep this open while testing

### Step 3: Upload Test Data
1. Click on any distributor tab (e.g., "Alpine")
2. Click "Upload Report"
3. Select a CSV or XLSX file
4. Wait for processing to complete

### Step 4: Check Console Output
Look for these messages:
```
✅ DynamoDB Request: { operation: 'PutCommand', ... }
✅ Data successfully saved to DynamoDB
```

### Step 5: Verify in AWS Console
1. Go to AWS DynamoDB Console
2. Navigate to table: `SalesTracker-dbqznmct8mzz4`
3. Click "Explore table items"
4. Filter by `PK` = `SALES#ALPINE` (or appropriate distributor)
5. **You should see your records with all details**

---

## Expected Console Output

### Success Case
```
Dashboard received new data: {recordCount: 45, periods: Array(1), totalRevenue: 12345.67, ...}
Existing periods: []
New periods: Set(1) { '2025-10' }
Merged data: {recordCount: 45, periods: Array(1), totalRevenue: 12345.67}
About to call onDataParsed with 45 records
Sample records: (3) [{…}, {…}, {…}]
About to parse reports with periods: ['2025-10']
Parsing completed successfully
About to call onDataParsed with 45 records

DynamoDB Request: { 
  operation: 'PutCommand', 
  region: 'us-west-1', 
  tableName: 'SalesTracker-dbqznmct8mzz4' 
}

DynamoDB Response: {
  operation: 'PutCommand',
  success: true
}

Alpine data successfully saved to DynamoDB
```

### Error Case (What to Look For)
```
❌ DynamoDB Error: {
  operation: 'PutCommand',
  error: 'The user has not granted permission to access the specified resource',
  stack: '...'
}
```

---

## What Data Gets Saved

Each upload creates records with:
```json
{
  "distributor": "ALPINE",
  "period": "2025-10",
  "customerName": "Sample Customer",
  "productName": "Sample Product",
  "productCode": "12345",
  "cases": 100,
  "revenue": 1234.56,
  "invoiceKey": "ALPINE-2025-10-1729644000000-abc123def",
  "source": "Alpine Upload",
  "timestamp": "2025-10-23T15:30:45.123Z",
  "id": "ALPINE-2025-10-1729644000000-abc123def",
  "createdAt": "2025-10-23T15:30:45.123Z",
  "updatedAt": "2025-10-23T15:30:45.123Z"
}
```

---

## Troubleshooting

### "Failed to save data to DynamoDB"
**Problem**: Missing or incorrect AWS credentials

**Fix**:
1. Check `.env` file exists in project root
2. Verify it contains:
   ```
   REACT_APP_AWS_REGION=us-west-1
   REACT_APP_AWS_ACCESS_KEY_ID=AKIA...
   REACT_APP_AWS_SECRET_ACCESS_KEY=...
   REACT_APP_AWS_APP_ID=dbqznmct8mzz4
   ```
3. Restart app: `npm start`

### "No DynamoDB messages in console"
**Problem**: Hook not properly integrated

**Fix**:
1. Check that `src/Dashboard.tsx` has the import:
   ```typescript
   import { useDynamoDB } from './hooks/useDynamoDB';
   ```
2. Check that the hook is initialized in Dashboard component
3. Rebuild: `npm run build && npm start`

### "Table not found: SalesTracker-dbqznmct8mzz4"
**Problem**: DynamoDB table doesn't exist or wrong region

**Fix**:
1. Go to AWS DynamoDB Console
2. Check table exists in region `us-west-1`
3. If not, create it with:
   - Table name: `SalesTracker-dbqznmct8mzz4`
   - Primary key: `PK` (Partition Key), `SK` (Sort Key)
   - Billing: On-demand

### "Network tab shows 403 Forbidden"
**Problem**: IAM user doesn't have DynamoDB permissions

**Fix**:
1. Go to AWS IAM Console
2. Find your user
3. Attach policy: `AmazonDynamoDBFullAccess` (or appropriate permissions)

---

## Network Inspection

### Open DevTools Network Tab
1. Press `F12` → Network tab
2. Upload data
3. Filter by XHR/Fetch requests
4. Look for requests to AWS services
5. Click on request and check:
   - Status: Should be `200`
   - Response: Should contain data without errors

### Typical Request Headers
```
Host: dynamodb.us-west-1.amazonaws.com
Authorization: AWS4-HMAC-SHA256 ...
Content-Type: application/x-amz-json-1.0
X-Amz-Target: DynamoDB_20120810.PutItem
```

---

## Data Persistence Check

### Test 1: Clear localStorage and Reload
1. Upload test data (note the numbers)
2. Open DevTools → Application → localStorage
3. Look for `salesTracker_alpineData` and delete it
4. Refresh page (F5)
5. **Expected**: Data should still appear if DynamoDB integration is working

### Test 2: Check DynamoDB Directly
1. Upload data
2. Go to AWS DynamoDB Console
3. Table: `SalesTracker-dbqznmct8mzz4`
4. Click "Explore table items"
5. **Expected**: Records appear with `PK` starting with `SALES#`

---

## Success Checklist

- [ ] Console shows "Data successfully saved to DynamoDB"
- [ ] No errors in console for DynamoDB operations
- [ ] AWS DynamoDB table shows new records
- [ ] Records have all expected fields
- [ ] Different distributors have different PK values (SALES#ALPINE, SALES#PETES, etc.)
- [ ] Data appears in UI correctly
- [ ] Data persists after page refresh

---

## Files to Check if Stuck

1. **`.env` file** - AWS credentials
   - Location: `/Users/isaachirsch/Desktop/GalantCo/SalesTracker/.env`
   - Check: All `REACT_APP_AWS_*` variables are set

2. **`src/Dashboard.tsx`** - DynamoDB integration
   - Line 33: Should have `import { useDynamoDB }`
   - Line 623-629: Should have useDynamoDB hook initialization
   - Line 1013+: Handler functions should have DynamoDB save code

3. **`src/services/dynamodb.ts`** - DynamoDB service
   - Should be properly configured
   - No changes needed if basic test fails

4. **Build output** - Verify compilation
   - Run: `npm run build`
   - Should complete without errors
   - Check: `build/` folder exists
