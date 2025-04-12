import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import jwt from 'jsonwebtoken';

// Simulated database - in a real app this would be a database connection
// This is just for the demo purposes to simulate api functionality
const subscriptions = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface Subscription {
  id: string;
  user_id: string;
  name: string;
  price: string;
  billing_cycle: string;
  category: string;
  description: string;
  next_billing_date: string;
  color: string;
  logo?: string;
  website: string;
  notes: string;
  created_at: string;
  updated_at: string;
  version?: string;
}

// Helper to verify JWT tokens
const verifyToken = (token: string) => {
  try {
    if (!token) {
      return null;
    }
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Get authorization token from event
const getToken = (event: HandlerEvent) => {
  const authHeader = event.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
};

// Helper to check if a user is authorized for a subscription
const isAuthorized = (userId: string, subscriptionUserId: string, role: string) => {
  return userId === subscriptionUserId || role === 'admin';
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Verify JWT token
  const token = getToken(event);
  const decoded: any = verifyToken(token);
  
  if (!decoded && event.httpMethod !== 'OPTIONS') {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ message: 'Unauthorized' })
    };
  }
  
  const userId = decoded?.id;
  const userRole = decoded?.role || 'user';

  // Parse path to extract ID if present
  const path = event.path.replace('/.netlify/functions/subscriptions', '');
  const segments = path.split('/').filter(Boolean);
  const isUserSubscriptions = segments[0] === 'user' && segments.length === 2;
  const subscriptionId = !isUserSubscriptions && segments.length > 0 ? segments[0] : null;
  const requestUserId = isUserSubscriptions ? segments[1] : null;

  try {
    // GET /subscriptions/user/:userId - Get user's subscriptions
    if (event.httpMethod === 'GET' && isUserSubscriptions) {
      console.log(`Getting subscriptions for user ${requestUserId}`);
      
      // Check if user is requesting their own data or is an admin
      if (userId !== requestUserId && userRole !== 'admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ message: 'Forbidden: You can only access your own subscriptions' })
        };
      }
      
      // For demo, return mock data
      const mockSubscriptions = [
        {
          id: "47f31ff2-96c5-4ddc-b6d2-11f5a8fc14f1",
          user_id: requestUserId,
          name: "YouTube Premium",
          price: "10.00",
          billing_cycle: "monthly",
          category: "Streaming",
          description: "",
          next_billing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          color: "#FF0000",
          logo: null,
          website: "",
          notes: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: null
        },
        {
          id: "865abff3-136b-4da6-b1e4-eb529f555729",
          user_id: requestUserId,
          name: "Disney+",
          price: "50.00",
          billing_cycle: "monthly",
          category: "Streaming",
          description: "",
          next_billing_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          color: "#0063E5",
          logo: null,
          website: "",
          notes: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: null
        }
      ];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mockSubscriptions)
      };
    }
    
    // GET /subscriptions/:id - Get a specific subscription
    if (event.httpMethod === 'GET' && subscriptionId) {
      console.log(`Getting subscription with ID ${subscriptionId}`);
      
      // Mock data for demo
      const mockSubscription = {
        id: subscriptionId,
        user_id: userId,
        name: "Netflix",
        price: "15.99",
        billing_cycle: "monthly",
        category: "Streaming",
        description: "",
        next_billing_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        color: "#E50914",
        logo: null,
        website: "",
        notes: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: null
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mockSubscription)
      };
    }
    
    // POST /subscriptions - Create a new subscription
    if (event.httpMethod === 'POST' && !subscriptionId) {
      console.log('Creating a new subscription');
      
      const data = JSON.parse(event.body || '{}');
      
      // Validate required fields
      if (!data.name || !data.price || !data.billing_cycle) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Missing required fields' })
        };
      }
      
      // Create new subscription with UUID
      const newSubscription = {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        user_id: data.user_id || userId,
        name: data.name,
        price: data.price,
        billing_cycle: data.billing_cycle,
        category: data.category || "Other",
        description: data.description || "",
        next_billing_date: data.next_billing_date || new Date().toISOString(),
        color: data.color || "#000000",
        logo: data.logo || null,
        website: data.website || "",
        notes: data.notes || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: null
      };
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ message: 'Subscription created', subscription: newSubscription })
      };
    }
    
    // PUT /subscriptions/:id - Update a subscription
    if (event.httpMethod === 'PUT' && subscriptionId) {
      console.log(`Updating subscription with ID ${subscriptionId}`);
      
      const data = JSON.parse(event.body || '{}');
      
      // Mock subscription for checking authorization
      const mockSubscription = {
        id: subscriptionId,
        user_id: userId // Assuming the subscription belongs to the requesting user
      };
      
      // Check if user is authorized
      if (!isAuthorized(userId, mockSubscription.user_id, userRole)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ message: 'Forbidden: You can only update your own subscriptions' })
        };
      }
      
      // Update subscription
      const updatedSubscription = {
        ...mockSubscription,
        ...data,
        id: subscriptionId, // Ensure ID remains the same
        updated_at: new Date().toISOString()
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedSubscription)
      };
    }
    
    // DELETE /subscriptions/:id - Delete a subscription
    if (event.httpMethod === 'DELETE' && subscriptionId) {
      console.log(`Deleting subscription with ID ${subscriptionId}`);
      
      // In a real app, get the subscription to check ownership
      // For the demo, we'll assume it exists and belongs to the user
      const mockSubscription = {
        id: subscriptionId,
        user_id: userId
      };
      
      // Check if user is authorized
      if (!isAuthorized(userId, mockSubscription.user_id, userRole)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ message: 'Forbidden: You can only delete your own subscriptions' })
        };
      }
      
      // Delete the subscription - in a real app this would be a DB delete
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Subscription deleted successfully', id: subscriptionId })
      };
    }
    
    // If we reach here, the requested endpoint wasn't found
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Not found' })
    };
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal server error', error: String(error) })
    };
  }
};

export { handler };