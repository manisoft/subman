import { configureStore } from '@reduxjs/toolkit';
import { subscriptionReducer } from './slices/subscriptionSlice';

export const store = configureStore({
    reducer: {
        subscriptions: subscriptionReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;