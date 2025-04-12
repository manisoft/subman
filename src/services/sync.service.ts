import axios from 'axios';
import { dbService } from './db.service';
import { Subscription } from '../types/models';

// Determine the environment and use appropriate API URL
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:3000/api' 
  : '/.netlify/functions';

console.log('Sync service using API URL:', API_BASE_URL);

type EntityType = Subscription;

// Define interface for API subscription data format
interface APISubscriptionData {
  id?: string;
  name: string;
  price: string;
  billing_cycle: string;
  user_id: string;
  category?: string | number;
  description?: string;
  next_billing_date?: string;
  color?: string;
  logo?: string | null;
  website?: string;
  notes?: string;
  [key: string]: any; // Allow for additional properties
}

interface SyncOperation {
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: 'subscription' | 'payment';
    data: EntityType | null;
    id?: string | number;
}

interface SyncState {
    lastSyncTimestamp: number;
    pendingOperations: SyncOperation[];
}

class SyncService {
    private isOnline: boolean = navigator.onLine;
    private syncState: SyncState = {
        lastSyncTimestamp: 0,
        pendingOperations: []
    };

    constructor() {
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
        this.loadSyncState();
    }

    private async loadSyncState() {
        const stored = localStorage.getItem('syncState');
        if (stored) {
            this.syncState = JSON.parse(stored);
        }
    }

    private saveSyncState() {
        localStorage.setItem('syncState', JSON.stringify(this.syncState));
    }

    private handleOnline = async () => {
        this.isOnline = true;
        await this.syncPendingOperations();
    };

    private handleOffline = () => {
        this.isOnline = false;
    };

    private async syncPendingOperations() {
        if (!this.isOnline || this.syncState.pendingOperations.length === 0) return;

        for (const operation of this.syncState.pendingOperations) {
            try {
                switch (operation.type) {
                    case 'CREATE':
                        await this.syncCreate(operation);
                        break;
                    case 'UPDATE':
                        await this.syncUpdate(operation);
                        break;
                    case 'DELETE':
                        await this.syncDelete(operation);
                        break;
                }
            } catch (error) {
                console.error('Sync failed for operation:', operation, error);
                continue;
            }
        }

        this.syncState.pendingOperations = [];
        this.syncState.lastSyncTimestamp = Date.now();
        this.saveSyncState();
    }

    // Convert Subscription object to API format
    private formatSubscriptionForApi(subscription: Subscription): APISubscriptionData {
        return {
            id: subscription.id,
            name: subscription.name,
            price: subscription.cost.toString(),
            billing_cycle: subscription.billingCycle.toLowerCase(),
            user_id: String(subscription.userId),
            category: subscription.categoryId,
            description: subscription.description || '',
            next_billing_date: subscription.nextBillingDate instanceof Date 
                ? subscription.nextBillingDate.toISOString() 
                : subscription.nextBillingDate,
            color: subscription.color,
            logo: subscription.logo,
            website: subscription.website,
            notes: subscription.notes
        };
    }

    private async syncCreate(operation: SyncOperation) {
        try {
            console.log(`Syncing ${operation.entity} creation to ${API_BASE_URL}/${operation.entity}s`);
            
            // Format data for API if needed
            let apiData: any = operation.data;
            if (operation.entity === 'subscription' && operation.data) {
                apiData = this.formatSubscriptionForApi(operation.data as Subscription);
                console.log('Formatted subscription data for API:', apiData);
            }
            
            const response = await axios.post(
                `${API_BASE_URL}/${operation.entity}s`,
                apiData,
                {
                    headers: this.getAuthHeader()
                }
            );
            
            console.log('Create sync response:', response.data);
            
            if (operation.entity === 'subscription' && operation.data) {
                // Extract ID from different possible response formats
                let newId: string;
                if (response.data && response.data.subscription && response.data.subscription.id) {
                    newId = String(response.data.subscription.id);
                } else if (response.data && response.data.id) {
                    newId = String(response.data.id);
                } else {
                    // Fallback to a timestamp if we don't get an ID back
                    newId = Date.now().toString();
                }
                
                // Update the local subscription with the server-generated ID
                const updatedSubscription = {
                    ...(operation.data as Subscription),
                    id: newId
                } as Subscription;
                
                console.log('Updating local subscription with ID:', newId);
                await dbService.updateSubscription(updatedSubscription);
            }
        } catch (error) {
            console.error('Error during create sync:', error);
            
            // If offline or network error, store locally but keep in pending operations
            if (!navigator.onLine || this.isNetworkError(error)) {
                if (operation.entity === 'subscription' && operation.data) {
                    console.log('Network error/offline - storing subscription locally');
                    // Make sure we mark it to be synced later
                    this.saveSyncState();
                }
            }
            
            throw error;
        }
    }

    private async syncUpdate(operation: SyncOperation) {
        try {
            // Format data for API if needed
            let apiData: any = operation.data;
            if (operation.entity === 'subscription' && operation.data) {
                apiData = this.formatSubscriptionForApi(operation.data as Subscription);
                console.log('Formatted subscription data for API update:', apiData);
            }
            
            const response = await axios.put(
                `${API_BASE_URL}/${operation.entity}s/${operation.id}`,
                apiData,
                {
                    headers: this.getAuthHeader()
                }
            );
            
            console.log('Update sync response:', response.data);
            
            // If local subscription exists, update it with any server-side changes
            if (operation.entity === 'subscription' && operation.data && operation.id) {
                const subscription = operation.data as Subscription;
                // Fetch the latest from IndexedDB to ensure we have correct data
                const existingSubscription = await dbService.getSubscription(String(operation.id));
                if (existingSubscription) {
                    const updatedSubscription = {
                        ...existingSubscription,
                        ...subscription,
                        id: String(operation.id) // Ensure ID is consistent
                    };
                    await dbService.updateSubscription(updatedSubscription);
                }
            }
        } catch (error) {
            console.error('Error during update sync:', error);
            // If offline, keep in pending operations
            if (!navigator.onLine || this.isNetworkError(error)) {
                console.log('Network error/offline during update - will retry later');
                this.saveSyncState();
            }
            
            throw error;
        }
    }

    private async syncDelete(operation: SyncOperation) {
        try {
            console.log(`Syncing delete for ${operation.entity} with ID ${operation.id}`);
            
            const response = await axios.delete(
                `${API_BASE_URL}/${operation.entity}s/${operation.id}`,
                {
                    headers: this.getAuthHeader()
                }
            );
            
            console.log('Delete sync response:', response.data);
            
            // Ensure it's deleted from local DB
            if (operation.entity === 'subscription' && operation.id) {
                await dbService.deleteSubscription(String(operation.id));
            }
        } catch (error: any) {
            console.error('Error during delete sync:', error);
            
            // For 404 errors, we consider it already deleted
            if (error.response && error.response.status === 404) {
                console.log('Resource not found on server (404) - considering it already deleted');
                if (operation.entity === 'subscription' && operation.id) {
                    await dbService.deleteSubscription(String(operation.id));
                }
                return; // Don't rethrow for 404s
            }
            
            // If offline, keep in pending operations
            if (!navigator.onLine || this.isNetworkError(error)) {
                console.log('Network error/offline during delete - will retry later');
                this.saveSyncState();
            }
            
            throw error;
        }
    }

    // Helper to get auth headers
    private getAuthHeader() {
        const token = localStorage.getItem('auth_token');
        if (!token) return {};
        
        // Ensure token has Bearer prefix
        const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        return { Authorization: formattedToken };
    }
    
    // Helper to identify network errors
    private isNetworkError(error: any): boolean {
        return (
            !navigator.onLine || 
            (error && (
                error.code === 'ERR_NETWORK' ||
                error.code === 'ECONNABORTED' ||
                (error.message && (
                    error.message.includes('Network Error') ||
                    error.message.includes('timeout')
                ))
            ))
        );
    }

    async addPendingOperation(
        type: 'CREATE' | 'UPDATE' | 'DELETE',
        entity: 'subscription' | 'payment',
        data: EntityType | null,
        id?: string | number
    ) {
        this.syncState.pendingOperations.push({ type, entity, data, id });
        this.saveSyncState();
        if (this.isOnline) {
            await this.syncPendingOperations();
        }
    }

    getIsOnline() {
        return this.isOnline;
    }
}

export const syncService = new SyncService();