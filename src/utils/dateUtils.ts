/**
 * Calculates the next billing date based on the given date and billing cycle.
 * If the given date is in the past, it will advance to the next appropriate date
 * based on the billing cycle.
 * 
 * @param billingDate The current billing date (could be in the past)
 * @param billingCycle The billing cycle (MONTHLY, YEARLY, QUARTERLY)
 * @returns A Date object representing the next appropriate billing date
 */
export function getNextBillingDate(billingDate: Date | string, billingCycle: string): Date {
    // Convert to Date object if string is provided
    const baseDate = typeof billingDate === 'string' ? new Date(billingDate) : new Date(billingDate);
    const currentDate = new Date();
    
    // If the billing date is already in the future, return it as is
    if (baseDate > currentDate) {
        return baseDate;
    }
    
    // Create a new date object to avoid modifying the original
    const nextDate = new Date(baseDate);
    const lowerCaseCycle = billingCycle.toLowerCase();
    
    // Keep incrementing the date according to the billing cycle until it's in the future
    while (nextDate <= currentDate) {
        if (lowerCaseCycle === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (lowerCaseCycle === 'yearly') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else if (lowerCaseCycle === 'quarterly') {
            nextDate.setMonth(nextDate.getMonth() + 3);
        } else {
            // Default to monthly if the billing cycle is not recognized
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
    }
    
    return nextDate;
} 