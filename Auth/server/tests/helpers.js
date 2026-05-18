// Test helpers. The app is loaded lazily so globalSetup's env writes are
// in place before any controller imports run.

const mongoose = require('mongoose');

let app;
const getApp = () => {
    if (!app) app = require('../app');
    return app;
};

// supertest writes cookies as a `set-cookie` array. Parse into a
// { name: value } map so tests can read/echo specific cookies and an
// `asHeader` string that can be replayed via `.set('Cookie', ...)`.
const parseSetCookies = (res) => {
    const raw = res.headers['set-cookie'] || [];
    const arr = Array.isArray(raw) ? raw : [raw];
    const jar = {};
    const pairs = [];
    for (const line of arr) {
        const first = line.split(';', 1)[0];
        const eq = first.indexOf('=');
        if (eq === -1) continue;
        const name = first.slice(0, eq);
        const value = first.slice(eq + 1);
        jar[name] = value;
        pairs.push(`${name}=${value}`);
    }
    return { jar, asHeader: pairs.join('; ') };
};

// Wait until Mongo is connected. Tests that touch the DB should await
// this once before they start — globalSetup hands us the URI but the
// connection itself opens asynchronously when app.js loads dbConnection.
const waitForMongo = async () => {
    if (mongoose.connection.readyState === 1) return;
    await new Promise((resolve, reject) => {
        mongoose.connection.once('open', resolve);
        mongoose.connection.once('error', reject);
    });
};

// Wipe every collection between test files for isolation. Faster than
// dropping and re-creating the database.
const clearDatabase = async () => {
    if (mongoose.connection.readyState !== 1) return;
    const cols = await mongoose.connection.db.collections();
    await Promise.all(cols.map((c) => c.deleteMany({})));
};

const closeMongo = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
};

// Convenience: register + login a user, return the cookies needed to
// hit authenticated routes (auth, refresh, csrf).
const request = require('supertest');

const STRONG_PW = 'TestPass1!';

const registerAndLogin = async ({
    name = 'Test User',
    username,
    email,
    password = STRONG_PW
}) => {
    const a = getApp();
    await request(a)
        .post('/auth/register')
        .send({ name, username, email, password })
        .expect(201);

    const loginRes = await request(a)
        .post('/auth/login')
        .send({ username, password })
        .expect(200);

    return parseSetCookies(loginRes);
};

module.exports = {
    getApp,
    parseSetCookies,
    waitForMongo,
    clearDatabase,
    closeMongo,
    registerAndLogin,
    STRONG_PW
};
