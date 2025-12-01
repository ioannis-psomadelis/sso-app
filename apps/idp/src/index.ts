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
import { federatedRoute } from './routes/federated.js';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: ['http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
});
// Cookie with a proper secret
await fastify.register(cookie, {
  secret: 'super-secret-cookie-key-for-sso-demo',
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
fastify.register(federatedRoute);

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

try {
  await fastify.listen({ port: 3000, host: '0.0.0.0' });
  console.log('🔐 IdP server running at http://localhost:3000');
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
