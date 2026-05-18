const request = require('supertest');
const {
    getApp,
    waitForMongo,
    clearDatabase,
    closeMongo,
    parseSetCookies,
    registerAndLogin,
    STRONG_PW
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
});


describe('register → login → /me', () => {
    test('happy path: register, login, fetch /me with cookies', async () => {
        const { jar, asHeader } = await registerAndLogin({
            username: 'alice',
            email: 'alice@example.com'
        });

        expect(jar.authToken).toBeTruthy();
        expect(jar.authRefreshToken).toBeTruthy();
        expect(jar.csrfToken).toBeTruthy();

        const meRes = await request(app)
            .get('/auth/me')
            .set('Cookie', asHeader)
            .expect(200);

        expect(meRes.body.success).toBe(true);
        expect(meRes.body.client.username).toBe('alice');
    });

    test('/me is 401 without auth cookies', async () => {
        await request(app).get('/auth/me').expect(401);
    });

    test('login with wrong password returns generic 403', async () => {
        await request(app)
            .post('/auth/register')
            .send({ name: 'Bob', username: 'bobby', email: 'bob@example.com', password: STRONG_PW })
            .expect(201);

        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'bobby', password: 'WrongPass1!' })
            .expect(403);

        expect(res.body.message).toBe('Invalid Credentials');
    });

    test('login with unknown username returns the SAME generic 403', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'ghost', password: STRONG_PW })
            .expect(403);

        // Identical to the wrong-password case — no enumeration oracle.
        expect(res.body.message).toBe('Invalid Credentials');
    });

    test('register echoes a generic conflict regardless of which field collides', async () => {
        await request(app)
            .post('/auth/register')
            .send({ name: 'Test User', username: 'carol', email: 'carol@example.com', password: STRONG_PW })
            .expect(201);

        const sameEmail = await request(app)
            .post('/auth/register')
            .send({ name: 'Test User', username: 'carol2', email: 'carol@example.com', password: STRONG_PW })
            .expect(409);

        const sameUsername = await request(app)
            .post('/auth/register')
            .send({ name: 'Test User', username: 'carol', email: 'carol2@example.com', password: STRONG_PW })
            .expect(409);

        // Both return the same message — caller can't tell which collided.
        expect(sameEmail.body.message).toBe(sameUsername.body.message);
    });
});


describe('refresh + tokenVersion', () => {
    test('a fresh refresh cookie mints a new access cookie', async () => {
        const { jar, asHeader } = await registerAndLogin({
            username: 'dave',
            email: 'dave@example.com'
        });
        const originalAccess = jar.authToken;
        // Burn a clock tick so the new JWT's iat differs (otherwise the
        // payload — and the cookie — would be identical).
        await new Promise((r) => setTimeout(r, 1100));

        const res = await request(app)
            .post('/auth/refresh')
            .set('Cookie', asHeader)
            .expect(200);

        const { jar: jar2 } = parseSetCookies(res);
        expect(jar2.authToken).toBeTruthy();
        expect(jar2.authToken).not.toBe(originalAccess);
    });

    test('refresh without cookie → 401', async () => {
        await request(app).post('/auth/refresh').expect(401);
    });

    test('changing password bumps tokenVersion and invalidates other sessions', async () => {
        // Session A logs in.
        const A = await registerAndLogin({
            username: 'evelyn',
            email: 'eve@example.com'
        });

        // Session B logs in on a "different device" (just a second login).
        const loginB = await request(app)
            .post('/auth/login')
            .send({ username: 'evelyn', password: STRONG_PW })
            .expect(200);
        const B = parseSetCookies(loginB);

        // Session A changes the password — its own cookies should be
        // refreshed by the response, but session B's refresh cookie now
        // carries a stale tokenVersion.
        const NEW_PW = 'NewerPass2!';
        const change = await request(app)
            .patch('/auth/me/password')
            .set('Cookie', A.asHeader)
            .set('x-csrf-token', A.jar.csrfToken)
            .send({ currentPassword: STRONG_PW, newPassword: NEW_PW, confirmNewPassword: NEW_PW })
            .expect(200);

        expect(change.body.success).toBe(true);

        // Session B's refresh attempt should be rejected as "Session revoked".
        const stale = await request(app)
            .post('/auth/refresh')
            .set('Cookie', B.asHeader)
            .expect(401);
        expect(stale.body.message).toBe('Session revoked');

        // Session A's NEW cookies (returned from the password-change call)
        // should refresh cleanly because they were re-issued post-bump.
        const { asHeader: aAfter } = parseSetCookies(change);
        await request(app)
            .post('/auth/refresh')
            .set('Cookie', aAfter)
            .expect(200);
    });
});
