<div align="center">

# ⚡ SurgeCart

**A high-concurrency, production-ready flash-sale e-commerce platform**

Prevents stock overselling and handles sudden traffic spikes gracefully using Redis-backed queueing and atomic stock reservations.

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![Redis](https://img.shields.io/badge/Redis-Lua_Scripts-DC382D?logo=redis&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Core Concurrency Mechanisms](#-core-concurrency-mechanisms)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)
- [Local Development Setup](#-local-development-setup)
- [Production Deployment](#-production-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Overview

SurgeCart is a high-concurrency, production-ready flash-sale e-commerce platform designed to prevent stock overselling and handle sudden spikes in traffic gracefully. It uses:

- **Redis Sorted Sets (ZSET)** as a queue throttle
- **Redis Lua scripts** for atomic check-and-decrement stock reservations
- **Socket.IO** for real-time queue position and stock tracking
- **Stripe** for payments

---

## 🏗 Core Concurrency Mechanisms

1. **Traffic Throttling (The Queue)**

   Instead of allowing thousands of concurrent HTTP requests to hit MongoDB directly, users are routed into a Redis ZSET queue:

   ```
   ZADD product:queue:<productId> <timestamp> <userId>
   ```

   A background processor pops users off the queue in batches based on available stock, issuing them a temporary purchase pass:

   ```
   SET product:pass:<productId>:<userId> true EX 120
   ```

2. **Atomic Inventory Reservation**

   Only users with a valid pass can trigger a stock reservation. Reservation uses a Redis Lua script to query and decrement the stock cache atomically, preventing race conditions (overselling) during checkout:

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

3. **Stripe & TTL Reservation Lifecycle**

   If payment succeeds, the Stripe webhook marks the order as `paid`, permanently decrements stock in MongoDB, and completes the reservation. If the user fails to pay within 10 minutes, a background cleanup worker expires the order, deletes the reservation key, and returns the stock to Redis.

---

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js, Express, TypeScript, Mongoose (MongoDB), ioredis (Redis), Socket.IO, bcryptjs, jsonwebtoken, Stripe SDK |
| **Frontend** | React, TypeScript, Vite, TailwindCSS, React Query (TanStack Query), Axios, Socket.IO Client |
| **DevOps** | Docker, docker-compose, GitHub Actions CI |

---

## 📁 Project Structure

```
surgecart/
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── components/         # Reusable Components (Navbar, Countdown, ProtectedRoute)
│   │   ├── context/             # Auth & Socket.IO Context Providers
│   │   ├── pages/               # Route Pages (Home, Detail, Queue, Dashboard, Orders)
│   │   ├── services/            # Axios API Client
│   │   └── types/                # Type Declarations
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── server/                     # Backend API Server
│   ├── src/
│   │   ├── config/               # DB, Redis, Stripe, Socket.IO config
│   │   ├── controllers/          # Request Handlers (Auth, Product, Queue, Orders)
│   │   ├── middleware/           # Auth, Roles, Webhook raw-body, Global Error Handler
│   │   ├── models/                # Mongoose Schemas (User, Product, Order)
│   │   ├── routes/                # API Endpoints
│   │   ├── services/              # Redis scripts, Queue processors, Workers, Sockets
│   │   └── types/                  # TypeScript Types
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml           # Monorepo containerization configuration
└── README.md                    # System Documentation
```

---

## 📡 API Documentation

### 1. Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Registers a new user. Expects `{ name, email, password, role: "buyer" \| "seller" }` |
| `POST` | `/api/auth/login` | Authenticates user. Expects `{ email, password }`. Returns JWT token and user info |
| `GET` | `/api/auth/me` | Fetches details of the logged-in user *(requires auth header)* |

### 2. Products

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | Lists all products with their current live stock count |
| `GET` | `/api/products/:id` | Gets detailed info for a single product with live stock from Redis |
| `GET` | `/api/products/seller/list` | Lists products created by the authenticated seller *(seller/admin only)* |
| `POST` | `/api/products` | Creates a product and loads stock into Redis *(seller/admin only)* |
| `PUT` | `/api/products/:id` | Updates details; modifying stock resets the Redis cache *(seller/admin/owner)* |
| `DELETE` | `/api/products/:id` | Deletes product and invalidates the Redis cache *(seller/admin/owner)* |

### 3. Queue Management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/queue/join` | Adds the user to the Redis ZSET queue. Expects `{ productId }` |
| `GET` | `/api/queue/status/:productId` | Checks queue position or purchase-pass authorization |
| `POST` | `/api/queue/leave` | Removes user from the queue. Expects `{ productId }` |

### 4. Orders & Checkout

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/orders/reserve` | Validates queue pass, runs the Lua script to decrement stock, creates a `reserved` order, and returns a Stripe Checkout URL. Expects `{ productId }` |
| `GET` | `/api/orders` | Lists order history for the current user |
| `GET` | `/api/orders/:id` | Fetches specific order details *(restricted to buyer, seller of product, or admin)* |
| `POST` | `/api/orders/:id/cancel` | Manually cancels a reservation, releases Redis stock, marks order as `cancelled` |

### 5. Stripe Integrations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/stripe/webhook` | Receives Stripe raw events (`checkout.session.completed` / `checkout.session.expired`) |
| `POST` | `/api/stripe/mock-payment-success` | Developer utility to simulate a successful Stripe checkout locally. Expects `{ orderId }` |

---

## 🔐 Environment Variables

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

> ⚠️ **Never commit real `.env` files.** Use `.env.example` files in the repo and add `.env` to `.gitignore`.

---

## 💻 Local Development Setup

1. **Clone and install workspace dependencies**

   ```bash
   npm run install:all
   ```

2. **Start database services** (if using Docker locally)

   ```bash
   docker-compose up mongodb redis -d
   ```

3. **Run services in dev mode**

   | Service | Command | Port |
   |---|---|---|
   | Backend Server | `npm run dev:server` | `5000` |
   | Frontend React | `npm run dev:client` | `5173` |

---

## ☁️ Production Deployment

### 1. MongoDB Atlas Setup

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Go to **Network Access** and whitelist your hosting provider's IP (or `0.0.0.0/0` for dynamic hosting like Render).
3. Copy the connection string:

   ```
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/surgecart?retryWrites=true&w=majority
   ```

### 2. Upstash Redis Setup

Since standard hosting providers like Render/Vercel don't include persistent Redis instances, [Upstash](https://upstash.com/) offers a cloud Redis option:

1. Create an Upstash account.
2. Create a Serverless Redis Database.
3. Copy the connection URL:

   ```
   rediss://default:xxxx@xxxx.upstash.io:6379
   ```

### 3. Deploying the Backend on Render

1. Create a new **Web Service** on Render connected to your GitHub repository.
2. Set the root directory to `server/`.
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npm start`
5. Add environment variables:
   - `MONGO_URI` (from Atlas)
   - `REDIS_URI` (from Upstash)
   - `JWT_SECRET` (generate a secure random key)
   - `JWT_EXPIRES_IN=7d`
   - `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`
   - `CLIENT_URL` (the URL of your deployed frontend)

### 4. Deploying the Frontend on Vercel

1. Create a new project on Vercel connected to your GitHub repository.
2. Set the root directory to `client/`.
3. Vercel auto-detects Vite. Default build settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variables:
   - `VITE_API_URL` — your Render backend URL (e.g. `https://surgecart-api.onrender.com/api`)
   - `VITE_SOCKET_URL` — your Render backend base URL (e.g. `https://surgecart-api.onrender.com`)

---

## 🤝 Contributing

Contributions are welcome! Please open an issue to discuss significant changes before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
