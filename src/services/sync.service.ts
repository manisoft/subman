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

    private async syncCreate(operation: SyncOperation) {
        try {
            console.log(`Syncing ${operation.entity} creation to ${API_BASE_URL}/${operation.entity}s`);
            
            const response = await axios.post(
                `${API_BASE_URL}/${operation.entity}s`,
                operation.data,
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
            await axios.put(
                `${API_BASE_URL}/${operation.entity}s/${operation.id}`,
                operation.data,
                {
                    headers: this.getAuthHeader()
                }
            );
        } catch (error) {
            // If offline, keep in pending operations
            if (!navigator.onLine || this.isNetworkError(error)) {
                this.saveSyncState();
            }
            throw error;
        }
    }

    private async syncDelete(operation: SyncOperation) {
        try {
            await axios.delete(
                `${API_BASE_URL}/${operation.entity}s/${operation.id}`,
                {
                    headers: this.getAuthHeader()
                }
            );
        } catch (error) {
            // If offline, keep in pending operations
            if (!navigator.onLine || this.isNetworkError(error)) {
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