import { openDB, DBSchema } from 'idb';
import { Subscription, Category, User, PaymentHistory } from '../types/models';

interface SubManDB extends DBSchema {
    subscriptions: {
        key: number;
        value: Subscription;
        indexes: { 'by-user': number; 'by-category': number };
    };
    categories: {
        key: number;
        value: Category;
    };
    users: {
        key: number;
        value: User;
        indexes: { 'by-email': string };
    };
    paymentHistory: {
        key: number;
        value: PaymentHistory;
        indexes: { 'by-subscription': number };
    };
}

const DB_NAME = 'subman-db';
const DB_VERSION = 1;

export const initDB = async () => {
    const db = await openDB<SubManDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Create stores
            const subscriptionStore = db.createObjectStore('subscriptions', { keyPath: 'id', autoIncrement: true });
            const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
            const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
            const paymentStore = db.createObjectStore('paymentHistory', { keyPath: 'id', autoIncrement: true });

            // Create indexes
            subscriptionStore.createIndex('by-user', 'userId');
            subscriptionStore.createIndex('by-category', 'categoryId');
            userStore.createIndex('by-email', 'email', { unique: true });
            paymentStore.createIndex('by-subscription', 'subscriptionId');
        },
    });
    return db;
};

class DBService {
    private dbPromise = initDB();

    // Subscription methods
    async addSubscription(subscription: Omit<Subscription, 'id'>) {
        const db = await this.dbPromise;
        return db.add('subscriptions', subscription);
    }

    async getSubscription(id: number) {
        const db = await this.dbPromise;
        return db.get('subscriptions', id);
    }

    async updateSubscription(subscription: Subscription) {
        const db = await this.dbPromise;
        return db.put('subscriptions', subscription);
    }

    async deleteSubscription(id: number) {
        const db = await this.dbPromise;
        return db.delete('subscriptions', id);
    }

    async getUserSubscriptions(userId: number) {
        const db = await this.dbPromise;
        return db.getAllFromIndex('subscriptions', 'by-user', userId);
    }

    // Category methods
    async addCategory(category: Omit<Category, 'id'>) {
        const db = await this.dbPromise;
        return db.add('categories', category);
    }

    async getCategories() {
        const db = await this.dbPromise;
        return db.getAll('categories');
    }

    // User methods
    async addUser(user: Omit<User, 'id'>) {
        const db = await this.dbPromise;
        return db.add('users', user);
    }

    async getUserByEmail(email: string) {
        const db = await this.dbPromise;
        return db.getFromIndex('users', 'by-email', email);
    }

    // Payment history methods
    async addPayment(payment: Omit<PaymentHistory, 'id'>) {
        const db = await this.dbPromise;
        return db.add('paymentHistory', payment);
    }

    async getSubscriptionPayments(subscriptionId: number) {
        const db = await this.dbPromise;
        return db.getAllFromIndex('paymentHistory', 'by-subscription', subscriptionId);
    }
}

export const dbService = new DBService();