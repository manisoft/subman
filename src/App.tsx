import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FluentProvider, webLightTheme, makeStyles, Button } from '@fluentui/react-components';
import { ServiceWorkerRegistration } from './components/ServiceWorkerRegistration';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { Dashboard } from './components/Dashboard';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { AuthProvider } from './context/AuthContext';
import { useAuthContext } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const useStyles = makeStyles({
  app: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '1rem',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid #e0e0e0',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoImg: {
    width: '32px',
    height: '32px',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  }
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

function AppContent() {
  const styles = useStyles();
  const { isOnline } = useNetworkStatus();
  const { user, logout } = useAuthContext();

  return (
    <div className={styles.app}>
      {user && (
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.logo}>
              <img src="/logo.svg" alt="SubMan Logo" className={styles.logoImg} />
              <h1>SubMan</h1>
            </div>
            <Button appearance="subtle" onClick={logout}>Logout</Button>
          </div>
          {!isOnline && (
            <div className="offline-indicator">
              Offline Mode - Changes will sync when connection is restored
            </div>
          )}
        </header>
      )}
      <main className={styles.main}>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <FluentProvider
        theme={webLightTheme}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ServiceWorkerRegistration />
        <Router>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </Router>
      </FluentProvider>
    </ErrorBoundary>
  );
}

export default App;
