import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing environment variables. Supabase client will not be initialized.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Data types matching the DynamoDB service interface
export interface SalesRecord {
  id: string;
  distributor: string;
  period: string;
  customerName: string;
  productName: string;
  productCode?: string;
  cases: number;
  revenue: number;
  invoiceKey: string;
  source?: string;
  timestamp?: string;
  createdAt: string;
  updatedAt: string;
  accountName?: string;
  customerId?: string;
  itemNumber?: string;
  size?: string;
  weightLbs?: number;
}

export interface CustomerProgression {
  id: string;
  distributor: string;
  customerName: string;
  progression: any;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  id: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  groups: string[];
  createdAt: string;
  updatedAt: string;
}

// Database row types (matching Supabase schema)
interface SalesRecordRow {
  id: string;
  distributor: string;
  period: string;
  customer_name: string;
  product_name: string;
  product_code?: string;
  cases: number;
  revenue: number;
  invoice_key: string;
  source?: string;
  timestamp?: string;
  created_at: string;
  updated_at: string;
  account_name?: string;
  customer_id?: string;
  item_number?: string;
  size?: string;
  weight_lbs?: number;
}

interface CustomerProgressionRow {
  id: string;
  distributor: string;
  customer_name: string;
  progression: any;
  created_at: string;
  updated_at: string;
}

interface AppStateRow {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}

// Helper functions to convert between camelCase and snake_case
function toSalesRecord(row: SalesRecordRow): SalesRecord {
  return {
    id: row.id,
    distributor: row.distributor,
    period: row.period,
    customerName: row.customer_name,
    productName: row.product_name,
    productCode: row.product_code,
    cases: Number(row.cases),
    revenue: Number(row.revenue),
    invoiceKey: row.invoice_key,
    source: row.source,
    timestamp: row.timestamp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    accountName: row.account_name,
    customerId: row.customer_id,
    itemNumber: row.item_number,
    size: row.size,
    weightLbs: row.weight_lbs ? Number(row.weight_lbs) : undefined,
  };
}

function fromSalesRecord(record: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>): Partial<SalesRecordRow> {
  return {
    distributor: record.distributor,
    period: record.period,
    customer_name: record.customerName,
    product_name: record.productName,
    product_code: record.productCode,
    cases: record.cases,
    revenue: record.revenue,
    invoice_key: record.invoiceKey,
    source: record.source,
    timestamp: record.timestamp,
    account_name: record.accountName,
    customer_id: record.customerId,
    item_number: record.itemNumber,
    size: record.size,
    weight_lbs: record.weightLbs,
  };
}

function toCustomerProgression(row: CustomerProgressionRow): CustomerProgression {
  return {
    id: row.id,
    distributor: row.distributor,
    customerName: row.customer_name,
    progression: row.progression,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAppState(row: AppStateRow): AppState {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SupabaseService {
  private client: SupabaseClient | null;

  constructor() {
    this.client = supabase;
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client is not initialized. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY environment variables.');
    }
    return this.client;
  }

  // Sales Records Operations
  async saveSalesRecord(record: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalesRecord> {
    const client = this.ensureClient();
    const row = fromSalesRecord(record);
    
    const { data, error } = await client
      .from('sales_records')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error saving sales record:', error);
      throw error;
    }

    return toSalesRecord(data as SalesRecordRow);
  }

  async saveSalesRecords(records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SalesRecord[]> {
    if (records.length === 0) return [];
    
    const client = this.ensureClient();
    const rows = records.map(fromSalesRecord);
    
    const { data, error } = await client
      .from('sales_records')
      .insert(rows)
      .select();

    if (error) {
      console.error('[Supabase] Error saving sales records:', error);
      throw error;
    }

    return (data as SalesRecordRow[]).map(toSalesRecord);
  }

  async saveSalesRecordsFast(records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SalesRecord[]> {
    // Supabase handles batch inserts efficiently, so this is the same as saveSalesRecords
    return this.saveSalesRecords(records);
  }

  async getSalesRecordsByDistributor(distributor: string): Promise<SalesRecord[]> {
    const client = this.ensureClient();
    
    console.log(`[Supabase] Querying sales records for distributor: ${distributor}`);
    
    // Supabase PostgREST has a default limit of 1000 rows
    // We need to paginate to get all records
    const allRecords: SalesRecordRow[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await client
        .from('sales_records')
        .select('*')
        .eq('distributor', distributor)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('[Supabase] Error fetching sales records by distributor:', error);
        throw error;
      }

      if (data && data.length > 0) {
        allRecords.push(...(data as SalesRecordRow[]));
        from += pageSize;
        // If we got fewer records than pageSize, we've reached the end
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    console.log(`[Supabase] Found ${allRecords.length} total records for distributor ${distributor} (after pagination)`);
    if (distributor === 'KEHE' && allRecords.length > 0) {
      console.log('[Supabase] Sample KEHE records:', allRecords.slice(0, 3).map((r: any) => ({
        distributor: r.distributor,
        period: r.period,
        customerName: r.customer_name,
        accountName: r.account_name,
        productName: r.product_name
      })));
    }
    if (distributor === 'VISTAR' && allRecords.length > 0) {
      console.log('[Supabase] Sample VISTAR records:', allRecords.slice(0, 3).map((r: any) => ({
        distributor: r.distributor,
        period: r.period,
        customerName: r.customer_name,
        accountName: r.account_name,
        productName: r.product_name,
        invoiceKey: r.invoice_key
      })));
    }

    return allRecords.map(toSalesRecord);
  }

  async getSalesRecordsByPeriod(period: string): Promise<SalesRecord[]> {
    const client = this.ensureClient();
    
    const { data, error } = await client
      .from('sales_records')
      .select('*')
      .eq('period', period)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error fetching sales records by period:', error);
      throw error;
    }

    return (data as SalesRecordRow[]).map(toSalesRecord);
  }

  async getAllSalesRecords(): Promise<SalesRecord[]> {
    const client = this.ensureClient();
    
    const { data, error } = await client
      .from('sales_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error fetching all sales records:', error);
      throw error;
    }

    return (data as SalesRecordRow[]).map(toSalesRecord);
  }

  // Customer Progression Operations
  async saveCustomerProgression(distributor: string, customerName: string, progression: any): Promise<CustomerProgression> {
    const client = this.ensureClient();
    
    const { data, error } = await client
      .from('customer_progressions')
      .upsert({
        distributor,
        customer_name: customerName,
        progression,
      }, {
        onConflict: 'distributor,customer_name',
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error saving customer progression:', error);
      throw error;
    }

    return toCustomerProgression(data as CustomerProgressionRow);
  }

  async saveCustomerProgressionWithDedup(distributor: string, customerName: string, progression: any): Promise<CustomerProgression> {
    // Supabase upsert handles deduplication automatically
    return this.saveCustomerProgression(distributor, customerName, progression);
  }

  async getCustomerProgressionsByDistributor(distributor: string): Promise<CustomerProgression[]> {
    const client = this.ensureClient();
    
    const { data, error } = await client
      .from('customer_progressions')
      .select('*')
      .eq('distributor', distributor);

    if (error) {
      console.error('[Supabase] Error fetching customer progressions:', error);
      throw error;
    }

    return (data as CustomerProgressionRow[]).map(toCustomerProgression);
  }

  // App State Operations
  async saveAppState(key: string, value: any): Promise<AppState> {
    const client = this.ensureClient();
    
    const { data, error } = await client
      .from('app_state')
      .upsert({
        key,
        value,
      }, {
        onConflict: 'key',
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error saving app state:', error);
      throw error;
    }

    return toAppState(data as AppStateRow);
  }

  async getAppState(key: string): Promise<AppState | null> {
    const client = this.ensureClient();
    
    try {
      const { data, error } = await client
        .from('app_state')
        .select('*')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        // Handle 406 Not Acceptable errors (might be RLS or API config issue)
        // Check error message for 406 status
        if (error.code === 'PGRST301' || (error.message && error.message.includes('406'))) {
          console.warn(`[Supabase] 406/Not Acceptable error for key "${key}". This might be an RLS policy issue.`, error);
          return null;
        }
        console.error('[Supabase] Error fetching app state:', error);
        throw error;
      }

      return toAppState(data as AppStateRow);
    } catch (err: any) {
      // Catch any other errors and return null instead of throwing
      // Check for 406 errors in various ways
      if (err?.code === 'PGRST301' || 
          (err?.message && err.message.includes('406')) ||
          (err?.statusCode === 406) ||
          (typeof err === 'string' && err.includes('406'))) {
        console.warn(`[Supabase] 406 error for key "${key}". Returning null.`, err);
        return null;
      }
      throw err;
    }
  }

  async getAllAppStates(): Promise<AppState[]> {
    const client = this.ensureClient();
    
    const { data, error } = await client
      .from('app_state')
      .select('*');

    if (error) {
      console.error('[Supabase] Error fetching all app states:', error);
      throw error;
    }

    return (data as AppStateRow[]).map(toAppState);
  }

  // Utility methods
  async clearDistributorData(distributor: string): Promise<void> {
    const client = this.ensureClient();
    
    // Delete sales records
    const { error: salesError } = await client
      .from('sales_records')
      .delete()
      .eq('distributor', distributor);

    if (salesError) {
      console.error('[Supabase] Error deleting sales records:', salesError);
      throw salesError;
    }

    // Delete customer progressions
    const { error: progressionError } = await client
      .from('customer_progressions')
      .delete()
      .eq('distributor', distributor);

    if (progressionError) {
      console.error('[Supabase] Error deleting customer progressions:', progressionError);
      throw progressionError;
    }
  }

  async clearAllData(): Promise<void> {
    const client = this.ensureClient();
    
    const { error: salesError } = await client
      .from('sales_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (salesError) {
      console.error('[Supabase] Error deleting all sales records:', salesError);
      throw salesError;
    }

    const { error: progressionError } = await client
      .from('customer_progressions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (progressionError) {
      console.error('[Supabase] Error deleting all customer progressions:', progressionError);
      throw progressionError;
    }

    const { error: stateError } = await client
      .from('app_state')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (stateError) {
      console.error('[Supabase] Error deleting all app state:', stateError);
      throw stateError;
    }
  }

  async deleteRecordsByPeriodAndDistributor(distributor: string, period: string): Promise<void> {
    const client = this.ensureClient();
    
    const { error } = await client
      .from('sales_records')
      .delete()
      .eq('distributor', distributor)
      .eq('period', period);

    if (error) {
      console.error('[Supabase] Error deleting records by period and distributor:', error);
      throw error;
    }
  }

  async getRecordsByInvoiceKeysAndDistributor(distributor: string, invoiceKeys: string[]): Promise<SalesRecord[]> {
    if (invoiceKeys.length === 0) return [];
    
    const client = this.ensureClient();
    
    const { data, error } = await client
      .from('sales_records')
      .select('*')
      .eq('distributor', distributor)
      .in('invoice_key', invoiceKeys);

    if (error) {
      console.error('[Supabase] Error fetching records by invoice keys:', error);
      throw error;
    }

    return (data as SalesRecordRow[]).map(toSalesRecord);
  }

  async saveSalesRecordsWithDedupByDistributor(
    distributor: string,
    records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<SalesRecord[]> {
    if (records.length === 0) return [];

    console.log(`[Supabase Dedup] ${distributor}: Starting dedup check for ${records.length} records`);
    const startTime = Date.now();

    try {
      // Get existing records for this distributor
      const existingRecords = await this.getSalesRecordsByDistributor(distributor);
      console.log(`[Supabase Dedup] ${distributor}: Found ${existingRecords.length} existing records`);

      if (existingRecords.length === 0) {
        console.log(`[Supabase Dedup] ${distributor}: No existing records. Saving all ${records.length} new records.`);
        return this.saveSalesRecordsFast(records);
      }

      // Check for duplicates using invoice key
      const existingInvoiceKeys = new Set(existingRecords.map(r => r.invoiceKey));
      const newRecords = records.filter(r => {
        if (!r.invoiceKey) return true; // Keep records without invoice key
        return !existingInvoiceKeys.has(r.invoiceKey);
      });

      if (newRecords.length === 0) {
        const duration = Date.now() - startTime;
        console.log(`[Supabase Dedup] ${distributor}: All ${records.length} records are duplicates. Not saving. (${duration}ms)`);
        return [];
      }

      const filteredCount = records.length - newRecords.length;
      if (filteredCount > 0) {
        console.log(`[Supabase Dedup] ${distributor}: Filtered ${filteredCount} duplicates. Saving ${newRecords.length} records.`);
      }

      const result = await this.saveSalesRecordsFast(newRecords);
      const duration = Date.now() - startTime;
      console.log(`[Supabase Dedup] ${distributor}: Dedup + save complete in ${duration}ms`);
      return result;
    } catch (error) {
      console.error(`[Supabase Dedup] ${distributor}: Error during dedup check:`, error);
      console.error(`[Supabase Dedup] ${distributor}: FALLING BACK to saving without dedup!`);
      return this.saveSalesRecordsFast(records);
    }
  }

  async saveSalesRecordsWithDedup(records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<SalesRecord[]> {
    if (records.length === 0) return [];
    
    const distributor = records[0].distributor;
    if (!distributor) {
      console.warn('[Supabase Dedup] No distributor found in records, cannot deduplicate properly');
      return this.saveSalesRecords(records);
    }

    return this.saveSalesRecordsWithDedupByDistributor(distributor, records);
  }

  // User Profile Operations
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const client = this.ensureClient();
      
      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user doesn't have a profile yet
          return null;
        }
        // If table doesn't exist or RLS issue, return null instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('[Supabase] user_profiles table does not exist yet');
          return null;
        }
        console.error('[Supabase] Error fetching user profile:', error);
        // Return null instead of throwing to prevent blocking
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        username: data.username,
        groups: data.groups || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('[Supabase] Exception in getUserProfile:', err);
      // Return null instead of throwing to prevent blocking
      return null;
    }
  }

  async createOrUpdateUserProfile(
    userId: string,
    username?: string,
    groups?: string[]
  ): Promise<UserProfile> {
    const client = this.ensureClient();
    
    const { data, error } = await client
      .from('user_profiles')
      .upsert({
        id: userId,
        username,
        groups: groups || [],
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error creating/updating user profile:', error);
      throw error;
    }

    return {
      id: data.id,
      username: data.username,
      groups: data.groups || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateUserGroups(userId: string, groups: string[]): Promise<UserProfile> {
    const client = this.ensureClient();
    
    const { data, error } = await client
      .from('user_profiles')
      .update({ groups })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error updating user groups:', error);
      throw error;
    }

    return {
      id: data.id,
      username: data.username,
      groups: data.groups || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const supabaseService = new SupabaseService();
export default supabaseService;
