# DynamoDB Migration Guide

## Overview
This guide will help you migrate your Sales Tracker application from Google Sheets to AWS DynamoDB for better performance, scalability, and data persistence.

## Prerequisites
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js and npm installed

## Step 1: Set Up AWS Credentials

1. **Create an IAM User** (if you don't have one):
   - Go to AWS IAM Console
   - Create a new user with programmatic access
   - Attach the following policies:
     - `AmazonDynamoDBFullAccess`
     - `CloudFormationFullAccess` (for table creation)

2. **Configure AWS CLI**:
   ```bash
   aws configure
   ```
   Enter your Access Key ID, Secret Access Key, region (e.g., `us-east-1`), and output format (`json`).

## Step 2: Create DynamoDB Table

Run the setup script:
```bash
./setup-dynamodb.sh
```

This will:
- Create a DynamoDB table named `SalesTracker-dbqznmct8mzz4`
- Set up proper indexes for efficient querying
- Enable point-in-time recovery

## Step 3: Configure Environment Variables

Create a `.env` file in your project root:
```bash
# AWS Configuration
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AWS_ACCESS_KEY_ID=your_access_key_here
REACT_APP_AWS_SECRET_ACCESS_KEY=your_secret_key_here
REACT_APP_AWS_APP_ID=dbqznmct8mzz4

# Google Apps Script (keep for backward compatibility)
REACT_APP_GS_WEBAPP_URL=your_google_apps_script_url_here
REACT_APP_GS_TOKEN=your_google_apps_script_token_here
```

## Step 4: Update Your Application

### Option A: Replace Dashboard Component (Recommended)

Update `src/App.tsx`:
```tsx
import DashboardDynamoDB from './DashboardDynamoDB';

function App() {
  return (
    <div className="App">
      <DashboardDynamoDB />
    </div>
  );
}
```

### Option B: Gradual Migration

Keep both components and add a toggle:
```tsx
import Dashboard from './Dashboard';
import DashboardDynamoDB from './DashboardDynamoDB';

function App() {
  const [useDynamoDB, setUseDynamoDB] = useState(false);
  
  return (
    <div className="App">
      <div className="mb-4">
        <label>
          <input 
            type="checkbox" 
            checked={useDynamoDB}
            onChange={(e) => setUseDynamoDB(e.target.checked)}
          />
          Use DynamoDB (Beta)
        </label>
      </div>
      {useDynamoDB ? <DashboardDynamoDB /> : <Dashboard />}
    </div>
  );
}
```

## Step 5: Test the Migration

1. **Start your application**:
   ```bash
   npm start
   ```

2. **Test data upload**:
   - Upload a small test file
   - Verify data appears in the dashboard
   - Check that data persists after page refresh

3. **Verify DynamoDB data**:
   ```bash
   aws dynamodb scan --table-name SalesTracker-dbqznmct8mzz4 --limit 5
   ```

## Data Structure

The DynamoDB table uses the following structure:

### Primary Key Structure
- **PK (Partition Key)**: `SALES#{distributor}`, `PROGRESSION#{distributor}`, or `APP_STATE`
- **SK (Sort Key)**: `{period}#{id}`, `{customerName}#{id}`, or `{stateKey}`

### Global Secondary Indexes
- **GSI1**: Query by period (`PERIOD#{period}`)
- **GSI2**: Query by customer (`CUSTOMER#{customerName}`)

### Sample Records

**Sales Record**:
```json
{
  "PK": "SALES#ALPINE",
  "SK": "2025-10#alpine-2025-10-1234567890-abc123",
  "GSI1PK": "PERIOD#2025-10",
  "GSI1SK": "ALPINE#alpine-2025-10-1234567890-abc123",
  "GSI2PK": "CUSTOMER#Customer Name",
  "GSI2SK": "ALPINE#2025-10#alpine-2025-10-1234567890-abc123",
  "id": "alpine-2025-10-1234567890-abc123",
  "distributor": "ALPINE",
  "period": "2025-10",
  "customerName": "Customer Name",
  "productName": "Product Name",
  "productCode": "PROD123",
  "cases": 10,
  "revenue": 150.00,
  "invoiceKey": "INV-123",
  "source": "Alpine Upload",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

## Benefits of DynamoDB Migration

1. **Performance**: Faster data access and queries
2. **Scalability**: Handles large datasets efficiently
3. **Reliability**: Built-in backup and recovery
4. **Cost**: Pay-per-use pricing model
5. **Integration**: Easy integration with other AWS services

## Troubleshooting

### Common Issues

1. **"Access Denied" Error**:
   - Check AWS credentials
   - Verify IAM permissions
   - Ensure region is correct

2. **"Table Not Found" Error**:
   - Run the setup script again
   - Check table name in environment variables

3. **Data Not Persisting**:
   - Check browser console for errors
   - Verify DynamoDB service is working
   - Check network connectivity

### Debug Commands

```bash
# Check table status
aws dynamodb describe-table --table-name SalesTracker-dbqznmct8mzz4

# List all items
aws dynamodb scan --table-name SalesTracker-dbqznmct8mzz4 --limit 10

# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name SalesTracker-dbqznmct8mzz4-Stack
```

## Rollback Plan

If you need to rollback to Google Sheets:

1. Update `src/App.tsx` to use the original `Dashboard` component
2. Remove DynamoDB environment variables
3. Your Google Sheets integration will continue to work

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify AWS credentials and permissions
3. Test with a small dataset first
4. Review the DynamoDB service logs in AWS CloudWatch

## Next Steps

After successful migration:
1. Monitor DynamoDB costs in AWS Console
2. Set up CloudWatch alarms for monitoring
3. Consider implementing data archiving for old records
4. Explore additional AWS services for enhanced functionality
