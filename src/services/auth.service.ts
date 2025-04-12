import axios from 'axios';
import { dbService } from './db.service';
import { User } from '../types/models';

// Get the current hostname
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// For production (Netlify), use the relative path /api which gets redirected to /.netlify/functions
// For development, use localhost
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:3000/api' 
  : '/api';

console.log('Using API URL:', API_BASE_URL);

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
            try {
                this.currentUser = JSON.parse(storedUser);
            } catch (e) {
                console.error('Error parsing stored user:', e);
                localStorage.removeItem('current_user');
            }
        }

        // Set axios default header if token exists
        if (this.token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
            console.log('Auth token restored from localStorage');
        }
    }

    async login(credentials: LoginCredentials): Promise<User> {
        try {
            // Always try API login first
            const response = await axios.post<AuthResponse>(
                `${API_BASE_URL}/auth`,
                { ...credentials, type: 'login' }
            );
            await this.handleAuthResponse(response.data);
            return response.data.user;
        } catch (error) {
            // If offline, try to authenticate against IndexedDB
            if (!navigator.onLine) {
                const user = await this.offlineLogin(credentials.email);
                if (user) {
                    this.currentUser = user;
                    this.token = `offline-token-${Date.now()}`;
                    localStorage.setItem('auth_token', this.token);
                    localStorage.setItem('current_user', JSON.stringify(user));
                    return user;
                }
            }
            
            // If online but API failed, rethrow the error
            throw new Error('Authentication failed');
        }
    }

    async register(data: RegisterData): Promise<User> {
        const response = await axios.post<AuthResponse>(
            `${API_BASE_URL}/auth`,
            { ...data, type: 'register' }
        );
        await this.handleAuthResponse(response.data);
        return response.data.user;
    }

    private async handleAuthResponse(data: AuthResponse) {
        try {
            console.log('Auth response received:', data);
            
            // Create a properly formatted user object
            const currentTime = new Date();
            const formattedUser: User = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                role: data.user.role as 'user' | 'admin',
                // Add missing required fields with default values
                created_at: data.user.created_at ? new Date(data.user.created_at) : currentTime,
                updated_at: data.user.updated_at ? new Date(data.user.updated_at) : currentTime,
                // Optional fields
                avatar_url: data.user.avatar_url,
                last_sync: data.user.last_sync ? new Date(data.user.last_sync) : currentTime,
                version: data.user.version || '1.0'
            };
            
            this.token = data.token;
            this.currentUser = formattedUser;

            // Save to localStorage first (which doesn't throw constraints errors)
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('current_user', JSON.stringify(formattedUser));

            // Set up axios interceptor for authentication
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            
            // Store user data in IndexedDB for offline access (this might throw constraint errors)
            try {
                await dbService.addUser(formattedUser);
            } catch (dbError: any) {
                console.warn('IndexedDB operation failed, but authentication succeeded:', dbError.message);
                // Authentication still succeeded even if local storage failed
            }
            
            console.log('Auth setup completed successfully');
        } catch (error: any) {
            console.error('Error handling auth response:', error);
            throw new Error(`Failed to process authentication response: ${error.message}`);
        }
    }

    private async offlineLogin(email: string): Promise<User | null> {
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