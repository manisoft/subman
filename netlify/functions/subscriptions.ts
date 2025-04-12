import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import jwt from 'jsonwebtoken';

// Add declaration for Node.js process in Netlify Functions environment
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

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
  return authHeader.startsWith('Bearer ') ? authHeader : authHeader;
};

// Helper to check if a user is authorized for a subscription
const isAuthorized = (userId: string, subscriptionUserId: string, role: string) => {
  return userId === subscriptionUserId || role === 'admin';
};

// Helper to generate UUID-like string for IDs
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers - be sure to include all needed headers for browser preflight
  const headers = {
    'Access-Control-Allow-Origin': '*', // Or specify your domain
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Verify JWT token
  const token = getToken(event);
  const decoded: any = verifyToken(token);
  
  // For non-preflight requests, require authentication except for public endpoints
  if (!decoded && event.httpMethod !== 'OPTIONS') {
    console.log('Authentication failed - invalid or missing token');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ message: 'Unauthorized - valid authentication required' })
    };
  }
  
  const userId = decoded?.id;
  const userRole = decoded?.role || 'user';
  console.log(`Request from user ID: ${userId} with role: ${userRole}`);

  // Parse path to extract ID if present
  const path = event.path.replace('/.netlify/functions/subscriptions', '');
  const segments = path.split('/').filter(Boolean);
  const isUserSubscriptions = segments[0] === 'user' && segments.length === 2;
  const subscriptionId = !isUserSubscriptions && segments.length > 0 ? segments[0] : null;
  const requestUserId = isUserSubscriptions ? segments[1] : null;

  console.log(`Parsed path: isUserSubscriptions=${isUserSubscriptions}, subscriptionId=${subscriptionId}, requestUserId=${requestUserId}`);

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
      
      // Parse request body
      let data;
      try {
        data = JSON.parse(event.body || '{}');
        console.log('Parsed request data:', data);
      } catch (e) {
        console.error('Error parsing request body:', e);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid request body - JSON parsing failed' })
        };
      }
      
      // Validate required fields
      if (!data.name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Missing required field: name' })
        };
      }
      
      // Handle cost/price field names
      const price = data.price || (data.cost ? String(data.cost) : '0');
      
      // Handle billing cycle
      const billing_cycle = (data.billing_cycle || data.billingCycle || 'monthly').toLowerCase();
      
      // Create new subscription with UUID
      const newId = generateId();
      const newSubscription = {
        id: newId,
        user_id: data.user_id || data.userId || userId,
        name: data.name,
        price: price,
        billing_cycle: billing_cycle,
        category: data.category || data.category_id || "Other",
        description: data.description || "",
        next_billing_date: data.next_billing_date || data.nextBillingDate || new Date().toISOString(),
        color: data.color || "#000000",
        logo: data.logo || null,
        website: data.website || "",
        notes: data.notes || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: null
      };
      
      console.log('Created new subscription:', newSubscription);
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ message: 'Subscription created', subscription: newSubscription })
      };
    }
    
    // PUT /subscriptions/:id - Update a subscription
    if (event.httpMethod === 'PUT' && subscriptionId) {
      console.log(`Updating subscription with ID ${subscriptionId}`);
      
      let data;
      try {
        data = JSON.parse(event.body || '{}');
        console.log('Parsed update data:', data);
      } catch (e) {
        console.error('Error parsing request body for update:', e);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid request body - JSON parsing failed' })
        };
      }
      
      // Mock subscription for checking authorization
      const mockSubscription = {
        id: subscriptionId,
        user_id: data.user_id || data.userId || userId // Assuming the subscription belongs to the requesting user
      };
      
      // Check if user is authorized
      if (!isAuthorized(userId, mockSubscription.user_id, userRole)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ message: 'Forbidden: You can only update your own subscriptions' })
        };
      }
      
      // Handle price/cost conversion
      const price = data.price || (data.cost ? String(data.cost) : undefined);
      
      // Update subscription
      const updatedSubscription = {
        ...mockSubscription,
        ...data,
        id: subscriptionId, // Ensure ID remains the same
        price: price,
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
    console.log(`Not found: ${event.httpMethod} ${event.path}`);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Not found - endpoint does not exist' })
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