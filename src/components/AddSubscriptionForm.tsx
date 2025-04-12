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
} from '@fluentui/react-components';
import { DatePicker } from '@fluentui/react-datepicker-compat';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useAuthContext } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Subscription } from '../types/models';

const useStyles = makeStyles({
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '16px',
    },
    error: {
        color: '#d13438',
        marginBottom: '16px',
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
        <Card>
            <CardHeader header={<h2>Add New Subscription</h2>} />
            <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.error}>{error}</div>}

                <Field label="Subscription Name" required>
                    <Input
                        value={formData.name}
                        onChange={(_, data) => handleInputChange('name', data.value)}
                        required
                        disabled={isLoading}
                    />
                </Field>

                <Field label="Description">
                    <Input
                        value={formData.description}
                        onChange={(_, data) => handleInputChange('description', data.value)}
                        disabled={isLoading}
                    />
                </Field>

                <Field label="Cost" required>
                    <Input
                        type="number"
                        value={formData.cost}
                        onChange={(_, data) => handleInputChange('cost', data.value)}
                        min="0"
                        step="0.01"
                        required
                        disabled={isLoading}
                    />
                </Field>

                <Field label="Billing Cycle" required>
                    <Select
                        value={formData.billingCycle}
                        onChange={(_, data) => handleInputChange('billingCycle', data.value as FormData['billingCycle'])}
                        disabled={isLoading}
                    >
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                        <option value="QUARTERLY">Quarterly</option>
                    </Select>
                </Field>

                <Field label="Start Date" required>
                    <DatePicker
                        value={formData.startDate}
                        onSelectDate={(date) => date && handleInputChange('startDate', date)}
                        disabled={isLoading}
                    />
                </Field>

                <div className={styles.actions}>
                    <Button
                        appearance="subtle"
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