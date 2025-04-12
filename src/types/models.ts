export interface Subscription {
    id: string;
    name: string;
    description: string;
    cost: number;
    billingCycle: 'MONTHLY' | 'YEARLY' | 'QUARTERLY';
    startDate: string | Date;
    endDate?: string | Date;
    status: 'ACTIVE' | 'CANCELLED' | 'INACTIVE';
    categoryId: number | string;
    userId: number | string;
    nextBillingDate: string | Date;
    // Additional fields from API
    color?: string;
    logo?: string | null;
    website?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    version?: string | null;
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
    id?: string;
    subscriptionId: string;
    amount: number;
    paymentDate: Date;
    status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
}