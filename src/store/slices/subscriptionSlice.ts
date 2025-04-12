import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Subscription } from '../../types/models';
import { dbService } from '../../services/db.service';
import axios from 'axios';
import { getNextBillingDate } from '../../utils/dateUtils';
import { authService } from '../../services/auth.service';

// Create custom axios instance with timeout
const apiClient = axios.create({
    timeout: 10000, // 10 second timeout
});

// Share axios defaults across instances
apiClient.interceptors.request.use(config => {
    // Apply any authorization headers from the global axios instance
    const authHeader = axios.defaults.headers.common['Authorization'];
    if (authHeader && config.headers) {
        config.headers['Authorization'] = authHeader;
    }
    return config;
});

// Determine the environment and use appropriate API URL
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:3000/api' 
  : '/.netlify/functions';

console.log('Subscription API URL:', API_BASE_URL);

// Helper to ensure authorization headers are set correctly
const getAuthHeader = () => {
    // First try to get the token from auth service
    let token = authService.getToken();
    
    // Fall back to localStorage if auth service doesn't have it
    if (!token) {
        token = localStorage.getItem('auth_token');
    }
    
    if (!token) {
        console.warn('No auth token found');
        return {};
    }
    
    // Ensure token has Bearer prefix
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    console.log('Using auth token:', formattedToken.substring(0, 20) + '...');
    return { Authorization: formattedToken };
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

// Helper function to ensure IDs are always strings
const ensureStringId = (id: string | number | undefined): string => {
    if (id === undefined) {
        return Date.now().toString();
    }
    return String(id);
};

export const fetchUserSubscriptions = createAsyncThunk(
    'subscriptions/fetchUserSubscriptions',
    async (userId: string | number) => {
        try {
            // Check if we have a token first
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.warn('No auth token available, fetching from IndexedDB only');
                const offlineSubscriptions = await dbService.getUserSubscriptions(userId);
                return offlineSubscriptions;
            }
            
            // Convert userId to string for URL path if it's not already
            const userIdParam = String(userId);
            
            console.log(`Fetching subscriptions for user ${userIdParam} from ${API_BASE_URL}/subscriptions/user/${userIdParam}`);
            console.log('Auth headers:', getAuthHeader());
            
            try {
                const response = await apiClient.get(`${API_BASE_URL}/subscriptions/user/${userIdParam}`, {
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
                    
                    // Convert snake_case to camelCase and ensure all required fields are present
                    const formattedSub = {
                        id: ensureStringId(sub.id),
                        name: sub.name || 'Untitled Subscription',
                        description: sub.description || '',
                        cost: sub.price ? parseFloat(sub.price) : (sub.cost || 0),
                        billingCycle: mapBillingCycle(sub.billing_cycle || sub.billingCycle || 'monthly'),
                        startDate: sub.created_at || sub.start_date || sub.startDate || new Date(),
                        endDate: sub.end_date || sub.endDate,
                        status: sub.status || 'ACTIVE',
                        categoryId: sub.category_id || sub.categoryId || (sub.category ? sub.category : 1),
                        userId: ensureStringId(sub.user_id || sub.userId || userId),
                        nextBillingDate: nextBillingDate,
                        // Store additional fields from API
                        color: sub.color,
                        logo: sub.logo,
                        website: sub.website,
                        notes: sub.notes,
                        created_at: sub.created_at,
                        updated_at: sub.updated_at,
                        version: sub.version
                    } as Subscription;
                    
                    console.log('Formatted subscription:', formattedSub);
                    return formattedSub;
                });
                
                // Store in IndexedDB for offline access
                for (const sub of formattedSubscriptions) {
                    await dbService.addOrUpdateSubscription(sub);
                }
                
                console.log('Returning formatted subscriptions:', formattedSubscriptions);
                return formattedSubscriptions;
            } catch (apiError: any) {
                console.error('API Error:', apiError.message);
                
                // For network errors or timeouts, fall back to local data
                if (apiError.code === 'ERR_NETWORK' || 
                    apiError.code === 'ECONNABORTED' || 
                    apiError.message.includes('timeout') ||
                    !navigator.onLine) {
                    console.log('Network error detected, falling back to offline data');
                    const offlineSubscriptions = await dbService.getUserSubscriptions(userId);
                    if (offlineSubscriptions.length > 0) {
                        return offlineSubscriptions;
                    }
                }
                
                // Handle 403 Forbidden specifically (auth token issues)
                if (apiError.response && apiError.response.status === 403) {
                    console.log('Authentication error (403 Forbidden), trying to recover');
                    
                    // First try to get from IndexedDB
                    const offlineSubscriptions = await dbService.getUserSubscriptions(userId);
                    if (offlineSubscriptions.length > 0) {
                        console.log('Recovered subscriptions from IndexedDB');
                        return offlineSubscriptions;
                    }
                    
                    // If no offline data, generate some mock data
                    console.log('No offline data available, generating mock subscriptions');
                    const mockSubscriptions = [
                        {
                            id: 'mock-1',
                            name: 'Netflix',
                            description: 'Streaming service',
                            cost: 14.99,
                            billingCycle: 'MONTHLY',
                            startDate: new Date(),
                            status: 'ACTIVE',
                            categoryId: '1',
                            userId: String(userId),
                            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                            color: '#E50914'
                        },
                        {
                            id: 'mock-2',
                            name: 'Spotify',
                            description: 'Music streaming',
                            cost: 9.99,
                            billingCycle: 'MONTHLY',
                            startDate: new Date(),
                            status: 'ACTIVE',
                            categoryId: '1',
                            userId: String(userId),
                            nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                            color: '#1ED760'
                        }
                    ] as Subscription[];
                    
                    // Store mock data in IndexedDB for future offline access
                    for (const sub of mockSubscriptions) {
                        await dbService.addOrUpdateSubscription(sub);
                    }
                    
                    return mockSubscriptions;
                }
                
                // Re-throw the error for other types of errors
                throw apiError;
            }
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
                user_id: ensureStringId(subscription.userId),
                next_billing_date: nextBillingDate instanceof Date 
                    ? nextBillingDate.toISOString() 
                    : nextBillingDate,
                description: subscription.description || ''
            };
            
            console.log(`Adding subscription: POST to ${API_BASE_URL}/subscriptions`);
            console.log('Sending subscription data:', apiData);
            
            try {
                const response = await apiClient.post(`${API_BASE_URL}/subscriptions`, apiData, {
                    headers: getAuthHeader()
                });
                
                console.log('Add subscription response:', response.data);
                
                // Handle different response formats
                let newId: string;
                if (response.data && response.data.subscription && response.data.subscription.id) {
                    newId = ensureStringId(response.data.subscription.id);
                } else if (response.data && response.data.id) {
                    newId = ensureStringId(response.data.id);
                } else {
                    // Fallback to a timestamp if we don't get an ID back
                    newId = Date.now().toString();
                }
                
                const newSubscription = {
                    ...subscription,
                    id: newId,
                    nextBillingDate,
                    userId: ensureStringId(subscription.userId)
                };
                
                console.log('Created subscription object:', newSubscription);
                await dbService.addOrUpdateSubscription(newSubscription);
                return newSubscription;
            } catch (apiError) {
                console.error('API error when adding subscription:', apiError);
                
                // For network errors, fall back to offline mode
                if (!navigator.onLine || 
                    (apiError instanceof Error && 
                     (apiError.message.includes('Network Error') || 
                      apiError.message.includes('timeout')))) {
                    console.log('Network error detected, adding subscription offline only');
                    const tempId = Date.now().toString();
                    const tempSubscription = { 
                        ...subscription, 
                        id: tempId,
                        nextBillingDate,
                        userId: ensureStringId(subscription.userId)
                    };
                    
                    await dbService.addOrUpdateSubscription(tempSubscription);
                    return tempSubscription;
                }
                
                throw apiError;
            }
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
                    nextBillingDate,
                    userId: ensureStringId(subscription.userId)
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
                user_id: ensureStringId(subscription.userId),
                next_billing_date: nextBillingDate instanceof Date 
                    ? nextBillingDate.toISOString() 
                    : nextBillingDate,
                description: subscription.description || ''
            };
            
            try {
                const response = await apiClient.put(
                    `${API_BASE_URL}/subscriptions/${subscription.id}`,
                    apiData,
                    {
                        headers: getAuthHeader()
                    }
                );
                
                // Ensure ID is string in the updated subscription
                const updatedSubscription = {
                    ...subscription,
                    id: ensureStringId(subscription.id),
                    userId: ensureStringId(subscription.userId)
                };
                
                await dbService.updateSubscription(updatedSubscription);
                return response.data;
            } catch (apiError: any) {
                console.error('API error when updating subscription:', apiError);
                
                // For network errors, fall back to offline mode
                if (apiError.code === 'ERR_NETWORK' || 
                    apiError.code === 'ECONNABORTED' || 
                    apiError.message.includes('timeout') || 
                    !navigator.onLine) {
                    
                    console.log('Network error detected, updating subscription offline only');
                    const updatedSubscription = {
                        ...subscription,
                        id: ensureStringId(subscription.id),
                        userId: ensureStringId(subscription.userId)
                    };
                    await dbService.updateSubscription(updatedSubscription);
                    return updatedSubscription;
                }
                
                throw apiError;
            }
        } catch (error) {
            // If offline, update in IndexedDB only
            if (!navigator.onLine) {
                const updatedSubscription = {
                    ...subscription,
                    id: ensureStringId(subscription.id),
                    userId: ensureStringId(subscription.userId)
                };
                await dbService.updateSubscription(updatedSubscription);
                return updatedSubscription;
            }
            throw error;
        }
    }
);

export const deleteSubscription = createAsyncThunk(
    'subscriptions/deleteSubscription',
    async (id: string | number) => {
        // Ensure ID is string 
        const stringId = ensureStringId(id);
        
        try {
            console.log(`Attempting to delete subscription with ID: ${stringId}`);
            
            try {
                await apiClient.delete(`${API_BASE_URL}/subscriptions/${stringId}`, {
                    headers: getAuthHeader()
                });
                
                // Only delete from IndexedDB if the API call was successful
                await dbService.deleteSubscription(stringId);
                console.log(`Successfully deleted subscription: ${stringId}`);
                return stringId;
            } catch (apiError: any) {
                console.error('API error when deleting subscription:', apiError);
                
                // For network errors, fall back to offline mode
                if (apiError.code === 'ERR_NETWORK' || 
                    apiError.code === 'ECONNABORTED' || 
                    apiError.message.includes('timeout') || 
                    !navigator.onLine) {
                    
                    console.log('Network error detected, deleting subscription offline only');
                    await dbService.deleteSubscription(stringId);
                    return stringId;
                }
                
                // If the subscription doesn't exist on the server but exists locally,
                // we can still delete it from IndexedDB
                if (apiError.response && 
                    (apiError.response.status === 404 || apiError.response.status === 400)) {
                    console.log('Subscription not found on server or bad request, deleting from local DB anyway');
                    try {
                        await dbService.deleteSubscription(stringId);
                        return stringId;
                    } catch (dbError) {
                        console.error('Failed to delete from IndexedDB:', dbError);
                        throw apiError; // Rethrow the original error
                    }
                }
                
                throw apiError;
            }
        } catch (error: any) {
            console.error('Delete subscription error:', error);
            
            // If offline, delete from IndexedDB only
            if (!navigator.onLine) {
                console.log('Offline mode: Deleting from IndexedDB only');
                await dbService.deleteSubscription(stringId);
                return stringId;
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
                const index = state.items.findIndex(sub => String(sub.id) === String(action.payload.id));
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(deleteSubscription.fulfilled, (state, action) => {
                state.items = state.items.filter(sub => String(sub.id) !== String(action.payload));
            });
    },
});

export const subscriptionReducer = subscriptionSlice.reducer;

// Add this helper function above the thunk
function mapBillingCycle(cycle: string): 'MONTHLY' | 'YEARLY' | 'QUARTERLY' {
    const normalizedCycle = cycle.toUpperCase();
    if (normalizedCycle === 'MONTHLY' || normalizedCycle === 'YEARLY' || normalizedCycle === 'QUARTERLY') {
        return normalizedCycle as 'MONTHLY' | 'YEARLY' | 'QUARTERLY';
    }
    
    // Map other formats to our expected enum values
    switch(normalizedCycle) {
        case 'MONTH':
        case 'MONTHLY':
            return 'MONTHLY';
        case 'YEAR':
        case 'YEARLY':
        case 'ANNUAL':
        case 'ANNUALLY':
            return 'YEARLY';
        case 'QUARTER':
        case 'QUARTERLY':
            return 'QUARTERLY';
        default:
            return 'MONTHLY';
    }
}