import React, { useState } from 'react';
import {
    makeStyles,
    Card,
    CardHeader,
    Input,
    Button,
    Spinner,
    Select,
    Field,
    tokens,
} from '@fluentui/react-components';
import { DatePicker } from '@fluentui/react-datepicker-compat';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useAuthContext } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Subscription } from '../types/models';

const useStyles = makeStyles({
    card: {
        width: '100%',
        maxWidth: '100%',
        margin: '0',
        padding: '0',
        boxShadow: 'none',
        borderRadius: tokens.borderRadiusMedium,
    },
    cardHeader: {
        paddingBottom: '8px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        width: '100%',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '24px',
        width: '100%',
    },
    error: {
        color: tokens.colorPaletteRedForeground1,
        marginBottom: '16px',
        padding: '8px',
        borderRadius: tokens.borderRadiusSmall,
        backgroundColor: tokens.colorPaletteRedBackground1,
    },
    input: {
        width: '100%',
    },
});

interface AddSubscriptionFormProps {
    onClose: () => void;
}

interface FormData {
    name: string;
    description: string;
    cost: string;
    billingCycle: 'MONTHLY' | 'YEARLY' | 'QUARTERLY';
    startDate: Date;
    categoryId: number;
}

export const AddSubscriptionForm: React.FC<AddSubscriptionFormProps> = ({ onClose }) => {
    const styles = useStyles();
    const { user } = useAuthContext();
    const { isOnline } = useNetworkStatus();
    const { add } = useSubscriptions(user ? user.id : '0');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        cost: '0',
        billingCycle: 'MONTHLY',
        startDate: new Date(),
        categoryId: 1,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }

            const newSubscription: Omit<Subscription, 'id'> = {
                name: formData.name,
                description: formData.description,
                cost: parseFloat(formData.cost),
                billingCycle: formData.billingCycle,
                startDate: formData.startDate,
                categoryId: formData.categoryId,
                userId: user.id,
                status: 'ACTIVE',
                nextBillingDate: formData.startDate,
            };

            const success = await add(newSubscription);
            if (success) {
                onClose();
            } else {
                setError('Failed to add subscription');
            }
        } catch {
            setError('An error occurred while adding the subscription');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof FormData, value: string | number | Date) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <Card className={styles.card}>
            <CardHeader 
                header={<h2>Add New Subscription</h2>} 
                className={styles.cardHeader}
            />
            <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.error}>{error}</div>}

                <Field label="Subscription Name" required className={styles.field}>
                    <Input
                        className={styles.input}
                        value={formData.name}
                        onChange={(_, data) => handleInputChange('name', data.value)}
                        required
                        disabled={isLoading}
                        appearance="outline"
                        placeholder="Enter subscription name"
                    />
                </Field>

                <Field label="Description" className={styles.field}>
                    <Input
                        className={styles.input}
                        value={formData.description}
                        onChange={(_, data) => handleInputChange('description', data.value)}
                        disabled={isLoading}
                        appearance="outline"
                        placeholder="Enter description (optional)"
                    />
                </Field>

                <Field label="Cost" required className={styles.field}>
                    <Input
                        className={styles.input}
                        type="number"
                        value={formData.cost}
                        onChange={(_, data) => handleInputChange('cost', data.value)}
                        min="0"
                        step="0.01"
                        required
                        disabled={isLoading}
                        appearance="outline"
                        placeholder="0.00"
                    />
                </Field>

                <Field label="Billing Cycle" required className={styles.field}>
                    <Select
                        className={styles.input}
                        value={formData.billingCycle}
                        onChange={(_, data) => handleInputChange('billingCycle', data.value as FormData['billingCycle'])}
                        disabled={isLoading}
                        appearance="outline"
                    >
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                        <option value="QUARTERLY">Quarterly</option>
                    </Select>
                </Field>

                <Field label="Start Date" required className={styles.field}>
                    <DatePicker
                        className={styles.input}
                        value={formData.startDate}
                        onSelectDate={(date) => date && handleInputChange('startDate', date)}
                        disabled={isLoading}
                        placeholder="Select a date"
                    />
                </Field>

                <div className={styles.actions}>
                    <Button
                        appearance="secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        appearance="primary"
                        disabled={isLoading || !isOnline}
                    >
                        {isLoading ? <Spinner size="tiny" /> : 'Add Subscription'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};