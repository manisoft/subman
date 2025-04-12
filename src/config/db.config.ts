export const dbConfig = {
    host: import.meta.env.VITE_DB_HOST,
    port: Number(import.meta.env.VITE_DB_PORT) || 3306,
    database: import.meta.env.VITE_DB_NAME,
    user: import.meta.env.VITE_DB_USER,
    password: import.meta.env.VITE_DB_PASSWORD,
};

// Validate required environment variables
const requiredEnvVars = [
    'VITE_DB_HOST',
    'VITE_DB_NAME',
    'VITE_DB_USER',
    'VITE_DB_PASSWORD',
] as const;

for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}