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
            setUser(user);
            navigate('/dashboard');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to login');
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email: string, password: string, name: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const user = await authService.register({ email, password, name });
            setUser(user);
            navigate('/dashboard');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to register');
            throw e;
        } finally {
            setIsLoading(false);
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