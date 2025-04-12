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
          // Try to parse the user ID correctly - handle both string and number formats
          let userId: number;
          if (typeof currentUser.id === 'string') {
            // If the ID is a UUID format, generate a numeric hash as fallback
            if (currentUser.id.includes('-')) {
              userId = Math.abs(currentUser.id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
              }, 0));
            } else {
              userId = parseInt(currentUser.id, 10);
            }
          } else {
            userId = currentUser.id;
          }
          
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