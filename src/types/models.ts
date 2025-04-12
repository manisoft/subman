export interface Subscription {
    id?: string | number;
    name: string;
    description?: string;
    cost: number;
    billingCycle: 'MONTHLY' | 'YEARLY' | 'QUARTERLY';
    startDate: Date;
    endDate?: Date;
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
    categoryId: number;
    userId: number;
    nextBillingDate: Date;
}

export interface Category {
    id?: number;
    name: string;
    description?: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    role: 'user' | 'admin';
    created_at: Date;
    updated_at: Date;
    last_sync?: Date;
    version?: string;
}

export interface PaymentHistory {
    id?: string | number;
    subscriptionId: string | number;
    amount: number;
    paymentDate: Date;
    status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
}