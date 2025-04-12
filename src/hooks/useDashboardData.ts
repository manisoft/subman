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
        
        if (currentUser && status === 'idle') {
          const userId = typeof currentUser.id === 'string' ? parseInt(currentUser.id, 10) : currentUser.id;
          await dispatch(fetchUserSubscriptions(userId) as any);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dispatch, status]);

  return {
    subscriptions,
    isLoading: isLoading || status === 'loading',
    error
  };
}; 