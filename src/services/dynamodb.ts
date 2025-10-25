import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.REACT_APP_AWS_REGION || process.env.AWS_REGION || 'us-west-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Add error handling and logging
client.middlewareStack.add(
  (next, context) => async (args) => {
    const input = args.input as any;
    console.log('DynamoDB Request:', {
      operation: context.operationName,
      region: client.config.region(),
      tableName: input?.TableName || 'N/A',
    });
    
    try {
      const result = await next(args);
      console.log('DynamoDB Response:', {
        operation: context.operationName,
        success: true,
      });
      return result;
    } catch (error) {
      console.error('DynamoDB Error:', {
        operation: context.operationName,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
  {
    step: 'initialize',
    name: 'loggingMiddleware',
  }
);

const docClient = DynamoDBDocumentClient.from(client);

// Table name - using your app ID
const TABLE_NAME = `SalesTracker-${process.env.REACT_APP_AWS_APP_ID || 'dbqznmct8mzz4'}`;

// Debug function to check environment variables
export const debugEnvironment = () => {
  console.log('Environment Variables Debug:', {
    region: process.env.REACT_APP_AWS_REGION,
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID ? '***' + process.env.REACT_APP_AWS_ACCESS_KEY_ID.slice(-4) : 'NOT_SET',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY ? '***' + process.env.REACT_APP_AWS_SECRET_ACCESS_KEY.slice(-4) : 'NOT_SET',
    appId: process.env.REACT_APP_AWS_APP_ID,
    tableName: TABLE_NAME,
  });
};

// Data types for our sales records
export interface SalesRecord {
  id: string; // Primary key
  distributor: string; // Sort key
  period: string;
  customerName: string;
  productName: string;
  productCode?: string;
  cases: number;
  revenue: number;
  invoiceKey: string;
  source: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  accountName?: string; // Sub-customer/account name (for KeHe)
  customerId?: string;
  itemNumber?: string;
  size?: string;
  weightLbs?: number;
}

export interface CustomerProgression {
  id: string;
  distributor: string;
  customerName: string;
  progression: any; // The actual progression data
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  id: string;
  key: string; // e.g., 'selectedMonth', 'selectedDistributor', etc.
  value: any;
  createdAt: string;
  updatedAt: string;
}

class DynamoDBService {
  // Sales Records Operations
  async saveSalesRecord(record: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalesRecord> {
    const id = `${record.distributor}-${record.period}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const salesRecord: SalesRecord = {
      ...record,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `SALES#${record.distributor}`,
        SK: `${record.period}#${id}`,
        GSI1PK: `PERIOD#${record.period}`,
        GSI1SK: `${record.distributor}#${id}`,
        GSI2PK: `CUSTOMER#${record.customerName}`,
        GSI2SK: `${record.distributor}#${record.period}#${id}`,
        ...salesRecord,
      },
    });

    await docClient.send(command);
    return salesRecord;
  }

  async saveSalesRecords(records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SalesRecord[]> {
    const savedRecords: SalesRecord[] = [];
    
    // Process in batches of 25 (DynamoDB batch limit)
    for (let i = 0; i < records.length; i += 25) {
      const batch = records.slice(i, i + 25);
      const promises = batch.map(record => this.saveSalesRecord(record));
      const batchResults = await Promise.all(promises);
      savedRecords.push(...batchResults);
    }
    
    return savedRecords;
  }

  // FAST batch write method - much faster for large uploads (5-10x speed improvement)
  async saveSalesRecordsFast(records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SalesRecord[]> {
    const now = new Date().toISOString();
    const savedRecords: SalesRecord[] = [];
    
    console.log(`[DynamoDB] Starting fast batch write for ${records.length} records`);
    const startTime = Date.now();
    
    // Process in batches of 25 (DynamoDB BatchWriteCommand limit)
    for (let i = 0; i < records.length; i += 25) {
      const batch = records.slice(i, i + 25);
      
      // Create batch write items
      const requestItems = batch.map(record => {
        const id = `${record.distributor}-${record.period}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const salesRecord: SalesRecord = {
          ...record,
          id,
          createdAt: now,
          updatedAt: now,
        };
        
        return {
          PutRequest: {
            Item: {
              PK: `SALES#${record.distributor}`,
              SK: `${record.period}#${id}`,
              GSI1PK: `PERIOD#${record.period}`,
              GSI1SK: `${record.distributor}#${id}`,
              GSI2PK: `CUSTOMER#${record.customerName}`,
              GSI2SK: `${record.distributor}#${record.period}#${id}`,
              ...salesRecord,
            }
          }
        };
      });
      
      // Send batch write command
      try {
        const command = new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: requestItems
          }
        });
        
        await docClient.send(command);
        
        // Add to results
        batch.forEach((record, idx) => {
          const id = `${record.distributor}-${record.period}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          savedRecords.push({
            ...record,
            id,
            createdAt: now,
            updatedAt: now,
          });
        });
        
        console.log(`[DynamoDB] Batch ${Math.floor(i / 25) + 1} written (${batch.length} items)`);
      } catch (error) {
        console.error(`[DynamoDB] Batch write failed:`, error);
        throw error;
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[DynamoDB] Fast batch write complete! ${records.length} records in ${duration}ms (${(duration / records.length).toFixed(1)}ms per record)`);
    
    return savedRecords;
  }

  async getSalesRecordsByDistributor(distributor: string): Promise<SalesRecord[]> {
    const allItems: SalesRecord[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `SALES#${distributor}`,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await docClient.send(command);
      const items = (result.Items || []).map(item => ({
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
        accountName: item.accountName,
        customerId: item.customerId,
        itemNumber: item.itemNumber,
        size: item.size,
        weightLbs: item.weightLbs,
      })) as SalesRecord[];

      allItems.push(...items);
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  }

  async getSalesRecordsByPeriod(period: string): Promise<SalesRecord[]> {
    const allItems: SalesRecord[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `PERIOD#${period}`,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await docClient.send(command);
      const items = (result.Items || []).map(item => ({
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
        accountName: item.accountName,
        customerId: item.customerId,
        itemNumber: item.itemNumber,
        size: item.size,
        weightLbs: item.weightLbs,
      })) as SalesRecord[];

      allItems.push(...items);
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  }

  async getAllSalesRecords(): Promise<SalesRecord[]> {
    const allItems: SalesRecord[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':pk': 'SALES#',
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await docClient.send(command);
      const items = (result.Items || []).map(item => ({
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
        accountName: item.accountName,
        customerId: item.customerId,
        itemNumber: item.itemNumber,
        size: item.size,
        weightLbs: item.weightLbs,
      })) as SalesRecord[];

      allItems.push(...items);
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  }

  // Customer Progression Operations
  async saveCustomerProgression(distributor: string, customerName: string, progression: any): Promise<CustomerProgression> {
    const id = `${distributor}-${customerName}-${Date.now()}`;
    const now = new Date().toISOString();
    
    const customerProgression: CustomerProgression = {
      id,
      distributor,
      customerName,
      progression,
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `PROGRESSION#${distributor}`,
        SK: `${customerName}#${id}`,
        ...customerProgression,
      },
    });

    await docClient.send(command);
    return customerProgression;
  }

  // Save customer progression with deduplication - replaces existing progression for same customer
  async saveCustomerProgressionWithDedup(distributor: string, customerName: string, progression: any): Promise<CustomerProgression> {
    try {
      console.log(`[DynamoDB Progression Dedup] ${distributor}/${customerName}: Checking for existing progression`);
      
      // Get existing progressions for this distributor
      const existingProgressions = await this.getCustomerProgressionsByDistributor(distributor);
      
      // Find if this customer already has a progression
      const existingProgression = existingProgressions.find(p => p.customerName === customerName);
      
      if (existingProgression) {
        console.log(`[DynamoDB Progression Dedup] ${distributor}/${customerName}: Found existing progression with ID ${existingProgression.id}. Updating instead of creating duplicate.`);
        
        // Delete the old progression record
        await docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `PROGRESSION#${distributor}`,
            SK: `${customerName}#${existingProgression.id}`,
          },
        }));
      } else {
        console.log(`[DynamoDB Progression Dedup] ${distributor}/${customerName}: No existing progression found. Creating new one.`);
      }
      
      // Save the new progression (this will replace the old one)
      return this.saveCustomerProgression(distributor, customerName, progression);
    } catch (error) {
      console.error(`[DynamoDB Progression Dedup] ${distributor}/${customerName}: Error during dedup check:`, error);
      console.error(`[DynamoDB Progression Dedup] ${distributor}/${customerName}: FALLING BACK to regular save!`);
      // Fallback: just save normally
      return this.saveCustomerProgression(distributor, customerName, progression);
    }
  }

  async getCustomerProgressionsByDistributor(distributor: string): Promise<CustomerProgression[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `PROGRESSION#${distributor}`,
      },
    });

    const result = await docClient.send(command);
    return (result.Items || []).map(item => ({
      id: item.id,
      distributor: item.distributor,
      customerName: item.customerName,
      progression: item.progression,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })) as CustomerProgression[];
  }

  // App State Operations
  async saveAppState(key: string, value: any): Promise<AppState> {
    const id = `state-${key}`;
    const now = new Date().toISOString();
    
    const appState: AppState = {
      id,
      key,
      value,
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: 'APP_STATE',
        SK: key,
        ...appState,
      },
    });

    await docClient.send(command);
    return appState;
  }

  async getAppState(key: string): Promise<AppState | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: 'APP_STATE',
        SK: key,
      },
    });

    const result = await docClient.send(command);
    if (!result.Item) return null;

    return {
      id: result.Item.id,
      key: result.Item.key,
      value: result.Item.value,
      createdAt: result.Item.createdAt,
      updatedAt: result.Item.updatedAt,
    } as AppState;
  }

  async getAllAppStates(): Promise<AppState[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'APP_STATE',
      },
    });

    const result = await docClient.send(command);
    return (result.Items || []).map(item => ({
      id: item.id,
      key: item.key,
      value: item.value,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })) as AppState[];
  }

  // Utility methods
  async clearDistributorData(distributor: string): Promise<void> {
    // Get all sales records for this distributor
    const salesRecords = await this.getSalesRecordsByDistributor(distributor);
    
    // Delete sales records
    const deletePromises = salesRecords.map(record => 
      docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `SALES#${distributor}`,
          SK: `${record.period}#${record.id}`,
        },
      }))
    );

    // Get and delete customer progressions
    const progressions = await this.getCustomerProgressionsByDistributor(distributor);
    const progressionDeletePromises = progressions.map(progression =>
      docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PROGRESSION#${distributor}`,
          SK: `${progression.customerName}#${progression.id}`,
        },
      }))
    );

    await Promise.all([...deletePromises, ...progressionDeletePromises]);
  }

  async clearAllData(): Promise<void> {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: 'PK, SK',
    });

    const result = await docClient.send(command);
    const deletePromises = (result.Items || []).map(item =>
      docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
      }))
    );

    await Promise.all(deletePromises);
  }

  // Delete records by period and distributor
  async deleteRecordsByPeriodAndDistributor(distributor: string, period: string): Promise<void> {
    try {
      console.log(`[DynamoDB] Starting deletion for ${distributor} / ${period}`);
      
      // Get all sales records for this distributor and period
      const allRecords = await this.getSalesRecordsByDistributor(distributor);
      console.log(`[DynamoDB] Retrieved ${allRecords.length} total records for ${distributor}`);
      console.log(`[DynamoDB] Sample records:`, allRecords.slice(0, 3).map(r => ({ id: r.id, period: r.period, distributor: r.distributor })));
      
      const recordsToDelete = allRecords.filter(r => r.period === period);
      console.log(`[DynamoDB] Found ${recordsToDelete.length} records to delete for period ${period}`);
      
      if (recordsToDelete.length === 0) {
        console.warn(`[DynamoDB] No records found for ${distributor} / ${period}. Available periods:`, Array.from(new Set(allRecords.map(r => r.period))));
        return;
      }

      // Use fast batch delete for better performance
      await this.deleteRecordsBatchFast(distributor, recordsToDelete);
      
      console.log(`[DynamoDB] Successfully deleted ${recordsToDelete.length} records for ${distributor} / ${period}`);
    } catch (error) {
      console.error(`[DynamoDB] Error deleting records for ${distributor} / ${period}:`, error);
      throw error;
    }
  }

  // FAST batch delete method - much faster for deleting multiple records (5-10x speed improvement)
  async deleteRecordsBatchFast(distributor: string, recordsToDelete: SalesRecord[]): Promise<void> {
    if (recordsToDelete.length === 0) return;

    console.log(`[DynamoDB] Starting fast batch delete for ${recordsToDelete.length} records`);
    const startTime = Date.now();

    // Process in batches of 25 (DynamoDB BatchWriteCommand limit)
    for (let i = 0; i < recordsToDelete.length; i += 25) {
      const batch = recordsToDelete.slice(i, i + 25);

      // Create batch delete items
      const requestItems = batch.map(record => ({
        DeleteRequest: {
          Key: {
            PK: `SALES#${distributor}`,
            SK: `${record.period}#${record.id}`,
          }
        }
      }));

      try {
        const command = new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: requestItems
          }
        });

        await docClient.send(command);
        console.log(`[DynamoDB] Batch ${Math.floor(i / 25) + 1} deleted (${batch.length} items)`);
      } catch (error) {
        console.error(`[DynamoDB] Batch delete failed:`, error);
        throw error;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[DynamoDB] Fast batch delete complete! ${recordsToDelete.length} records deleted in ${duration}ms (${(duration / recordsToDelete.length).toFixed(1)}ms per record)`);
  }

  // Delete customer progressions for a given period and distributor
  async deleteCustomerProgressionsByPeriod(distributor: string, period: string): Promise<void> {
    try {
      console.log(`[DynamoDB] Deleting customer progressions for ${distributor} / ${period}`);
      
      // Get all sales records BEFORE deletion to know which customers to update
      const allRecordsBeforeDeletion = await this.getSalesRecordsByDistributor(distributor);
      const recordsInDeletedPeriod = allRecordsBeforeDeletion.filter(r => r.period === period);
      const affectedCustomers = new Set(recordsInDeletedPeriod.map(r => r.customerName));
      
      console.log(`[DynamoDB] Found ${affectedCustomers.size} customers affected by period deletion`);
      
      // Get all customer progressions for this distributor
      const allProgressions = await this.getCustomerProgressionsByDistributor(distributor);
      
      // Delete progressions for ALL customers affected by this period's deletion
      // (they may have other records in other periods, but we should still update their progressions)
      const deletePromises: Promise<any>[] = [];
      
      for (const progression of allProgressions) {
        if (affectedCustomers.has(progression.customerName)) {
          // Delete this customer's progression - it will be regenerated if needed
          console.log(`[DynamoDB] Deleting progression for customer: ${progression.customerName}`);
          deletePromises.push(
            docClient.send(new DeleteCommand({
              TableName: TABLE_NAME,
              Key: {
                PK: `PROGRESSION#${distributor}`,
                SK: `${progression.customerName}#${progression.id}`,
              },
            }))
          );
        }
      }
      
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`[DynamoDB] Successfully deleted ${deletePromises.length} customer progressions`);
      } else {
        console.log(`[DynamoDB] No customer progressions to delete`);
      }
    } catch (error) {
      console.error(`[DynamoDB] Error deleting customer progressions for ${distributor} / ${period}:`, error);
      throw error;
    }
  }

  // Get records by invoice key to check for duplicates
  async getRecordsByInvoiceKeys(invoiceKeys: string[]): Promise<SalesRecord[]> {
    if (invoiceKeys.length === 0) return [];

    try {
      const allItems: SalesRecord[] = [];
      let lastEvaluatedKey: any = undefined;

      do {
        const command = new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'invoiceKey IN (' + invoiceKeys.map((_, i) => `:key${i}`).join(',') + ')',
          ExpressionAttributeValues: invoiceKeys.reduce((acc, key, i) => {
            acc[`:key${i}`] = key;
            return acc;
          }, {} as Record<string, string>),
          ExclusiveStartKey: lastEvaluatedKey,
        });

        const result = await docClient.send(command);
        const items = (result.Items || []).map(item => ({
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
          accountName: item.accountName,
          customerId: item.customerId,
          itemNumber: item.itemNumber,
          size: item.size,
          weightLbs: item.weightLbs,
        })) as SalesRecord[];

        allItems.push(...items);
        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      return allItems;
    } catch (error) {
      console.error('[DynamoDB] Error fetching records by invoice keys:', error);
      return [];
    }
  }

  // Save sales records with deduplication - replace old records for same invoice keys
  async saveSalesRecordsWithDedup(records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SalesRecord[]> {
    if (records.length === 0) return [];
    
    // Get the distributor from the first record
    const distributor = records[0].distributor;
    if (!distributor) {
      console.warn('[DynamoDB Dedup] No distributor found in records, cannot deduplicate properly');
      return this.saveSalesRecords(records);
    }

    console.log(`[DynamoDB Dedup Entry] ${distributor}: Received ${records.length} records`);
    
    // Use the distributor-aware dedup method
    return this.saveSalesRecordsWithDedupByDistributor(distributor, records);
  }

  // Get records by invoice key and distributor to check for duplicates
  async getRecordsByInvoiceKeysAndDistributor(distributor: string, invoiceKeys: string[]): Promise<SalesRecord[]> {
    if (invoiceKeys.length === 0) return [];

    try {
      console.log(`[Scan] Starting scan for ${distributor} with ${invoiceKeys.length} keys`);
      const allItems: SalesRecord[] = [];
      let lastEvaluatedKey: any = undefined;
      let scansPerformed = 0;

      do {
        scansPerformed++;
        // Filter by distributor AND invoice key to be more efficient
        const command = new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'distributor = :dist AND invoiceKey IN (' + invoiceKeys.map((_, i) => `:key${i}`).join(',') + ')',
          ExpressionAttributeValues: {
            ':dist': distributor,
            ...invoiceKeys.reduce((acc, key, i) => {
              acc[`:key${i}`] = key;
              return acc;
            }, {} as Record<string, string>),
          },
          ExclusiveStartKey: lastEvaluatedKey,
          Limit: 100, // Limit each page to 100 items
        });

        console.log(`[Scan] Executing scan #${scansPerformed} for ${distributor}`);
        const result = await docClient.send(command);
        const items = (result.Items || []).map(item => ({
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
          accountName: item.accountName,
          customerId: item.customerId,
          itemNumber: item.itemNumber,
          size: item.size,
          weightLbs: item.weightLbs,
        })) as SalesRecord[];

        console.log(`[Scan] Scan #${scansPerformed} found ${items.length} items. Total so far: ${allItems.length + items.length}`);
        allItems.push(...items);
        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      console.log(`[Scan] Completed ${scansPerformed} scans for ${distributor}. Found ${allItems.length} total matching records`);
      return allItems;
    } catch (error) {
      console.error('[DynamoDB] Error scanning records by invoice keys and distributor:', error);
      console.error('[DynamoDB] Scan failed, returning empty array - this may cause duplicates to be saved!');
      return [];
    }
  }

  // Save sales records with deduplication by distributor - replace old records for same invoice keys
  async saveSalesRecordsWithDedupByDistributor(distributor: string, records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SalesRecord[]> {
    if (records.length === 0) return [];

    console.log(`[DynamoDB Dedup] ${distributor}: Starting dedup check for ${records.length} records`);
    const startTime = Date.now();
    
    const invoiceKeys = records.map(r => r.invoiceKey).filter(Boolean);
    
    if (invoiceKeys.length === 0) {
      console.log(`[DynamoDB Dedup] ${distributor}: No invoice keys found. Saving all ${records.length} records without dedup check.`);
      return this.saveSalesRecordsFast(records);
    }

    try {
      // Get ALL existing records for this distributor (more reliable than scan with filter)
      console.log(`[DynamoDB Dedup] ${distributor}: Querying all existing records for distributor...`);
      const allExistingRecords = await this.getSalesRecordsByDistributor(distributor);
      console.log(`[DynamoDB Dedup] ${distributor}: Retrieved ${allExistingRecords.length} existing records`);
      
      // Create set of existing invoice keys for dedup
      const existingInvoiceKeys = new Set(allExistingRecords.map(r => r.invoiceKey).filter(Boolean));
      console.log(`[DynamoDB Dedup] ${distributor}: Found ${existingInvoiceKeys.size} unique existing invoice keys`);
      
      // Filter out duplicates
      const newRecords = records.filter(r => {
        if (!r.invoiceKey) return true; // Keep records without invoice key
        return !existingInvoiceKeys.has(r.invoiceKey);
      });

      if (newRecords.length === 0) {
        const duration = Date.now() - startTime;
        console.log(`[DynamoDB Dedup] ${distributor}: All ${records.length} records are duplicates. Not saving anything. (${duration}ms)`);
        return [];
      }

      const filteredCount = records.length - newRecords.length;
      if (filteredCount > 0) {
        console.log(`[DynamoDB Dedup] ${distributor}: Filtered out ${filteredCount} duplicate records. Saving ${newRecords.length} new records.`);
      } else {
        console.log(`[DynamoDB Dedup] ${distributor}: No duplicates found. Saving all ${newRecords.length} records.`);
      }

      // Save using fast batch write
      const result = await this.saveSalesRecordsFast(newRecords);
      const duration = Date.now() - startTime;
      console.log(`[DynamoDB Dedup] ${distributor}: Dedup + save complete in ${duration}ms`);
      return result;

    } catch (error) {
      console.error(`[DynamoDB Dedup] ${distributor}: Error during dedup check:`, error);
      console.error(`[DynamoDB Dedup] ${distributor}: FALLING BACK to saving without dedup!`);
      // Fallback: at least try to save
      return this.saveSalesRecordsFast(records);
    }
  }

  // Fast batch write with deduplication - for best performance with duplicate prevention
  async saveSalesRecordsWithDedupFast(distributor: string, records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SalesRecord[]> {
    if (records.length === 0) return [];

    console.log(`[DynamoDB Fast Dedup] ${distributor}: Starting dedup check for ${records.length} records`);
    
    // Get all existing records for this distributor
    const existingRecords = await this.getSalesRecordsByDistributor(distributor);
    console.log(`[DynamoDB Fast Dedup] ${distributor}: Found ${existingRecords.length} existing records`);
    
    if (existingRecords.length === 0) {
      // No existing records, save all
      console.log(`[DynamoDB Fast Dedup] ${distributor}: No existing records. Saving all ${records.length} new records.`);
      return this.saveSalesRecordsFast(records);
    }

    // Check for duplicates using invoice key
    const existingInvoiceKeys = new Set(existingRecords.map(r => r.invoiceKey));
    const newRecords = records.filter(r => {
      if (!r.invoiceKey) return true; // Keep records without invoice key
      return !existingInvoiceKeys.has(r.invoiceKey);
    });

    if (newRecords.length === 0) {
      console.log(`[DynamoDB Fast Dedup] ${distributor}: All ${records.length} records are duplicates. Not saving.`);
      return [];
    }

    const filteredCount = records.length - newRecords.length;
    if (filteredCount > 0) {
      console.log(`[DynamoDB Fast Dedup] ${distributor}: Filtered ${filteredCount} duplicates. Saving ${newRecords.length} records.`);
    }

    return this.saveSalesRecordsFast(newRecords);
  }
}

export const dynamoDBService = new DynamoDBService();
export default dynamoDBService;
