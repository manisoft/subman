import { Handler } from '@netlify/functions';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const dbConfig = {
    host: process.env.VITE_DB_HOST,
    user: process.env.VITE_DB_USER,
    password: process.env.VITE_DB_PASSWORD,
    database: process.env.VITE_DB_NAME,
};

const verifyToken = (authHeader: string | undefined) => {
    if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
};

export const handler: Handler = async (event) => {
    try {
        const user = verifyToken(event.headers.authorization) as { id: string };
        const connection = await mysql.createConnection(dbConfig);

        switch (event.httpMethod) {
            case 'GET': {
                const [rows] = await connection.execute(
                    'SELECT * FROM subscriptions WHERE user_id = ?',
                    [user.id]
                );
                return {
                    statusCode: 200,
                    body: JSON.stringify(rows)
                };
            }

            case 'POST': {
                if (!event.body) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Missing request body' }) };
                }

                const subscription = JSON.parse(event.body);
                const [result] = await connection.execute(
                    `INSERT INTO subscriptions (
            id, user_id, name, price, billing_cycle, category,
            description, next_billing_date, color, logo, website, notes
          ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        user.id,
                        subscription.name,
                        subscription.price,
                        subscription.billing_cycle,
                        subscription.category,
                        subscription.description,
                        subscription.next_billing_date,
                        subscription.color,
                        subscription.logo,
                        subscription.website,
                        subscription.notes
                    ]
                );

                return {
                    statusCode: 201,
                    body: JSON.stringify({
                        message: 'Subscription created successfully',
                        subscription: { ...subscription, id: (result as any).insertId }
                    })
                };
            }

            case 'PUT': {
                if (!event.body || !event.queryStringParameters?.id) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required data' }) };
                }

                const subscription = JSON.parse(event.body);
                const [result] = await connection.execute(
                    `UPDATE subscriptions 
           SET name = ?, price = ?, billing_cycle = ?, category = ?,
               description = ?, next_billing_date = ?, color = ?,
               logo = ?, website = ?, notes = ?
           WHERE id = ? AND user_id = ?`,
                    [
                        subscription.name,
                        subscription.price,
                        subscription.billing_cycle,
                        subscription.category,
                        subscription.description,
                        subscription.next_billing_date,
                        subscription.color,
                        subscription.logo,
                        subscription.website,
                        subscription.notes,
                        event.queryStringParameters.id,
                        user.id
                    ]
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Subscription updated successfully',
                        subscription
                    })
                };
            }

            case 'DELETE': {
                if (!event.queryStringParameters?.id) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Missing subscription ID' }) };
                }

                await connection.execute(
                    'DELETE FROM subscriptions WHERE id = ? AND user_id = ?',
                    [event.queryStringParameters.id, user.id]
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Subscription deleted successfully' })
                };
            }

            default:
                return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
        }
    } catch (error: any) {
        console.error('Subscription error:', error);
        if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};