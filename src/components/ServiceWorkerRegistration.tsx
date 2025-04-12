import { useEffect } from 'react';
import { notificationService } from '../services/notification.service';

export const ServiceWorkerRegistration: React.FC = () => {
    useEffect(() => {
        const registerServiceWorker = async () => {
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.register('/service-worker.js');

                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    notificationService.showUpdateNotification();
                                }
                            });
                        }
                    });
                } catch (error) {
                    console.error('Service worker registration failed:', error);
                }
            }
        };

        registerServiceWorker();
    }, []);

    return null;
};