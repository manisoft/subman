import { Handler } from '@netlify/functions';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const dbConfig = {
    host: process.env.VITE_DB_HOST,
    user: process.env.VITE_DB_USER,
    password: process.env.VITE_DB_PASSWORD,
    database: process.env.VITE_DB_NAME,
};

export const handler: Handler = async (event) => {
    if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing request body' }) };
    }

    const { type, email, password } = JSON.parse(event.body);

    try {
        const connection = await mysql.createConnection(dbConfig);

        switch (type) {
            case 'login': {
                const [rows] = await connection.execute(
                    'SELECT id, email, password, name, role FROM users WHERE email = ?',
                    [email]
                );

                const user = (rows as any[])[0];
                if (!user || !await bcrypt.compare(password, user.password)) {
                    return {
                        statusCode: 401,
                        body: JSON.stringify({ error: 'Invalid credentials' })
                    };
                }

                const token = jwt.sign(
                    { id: user.id, email: user.email, role: user.role },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '7d' }
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        token,
                        user: {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role
                        }
                    })
                };
            }

            case 'register': {
                const hashedPassword = await bcrypt.hash(password, 10);
                const [result] = await connection.execute(
                    'INSERT INTO users (id, email, password, name, role) VALUES (UUID(), ?, ?, ?, "user")',
                    [email, hashedPassword, email.split('@')[0]]
                );

                const [newUser] = await connection.execute(
                    'SELECT id, email, name, role FROM users WHERE email = ?',
                    [email]
                );

                return {
                    statusCode: 201,
                    body: JSON.stringify({
                        message: 'User created successfully',
                        user: (newUser as any[])[0]
                    })
                };
            }

            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid operation type' })
                };
        }
    } catch (error: any) {
        console.error('Auth error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};