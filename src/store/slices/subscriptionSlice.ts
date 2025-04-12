import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Subscription } from '../../types/models';
import { dbService } from '../../services/db.service';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface SubscriptionState {
    items: Subscription[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: SubscriptionState = {
    items: [],
    status: 'idle',
    error: null
};

export const fetchUserSubscriptions = createAsyncThunk(
    'subscriptions/fetchUserSubscriptions',
    async (userId: number) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/subscriptions/user/${userId}`);
            const subscriptions = response.data;
            // Store in IndexedDB for offline access
            for (const sub of subscriptions) {
                await dbService.addSubscription(sub);
            }
            return subscriptions;
        } catch (error) {
            // If API fails, try to get from IndexedDB
            const offlineSubscriptions = await dbService.getUserSubscriptions(userId);
            if (offlineSubscriptions.length > 0) {
                return offlineSubscriptions;
            }
            throw error;
        }
    }
);

export const addSubscription = createAsyncThunk(
    'subscriptions/addSubscription',
    async (subscription: Omit<Subscription, 'id'>) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/subscriptions`, subscription);
            const newSubscription = response.data;
            await dbService.addSubscription(newSubscription);
            return newSubscription;
        } catch (error) {
            // If offline, store in IndexedDB only
            if (!navigator.onLine) {
                const tempId = Date.now(); // Temporary ID for offline
                const tempSubscription = { ...subscription, id: tempId };
                await dbService.addSubscription(tempSubscription);
                return tempSubscription;
            }
            throw error;
        }
    }
);

export const updateSubscription = createAsyncThunk(
    'subscriptions/updateSubscription',
    async (subscription: Subscription) => {
        try {
            const response = await axios.put(
                `${API_BASE_URL}/subscriptions/${subscription.id}`,
                subscription
            );
            await dbService.updateSubscription(subscription);
            return response.data;
        } catch (error) {
            // If offline, update in IndexedDB only
            if (!navigator.onLine) {
                await dbService.updateSubscription(subscription);
                return subscription;
            }
            throw error;
        }
    }
);

export const deleteSubscription = createAsyncThunk(
    'subscriptions/deleteSubscription',
    async (id: number) => {
        try {
            await axios.delete(`${API_BASE_URL}/subscriptions/${id}`);
            await dbService.deleteSubscription(id);
            return id;
        } catch (error) {
            // If offline, delete from IndexedDB only
            if (!navigator.onLine) {
                await dbService.deleteSubscription(id);
                return id;
            }
            throw error;
        }
    }
);

export const subscriptionSlice = createSlice({
    name: 'subscriptions',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserSubscriptions.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchUserSubscriptions.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = action.payload;
            })
            .addCase(fetchUserSubscriptions.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed to fetch subscriptions';
            })
            .addCase(addSubscription.fulfilled, (state, action) => {
                state.items.push(action.payload);
            })
            .addCase(updateSubscription.fulfilled, (state, action) => {
                const index = state.items.findIndex(sub => sub.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(deleteSubscription.fulfilled, (state, action) => {
                state.items = state.items.filter(sub => sub.id !== action.payload);
            });
    },
});

export const subscriptionReducer = subscriptionSlice.reducer;