export class NotificationService {
    private static instance: NotificationService;
    private permissionGranted: boolean = false;

    private constructor() {
        this.checkPermission();
    }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    private async checkPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }

        if (Notification.permission === 'granted') {
            this.permissionGranted = true;
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.permissionGranted = permission === 'granted';
        }
    }

    async requestPermission(): Promise<boolean> {
        await this.checkPermission();
        return this.permissionGranted;
    }

    showPaymentReminder(subscriptionName: string, daysUntil: number, amount: number) {
        if (!this.permissionGranted) return;

        const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);

        new Notification('Upcoming Payment Reminder', {
            body: `${subscriptionName} payment of ${formattedAmount} is due in ${daysUntil} days`,
            icon: '/favicon.ico',
            tag: `payment-${subscriptionName}`,
            requireInteraction: true
        });
    }

    showSyncNotification(wasOffline: boolean) {
        if (!this.permissionGranted) return;

        if (wasOffline) {
            new Notification('Back Online', {
                body: 'Your connection has been restored. Syncing changes...',
                icon: '/favicon.ico',
                tag: 'sync'
            });
        } else {
            new Notification('Offline Mode', {
                body: 'You are now offline. Changes will be saved locally.',
                icon: '/favicon.ico',
                tag: 'sync'
            });
        }
    }

    showUpdateNotification() {
        if (!this.permissionGranted) return;

        new Notification('App Update Available', {
            body: 'A new version of SubMan is available. Click to update.',
            icon: '/favicon.ico',
            tag: 'update',
            requireInteraction: true
        });
    }
}

export const notificationService = NotificationService.getInstance();