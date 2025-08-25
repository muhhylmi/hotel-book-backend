import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PrismaClient } from '@prisma/client';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { getUser } from './middleware/auth.js';
import { verifyXenditWebhook } from './services/xendit.js';
import { initializeBucket, uploadImage } from './services/minio.js';
import multer from 'multer';

const app = new Hono();
const prisma = new PrismaClient();

// Initialize MinIO bucket
initializeBucket();

// Configure multer for file uploads
multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// CORS middleware
app.use('*', cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173'],
  credentials: true
}));

app.post('/upload', async (c) => {
  try {
    const authorization = c.req.header('authorization');
    const user = getUser(authorization || undefined);

    if (!user || user.role !== 'ADMIN') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const formData = await c.req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadImage(buffer, file.name, file.type);

    return c.json({ imageUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    return c.json({ error: error.message || 'Upload failed' }, 500);
  }
});

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// GraphQL Yoga setup
const yoga = createYoga({
  schema,
  context: ({ request }) => {
    const authorization = request.headers.get('authorization');
    const user = getUser(authorization || undefined);

    return {
      prisma,
      user
    };
  },
  graphiql: process.env.NODE_ENV === 'development',
  cors: false // We handle CORS above
});

// GraphQL endpoint
app.all('/graphql', async (c) => {
  try {
    const response = await yoga.handle(c.req.raw);
    return response;
  } catch (error) {
    console.error('GraphQL error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Xendit webhook endpoint
app.post('/webhook/xendit', async (c) => {
  try {
    const body = await c.req.json();
    const webhookToken = c.req.header('x-callback-token');

    // Validate webhook token
    if (!webhookToken || !verifyXenditWebhook(webhookToken)) {
      return c.json({ error: 'Invalid webhook token' }, 401);
    }

    // Validate webhook body
    if (!body || !body.status || !body.external_id) {
      return c.json({ error: 'Invalid webhook body' }, 400);
    }

    // Process webhook based on status
    if (body.status === 'PAID') {
      await prisma.booking.update({
        where: { id: body.external_id },
        data: { status: 'CONFIRMED' }
      });
    } else if (body.status === 'EXPIRED' || body.status === 'FAILED') {
      await prisma.booking.update({
        where: { id: body.external_id },
        data: { status: 'CANCELLED' }
      });
    } else {
      // Log unknown status for debugging
      console.log(`Unknown webhook status: ${body.status}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Check if it's a Prisma error
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    return c.json({ error: 'Failed to process webhook' }, 500);
  }
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'OK' });
});

const port = parseInt(process.env.PORT || '4000');

console.log(`🚀 Server running on http://localhost:${port}/graphql`);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

serve({
  fetch: app.fetch,
  port
});