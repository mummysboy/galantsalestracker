# Supabase Migration Guide

This guide will help you migrate your Sales Tracker application from AWS DynamoDB/Cognito to Supabase.

## Overview

The migration involves:
1. **Database**: DynamoDB → Supabase PostgreSQL
2. **Authentication**: AWS Cognito → Supabase Auth
3. **Dependencies**: AWS SDK → Supabase Client

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project
3. Access to your existing AWS credentials (for data migration)

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: Sales Tracker (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
4. Wait for project creation (2-3 minutes)

## Step 2: Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste into the SQL Editor
4. Click **Run** to execute the migration
5. Verify tables were created:
   - `sales_records`
   - `customer_progressions`
   - `app_state`

## Step 3: Create User Profiles Table (Optional but Recommended)

For better user management, create a user profiles table:

```sql
-- Create user_profiles table for storing user metadata
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255),
  groups TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Service role can manage all profiles (for admin operations)
CREATE POLICY "Service role can manage profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');
```

## Step 4: Configure Environment Variables

Update your `.env` file (or create one from `env.example`):

```env
# Supabase Configuration (REQUIRED)
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here

# Google Apps Script (Optional - keep if using)
REACT_APP_GS_WEBAPP_URL=your_google_apps_script_url_here
REACT_APP_GS_TOKEN=your_google_apps_script_token_here
```

**Where to find these values:**
1. In Supabase Dashboard → **Settings** → **API**
2. **Project URL** = `REACT_APP_SUPABASE_URL`
3. **anon/public key** = `REACT_APP_SUPABASE_ANON_KEY`

## Step 5: Migrate Users from Cognito to Supabase

### Option A: Manual Migration (Small number of users)

1. In Supabase Dashboard → **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter email and password for each user
4. For admin users, update their profile:
   ```sql
   INSERT INTO user_profiles (id, username, groups)
   VALUES ('user-uuid-here', 'username', ARRAY['admin'])
   ON CONFLICT (id) DO UPDATE SET groups = ARRAY['admin'];
   ```

### Option B: Bulk Migration Script (Many users)

Create a script to export from Cognito and import to Supabase:

```javascript
// migrate-users.js
// Run this with Node.js after installing @supabase/supabase-js
const { createClient } = require('@supabase/supabase-js');
const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Configure clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const cognito = new CognitoIdentityProviderClient({ region: 'us-west-1' });

async function migrateUsers() {
  // List Cognito users
  const cognitoUsers = await cognito.send(new ListUsersCommand({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
  }));

  for (const user of cognitoUsers.Users || []) {
    const email = user.Attributes?.find(a => a.Name === 'email')?.Value;
    if (!email) continue;

    // Create user in Supabase
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      // Note: You'll need to set passwords manually or use a temporary password
    });

    if (error) {
      console.error(`Failed to create user ${email}:`, error);
      continue;
    }

    console.log(`Created user: ${email}`);
  }
}

migrateUsers();
```

## Step 6: Migrate Data from DynamoDB to Supabase

### Option A: Use the Application (Recommended)

1. Start your application with Supabase configured
2. Upload your sales data files again
3. The app will save to Supabase automatically

### Option B: Direct Database Migration

If you have a lot of data, you can write a migration script:

```javascript
// migrate-data.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { createClient } = require('@supabase/supabase-js');

const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-west-1' }));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrateSalesRecords() {
  // Scan DynamoDB
  const { Items } = await dynamoDB.send(new ScanCommand({
    TableName: 'SalesTracker-dbqznmct8mzz4',
    FilterExpression: 'begins_with(PK, :pk)',
    ExpressionAttributeValues: { ':pk': 'SALES#' },
  }));

  // Transform and insert into Supabase
  const records = Items.map(item => ({
    distributor: item.distributor,
    period: item.period,
    customer_name: item.customerName,
    product_name: item.productName,
    product_code: item.productCode,
    cases: item.cases,
    revenue: item.revenue,
    invoice_key: item.invoiceKey,
    source: item.source,
    timestamp: item.timestamp,
    account_name: item.accountName,
    customer_id: item.customerId,
    item_number: item.itemNumber,
    size: item.size,
    weight_lbs: item.weightLbs,
  }));

  // Insert in batches
  for (let i = 0; i < records.length; i += 1000) {
    const batch = records.slice(i, i + 1000);
    const { error } = await supabase.from('sales_records').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i}:`, error);
    } else {
      console.log(`Inserted batch ${i} - ${i + batch.length}`);
    }
  }
}

migrateSalesRecords();
```

## Step 7: Update Dependencies

The migration has already updated your code. Verify dependencies:

```bash
npm install
```

## Step 8: Test the Application

1. Start the development server:
   ```bash
   npm start
   ```

2. Test login with a Supabase user
3. Test uploading a sales report
4. Verify data appears in Supabase Dashboard → **Table Editor** → `sales_records`

## Step 9: Deploy

Update your deployment platform (Netlify, Vercel, etc.) environment variables:

1. Add `REACT_APP_SUPABASE_URL`
2. Add `REACT_APP_SUPABASE_ANON_KEY`
3. Remove AWS-related environment variables (optional, keep for reference)

## Admin Features Note

Some admin features (user creation, password reset) require Supabase Admin API access, which should be done through a backend service or Supabase Edge Functions for security. The current implementation includes basic admin functionality, but for production, consider:

1. **Supabase Edge Functions**: Create functions for admin operations
2. **Backend API**: Create a Node.js/Express API with service role key
3. **Supabase Dashboard**: Use Supabase Dashboard for user management

## Troubleshooting

### "Supabase client is not initialized"
- Check that `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are set
- Restart your development server after adding environment variables

### "Row Level Security policy violation"
- Check that users are authenticated
- Verify RLS policies in Supabase Dashboard → **Authentication** → **Policies**

### "User not found" during login
- Ensure users are created in Supabase
- Check email format matches exactly

### Data not appearing after upload
- Check browser console for errors
- Verify Supabase connection in Dashboard → **Settings** → **API**
- Check RLS policies allow inserts

## Rollback Plan

If you need to rollback:

1. Keep AWS credentials in environment variables
2. The old DynamoDB service code is still in `src/services/dynamodb.ts`
3. Revert imports in `Dashboard.tsx` and `App.tsx` to use DynamoDB/Cognito
4. Restart the application

## Support

For issues:
1. Check Supabase logs: Dashboard → **Logs**
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Ensure database migrations ran successfully

## Next Steps

After migration:
1. Monitor Supabase usage in Dashboard
2. Set up database backups (Supabase handles this automatically)
3. Consider enabling additional Supabase features:
   - Real-time subscriptions
   - Storage for file uploads
   - Edge Functions for serverless operations
