import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.REACT_APP_AWS_REGION || process.env.AWS_REGION || 'us-west-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Table name - using your app ID
const TABLE_NAME = `SalesTracker-${process.env.REACT_APP_AWS_APP_ID || 'dbqznmct8mzz4'}`;

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

  async getSalesRecordsByDistributor(distributor: string): Promise<SalesRecord[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `SALES#${distributor}`,
      },
    });

    const result = await docClient.send(command);
    return (result.Items || []).map(item => ({
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
    })) as SalesRecord[];
  }

  async getSalesRecordsByPeriod(period: string): Promise<SalesRecord[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `PERIOD#${period}`,
      },
    });

    const result = await docClient.send(command);
    return (result.Items || []).map(item => ({
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
    })) as SalesRecord[];
  }

  async getAllSalesRecords(): Promise<SalesRecord[]> {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':pk': 'SALES#',
      },
    });

    const result = await docClient.send(command);
    return (result.Items || []).map(item => ({
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
    })) as SalesRecord[];
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
}

export const dynamoDBService = new DynamoDBService();
export default dynamoDBService;
