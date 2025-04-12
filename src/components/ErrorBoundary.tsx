import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
    makeStyles,
    Card,
    Text,
    Button,
} from '@fluentui/react-components';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px',
    },
    card: {
        maxWidth: '600px',
        padding: '24px',
        textAlign: 'center',
    },
    heading: {
        marginBottom: '16px',
    },
    message: {
        marginBottom: '24px',
    },
    actions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
    },
});

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleReset = () => {
        localStorage.clear();
        indexedDB.deleteDatabase('subman-db');
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return <ErrorView onReload={this.handleReload} onReset={this.handleReset} />;
        }

        return this.props.children;
    }
}

interface ErrorViewProps {
    onReload: () => void;
    onReset: () => void;
}

const ErrorView: React.FC<ErrorViewProps> = ({ onReload, onReset }) => {
    const styles = useStyles();

    return (
        <div className={styles.container}>
            <Card className={styles.card}>
                <Text as="h1" size={800} className={styles.heading}>
                    Oops! Something went wrong
                </Text>
                <Text className={styles.message}>
                    We apologize for the inconvenience. You can try reloading the app or reset all data if the problem persists.
                </Text>
                <div className={styles.actions}>
                    <Button appearance="primary" onClick={onReload}>
                        Reload App
                    </Button>
                    <Button appearance="outline" onClick={onReset}>
                        Reset All Data
                    </Button>
                </div>
            </Card>
        </div>
    );
};