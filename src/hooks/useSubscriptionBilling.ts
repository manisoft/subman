import { useMemo } from 'react';
import { Subscription } from '../types/models';

interface BillingInfo {
    nextBillingDate: Date;
    daysUntilNextBilling: number;
    totalYearlyCost: number;
    cycleLength: number;
}

export const useSubscriptionBilling = (subscription: Subscription): BillingInfo => {
    return useMemo(() => {
        const today = new Date();
        const nextBilling = new Date(subscription.nextBillingDate);
        const daysUntil = Math.ceil((nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let cycleLength: number;
        let billingsPerYear: number;

        switch (subscription.billingCycle) {
            case 'MONTHLY':
                cycleLength = 30;
                billingsPerYear = 12;
                break;
            case 'QUARTERLY':
                cycleLength = 90;
                billingsPerYear = 4;
                break;
            case 'YEARLY':
                cycleLength = 365;
                billingsPerYear = 1;
                break;
            default:
                cycleLength = 30;
                billingsPerYear = 12;
        }

        return {
            nextBillingDate: nextBilling,
            daysUntilNextBilling: daysUntil,
            totalYearlyCost: subscription.cost * billingsPerYear,
            cycleLength,
        };
    }, [subscription]);
};