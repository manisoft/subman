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
        // Ensure nextBillingDate is valid, default to today if not
        let nextBilling: Date;
        try {
            nextBilling = subscription.nextBillingDate ? new Date(subscription.nextBillingDate) : new Date();
            // Check if the date is valid
            if (isNaN(nextBilling.getTime())) {
                nextBilling = new Date();
            }
        } catch (error) {
            nextBilling = new Date();
        }
        
        const today = new Date();
        const daysUntil = Math.ceil((nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Ensure billingCycle is valid
        const billingCycle = typeof subscription.billingCycle === 'string' 
            ? subscription.billingCycle
            : 'MONTHLY';
            
        let cycleLength: number;
        let billingsPerYear: number;

        switch (billingCycle) {
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
            totalYearlyCost: (subscription.cost || 0) * billingsPerYear,
            cycleLength,
        };
    }, [subscription]);
};