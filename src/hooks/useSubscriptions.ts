import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import {
    fetchUserSubscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription
} from '../store/slices/subscriptionSlice';
import { Subscription } from '../types/models';
import { syncService } from '../services/sync.service';

export const useSubscriptions = (userId: string | number) => {
    const dispatch = useDispatch<AppDispatch>();
    const { items, status, error } = useSelector((state: RootState) => state.subscriptions);

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchUserSubscriptions(userId));
        }
    }, [status, dispatch, userId]);

    const add = async (subscription: Omit<Subscription, 'id'>) => {
        try {
            await dispatch(addSubscription(subscription)).unwrap();
            await syncService.addPendingOperation('CREATE', 'subscription', subscription as Subscription);
            return true;
        } catch (error) {
            console.error('Failed to add subscription:', error);
            return false;
        }
    };

    const update = async (subscription: Subscription) => {
        try {
            await dispatch(updateSubscription(subscription)).unwrap();
            await syncService.addPendingOperation('UPDATE', 'subscription', subscription);
            return true;
        } catch (error) {
            console.error('Failed to update subscription:', error);
            return false;
        }
    };

    const remove = async (id: string) => {
        try {
            await dispatch(deleteSubscription(id)).unwrap();
            await syncService.addPendingOperation('DELETE', 'subscription', null, id);
            return true;
        } catch (error) {
            console.error('Failed to delete subscription:', error);
            return false;
        }
    };

    return {
        subscriptions: items,
        isLoading: status === 'loading',
        error,
        isOnline: syncService.getIsOnline(),
        add,
        update,
        remove
    };
};