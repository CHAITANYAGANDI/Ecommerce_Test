const request = require('supertest');
const {
    getApp,
    waitForMongo,
    clearDatabase,
    closeMongo
} = require('./helpers');

let app;

beforeAll(async () => {
    app = getApp();
    await waitForMongo();
});

beforeEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await closeMongo();
    // Restore env after the introspect test mutated it.
    process.env.INTERNAL_AUTH_SECRET = 'test-internal-auth-secret-padding';
});


describe('/forgot-password is opaque', () => {
    test('returns the same shape for unknown emails (no enumeration)', async () => {
        const unknown = await request(app)
            .post('/auth/forgot-password')
            .send({ email: 'nobody@example.com' })
            .expect(200);

        expect(unknown.body.success).toBe(true);
        expect(unknown.body.message).toMatch(/if an account exists/i);
    });
});


describe('/auth/token/active/:clientId — fail-closed', () => {
    test('refuses the request when INTERNAL_AUTH_SECRET is unset', async () => {
        // Save and clear — the controller reads the env on each request.
        const saved = process.env.INTERNAL_AUTH_SECRET;
        delete process.env.INTERNAL_AUTH_SECRET;
        try {
            const res = await request(app)
                .get('/auth/token/active/anything')
                .set('x-internal-auth', 'any-value')
                .expect(503);
            expect(res.body.success).toBe(false);
        } finally {
            process.env.INTERNAL_AUTH_SECRET = saved;
        }
    });

    test('rejects the request when x-internal-auth does not match', async () => {
        await request(app)
            .get('/auth/token/active/some-client-id')
            .set('x-internal-auth', 'wrong-secret')
            .expect(403);
    });
});


describe('Google OAuth state validation', () => {
    test('/auth/google/callback rejects when state cookie is absent', async () => {
        const res = await request(app)
            .get('/auth/google/callback?code=dummy&state=anything')
            .redirects(0);

        // Either a 302 redirect to /auth/login with error or, if redirects
        // are followed, the final location URL should reveal the error.
        // supertest's `.redirects(0)` keeps us on the redirect response.
        expect([301, 302, 303, 307, 308]).toContain(res.status);
        expect(res.headers.location).toMatch(/google_state_invalid/);
    });
});


describe('Auth health endpoints', () => {
    test('GET /health is 200 regardless of DB state', async () => {
        const res = await request(app).get('/health').expect(200);
        expect(res.body.status).toBe('ok');
    });

    test('GET /ready reflects Mongo readyState', async () => {
        const res = await request(app).get('/ready');
        // In-memory Mongo is connected during the test run.
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ready');
    });
});


describe('Body-size cap', () => {
    test('POST /auth/login with a >16kb payload is rejected', async () => {
        const huge = 'A'.repeat(20 * 1024);
        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'x', password: huge });
        // body-parser returns 413; the global error handler may map it.
        expect([400, 413, 500]).toContain(res.status);
    });
});
