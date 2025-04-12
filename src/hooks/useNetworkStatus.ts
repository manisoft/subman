import { useState, useEffect } from 'react';
import { notificationService } from '../services/notification.service';

export const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            if (wasOffline) {
                notificationService.showSyncNotification(true);
            }
            setWasOffline(false);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setWasOffline(true);
            notificationService.showSyncNotification(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Request notification permission on mount
        notificationService.requestPermission();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [wasOffline]);

    return { isOnline, wasOffline };
};