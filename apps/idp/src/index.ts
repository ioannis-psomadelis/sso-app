import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import websocket from '@fastify/websocket';
import { authorizeRoute } from './routes/authorize.js';
import { loginRoute } from './routes/login.js';
import { tokenRoute } from './routes/token.js';
import { userinfoRoute } from './routes/userinfo.js';
import { logoutRoute } from './routes/logout.js';
import { wellKnownRoute } from './routes/well-known.js';
import { tasksApiRoute } from './routes/api/tasks.js';
import { documentsRoute } from './routes/api/documents.js';
import { profileApiRoute } from './routes/api/profile.js';
import { federatedRoute } from './routes/federated.js';

const fastify = Fastify({ logger: true });

// Configure CORS origins from environment or use defaults
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3001', 'http://localhost:3002'];

await fastify.register(cors, {
  origin: corsOrigins,
  credentials: true,
});

// Warn if using default COOKIE_SECRET in production
if (!process.env.COOKIE_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: Using default COOKIE_SECRET in production is insecure!');
}

// Cookie with a proper secret
await fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-production',
});
await fastify.register(formbody);
await fastify.register(websocket);

// Store debug events in memory (per-session tracking)
const debugSessions = new Map<string, any[]>(); // sessionId -> events
const wsClients = new Set<any>();

// WebSocket route for debug events
fastify.register(async function (fastify) {
  fastify.get('/ws/debug', { websocket: true }, (socket, req) => {
    wsClients.add(socket);

    // Send existing events for this session if any
    const sessionId = (req.query as any).sessionId;
    if (sessionId && debugSessions.has(sessionId)) {
      socket.send(JSON.stringify({
        type: 'history',
        events: debugSessions.get(sessionId)
      }));
    }

    socket.on('message', (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'event' && data.sessionId) {
          // Store event
          if (!debugSessions.has(data.sessionId)) {
            debugSessions.set(data.sessionId, []);
          }
          debugSessions.get(data.sessionId)!.push(data.event);

          // Broadcast to all clients with same sessionId
          wsClients.forEach((client: any) => {
            if (client.readyState === 1) { // WebSocket.OPEN
              client.send(JSON.stringify({
                type: 'event',
                event: data.event,
                sessionId: data.sessionId
              }));
            }
          });
        }
      } catch (e) {
        console.error('WS message parse error:', e);
      }
    });

    socket.on('close', () => {
      wsClients.delete(socket);
    });
  });
});

// Register routes
fastify.register(authorizeRoute);
fastify.register(loginRoute);
fastify.register(tokenRoute);
fastify.register(userinfoRoute);
fastify.register(logoutRoute);
fastify.register(wellKnownRoute);
fastify.register(tasksApiRoute);
fastify.register(documentsRoute);
fastify.register(profileApiRoute);
fastify.register(federatedRoute);

// Root route - Landing page
fastify.get('/', async (request, reply) => {
  reply.type('text/html');
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSO Identity Provider</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      max-width: 600px;
      width: 100%;
    }
    h1 {
      color: #667eea;
      margin-bottom: 10px;
      font-size: 2em;
    }
    .status {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.9em;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .description {
      color: #666;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .links {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .links h2 {
      color: #333;
      font-size: 1.2em;
      margin-bottom: 10px;
    }
    .links a {
      display: block;
      padding: 12px 16px;
      background: #f3f4f6;
      border-radius: 6px;
      text-decoration: none;
      color: #667eea;
      font-weight: 500;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    .links a:hover {
      background: #e0e7ff;
      border-color: #667eea;
      transform: translateX(4px);
    }
    .links code {
      background: #1f2937;
      color: #10b981;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>SSO Identity Provider</h1>
    <span class="status">Server is running</span>

    <p class="description">
      This is the OAuth 2.0 / OpenID Connect Identity Provider for the SSO demonstration system.
      It handles user authentication and issues access tokens for client applications using the
      Authorization Code Flow with PKCE.
    </p>

    <div class="links">
      <h2>Available Endpoints</h2>
      <a href="/login">
        <code>GET /login</code> - User Login Page
      </a>
      <a href="/.well-known/openid-configuration">
        <code>GET /.well-known/openid-configuration</code> - OpenID Connect Discovery
      </a>
      <a href="/health">
        <code>GET /health</code> - Health Check
      </a>
    </div>

    <div class="footer">
      SSO Demo - University Thesis Project
    </div>
  </div>
</body>
</html>
  `;
});

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

const port = parseInt(process.env.PORT || '3000', 10);

try {
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`🔐 IdP server running on port ${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
