import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    makeStyles,
    Card,
    CardHeader,
    Input,
    Button,
    Label,
    Spinner,
} from '@fluentui/react-components';
import { useAuthContext } from '../context/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
        padding: '20px',
    },
    card: {
        width: '100%',
        maxWidth: '400px',
        padding: '20px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    error: {
        color: '#d13438',
        marginBottom: '16px',
    },
    offline: {
        backgroundColor: '#FFF4CE',
        padding: '8px',
        borderRadius: '4px',
        marginBottom: '16px',
        fontSize: '14px',
    },
    links: {
        marginTop: '16px',
        textAlign: 'center',
    },
});

export const RegisterPage: React.FC = () => {
    const styles = useStyles();
    const { register, isLoading, error } = useAuthContext();
    const { isOnline } = useNetworkStatus();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [validationError, setValidationError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError('');

        if (password !== confirmPassword) {
            setValidationError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setValidationError('Password must be at least 8 characters long');
            return;
        }

        console.log('Registration form submitted for:', email);
        try {
            await register(email, password, name);
            console.log('Registration function completed');
            // Don't do anything else after registration - navigation is handled in useAuth
        } catch (error) {
            console.error('Registration component caught error:', error);
            // Error is handled by the auth context
        }
    };

    const displayError = validationError || error;

    return (
        <div className={styles.container}>
            <Card className={styles.card}>
                <CardHeader header={<h2>Create Account</h2>} />

                {!isOnline && (
                    <div className={styles.offline}>
                        You are offline. Please connect to the internet to register.
                    </div>
                )}

                {displayError && <div className={styles.error}>{displayError}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(_, data) => setName(data.value)}
                            required
                            disabled={isLoading || !isOnline}
                        />
                    </div>

                    <div className={styles.field}>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(_, data) => setEmail(data.value)}
                            required
                            disabled={isLoading || !isOnline}
                        />
                    </div>

                    <div className={styles.field}>
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(_, data) => setPassword(data.value)}
                            required
                            disabled={isLoading || !isOnline}
                        />
                    </div>

                    <div className={styles.field}>
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(_, data) => setConfirmPassword(data.value)}
                            required
                            disabled={isLoading || !isOnline}
                        />
                    </div>

                    <Button
                        type="submit"
                        appearance="primary"
                        disabled={isLoading || !isOnline}
                    >
                        {isLoading ? <Spinner size="tiny" /> : 'Register'}
                    </Button>
                </form>

                <div className={styles.links}>
                    <p>Already have an account? <Link to="/login">Login here</Link></p>
                </div>
            </Card>
        </div>
    );
};