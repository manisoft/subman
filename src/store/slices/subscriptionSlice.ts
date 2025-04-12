import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Subscription } from '../../types/models';
import { dbService } from '../../services/db.service';
import axios from 'axios';
import { getNextBillingDate } from '../../utils/dateUtils';

// Determine the environment and use appropriate API URL
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:3000/api' 
  : '/.netlify/functions';

console.log('Subscription API URL:', API_BASE_URL);

// Helper to ensure authorization headers are set correctly
const getAuthHeader = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

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
            console.log(`Fetching subscriptions for user ${userId} from ${API_BASE_URL}/subscriptions/user/${userId}`);
            console.log('Auth headers:', getAuthHeader());
            
            const response = await axios.get(`${API_BASE_URL}/subscriptions/user/${userId}`, {
                headers: getAuthHeader()
            });
            
            console.log('API Response:', response.data);
            
            // Handle different response formats
            let subscriptions;
            if (Array.isArray(response.data)) {
                subscriptions = response.data;
            } else if (response.data && typeof response.data === 'object') {
                // Handle single subscription response
                if (response.data.id) {
                    subscriptions = [response.data];
                } else if (response.data.subscriptions && Array.isArray(response.data.subscriptions)) {
                    subscriptions = response.data.subscriptions;
                } else {
                    subscriptions = [];
                }
            } else {
                subscriptions = [];
            }
            
            console.log('Parsed subscriptions:', subscriptions);
            
            // Map API response to match local model structure
            const formattedSubscriptions = subscriptions.map((sub: any) => {
                // Calculate the next billing date if it's in the past
                const nextBillingDate = getNextBillingDate(
                    sub.next_billing_date || sub.nextBillingDate || new Date(),
                    sub.billing_cycle || sub.billingCycle || 'MONTHLY'
                );
                
                // Create formatted subscription with defaults for missing fields
                const formattedSub = {
                    id: sub.id || Date.now().toString(),
                    name: sub.name || 'Untitled Subscription',
                    description: sub.description || '',
                    cost: sub.price ? parseFloat(sub.price) : (sub.cost || 0),
                    billingCycle: sub.billing_cycle || sub.billingCycle || 'MONTHLY',
                    startDate: sub.start_date || sub.startDate || new Date(),
                    endDate: sub.end_date || sub.endDate,
                    status: sub.status || 'ACTIVE',
                    categoryId: sub.category_id || sub.categoryId || 1,
                    userId: sub.user_id || sub.userId || userId,
                    nextBillingDate: nextBillingDate
                };
                
                console.log('Formatted subscription:', formattedSub);
                return formattedSub;
            });
            
            // Store in IndexedDB for offline access
            for (const sub of formattedSubscriptions) {
                await dbService.addOrUpdateSubscription(sub);
            }
            
            console.log('Returning formatted subscriptions:', formattedSubscriptions);
            return formattedSubscriptions;
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            
            // If API fails, try to get from IndexedDB
            console.log('Attempting to fetch subscriptions from IndexedDB');
            const offlineSubscriptions = await dbService.getUserSubscriptions(userId);
            console.log('IndexedDB subscriptions:', offlineSubscriptions);
            
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
            // Ensure the next billing date is in the future
            const nextBillingDate = getNextBillingDate(
                subscription.nextBillingDate,
                subscription.billingCycle
            );
            
            // Format the data to match what the backend expects
            const apiData = {
                name: subscription.name,
                price: subscription.cost.toString(), // Convert cost to string price for API
                billing_cycle: subscription.billingCycle.toLowerCase(),
                start_date: subscription.startDate instanceof Date 
                    ? subscription.startDate.toISOString() 
                    : subscription.startDate,
                end_date: subscription.endDate instanceof Date 
                    ? subscription.endDate.toISOString() 
                    : subscription.endDate,
                status: subscription.status,
                category_id: subscription.categoryId,
                user_id: subscription.userId,
                next_billing_date: nextBillingDate instanceof Date 
                    ? nextBillingDate.toISOString() 
                    : nextBillingDate,
                description: subscription.description || ''
            };
            
            console.log(`Adding subscription: POST to ${API_BASE_URL}/subscriptions`);
            console.log('Sending subscription data:', apiData);
            
            const response = await axios.post(`${API_BASE_URL}/subscriptions`, apiData, {
                headers: getAuthHeader()
            });
            
            console.log('Add subscription response:', response.data);
            
            // Handle different response formats
            let newId: string | number;
            if (response.data && response.data.subscription && response.data.subscription.id) {
                newId = response.data.subscription.id;
            } else if (response.data && response.data.id) {
                newId = response.data.id;
            } else {
                // Fallback to a timestamp if we don't get an ID back
                newId = Date.now().toString();
            }
            
            const newSubscription = {
                ...subscription,
                id: newId,
                nextBillingDate
            };
            
            console.log('Created subscription object:', newSubscription);
            await dbService.addOrUpdateSubscription(newSubscription);
            return newSubscription;
        } catch (error) {
            console.error('Failed to add subscription:', error);
            
            // Fallback for offline mode
            if (!navigator.onLine) {
                console.log('Offline mode - adding subscription locally only');
                const tempId = Date.now().toString();
                
                // Ensure the next billing date is in the future
                const nextBillingDate = getNextBillingDate(
                    subscription.nextBillingDate,
                    subscription.billingCycle
                );
                
                const tempSubscription = { 
                    ...subscription, 
                    id: tempId,
                    nextBillingDate
                };
                
                console.log('Created offline subscription:', tempSubscription);
                await dbService.addOrUpdateSubscription(tempSubscription);
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
            // Ensure the next billing date is in the future
            const nextBillingDate = getNextBillingDate(
                subscription.nextBillingDate,
                subscription.billingCycle
            );
            
            // Format the data to match what the backend expects
            const apiData = {
                name: subscription.name,
                price: subscription.cost.toString(),
                billing_cycle: subscription.billingCycle.toLowerCase(),
                start_date: subscription.startDate instanceof Date 
                    ? subscription.startDate.toISOString() 
                    : subscription.startDate,
                end_date: subscription.endDate instanceof Date 
                    ? subscription.endDate.toISOString() 
                    : subscription.endDate,
                status: subscription.status,
                category_id: subscription.categoryId,
                user_id: subscription.userId,
                next_billing_date: nextBillingDate instanceof Date 
                    ? nextBillingDate.toISOString() 
                    : nextBillingDate,
                description: subscription.description || ''
            };
            
            const response = await axios.put(
                `${API_BASE_URL}/subscriptions/${subscription.id}`,
                apiData,
                {
                    headers: getAuthHeader()
                }
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
    async (id: string | number) => {
        try {
            console.log(`Attempting to delete subscription with ID: ${id}`);
            
            await axios.delete(`${API_BASE_URL}/subscriptions/${id}`, {
                headers: getAuthHeader()
            });
            
            // Only delete from IndexedDB if the API call was successful
            await dbService.deleteSubscription(id);
            console.log(`Successfully deleted subscription: ${id}`);
            return id;
        } catch (error: any) {
            console.error('Delete subscription error:', error);
            
            // If offline, delete from IndexedDB only
            if (!navigator.onLine) {
                console.log('Offline mode: Deleting from IndexedDB only');
                await dbService.deleteSubscription(id);
                return id;
            }
            
            // If the subscription doesn't exist on the server but exists locally,
            // we can still delete it from IndexedDB
            if (error.response && (error.response.status === 404 || error.response.status === 400)) {
                console.log('Subscription not found on server or bad request, deleting from local DB anyway');
                try {
                    await dbService.deleteSubscription(id);
                    return id;
                } catch (dbError) {
                    console.error('Failed to delete from IndexedDB:', dbError);
                    throw error; // Rethrow the original error
                }
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