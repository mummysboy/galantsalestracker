import { useState, useCallback } from 'react';
import { dynamoDBService, SalesRecord, CustomerProgression } from '../services/dynamodb';

export interface UseDynamoDBReturn {
  // Sales Records
  salesRecords: SalesRecord[];
  loading: boolean;
  error: string | null;
  
  // Actions
  saveSalesRecord: (record: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  saveSalesRecords: (records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  loadSalesRecordsByDistributor: (distributor: string) => Promise<void>;
  loadSalesRecordsByPeriod: (period: string) => Promise<void>;
  loadAllSalesRecords: () => Promise<void>;
  
  // Customer Progressions
  customerProgressions: Map<string, CustomerProgression>;
  saveCustomerProgression: (distributor: string, customerName: string, progression: any) => Promise<void>;
  loadCustomerProgressionsByDistributor: (distributor: string) => Promise<void>;
  
  // App State
  appState: Map<string, any>;
  saveAppState: (key: string, value: any) => Promise<void>;
  loadAppState: (key: string) => Promise<any>;
  loadAllAppStates: () => Promise<void>;
  
  // Utility
  clearDistributorData: (distributor: string) => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useDynamoDB = (): UseDynamoDBReturn => {
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [customerProgressions, setCustomerProgressions] = useState<Map<string, CustomerProgression>>(new Map());
  const [appState, setAppState] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sales Records Actions
  const saveSalesRecord = useCallback(async (record: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);
      const savedRecord = await dynamoDBService.saveSalesRecord(record);
      setSalesRecords(prev => [...prev, savedRecord]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sales record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSalesRecords = useCallback(async (records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    try {
      setLoading(true);
      setError(null);
      const savedRecords = await dynamoDBService.saveSalesRecords(records);
      setSalesRecords(prev => [...prev, ...savedRecords]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sales records');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSalesRecordsByDistributor = useCallback(async (distributor: string) => {
    try {
      setLoading(true);
      setError(null);
      const records = await dynamoDBService.getSalesRecordsByDistributor(distributor);
      setSalesRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales records');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSalesRecordsByPeriod = useCallback(async (period: string) => {
    try {
      setLoading(true);
      setError(null);
      const records = await dynamoDBService.getSalesRecordsByPeriod(period);
      setSalesRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales records');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllSalesRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await dynamoDBService.getAllSalesRecords();
      setSalesRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales records');
    } finally {
      setLoading(false);
    }
  }, []);

  // Customer Progressions Actions
  const saveCustomerProgression = useCallback(async (distributor: string, customerName: string, progression: any) => {
    try {
      setLoading(true);
      setError(null);
      const savedProgression = await dynamoDBService.saveCustomerProgression(distributor, customerName, progression);
      setCustomerProgressions(prev => {
        const newMap = new Map(prev);
        newMap.set(`${distributor}-${customerName}`, savedProgression);
        return newMap;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer progression');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomerProgressionsByDistributor = useCallback(async (distributor: string) => {
    try {
      setLoading(true);
      setError(null);
      const progressions = await dynamoDBService.getCustomerProgressionsByDistributor(distributor);
      setCustomerProgressions(prev => {
        const newMap = new Map(prev);
        progressions.forEach(progression => {
          newMap.set(`${distributor}-${progression.customerName}`, progression);
        });
        return newMap;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer progressions');
    } finally {
      setLoading(false);
    }
  }, []);

  // App State Actions
  const saveAppState = useCallback(async (key: string, value: any) => {
    try {
      setLoading(true);
      setError(null);
      await dynamoDBService.saveAppState(key, value);
      setAppState(prev => {
        const newMap = new Map(prev);
        newMap.set(key, value);
        return newMap;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save app state');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAppState = useCallback(async (key: string) => {
    try {
      setLoading(true);
      setError(null);
      const state = await dynamoDBService.getAppState(key);
      if (state) {
        setAppState(prev => {
          const newMap = new Map(prev);
          newMap.set(key, state.value);
          return newMap;
        });
        return state.value;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app state');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllAppStates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const states = await dynamoDBService.getAllAppStates();
      setAppState(prev => {
        const newMap = new Map(prev);
        states.forEach(state => {
          newMap.set(state.key, state.value);
        });
        return newMap;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app states');
    } finally {
      setLoading(false);
    }
  }, []);

  // Utility Actions
  const clearDistributorData = useCallback(async (distributor: string) => {
    try {
      setLoading(true);
      setError(null);
      await dynamoDBService.clearDistributorData(distributor);
      // Remove from local state
      setSalesRecords(prev => prev.filter(record => record.distributor !== distributor));
      setCustomerProgressions(prev => {
        const newMap = new Map(prev);
        for (const [key, progression] of Array.from(newMap.entries())) {
          if (progression.distributor === distributor) {
            newMap.delete(key);
          }
        }
        return newMap;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear distributor data');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await dynamoDBService.clearAllData();
      setSalesRecords([]);
      setCustomerProgressions(new Map());
      setAppState(new Map());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all data');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    salesRecords,
    loading,
    error,
    saveSalesRecord,
    saveSalesRecords,
    loadSalesRecordsByDistributor,
    loadSalesRecordsByPeriod,
    loadAllSalesRecords,
    customerProgressions,
    saveCustomerProgression,
    loadCustomerProgressionsByDistributor,
    appState,
    saveAppState,
    loadAppState,
    loadAllAppStates,
    clearDistributorData,
    clearAllData,
  };
};
