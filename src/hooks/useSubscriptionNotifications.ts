import { useEffect, useRef } from 'react';
import { Subscription } from '../types/models';
import { notificationService } from '../services/notification.service';
import { useSubscriptionBilling } from './useSubscriptionBilling';

export const useSubscriptionNotifications = (subscription: Subscription) => {
    const billing = useSubscriptionBilling(subscription);
    const notifiedRef = useRef<boolean>(false);

    useEffect(() => {
        if (
            !notifiedRef.current &&
            subscription.status === 'ACTIVE' &&
            billing.daysUntilNextBilling <= 7
        ) {
            notificationService.showPaymentReminder(
                subscription.name,
                billing.daysUntilNextBilling,
                subscription.cost
            );
            notifiedRef.current = true;
        }
    }, [subscription, billing.daysUntilNextBilling]);
};