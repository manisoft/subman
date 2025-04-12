import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { fetchUserSubscriptions } from '../store/slices/subscriptionSlice';
import { authService } from '../services/auth.service';

export const useDashboardData = () => {
  const dispatch = useDispatch();
  const { items: subscriptions, status, error } = useSelector((state: RootState) => state.subscriptions);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const currentUser = authService.getCurrentUser();
        
        console.log('Current user:', currentUser);
        console.log('Subscription status:', status);
        console.log('Current subscriptions:', subscriptions);
        
        if (currentUser && (status === 'idle' || subscriptions.length === 0)) {
          // Use the exact user ID from the current user without any conversion
          const userId = currentUser.id;
          
          console.log('Fetching subscriptions for user ID:', userId);
          await dispatch(fetchUserSubscriptions(userId) as any);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dispatch, status, subscriptions.length]);

  return {
    subscriptions,
    isLoading: isLoading || status === 'loading',
    error
  };
}; 