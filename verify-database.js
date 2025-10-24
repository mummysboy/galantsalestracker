#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
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

async function verifyDatabase() {
  try {
    console.log(`\n🔍 Verifying database: ${TABLE_NAME}\n`);
    
    // Scan with pagination to get ALL items
    let totalItems = 0;
    let lastEvaluatedKey = undefined;
    const itemsByType = {};

    do {
      const scanResult = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: lastEvaluatedKey,
      }));

      const items = scanResult.Items || [];
      totalItems += items.length;

      // Categorize items by PK prefix
      items.forEach(item => {
        const pkType = item.PK?.split('#')[0] || 'UNKNOWN';
        itemsByType[pkType] = (itemsByType[pkType] || 0) + 1;
      });

      lastEvaluatedKey = scanResult.LastEvaluatedKey;
      console.log(`  Found ${items.length} items (total so far: ${totalItems})...`);

    } while (lastEvaluatedKey);

    console.log(`\n📊 Total Items in Database: ${totalItems}`);
    console.log('\n📋 Items by Type:');
    Object.entries(itemsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} items`);
    });

    if (totalItems === 0) {
      console.log('\n✨ Database is EMPTY!\n');
    } else {
      console.log(`\n⚠️  Database still contains ${totalItems} items!\n`);
    }

  } catch (error) {
    console.error('\n❌ Error verifying database:', error.message);
    console.error('\nEnvironment:');
    console.error(`  Table: ${TABLE_NAME}`);
    console.error(`  Region: ${process.env.REACT_APP_AWS_REGION || process.env.AWS_REGION || 'us-west-1'}`);
    process.exit(1);
  }
}

// Run the verification
verifyDatabase();
