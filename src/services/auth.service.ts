import axios from 'axios';
import { dbService } from './db.service';
import { User } from '../types/models';

// Create custom axios instance with timeout
const authClient = axios.create({
    timeout: 10000 // 10 second timeout
});

// Share auth headers between instances
authClient.interceptors.request.use(config => {
    const authHeader = axios.defaults.headers.common['Authorization'];
    if (authHeader && config.headers) {
        config.headers['Authorization'] = authHeader;
    }
    return config;
});

// Get the current hostname
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// For production (Netlify), use the direct path to functions
// For development, use localhost
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:3000/api' 
  : '/.netlify/functions';

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
        const token = localStorage.getItem('auth_token');
        const userJson = localStorage.getItem('current_user');
        
        if (token && userJson) {
            try {
                this.token = token;
                this.currentUser = JSON.parse(userJson);
                
                // Set up axios interceptor for authentication
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                console.log('Auth token restored from localStorage');
            } catch (e) {
                console.error('Failed to restore user session:', e);
                this.logout(); // Clear invalid data
            }
        }
    }

    async login(credentials: LoginCredentials): Promise<User> {
        try {
            // Always try API login first
            try {
                console.log('Attempting API login...');
                const response = await authClient.post<AuthResponse>(
                    `${API_BASE_URL}/auth`,
                    { ...credentials, type: 'login' }
                );
                await this.handleAuthResponse(response.data);
                return response.data.user;
            } catch (apiError: any) {
                console.error('API login error:', apiError.message);
                
                // Handle network errors specifically
                if (apiError.code === 'ERR_NETWORK' || 
                    apiError.code === 'ECONNABORTED' || 
                    apiError.message.includes('timeout') || 
                    !navigator.onLine) {
                    
                    console.log('Network error detected, attempting offline login');
                    const user = await this.offlineLogin(credentials.email);
                    if (user) {
                        this.currentUser = user;
                        this.token = `offline-token-${Date.now()}`;
                        localStorage.setItem('auth_token', this.token);
                        localStorage.setItem('current_user', JSON.stringify(user));
                        return user;
                    }
                }
                
                throw apiError;
            }
        } catch (error) {
            console.error('Authentication failed:', error);
            
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
        try {
            const response = await authClient.post<AuthResponse>(
                `${API_BASE_URL}/auth`,
                { ...data, type: 'register' }
            );
            await this.handleAuthResponse(response.data);
            return response.data.user;
        } catch (error: any) {
            console.error('Registration failed:', error.message);
            
            // Provide more descriptive error messages
            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                throw new Error('Cannot connect to the server. Please check your internet connection.');
            } else if (error.response && error.response.data && error.response.data.message) {
                throw new Error(error.response.data.message);
            }
            
            throw error;
        }
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

            // Format token with Bearer prefix if needed
            const authToken = data.token.startsWith('Bearer ') ? data.token : `Bearer ${data.token}`;
            
            // Set up axios interceptor for authentication (for both axios instances)
            axios.defaults.headers.common['Authorization'] = authToken;
            
            console.log(`Auth token set in axios defaults: ${authToken.substring(0, 20)}...`);
            
            // Store user data in IndexedDB for offline access
            try {
                // Check if the user already exists in the database
                const existingUser = await dbService.getUserByEmail(formattedUser.email);
                
                if (existingUser) {
                    // Ensure we use the same ID from the database to avoid key conflicts
                    // Update the existing user with their exact ID to avoid constraint errors
                    await dbService.updateUser({
                        ...formattedUser,
                        id: existingUser.id
                    });
                } else {
                    // Add the new user
                    await dbService.addUser(formattedUser);
                }
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
        console.log('User logged out, auth headers cleared');
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