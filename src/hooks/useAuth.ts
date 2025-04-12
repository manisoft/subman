import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { User } from '../types/models';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(authService.getCurrentUser());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check and update auth state when the component mounts
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const user = await authService.login({ email, password });
            console.log('Login successful, redirecting to dashboard...', user);
            setUser(user);
            
            // Use a slight delay to ensure state is updated before navigation
            setTimeout(() => {
                navigate('/dashboard');
            }, 100);
        } catch (e) {
            console.error('Login failed:', e);
            setError(e instanceof Error ? e.message : 'Failed to login');
            setIsLoading(false); // Make sure to reset loading state on error
            throw e;
        } finally {
            // Moved to setTimeout for successful login to avoid race conditions
        }
    };

    const register = async (email: string, password: string, name: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const user = await authService.register({ email, password, name });
            console.log('Registration successful, redirecting to dashboard...', user);
            setUser(user);
            
            // Use a slight delay to ensure state is updated before navigation
            setTimeout(() => {
                navigate('/dashboard');
            }, 100);
        } catch (e) {
            console.error('Registration failed:', e);
            setError(e instanceof Error ? e.message : 'Failed to register');
            setIsLoading(false); // Make sure to reset loading state on error
            throw e;
        } finally {
            // Moved to setTimeout for successful registration to avoid race conditions
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        navigate('/login');
    };

    return {
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
    };
};