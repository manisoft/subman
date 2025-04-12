import axios from 'axios';
import { dbService } from './db.service';
import { Subscription } from '../types/models';

// Updated API URL with explicit Netlify functions path
const API_BASE_URL = import.meta.env.VITE_API_URL || '/.netlify/functions';

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
        const response = await axios.post(
            `${API_BASE_URL}/${operation.entity}s`,
            operation.data
        );
        if (operation.entity === 'subscription' && operation.data) {
            await dbService.updateSubscription({
                ...(operation.data as Subscription),
                id: response.data.id
            } as Subscription);
        }
    }

    private async syncUpdate(operation: SyncOperation) {
        await axios.put(
            `${API_BASE_URL}/${operation.entity}s/${operation.id}`,
            operation.data
        );
    }

    private async syncDelete(operation: SyncOperation) {
        await axios.delete(
            `${API_BASE_URL}/${operation.entity}s/${operation.id}`
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