const request = require('supertest');
const {
    getApp,
    waitForMongo,
    clearDatabase,
    closeMongo,
    registerAndLogin
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


describe('CSRF protection on authenticated state-changing routes', () => {
    test('POST /auth/logout without x-csrf-token → 403', async () => {
        const { asHeader } = await registerAndLogin({
            username: 'frank',
            email: 'frank@example.com'
        });

        const res = await request(app)
            .post('/auth/logout')
            .set('Cookie', asHeader)
            // no x-csrf-token header on purpose
            .expect(403);

        expect(res.body.message).toMatch(/csrf/i);
    });

    test('POST /auth/logout with mismatched x-csrf-token → 403', async () => {
        const { asHeader } = await registerAndLogin({
            username: 'gina',
            email: 'gina@example.com'
        });

        await request(app)
            .post('/auth/logout')
            .set('Cookie', asHeader)
            .set('x-csrf-token', 'not-the-right-token')
            .expect(403);
    });

    test('POST /auth/logout with matching cookie+header → 200', async () => {
        const { jar, asHeader } = await registerAndLogin({
            username: 'hank',
            email: 'hank@example.com'
        });

        const res = await request(app)
            .post('/auth/logout')
            .set('Cookie', asHeader)
            .set('x-csrf-token', jar.csrfToken)
            .expect(200);

        expect(res.body.success).toBe(true);
    });

    test('GET routes do NOT require csrf', async () => {
        const { asHeader } = await registerAndLogin({
            username: 'ivory',
            email: 'ivy@example.com'
        });

        await request(app)
            .get('/auth/me')
            .set('Cookie', asHeader)
            .expect(200);
    });

    test('PATCH /me/username without csrf → 403', async () => {
        const { asHeader } = await registerAndLogin({
            username: 'jake',
            email: 'jake@example.com'
        });

        await request(app)
            .patch('/auth/me/username')
            .set('Cookie', asHeader)
            .send({ username: 'jake_renamed' })
            .expect(403);
    });
});
