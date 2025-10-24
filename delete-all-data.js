#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const APP_ID = process.env.REACT_APP_AWS_APP_ID || 'dbqznmct8mzz4';
const TABLE_NAME = `SalesTracker-${APP_ID}`;

const client = new DynamoDBClient({
  region: process.env.REACT_APP_AWS_REGION || process.env.AWS_REGION || 'us-west-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

async function deleteAllData() {
  try {
    console.log(`\n🗑️  Starting complete deletion from table: ${TABLE_NAME}\n`);
    
    // Collect ALL items with proper pagination
    console.log('📊 Scanning table for ALL items (with pagination)...');
    const allItems = [];
    let lastEvaluatedKey = undefined;
    let scanPass = 1;

    do {
      const scanResult = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: 'PK, SK',
        ExclusiveStartKey: lastEvaluatedKey,
      }));

      const items = scanResult.Items || [];
      allItems.push(...items);
      console.log(`  Pass ${scanPass}: Found ${items.length} items (total: ${allItems.length})`);
      
      lastEvaluatedKey = scanResult.LastEvaluatedKey;
      scanPass++;
    } while (lastEvaluatedKey);

    console.log(`✅ Scanning complete. Total items to delete: ${allItems.length}\n`);

    if (allItems.length === 0) {
      console.log('✨ Table is already empty!\n');
      process.exit(0);
    }

    // Delete items in batches of 25 (DynamoDB limit)
    const batchSize = 25;
    let deletedCount = 0;

    for (let i = 0; i < allItems.length; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize);
      const deleteRequests = batch.map(item => ({
        DeleteRequest: {
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        },
      }));

      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allItems.length / batchSize);
      console.log(`🗑️  Batch ${batchNum}/${totalBatches} (${batch.length} items)...`);
      
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: deleteRequests,
        },
      }));

      deletedCount += batch.length;
      console.log(`   ✅ Deleted ${deletedCount}/${allItems.length} items`);
    }

    console.log(`\n✨ Successfully deleted all ${deletedCount} items from ${TABLE_NAME}\n`);
    console.log('✓ Database is now empty!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error deleting data:', error.message);
    console.error('\nMake sure:');
    console.error('  1. AWS credentials are configured in .env or environment variables');
    console.error('  2. The table name is correct: ' + TABLE_NAME);
    console.error('  3. You have permissions to delete from this table\n');
    process.exit(1);
  }
}

// Run the deletion
deleteAllData();
