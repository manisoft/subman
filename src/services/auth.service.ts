import axios from 'axios';
import { dbService } from './db.service';
import { syncService } from './sync.service';
import { User } from '../types/models';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface AuthResponse {
    user: User;
    token: string;
}

interface LoginCredentials {
    email: string;
    password: string;
}

interface RegisterData extends LoginCredentials {
    name: string;
}

class AuthService {
    private token: string | null = null;
    private currentUser: User | null = null;

    constructor() {
        // Try to restore session from localStorage
        this.token = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
        }
    }

    async login(credentials: LoginCredentials): Promise<User> {
        try {
            const response = await axios.post<AuthResponse>(
                `${API_BASE_URL}/auth/login`,
                credentials
            );
            await this.handleAuthResponse(response.data);
            return response.data.user;
        } catch (error) {
            // If offline, try to authenticate against IndexedDB
            if (!navigator.onLine) {
                const user = await this.offlineLogin(credentials.email, credentials.password);
                if (user) {
                    this.currentUser = user;
                    return user;
                }
            }
            throw error;
        }
    }

    async register(data: RegisterData): Promise<User> {
        const response = await axios.post<AuthResponse>(
            `${API_BASE_URL}/auth/register`,
            data
        );
        await this.handleAuthResponse(response.data);
        return response.data.user;
    }

    private async handleAuthResponse(data: AuthResponse) {
        this.token = data.token;
        this.currentUser = data.user;
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('current_user', JSON.stringify(data.user));

        // Store user data in IndexedDB for offline access
        await dbService.addUser(data.user);

        // Set up axios interceptor for authentication
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    }

    private async offlineLogin(email: string, password: string): Promise<User | null> {
        const user = await dbService.getUserByEmail(email);
        if (user) {
            // In a real app, we'd need to handle password hashing properly
            // This is just a basic implementation for the PWA demo
            return user;
        }
        return null;
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        delete axios.defaults.headers.common['Authorization'];
    }

    isAuthenticated(): boolean {
        return !!this.token && !!this.currentUser;
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    getToken(): string | null {
        return this.token;
    }
}

export const authService = new AuthService();