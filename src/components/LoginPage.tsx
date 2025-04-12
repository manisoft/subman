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
        flex: 1,
        width: '100%',
        background: '#f5f5f5',
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

export const LoginPage: React.FC = () => {
    const styles = useStyles();
    const { login, isLoading, error } = useAuthContext();
    const { isOnline } = useNetworkStatus();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login form submitted for:', email);
        try {
            await login(email, password);
            console.log('Login function completed');
            // Don't do anything else after login - navigation is handled in useAuth
        } catch (error) {
            console.error('Login component caught error:', error);
            // Error is handled by the auth context
        }
    };

    return (
        <div className={styles.container}>
            <Card className={styles.card}>
                <CardHeader header={<h2>Login to SubMan</h2>} />

                {!isOnline && (
                    <div className={styles.offline}>
                        You are offline. You can still log in if you've previously logged in on this device.
                    </div>
                )}

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(_, data) => setEmail(data.value)}
                            required
                            disabled={isLoading}
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
                            disabled={isLoading}
                        />
                    </div>

                    <Button
                        type="submit"
                        appearance="primary"
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="tiny" /> : 'Login'}
                    </Button>
                </form>

                <div className={styles.links}>
                    <p>Don't have an account? <Link to="/register">Register here</Link></p>
                </div>
            </Card>
        </div>
    );
};