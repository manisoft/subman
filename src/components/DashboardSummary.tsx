import React, { useMemo } from 'react';
import {
    makeStyles,
    Card,
    Text,
    Badge,
} from '@fluentui/react-components';
import { Subscription } from '../types/models';
import { useSubscriptionBilling } from '../hooks/useSubscriptionBilling';
import { useSubscriptionNotifications } from '../hooks/useSubscriptionNotifications';

const useStyles = makeStyles({
    container: {
        marginBottom: '24px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginTop: '16px',
    },
    card: {
        padding: '16px',
    },
    stat: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    value: {
        fontSize: '24px',
        fontWeight: 'bold',
    },
    label: {
        fontSize: '14px',
        color: '#616161',
    },
    upcomingList: {
        marginTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    upcomingItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
    },
    cardMarginTop: {
        marginTop: '16px',
    },
    paymentInfo: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
});

interface DashboardSummaryProps {
    subscriptions: Subscription[];
}

const UpcomingPaymentItem: React.FC<{ subscription: Subscription }> = ({ subscription }) => {
    const styles = useStyles();
    const billing = useSubscriptionBilling(subscription);

    // Add notification support
    useSubscriptionNotifications(subscription);

    return (
        <div key={subscription.id} className={styles.upcomingItem}>
            <div>
                <Text weight="medium">{subscription.name}</Text>
                <Text size={300}>Due in {billing.daysUntilNextBilling} days</Text>
            </div>
            <div className={styles.paymentInfo}>
                <Text>{formatCurrency(subscription.cost)}</Text>
                <Badge color={billing.daysUntilNextBilling <= 2 ? 'danger' : 'warning'}>
                    {billing.daysUntilNextBilling <= 2 ? 'Due Soon' : 'Upcoming'}
                </Badge>
            </div>
        </div>
    );
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ subscriptions }) => {
    const styles = useStyles();

    // Calculate statistics
    const { totalMonthlySpending, totalYearlySpending, activeSubscriptions, upcomingSubscriptions } = useMemo(() => {
        const active = subscriptions.filter(sub => sub.status === 'ACTIVE');
        const monthly = active.reduce((total, sub) => {
            switch (sub.billingCycle) {
                case 'MONTHLY':
                    return total + sub.cost;
                case 'YEARLY':
                    return total + (sub.cost / 12);
                case 'QUARTERLY':
                    return total + (sub.cost / 3);
                default:
                    return total;
            }
        }, 0);

        const yearly = active.reduce((total, sub) => {
            switch (sub.billingCycle) {
                case 'MONTHLY':
                    return total + (sub.cost * 12);
                case 'YEARLY':
                    return total + sub.cost;
                case 'QUARTERLY':
                    return total + (sub.cost * 4);
                default:
                    return total;
            }
        }, 0);

        // Pre-filter subscriptions that might have upcoming payments
        const upcoming = active.filter(sub => {
            const nextBilling = new Date(sub.nextBillingDate);
            const daysUntil = Math.ceil((nextBilling.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysUntil <= 7;
        });

        return {
            totalMonthlySpending: monthly,
            totalYearlySpending: yearly,
            activeSubscriptions: active,
            upcomingSubscriptions: upcoming,
        };
    }, [subscriptions]);

    return (
        <div className={styles.container}>
            <div className={styles.grid}>
                <Card className={styles.card}>
                    <div className={styles.stat}>
                        <Text className={styles.value}>{activeSubscriptions.length}</Text>
                        <Text className={styles.label}>Active Subscriptions</Text>
                    </div>
                </Card>
                <Card className={styles.card}>
                    <div className={styles.stat}>
                        <Text className={styles.value}>{formatCurrency(totalMonthlySpending)}</Text>
                        <Text className={styles.label}>Monthly Spending</Text>
                    </div>
                </Card>
                <Card className={styles.card}>
                    <div className={styles.stat}>
                        <Text className={styles.value}>{formatCurrency(totalYearlySpending)}</Text>
                        <Text className={styles.label}>Yearly Spending</Text>
                    </div>
                </Card>
            </div>

            {upcomingSubscriptions.length > 0 && (
                <Card className={`${styles.card} ${styles.cardMarginTop}`}>
                    <Text weight="semibold">Upcoming Payments (Next 7 Days)</Text>
                    <div className={styles.upcomingList}>
                        {upcomingSubscriptions.map(subscription => (
                            <UpcomingPaymentItem
                                key={subscription.id}
                                subscription={subscription}
                            />
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};