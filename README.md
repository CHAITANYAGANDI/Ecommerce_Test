# TrendyTreasures — E-Commerce Microservices Platform

A modular e-commerce platform built with a microservices architecture. The storefront aggregates products from two simulated marketplaces (an "Amazon" Node.js service and a "Walmart" Python/Flask service), an API Gateway centralizes routing and injects access tokens, and a separate Auth server issues OAuth-style API credentials to authorized clients.

This README documents the architecture, every service, every authentication flow, the data model, the runtime environment, and how to run and deploy the system end to end.

---

## 1. High-level architecture

```
                                   ┌──────────────────────┐
                                   │    React storefront  │   port 3001
                                   │      (client/)       │
                                   └──────────┬───────────┘
                                              │  fetch (credentials: 'include')
                                              ▼
┌──────────────────────┐            ┌──────────────────────┐
│  React auth client   │            │     API Gateway      │   port 7000
│   (Auth/client/)     │            │    (APIGateway/)     │
└──────────┬───────────┘            └──────┬───────┬───────┘
           │ port 3002                     │       │
           │                               │       │
           ▼                               ▼       ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│     Auth server      │    │    Users service     │    │   Amazon service     │
│   (Auth/server/)     │    │      (Users/)        │    │     (Amazon/)        │
│       port 5000      │    │      port 7001       │    │     port 8000        │
└──────────┬───────────┘    └──────────┬───────────┘    └──────────┬───────────┘
           │                           │                           │
           │                           │                ┌──────────┴───────────┐
           │                           │                │   Walmart service    │
           │                           │                │     (Walmart/)       │
           │                           │                │     port 8001        │
           │                           │                └──────────┬───────────┘
           │                           │                           │
           └───────────────────────────┴───────────────────────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │   MongoDB    │
                               └──────────────┘
```

There are **three distinct authentication flows** in the system — see [§5 Authentication flows](#5-authentication-flows).

### Microservices features

| Feature | Where | What |
|---|---|---|
| API versioning | All gateway routes | `/api/v1/*` — version baked into URL so v2 can ship without breaking clients |
| Health endpoints | Every backend service | `GET /health` returns `{ status, service, uptime, mongoState }` for liveness checks |
| Correlation IDs | Gateway → all services | `x-request-id` header (UUID, generated at gateway, propagated downstream, logged in every service) |
| Rate limiting | Gateway | 120 req/min general, 30 req/15min on auth routes — env-tunable |
| Token injection | Gateway → Amazon/Walmart | `productsauthorization` header injected from MongoDB `creds` collection (60s cache) |
| Refresh-token rotation | Gateway → Users → all clients | 15-min access tokens auto-refreshed via 7-day refresh tokens; concurrent-burst dedup |
| Containerization | All 5 backends | `Dockerfile` per service + root `docker-compose.yml` to bring everything up with one command |

---

## 2. Repository layout

```
E_Commerce_Prod/
├── APIGateway/                # Central HTTP gateway (port 7000)
│   ├── app.js                 # Proxy config + product-token injection
│   ├── Models/
│   │   ├── creds.js           # Mirror of Users.creds collection
│   │   └── dbConnection.js
│   └── package.json
│
├── Auth/
│   ├── server/                # Authorization server for client apps (port 5000)
│   │   ├── app.js
│   │   ├── Controllers/
│   │   │   ├── ClientLoginController.js          # Issues authToken cookie
│   │   │   ├── OAuthLoginController.js           # OAuth-style redirect step
│   │   │   ├── ClientRegisterController.js
│   │   │   ├── OAuthLoginPageController.js       # Server-rendered EJS login
│   │   │   ├── ClientAPIDetailsController.js
│   │   │   ├── ClientAuthorizationController.js  # Mints product API access tokens
│   │   │   └── SessionController.js              # /me, /logout
│   │   ├── Middlewares/
│   │   │   ├── verifyToken.js          # Reads authToken cookie
│   │   │   └── clientCredsValidation.js
│   │   ├── Models/
│   │   │   ├── Client.js               # Client-app accounts
│   │   │   └── Credential.js           # Issued API credentials
│   │   ├── Routes/router.js
│   │   ├── Services/
│   │   │   ├── CreateCredentialService.js
│   │   │   └── GetCredentialsService.js
│   │   ├── Views/login.ejs             # Used by OAuthLoginPageController
│   │   ├── utils/
│   │   │   ├── cookieOptions.js
│   │   │   └── generateUniqueIdentifiers.js
│   │   └── .env.example
│   │
│   └── client/                # React app for client-app developers (port 3002)
│       ├── src/
│       │   ├── components/    # AuthLogin, AuthRegistration, AuthDashboard,
│       │   │                  # AuthCredentials, AuthCredDetails
│       │   ├── RefreshHandler.js
│       │   ├── App.js
│       │   └── utils.js
│       └── .env.example
│
├── Users/                     # User/admin/cart/order service (port 7001)
│   ├── app.js
│   ├── Controllers/
│   │   ├── AuthController.js           # signup, login (sets pendingAuth cookie)
│   │   ├── LoginAdmin.js               # Admin login (sets adminToken cookie)
│   │   ├── RegisterAdmin.js
│   │   ├── SessionController.js        # /me, /logout for users + admins
│   │   ├── UserController.js           # Admin: list/delete users
│   │   ├── UserAccountController.js    # Self-delete account
│   │   ├── CartController.js
│   │   ├── OrderController.js
│   │   ├── AddressController.js
│   │   ├── clientData.js               # Stores client app details for admin
│   │   ├── getCreds.js                 # Lists configured product API creds
│   │   └── token.js                    # Returns access_token by client_id
│   ├── Middlewares/
│   │   ├── Authorization.js            # Cookie-aware JWT + Google verify
│   │   ├── verifyOtp.js                # Reads pendingAuth → sets userToken
│   │   ├── adminCredsValidation.js
│   │   ├── userCredsValidation.js
│   │   ├── googleAuth.js               # Google OAuth2 helpers
│   │   ├── auth.js                     # Receives access tokens from Auth/server callback
│   │   └── authenticate.js             # Forwards to Auth/server /authorize
│   ├── Models/
│   │   ├── User.js                     # Customers + admins (single collection)
│   │   ├── Cart.js
│   │   ├── Order.js
│   │   ├── Address.js
│   │   ├── otp.js                      # OTP storage (TTL)
│   │   ├── Client.js                   # Cached client-app handle from Auth/server
│   │   ├── Credential.js               # Issued product API access tokens
│   │   └── db.js
│   ├── Routes/                         # AuthRouter, AdminRouter, AccountRouter,
│   │                                   # CartRouter, CheckoutIntentRouter,
│   │                                   # PasswordResetRouter, GoogleAuthRouter
│   ├── Services/
│   │   ├── OtpService.js
│   │   ├── MailService.js
│   │   └── ForgotPasswordService.js
│   ├── utils/cookieOptions.js
│   └── .env.example
│
├── Amazon/                    # Amazon-branded products (port 8000)
│   ├── app.js
│   ├── Controllers/ProductController.js
│   ├── Middlewares/Authorization.js   # Verifies productsauthorization JWT
│   ├── Models/
│   │   ├── Product.js
│   │   └── dbConnection.js
│   ├── Routes/ProductRouter.js
│   └── .env.example
│
├── Walmart/                   # Walmart-branded products (port 8001, Python/Flask)
│   ├── app.py
│   ├── Controllers/products_controller.py
│   ├── Middlewares/authorization.py
│   ├── Models/
│   │   ├── product_model.py
│   │   └── db_connection.py
│   ├── Routes/Router.py
│   └── .env.example
│
├── client/                    # Storefront React app (port 3001)
│   ├── src/
│   │   ├── components/        # 19 components — see §6.7
│   │   ├── RefreshHandler.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── utils.js           # API_BASE, fetchCurrentUser, etc.
│   └── .env.example
│
└── README.md                  # This file
```

---

## 3. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Create React App), React Router v6, react-toastify |
| Backend (services) | Node.js, Express 4, Mongoose 8 |
| Backend (one service) | Python 3, Flask, flask-cors |
| Gateway | Express + http-proxy-middleware v3 |
| Database | MongoDB |
| Auth | JWT (`jsonwebtoken`), bcryptjs, Google OAuth2 |
| Mail | Resend (HTTPS API — required because Render's free tier blocks outbound SMTP) |
| Security | helmet, express-rate-limit (Auth/server only), httpOnly cookies |

---

## 4. Data model

The system uses a single MongoDB **instance**, but each domain owns its own database — services do not share collections.

| Database | Owned by | What lives there |
|---|---|---|
| `ecommerce` | TrendyTreasures (Users + APIGateway) | users, carts, OTPs, checkout intents, OAuth handshake cache, issued product-API tokens (`creds`) |
| `auth` | Auth/server | client-app developer accounts, registered API credentials |
| `amazon` | Amazon service | products, orders, guestCustomers, addresses, payments |
| `walmart` | Walmart service | products, orders, guestCustomers, addresses, payments |

Cross-service reads happen over HTTP (e.g., the Amazon checkout page calls TT's `/checkout/intent/:ref` to read items, then notifies TT via `/checkout/intent/:ref/complete`). The only direct cross-service DB reach is the gateway looking up `creds` in the `ecommerce` DB — that's intentional, since `creds` are issued tokens the gateway needs to inject on every product request.

### Users service collections

| Collection | Purpose | Schema (key fields) |
|---|---|---|
| `users` | All user accounts (customers + admins) | `name`, `email` (unique), `password` (bcrypt; optional for Google users), `role` (`Customer`/`Admin`), `isGoogleUser` |
| `addresses` | Shipping addresses, one per user | `userId` (email, unique), `fullName`, `phoneNumber`, `address`, `city`, `province`, `postalCode`, `countryRegion` |
| `carts` | Cart line items, one row per product | `userId`, `productName`, `productDescription`, `productImageUrl`, `productPrice`, `productQuantity`, `productSoldBy` |
| `orders` | Placed orders | `orderNumber` (unique), `userId` (unique), `address_id` (refs addresses), `items_id` (refs carts), `total`, `status`, `createdAt` |
| `otps` | Short-lived OTP codes for 2FA + password reset | `email`, `otp`, `createdAt` (TTL) |
| `clients` | Cached client-app handle returned from Auth/server during admin authorization | `client_id`, `client_secret`, `redirect_uri` |
| `creds` | Issued product API access tokens (the JWTs the gateway injects) | `client_id` (unique), `api_name` (unique), `api_url`, `access_token` (unique) |

### Auth/server collections

| Collection | Purpose | Schema |
|---|---|---|
| `clients` | Client-app developer accounts (separate from user `clients`) | `name`, `username` (unique), `password` |
| `credentials` | API credentials registered by a client-app developer | `client` (refs clients), `api_name`, `api_url`, `redirect_uri`, `client_id`, `client_secret`, `secret_key`, `creation_date` |

> **Note:** Auth/server connects to a **separate database (`auth`)** from the storefront's `ecommerce` database, so the two `clients` collections (different shapes) live in different DBs and cannot collide. The Users service's local copy is named `temp_clients` (TTL 10 min) — it's a short-lived OAuth handshake cache, not a duplicate of Auth's source-of-truth `clients`.

### Amazon and Walmart services

Each owns a `products` collection with: `name`, `description`, `price`, `category`, `brand`, `features` (array), `soldBy`, `imageUrl`, `inventory: { stock, supplier, lastUpdated }`, `inStock`, `isActive`, `createdAt`, `updatedAt`. There is **no separate Inventory service** — inventory is a sub-document on each product (despite what older copies of this README claimed).

---

## 5. Authentication flows

The system has three independent auth flows. All of them use **httpOnly cookies** issued and consumed by the server — the React clients never read or write tokens to localStorage or cookies directly.

Every login flow issues **two cookies**: a short-lived **access token** (15 minutes) and a long-lived **refresh token** (7 days). When an access token expires, the React client's fetch wrapper automatically calls `/auth/refresh`, the server rotates both tokens (refresh-token rotation), and the original request is retried — all transparent to the user. The user only has to log in again if the refresh token itself expires (after 7 days of inactivity) or fails verification.

| Cookie | TTL | Set by | Used by |
|---|---|---|---|
| `userToken` | 15 min | verifyOtp, Google callback, /auth/refresh | All `/api/user/*` routes (except admin) |
| `userRefreshToken` | 7 days | verifyOtp, Google callback, /auth/refresh | `POST /api/user/auth/refresh` only |
| `adminToken` | 15 min | LoginAdmin, /auth/refresh | All `/api/user/admin/*` routes |
| `adminRefreshToken` | 7 days | LoginAdmin, /auth/refresh | `POST /api/user/auth/refresh` only |
| `authToken` | 15 min | Auth/server LoginClient, /auth/refresh | All Auth/server protected routes |
| `authRefreshToken` | 7 days | Auth/server LoginClient, /auth/refresh | `POST /auth/refresh` only |
| `pendingAuth` | 10 min | login (after password OK) | verifyOtp |
| `recoveryGrant` | 10 min | password-reset verifyOtp | resetPassword |

### 5.1 End-customer login (email + password + OTP)

```
Browser                        Users service (gateway → :7001)
   │                                  │
   │  POST /api/user/auth/login       │
   │  { email, password }             │
   │ ────────────────────────────────►│
   │                                  │ verify password
   │                                  │ generate OTP, save to otps collection
   │                                  │ send OTP email via Resend HTTPS API
   │                                  │ sign pendingAuth JWT (10 min, contains email/name)
   │  Set-Cookie: pendingAuth=…       │
   │ ◄────────────────────────────────│
   │                                  │
   │  POST /api/user/auth/verifyotp   │
   │  { otp }                         │
   │ ────────────────────────────────►│
   │                                  │ read pendingAuth cookie → email
   │                                  │ verify OTP against otps collection
   │                                  │ sign userToken JWT (7 days)
   │  Set-Cookie: userToken=…         │
   │  Clear-Cookie: pendingAuth       │
   │ ◄────────────────────────────────│
   │                                  │
   │  GET /api/user/auth/me           │
   │  (cookie sent automatically)     │
   │ ────────────────────────────────►│
   │                                  │ Authorization middleware verifies cookie
   │  { user: { name, email, role } } │
   │ ◄────────────────────────────────│
```

### 5.2 Admin login

Identical to 5.1 but at `POST /api/user/admin/login` and **no OTP step** — issues `adminToken` cookie directly on password verification (7-day expiry). Subsequent admin endpoints check `req.cookies.adminToken` via the same `Authorization.js` middleware.

### 5.3 Google sign-in

```
Browser                Users service                    Google
   │                        │                              │
   │ click "Sign in with    │                              │
   │  Google"               │                              │
   │ form GET /auth/google  │                              │
   │ ──────────────────────►│                              │
   │                        │ redirect 302                 │
   │ ──────────────────────────────────────────────────────►│
   │                        │                              │
   │ ◄─────────────────────────── consent screen ──────────│
   │                                                       │
   │ redirect with ?code=…  │                              │
   │ ──────────────────────►│ /auth/google/callback        │
   │                        │ exchange code → access_token │
   │                        │ ──────────────────────────►  │
   │                        │ ◄────────────────────────── │
   │                        │ upsert User (isGoogleUser)   │
   │  Set-Cookie: userToken=ya29.* (the Google access tok) │
   │  Set-Cookie: userInfo={name,email}                    │
   │  302 → /auth/google/callback (React route)            │
   │ ◄──────────────────────│                              │
   │                                                       │
   │  GET /api/user/authenticate                           │
   │ ──────────────────────►│ reads userInfo cookie        │
   │  { user: {name,email}}  ◄────────────────────────────│
   │  navigate to /home                                   │
```

The `Authorization.js` middleware handles two token formats: anything starting with `ya29.*` is verified by hitting Google's `tokeninfo` endpoint; anything else is verified as a local JWT.

### 5.4 Refresh-token rotation (every flow)

```
Browser                                       Users service
   │                                                │
   │ GET /api/user/cart/get/foo@x.com               │
   │ (userToken cookie attached)                    │
   │ ───────────────────────────────────────────►   │
   │                                                │ Authorization mw:
   │                                                │   verify userToken JWT
   │                                                │   → expired (15 min passed)
   │ 401 Unauthorized                               │
   │ ◄───────────────────────────────────────────   │
   │                                                │
   │ apiFetch detects 401, calls:                   │
   │ POST /api/user/auth/refresh                    │
   │ (userRefreshToken cookie attached)             │
   │ ───────────────────────────────────────────►   │
   │                                                │ verify userRefreshToken
   │                                                │ → still valid
   │                                                │ sign new access (15 min)
   │                                                │ sign new refresh (7 days)  [rotation]
   │ Set-Cookie: userToken=…                        │
   │ Set-Cookie: userRefreshToken=…                 │
   │ 200 OK                                         │
   │ ◄───────────────────────────────────────────   │
   │                                                │
   │ apiFetch retries the original request          │
   │ GET /api/user/cart/get/foo@x.com               │
   │ ───────────────────────────────────────────►   │
   │ 200 { cartItems: [...] }                       │
   │ ◄───────────────────────────────────────────   │
```

The same `/auth/refresh` endpoint handles both `userRefreshToken` and `adminRefreshToken` — it inspects which cookie is present and rotates accordingly. Concurrent 401s share a single in-flight refresh promise so we only call `/refresh` once per burst, not once per failing request.

If the refresh token itself is expired or invalid, both cookies are cleared and the client receives a 401 from the refresh call, which propagates as an unauthenticated state — the user must log in again.

**Refresh-token rotation** (issuing a new refresh token on each refresh) limits the replay window if a refresh token is somehow stolen: the attacker has a token that's only valid until the next legitimate refresh, after which the user's actions invalidate the attacker's copy.

### 5.5 Client-app authorization (Auth/server)

This is a separate OAuth-inspired flow for **third-party client apps** (i.e., the simulated "marketplaces"). It does NOT involve end users.

1. A developer registers at `Auth/client/` (port 3002) → `POST /auth/register` on `Auth/server/`.
2. They log in → `Set-Cookie: authToken` (1 hour expiry).
3. From the AuthDashboard, they create a credential (`POST /auth/credentials`) — this returns a `client_id`, `client_secret`, `secret_key`, and `redirect_uri`.
4. Separately, an **admin** of TrendyTreasures (logged in via §5.2) goes to `/admin/auth/request` and submits the `apiName`, `clientId`, `clientSecret`, `redirectUri`.
5. The admin's browser is then redirected to `Auth/server/auth/client/login`, which renders an EJS form. After confirming, Auth/server signs an access-token JWT (`expiresIn: '30d'`) using the `secret_key` set in step 3, and **POSTs it to the redirectUri**.
6. The redirectUri is `Users/admin/auth/callback` → controller `Middlewares/auth.js` saves the access_token to the `creds` collection keyed by `api_name`.
7. The APIGateway then injects this access_token as the `productsauthorization` header for all `/api/amazon/products/*` and `/api/walmart/products/*` requests (60-second cache). Browsers never see it.

---

## 6. Per-service deep dive

### 6.1 APIGateway (port 7000)

**Single responsibility:** receive every browser request, route it to the right backend service, and inject the product-API access token when proxying to Amazon/Walmart.

Key behaviors:
- `/api/user/*` → `USERS_SERVICE_URL` (default `http://localhost:7001`)
- `/api/amazon/products/*` → `AMAZON_SERVICE_URL` + `productsauthorization` header injected from `creds` collection (cached 60 s)
- `/api/walmart/products/*` → `WALMART_SERVICE_URL` + same header injection
- CORS: env-driven allowlist with `credentials: true`
- Sets `x-original-url` header so the downstream Authorization middleware can verify the request URL against the JWT's `api_url` claim

### 6.2 Users service (port 7001)

**The largest service.** Owns customer accounts, admin accounts, OTP-based 2FA, Google OAuth, address book, cart, orders, and acts as the bridge between admins and Auth/server.

Routers mounted on the root in `Users/app.js`:
| Mount | File | Purpose |
|---|---|---|
| `/` | `GoogleAuthRouter.js` | Google OAuth init + callback + `/authenticate` |
| `/auth` | `AuthRouter.js` | signup, login, verifyotp, me, logout |
| `/admin` | `AdminRouter.js` | admin login/register/CRUD + the auth/token bridge |
| `/recovery` | `PasswordResetRouter.js` | forgot/verify/reset password |
| `/account` | `AccountRouter.js` | self-delete account |
| `/cart` | `CartRouter.js` | get/add/update/remove cart items |
| `/checkout` | `CheckoutIntentRouter.js` | create / read / complete checkout intents (referrals) |

All non-public routes go through `Middlewares/Authorization.js`, which:
1. First checks `req.cookies.userToken` then `req.cookies.adminToken` then falls back to the `Authorization` header.
2. If the token starts with `ya29.*`, verifies it against Google's tokeninfo endpoint (matching `aud` against `GOOGLE_CLIENT_ID`).
3. Otherwise verifies it as a JWT signed with `JWT_SECRET`.

### 6.3 Auth/server (port 5000)

**Authorization server** for the client-app developer flow. Uses helmet, rate-limiting (200 req / 15 min), and EJS for one server-rendered page (the OAuth-style consent screen at `GET /auth/client/login`).

Routes:
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | none | Register a client-app developer |
| POST | `/auth/login` | none | Log in, sets `authToken` + `authRefreshToken` cookies |
| POST | `/auth/refresh` | refresh cookie | Rotate access + refresh tokens |
| GET | `/auth/me` | cookie | Current developer info |
| POST | `/auth/logout` | none | Clear `authToken` cookie |
| POST | `/auth/credentials` | cookie | Create a new API credential |
| GET | `/auth/dashboard` | cookie | List developer's credentials |
| GET | `/auth/creds/apiinfo/:id` | cookie | Get one credential's full details |
| GET | `/auth/client/login` | session | Render the EJS consent page |
| POST | `/auth/client/login` | none | Confirm consent, redirect with username |
| POST | `/auth/authorize` | none | Mint the 30-day product API access token |
| POST | `/auth/token` | cookie | Internal: client_id → access token |

### 6.4 Amazon service (port 8000)

Tiny CRUD service backed by the `Products` collection. All routes are gated by `Middlewares/Authorization.js`, which verifies the `productsauthorization` header as a JWT signed with `SECRET` (Walmart reads the same env var under the same name) and confirms the request URL contains the JWT's `api_url` claim (defense against token reuse across services).

Endpoints (under gateway `/api/amazon/products`):
- `GET /get` — list all products
- `GET /:productId` — single product
- `POST /add` — create product (used by seed scripts/admin tools)

### 6.5 Walmart service (port 8001)

Functionally identical to Amazon but written in Flask + Python. Same `productsauthorization` JWT validation logic in `Middlewares/authorization.py`.

### 6.6 Auth/client (port 3002)

5-page React app for the client-app developer flow:
- `AuthRegistration` — sign up
- `AuthLogin` — log in (sets cookie)
- `AuthDashboard` — list credentials
- `AuthCredentials` — create new credential
- `AuthCredDetails` — view full credential (client_id, secret, etc.)

Auth state is loaded by calling `GET /auth/me` on mount via `RefreshHandler.js`.

### 6.7 Storefront client (port 3001)

19 React components covering the full customer + admin UX:

| Customer | Admin | Auth flow |
|---|---|---|
| Signup, Signin | AdminLogin, AdminRegistration | ForgotPassword |
| Home (product listing) | AdminDashboard | VerifyOtp (recovery) |
| ProductDetails | UserManagement | ResetPassword |
| Cart | AuthManagement | TwoFactorAuthentication (login OTP) |
| Checkout | AuthRequest | GoogleCallBack |
| Address | ProtectedRoutes (renders credential table) | ClientCallBack |

Cross-cutting helpers in `client/src/utils.js`:
- `API_BASE`, `AMAZON_API`, `WALMART_API`, `AUTH_SERVER_URL`, `CLIENT_URL` — env-driven URL constants
- `apiFetch(path, options)` — wraps `fetch` with `credentials: 'include'` + **auto-refresh on 401** (calls `/auth/refresh`, retries once)
- `amazonFetch(path, options)`, `walmartFetch(path, options)` — same wrapper for product endpoints
- `fetchCurrentUser()`, `fetchCurrentAdmin()` — read cookie-backed identity
- `logoutUser()`, `logoutAdmin()` — POST to the relevant logout endpoint
- `handleSuccess`, `handleError` — toast notifications

**Always use these helpers — never call `fetch` directly.** Direct `fetch` calls bypass the refresh-token retry, so users would hit forced logouts every 15 minutes. If you add a new component that talks to the gateway, import the relevant helper from `utils.js`.

---

## 7. Environment variables

Every service ships a `.env.example`. Copy it to `.env` and fill in real values.

| Service | Required env vars |
|---|---|
| `APIGateway/` | `PORT`, `USERS_SERVICE_URL`, `AMAZON_SERVICE_URL`, `WALMART_SERVICE_URL`, `CORS_ORIGINS`, `MONGO_CONN` |
| `Users/` | `PORT`, `NODE_ENV`, `MONGO_CONN`, `JWT_SECRET`, `CORS_ORIGINS`, `CLIENT_URL`, `AUTH_SERVER_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `RESEND_API_KEY`, `MAIL_FROM` |
| `Auth/server/` | `PORT`, `NODE_ENV`, `MONGO_CONN`, `JWT_SECRET`, `CORS_ORIGINS`, `RESEND_API_KEY`, `MAIL_FROM` |
| `Amazon/` | `PORT`, `MONGO_CONN`, `CORS_ORIGINS`, `SECRET` |
| `Walmart/` | `PORT`, `MONGO_CONN`, `CORS_ORIGINS`, `SECRET` |
| `client/` | `REACT_APP_API_URL`, `REACT_APP_AUTH_URL`, `REACT_APP_CLIENT_URL` (build-time only) |
| `Auth/client/` | `REACT_APP_AUTH_URL` (build-time only) |

> **Cross-service constraints:**
> - All product services and `Auth/server` must share the same provider-token signing secret because Auth/server signs the JWT and the product services verify it. Concretely: `Auth/server`'s `JWT_PROVIDER_SECRET` must equal `SECRET` in both Amazon and Walmart (two services, same env var name, same value). The historical per-credential `secret_key` field on `Auth/server/credentials` is a leftover from an earlier design — the runtime verifying middleware in `Amazon`/`Walmart` uses the env-var secret, not `secret_key`. **Plan to consolidate this** before going live.
> - `Users` and `APIGateway` must point at the same MongoDB DB so they see the same `creds` collection.

---

## 8. Running locally

You need: Node.js 18+, Python 3.10+, MongoDB running locally (or a connection string to MongoDB Atlas).

### Step 1 — Clone & install

```bash
git clone <repo>
cd E_Commerce_Prod

# Node services
for svc in APIGateway Users Auth/server Amazon client Auth/client; do
  (cd "$svc" && npm install)
done

# Python service
cd Walmart
pip install flask flask-cors pymongo python-dotenv
cd ..
```

### Step 2 — Configure env vars

Copy each `.env.example` to `.env` in the same directory and fill in the values. For local dev the defaults work — you only need to set:
- `MONGO_URI` / `MONGO_CONN` (your MongoDB connection string)
- `JWT_SECRET`, `SECRET` (used by both Amazon and Walmart) — any long random string; `SECRET` must hold the same value as Auth's `JWT_PROVIDER_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (only if testing Google sign-in)
- `RESEND_API_KEY` (sign up at https://resend.com — only if testing OTP/recovery). Sender defaults to `onboarding@resend.dev`; set `MAIL_FROM` once you've verified a custom domain.

### Step 3 — Start everything

**Option A: Docker Compose (recommended)** — one command brings up MongoDB + all 5 backends:

```powershell
docker compose up --build
```

This starts: `mongo`, `users`, `authserver`, `amazon`, `walmart`, `gateway`. Containers are wired together via the docker-compose internal network (services find each other by name, e.g. `http://users:7001`). Then run the React apps in separate terminals:

```powershell
cd client && npm start          # storefront on :3001
cd Auth/client && npm start     # auth client on :3002
```

**Option B: Run each service natively** — open seven terminals:

```bash
cd APIGateway && node app.js     # :7000
cd Users && node app.js          # :7001
cd Auth/server && node app.js    # :5000
cd Amazon && node app.js         # :8000
cd Walmart && python app.py      # :8001
cd client && npm start           # :3001
cd Auth/client && npm start      # :3002
```

The storefront opens at `http://localhost:3001`, the Auth/client app at `http://localhost:3002`.

### Step 3.5 — Verify health

Once everything's running, hit the health endpoints to confirm each service is up and connected to Mongo:

```powershell
curl http://localhost:7000/health    # gateway
curl http://localhost:7001/health    # users
curl http://localhost:5000/health    # auth-server
curl http://localhost:8000/health    # amazon
curl http://localhost:8001/health    # walmart
```

Each returns `{ "status": "ok", "service": "...", "mongoState": 1 }` (1 = connected). If you see `mongoState: 0` or `2`, the service can't reach MongoDB — check the connection string.

### Step 3.6 — Watch the correlation IDs flow

Every request through the gateway gets an `x-request-id` UUID. The same ID is logged by every service the request touches. Tail the logs and you'll see:

```
[gateway] [a1b2c3d4-...] GET /api/v1/user/auth/me
[users]   [a1b2c3d4-...] GET /auth/me
```

Same ID in both. Makes debugging cross-service issues straightforward — `grep <id>` across the log stream and you have the full trace.

### Step 4 — Smoke test

1. Sign up at `/signup`.
2. Log in at `/login` → expect an OTP email → enter it on `/mfauth` → land on `/home`.
3. (If no OTP email is configured, comment out the `sendMail` step in `Users/Controllers/AuthController.js` for local testing.)
4. To see products, an admin must have completed the client-app authorization flow (§5.4). Skip this for first-run by manually inserting documents into the `creds` collection.

---

## 9. Deploying to Render / Railway / similar PaaS

Each service deploys as its own web service. Steps:

1. **Create 7 web services** (one per directory). For Node services use `npm install` as build, `node app.js` as start. For Python use `pip install -r requirements.txt` (you'll need to create one) and `python app.py`. The two React apps deploy as static sites with build command `npm run build` and publish directory `build/`.
2. **Set `NODE_ENV=production`** on every Node service. This flips cookies to `Secure: true; SameSite: 'None'` so they work cross-origin between services on different `*.onrender.com` subdomains.
3. **Fill in env vars** per service, using each `.env.example` as a checklist. Cross-link the URLs:
   - `client`'s `REACT_APP_API_URL` = the gateway's URL
   - `Users`'s `AUTH_SERVER_URL` = Auth/server's URL
   - `APIGateway`'s `USERS_SERVICE_URL`/`AMAZON_SERVICE_URL`/`WALMART_SERVICE_URL` = each service's URL
   - Every backend's `CORS_ORIGINS` = the storefront's URL
4. **Set up a single MongoDB Atlas cluster**. Either:
   - Use one DB for all services (you'll need to fix the `clients` collection name collision between Users and Auth/server), or
   - Use separate DB names per service and point the gateway at the Users DB.
5. **Trigger a fresh build** of the React apps after setting `REACT_APP_*` env vars — those are baked in at build time, not runtime.

### Common pitfalls

- **Cookies not arriving cross-origin** — confirm `credentials: 'include'` on every fetch (already done in this codebase) and `credentials: true` + a non-wildcard origin in CORS.
- **Google OAuth redirect mismatch** — update `GOOGLE_REDIRECT_URI` in Google Cloud console to match the deployed Users service URL.
- **OTP emails not arriving on Render** — Render's free tier blocks outbound SMTP, so the mailer uses Resend's HTTPS API. Set `RESEND_API_KEY` and (if using a custom domain) `MAIL_FROM`. With the sandbox sender (`onboarding@resend.dev`), Resend will only deliver to addresses on your own Resend account — verify a domain in the dashboard before sending to real users.
- **`creds` collection empty** — the gateway can't inject `productsauthorization` until an admin has completed the client-app authorization flow (§5.4) at least once per API.

---

## 10. Security notes

What's protected:
- All JWTs (user/admin/auth) live in `httpOnly` cookies — JS can't read them, mitigates XSS token theft.
- Cookies use `SameSite: None; Secure` in production — mitigates CSRF via cross-site.
- Passwords are bcrypt-hashed (salt rounds: 10).
- The Authorization middleware is **cookie-first, header-fallback** — preserving the Google `ya29.*` flow.
- Product API access tokens never reach the browser; the gateway injects them server-side.
- **Short access tokens (15 min) + refresh-token rotation**: stolen access tokens have at most a 15-minute window of usefulness; stolen refresh tokens are invalidated as soon as the legitimate user makes any request that triggers a refresh.

What still needs work before production traffic:
- **`SECRET` vs per-credential `secret_key`**: the verification path in both Amazon and Walmart middleware uses `SECRET` (which must hold the same value as Auth's `JWT_PROVIDER_SECRET`), but `Auth/server/Controllers/ClientAuthorization.js` signs with `creds[0].secret_key`. These must agree. Either drop the env-var-based shared secret and have the product services look up the secret from MongoDB at verify time, or make `secret_key === SECRET` for every credential.
- **No CSRF token** for state-changing cookie-authenticated requests. SameSite=None+Lax mitigates most attacks, but a double-submit cookie pattern would be a belt-and-suspenders improvement.
- **Rate limiting** is only on `Auth/server`, not on `Users` (where the login lives). Add `express-rate-limit` to `Users/app.js` before going live.
- **OTP** has no max-attempts counter — a 4-digit OTP is brute-forceable in seconds without one.
- **`JWT_SECRET`** must rotate on a schedule; currently there's no rotation infrastructure.

---

## 11. Future enhancements (roadmap)

- Add a real Inventory service (decouple stock tracking from product documents) — *currently inventory is a sub-document on each product*.
- Add a Payment service and integrate Stripe.
- Containerize each service with Docker; add a `docker-compose.yml` for local orchestration.
- Replace the current sync HTTP between `Users` and `Auth/server` (admin auth bridge) with a message queue.
- Add CI (GitHub Actions) for `npm test` + ESLint per service.
- Add observability — at minimum, request-correlation IDs propagated across the gateway.

---

## License

ISC (per existing `package.json` files).
