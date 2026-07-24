# SurgeCart – Flash-Sale E-Commerce Platform

SurgeCart is a high-concurrency, production-ready flash-sale e-commerce platform designed to prevent stock overselling and handle sudden spikes in traffic gracefully. It utilizes **Redis Sorted Sets (ZSET)** as a queue throttle, **Redis Lua scripts** for atomic check-and-decrement stock reservations, **Socket.IO** for real-time queue position and stock tracking, and **Stripe** for payments.

---

## Technical Architecture

```mermaid
graph TD
    Client[React SPA client] -->|Socket.IO: Live updates| Server[Express Server]
    Client -->|HTTP: Auth, Listing, Queue Join| Server
    
    subgraph Throttling & Reservation Engine
        Server -->|ZADD / ZRANK| ZSET_Queue[(Redis Sorted Set Queue)]
        Server -->|EVAL: Atomic Decr & TTL| Stock_Cache[(Redis Stock Cache)]
    end
    
    subgraph Persistence Layer
        Server -->|Mongoose Client| MongoDB[(MongoDB Database)]
    end
    
    subgraph Background Processing
        Worker[Background Worker] -->|Periodically pop ZSET| Server
        Worker -->|Cleanup stale orders| MongoDB
    end

    Server -->|Create Checkout Session| Stripe[Stripe API]
    Stripe -->|Webhooks: checkout.session.completed| WebhookHandler[Express Webhook Endpoint]
    WebhookHandler -->|Commit Order & Decrement DB Stock| MongoDB
```

### Core Concurrency Mechanisms

1. **Traffic Throttling (The Queue)**:
   Instead of allowing thousands of concurrent HTTP requests to hit the MongoDB database, users are directed to join a Redis ZSET queue (`ZADD product:queue:<productId> <timestamp> <userId>`). A background processor pops users off the queue in batches based on available stock, issuing them a temporary purchase pass (`SET product:pass:<productId>:<userId> true EX 120`).
2. **Atomic Inventory Reservation**:
   Only users with a valid pass can trigger a stock reservation. Stock reservation uses a Redis Lua script to query and decrement the stock cache atomically:
   ```lua
   local stockKey = KEYS[1]
   local reservationKey = KEYS[2]
   local qty = tonumber(ARGV[1])
   local ttl = tonumber(ARGV[2])

   local currentStock = redis.call('get', stockKey)
   if not currentStock then return -1 end

   if tonumber(currentStock) >= qty then
       redis.call('decrby', stockKey, qty)
       redis.call('set', reservationKey, qty, 'EX', ttl)
       return 1
   else
       return 0
   end
   ```
   This prevents race conditions (overselling) during checkout.
3. **Stripe & TTL Reservation Lifecycle**:
   If payment is successful, the Stripe webhook marks the order as `paid`, decrements stock permanently in MongoDB, and completes the reservation. If the user fails to pay within 10 minutes, a background cleanup worker expires the order, deletes the reservation key, and returns the stock to Redis.

---

## Tech Stack

* **Backend**: Node.js, Express, TypeScript, Mongoose (MongoDB), ioredis (Redis), Socket.IO, bcryptjs, jsonwebtoken, Stripe SDK.
* **Frontend**: React, TypeScript, Vite, TailwindCSS, React Query (TanStack Query), Axios, Socket.IO Client.
* **DevOps**: Docker, docker-compose, GitHub Actions CI.

---

## Project Structure

```
surgecart/
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── components/         # Reusable Components (Navbar, Countdown, ProtectedRoute)
│   │   ├── context/            # Auth & Socket.IO Context Providers
│   │   ├── pages/              # Route Pages (Home, Detail, Queue, Dashboard, Orders)
│   │   ├── services/           # Axios API Client
│   │   └── types/              # Type Declarations
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── server/                     # Backend API Server
│   ├── src/
│   │   ├── config/             # DB, Redis, Stripe, Socket.IO config
│   │   ├── controllers/        # Request Handlers (Auth, Product, Queue, Orders)
│   │   ├── middleware/         # Auth, Roles, Webhook raw-body, Global Error Handler
│   │   ├── models/             # Mongoose Schemas (User, Product, Order)
│   │   ├── routes/             # API Endpoints
│   │   ├── services/           # Redis scripts, Queue processors, Workers, Sockets
│   │   └── types/              # TypeScript Types
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml          # Monorepo containerization configuration
└── README.md                   # System Documentation
```

---

## API Documentation

### 1. Authentication
* **`POST /api/auth/register`**: Registers a new user. Expects `{ name, email, password, role: "buyer" | "seller" }`.
* **`POST /api/auth/login`**: Authenticates user. Expects `{ email, password }`. Returns JWT token and user info.
* **`GET /api/auth/me`**: Fetches details of the logged in user. (Requires Auth Header).

### 2. Products
* **`GET /api/products`**: Lists all products with their current live stock count.
* **`GET /api/products/:id`**: Gets detailed info for a single product with live stock from Redis.
* **`GET /api/products/seller/list`**: Lists products created by the authenticated seller. (Requires Seller/Admin role).
* **`POST /api/products`**: Creates a product. Loads stock into Redis. (Requires Seller/Admin role).
* **`PUT /api/products/:id`**: Updates details. Modifying stock resets Redis cache. (Requires Seller/Admin/Owner).
* **`DELETE /api/products/:id`**: Deletes product and invalidates Redis cache. (Requires Seller/Admin/Owner).

### 3. Queue Management
* **`POST /api/queue/join`**: Adds the user to the Redis ZSET queue. Expects `{ productId }`.
* **`GET /api/queue/status/:productId`**: Checks user's position in queue or checks if purchase pass is authorized.
* **`POST /api/queue/leave`**: Removes user from the queue. Expects `{ productId }`.

### 4. Orders & Checkout
* **`POST /api/orders/reserve`**: Validates queue pass, runs Redis Lua script to decrement stock, creates MongoDB Order with status `reserved`, and returns Stripe Checkout URL. Expects `{ productId }`.
* **`GET /api/orders`**: Lists order history of the current user.
* **`GET /api/orders/:id`**: Fetches specific order details (restricted to buyer, seller of product, or admin).
* **`POST /api/orders/:id/cancel`**: Manually cancels a reservation, immediately releasing the Redis stock and marking order as `cancelled`.

### 5. Stripe Integrations
* **`POST /api/stripe/webhook`**: Receives Stripe raw events (`checkout.session.completed` / `checkout.session.expired`).
* **`POST /api/stripe/mock-payment-success`**: Developer utility endpoint to simulate Stripe checkout payment success locally. Expects `{ orderId }`.

---

## Environment Variables

### Backend Server (`server/.env`)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGO_URI=mongodb://127.0.0.1:27017/surgecart
REDIS_URI=redis://127.0.0.1:6379

JWT_SECRET=super_secret_jwt_key_change_me_in_production
JWT_EXPIRES_IN=7d

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend Client (`client/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## Local Development Setup

1. **Clone and Install Workspace Dependencies**:
   ```bash
   npm run install:all
   ```
2. **Start Database Services** (if using Docker locally):
   ```bash
   docker-compose up mongodb redis -d
   ```
3. **Run Services in Dev Mode**:
   - Backend Server: `npm run dev:server` (runs on port 5000)
   - Frontend React: `npm run dev:client` (runs on port 5173)

---

## Production Deployment Steps

### 1. MongoDB Atlas Setup
1. Create a free cluster on MongoDB Atlas.
2. Go to **Network Access** and whitelist the IP address of your hosting provider (or `0.0.0.0/0` for dynamic hosting like Render).
3. Copy the connection string: `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/surgecart?retryWrites=true&w=majority`.

### 2. Upstash Redis Setup
Since standard hosting providers like Render/Vercel do not include persistent Redis instances, Upstash offers a cloud Redis option:
1. Create an account on Upstash.
2. Create a Serverless Redis Database.
3. Copy the Connection URL: `rediss://default:xxxx@xxxx.upstash.io:6379`.

### 3. Deploying Backend on Render
1. Create a new **Web Service** on Render connected to your GitHub repository.
2. Set the root directory to `server/`.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Add Environment Variables:
   - `MONGO_URI` (from Atlas)
   - `REDIS_URI` (from Upstash)
   - `JWT_SECRET` (generate a secure random key)
   - `JWT_EXPIRES_IN=7d`
   - `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`
   - `CLIENT_URL` (the URL of your frontend once deployed)

### 4. Deploying Frontend on Vercel
1. Create a new project on Vercel connected to your GitHub repository.
2. Set the root directory to `client/`.
3. Vercel automatically detects Vite. Build settings will defaults to:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add Environment Variables:
   - `VITE_API_URL` (the Render Backend URL ending in `/api`, e.g. `https://surgecart-api.onrender.com/api`)
   - `VITE_SOCKET_URL` (the Render Backend URL, e.g. `https://surgecart-api.onrender.com`)
5. Vercel automatically handles client-side routing fallback configuration when configured as a Single Page Application.
