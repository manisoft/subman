import { openDB, DBSchema } from 'idb';
import { Subscription, Category, User, PaymentHistory } from '../types/models';

interface SubManDB extends DBSchema {
    subscriptions: {
        key: string | number;  // Updated to handle both string and number IDs
        value: Subscription;
        indexes: { 'by-user': number; 'by-category': number };
    };
    categories: {
        key: number;
        value: Category;
    };
    users: {
        key: string;  // Changed from number to string to match User interface
        value: User;
        indexes: { 'by-email': string };
    };
    paymentHistory: {
        key: number;
        value: PaymentHistory;
        indexes: { 'by-subscription': string | number };  // Updated to match subscription key
    };
} 

const DB_NAME = 'subman-db';
const DB_VERSION = 1;

export const initDB = async () => {
    const db = await openDB<SubManDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Create stores
            const subscriptionStore = db.createObjectStore('subscriptions', {
                keyPath: 'id',
                autoIncrement: true
            });
            db.createObjectStore('categories', {
                keyPath: 'id',
                autoIncrement: true
            });
            const userStore = db.createObjectStore('users', {
                keyPath: 'id'  // Removed autoIncrement since we use UUID
            });
            const paymentStore = db.createObjectStore('paymentHistory', {
                keyPath: 'id',
                autoIncrement: true
            });

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
        const subWithId = {
            ...subscription,
            id: Date.now().toString() // Add a default ID if none is provided
        };
        return db.add('subscriptions', subWithId);
    }

    async getSubscription(id: string) {
        const db = await this.dbPromise;
        return db.get('subscriptions', id);
    }

    async updateSubscription(subscription: Subscription) {
        const db = await this.dbPromise;
        return db.put('subscriptions', subscription);
    }

    async deleteSubscription(id: string) {
        const db = await this.dbPromise;
        console.log(`Deleting subscription from IndexedDB with ID:`, id);
        
        try {
            return await db.delete('subscriptions', id);
        } catch (error) {
            console.error(`Failed to delete subscription with ID ${id}:`, error);
            throw error;
        }
    }

    async getUserSubscriptions(userId: number | string) {
        const db = await this.dbPromise;
        // Ensure userId is consistent with what's stored in the database
        const dbUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        return db.getAllFromIndex('subscriptions', 'by-user', dbUserId);
    }

    async addOrUpdateSubscription(subscription: Subscription) {
        const db = await this.dbPromise;
        try {
            return await db.add('subscriptions', subscription);
        } catch (error: any) {
            if (error.name === 'ConstraintError') {
                console.log('Subscription already exists in IndexedDB, updating instead...');
                return await this.updateSubscription(subscription);
            }
            throw error;
        }
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
    async addUser(user: User) {
        const db = await this.dbPromise;
        try {
            // Check if a user with this ID already exists
            const existingUserById = await db.get('users', user.id);
            if (existingUserById) {
                console.log('User with this ID already exists, updating instead...');
                return await this.updateUser(user);
            }
            
            // Check if a user with this email already exists
            const existingUserByEmail = await this.getUserByEmail(user.email);
            if (existingUserByEmail) {
                console.log('User with this email already exists, updating instead...');
                return await this.updateUser({
                    ...user,
                    id: existingUserByEmail.id
                });
            }
            
            return await db.add('users', user);
        } catch (error: any) {
            if (error.name === 'ConstraintError') {
                console.log('User already exists in IndexedDB (constraint error), updating instead...');
                return await this.updateUser(user);
            }
            throw error;
        }
    }

    async updateUser(user: User) {
        const db = await this.dbPromise;
        return db.put('users', user);
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

    async getSubscriptionPayments(subscriptionId: string) {
        const db = await this.dbPromise;
        return db.getAllFromIndex('paymentHistory', 'by-subscription', subscriptionId);
    }
}

export const dbService = new DBService();