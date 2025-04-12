import React, { useState } from 'react';
import {
    makeStyles,
    Table,
    TableHeader,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Button,
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    Badge,
    Spinner,
    Tooltip
} from '@fluentui/react-components';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Subscription } from '../types/models';
import { useAuthContext } from '../context/AuthContext';
import { AddSubscriptionForm } from './AddSubscriptionForm';
import { useSubscriptionBilling } from '../hooks/useSubscriptionBilling';
import { DashboardSummary } from './DashboardSummary';
import { authService } from '../services/auth.service';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
        padding: '20px'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    offline: {
        backgroundColor: '#FFF4CE',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '20px',
        color: '#5A4500'
    },
    billingInfo: {
        padding: '5px 0'
    },
    upcomingBilling: {
        color: 'red',
        fontWeight: 'bold'
    },
    tooltipContent: {
        padding: '10px'
    },
    errorContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '30px',
        textAlign: 'center'
    },
    errorActions: {
        display: 'flex',
        gap: '10px',
        marginTop: '15px'
    }
});

export const SubscriptionList: React.FC = () => {
    const styles = useStyles();
    const { isOnline } = useNetworkStatus();
    const { user } = useAuthContext();
    
    // Early return if no user
    if (!user) {
        return <div>Loading subscriptions...</div>;
    }
    
    // Convert user ID to number or generate hash for UUID format
    let userId: number;
    if (typeof user.id === 'string') {
        if (user.id.includes('-')) {
            // If UUID, generate a numeric hash
            userId = Math.abs(user.id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0));
        } else {
            // Try to parse as number
            userId = parseInt(user.id, 10) || Date.now();
        }
    } else {
        userId = user.id;
    }
    
    const { subscriptions, isLoading, error, remove } = useSubscriptions(userId);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const handleDelete = async (id: string) => {
        try {
            const success = await remove(id);
            if (success) {
                // Show success notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Subscription Deleted', {
                        body: 'The subscription was successfully deleted.',
                    });
                }
            } else {
                // Show error notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Delete Failed', {
                        body: 'Failed to delete the subscription.',
                    });
                }
            }
        } catch (error) {
            console.error('Error deleting subscription:', error);
            // Show error notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Error', {
                    body: 'Error deleting subscription.',
                });
            }
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const BillingCell: React.FC<{ subscription: Subscription }> = ({ subscription }) => {
        try {
            const billing = useSubscriptionBilling(subscription);
            const isUpcoming = billing.daysUntilNextBilling <= 7;

            return (
                <Tooltip
                    content={
                        <div className={styles.tooltipContent}>
                            <p>Next billing in: {billing.daysUntilNextBilling} days</p>
                            <p>Billing cycle: {billing.cycleLength} days</p>
                            <p>Yearly cost: {formatCurrency(billing.totalYearlyCost)}</p>
                        </div>
                    }
                    relationship="label"
                >
                    <div className={styles.billingInfo}>
                        <span className={isUpcoming ? styles.upcomingBilling : undefined}>
                            {new Date(billing.nextBillingDate).toLocaleDateString()}
                            {isUpcoming && ' (Soon)'}
                        </span>
                    </div>
                </Tooltip>
            );
        } catch (error) {
            console.error('Error rendering billing cell:', error);
            return <div>Billing data unavailable</div>;
        }
    };

    if (isLoading) {
        return <Spinner size="large" label="Loading subscriptions..." />;
    }

    if (error) {
        const isNetworkError = 
            error.includes('Network Error') || 
            error.includes('timeout') || 
            error.includes('ERR_NETWORK') ||
            error.includes('ERR_CONNECTION_TIMED_OUT');
            
        return (
            <div className={styles.errorContainer}>
                <div>
                    {isNetworkError ? (
                        <>
                            <h3>Network Connection Error</h3>
                            <p>The app cannot connect to the server. This could be due to:</p>
                            <ul style={{ textAlign: 'left' }}>
                                <li>Your internet connection is offline</li>
                                <li>The server is temporarily unavailable</li>
                                <li>A firewall is blocking the connection</li>
                            </ul>
                            <p>The app will run in offline mode using locally stored data.</p>
                        </>
                    ) : (
                        <>Error loading subscriptions: {error}</>
                    )}
                </div>
                <div className={styles.errorActions}>
                    {!isNetworkError && (
                        <Button 
                            appearance="primary" 
                            onClick={() => {
                                // Force logout and redirect to login page
                                authService.logout();
                                window.location.href = '/login';
                            }}
                        >
                            Re-authenticate
                        </Button>
                    )}
                    <Button 
                        appearance={isNetworkError ? "primary" : "secondary"}
                        onClick={() => window.location.reload()}
                    >
                        Retry Connection
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            {!isOnline && (
                <div className={styles.offline}>
                    You are currently offline. Changes will be synchronized when you reconnect.
                </div>
            )}

            <DashboardSummary subscriptions={subscriptions} />

            <div className={styles.header}>
                <h2>Your Subscriptions</h2>
                <Button
                    appearance="primary"
                    onClick={() => setIsAddDialogOpen(true)}
                >
                    Add Subscription
                </Button>
            </div>

            {/* Add Subscription Dialog */}
            <Dialog
                open={isAddDialogOpen}
                onOpenChange={(_event, data) => setIsAddDialogOpen(data.open)}
            >
                <DialogSurface>
                    <DialogBody>
                        <AddSubscriptionForm onClose={() => setIsAddDialogOpen(false)} />
                    </DialogBody>
                </DialogSurface>
            </Dialog>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell>Cost</TableHeaderCell>
                        <TableHeaderCell>Billing Cycle</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Next Billing</TableHeaderCell>
                        <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subscriptions.map((subscription: Subscription) => (
                        <TableRow key={subscription.id ?? 'temp'}>
                            <TableCell>{subscription.name || 'Unnamed'}</TableCell>
                            <TableCell>{formatCurrency(subscription.cost || 0)}</TableCell>
                            <TableCell>
                                {subscription.billingCycle && typeof subscription.billingCycle === 'string' 
                                    ? subscription.billingCycle.toLowerCase() 
                                    : 'unknown'}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    appearance={subscription.status === 'ACTIVE' ? 'filled' : 'ghost'}
                                    color={subscription.status === 'ACTIVE' ? 'success' : 'danger'}
                                >
                                    {subscription.status || 'UNKNOWN'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <BillingCell subscription={subscription} />
                            </TableCell>
                            <TableCell>
                                <Dialog>
                                    <DialogTrigger disableButtonEnhancement>
                                        <Button appearance="subtle">Delete</Button>
                                    </DialogTrigger>
                                    <DialogSurface>
                                        <DialogBody>
                                            <DialogTitle>Confirm Delete</DialogTitle>
                                            <p>Are you sure you want to delete this subscription?</p>
                                            <DialogActions>
                                                <Button appearance="secondary">Cancel</Button>
                                                <Button
                                                    appearance="primary"
                                                    onClick={() => subscription.id && handleDelete(subscription.id)}
                                                    disabled={!subscription.id}
                                                >
                                                    Delete
                                                </Button>
                                            </DialogActions>
                                        </DialogBody>
                                    </DialogSurface>
                                </Dialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};