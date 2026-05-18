const mongoose = require('mongoose');

const mongo_url = process.env.MONGO_CONN;

if (!mongo_url) {
    // eslint-disable-next-line no-console
    console.error('[Auth/server] MONGO_CONN is not set. Refusing to start.');
    process.exit(1);
}

mongoose
    .connect(mongo_url, {
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        maxPoolSize: 20,
        minPoolSize: 2,
        // Retry transient failures during cluster failover instead of
        // killing in-flight requests.
        retryWrites: true
    })
    .then(() => {
        // eslint-disable-next-line no-console
        console.log('MongoDB Connected....');
    })
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1);
    });

module.exports = mongoose;
