const mongoose = require('mongoose');

const mongo_url = process.env.MONGO_CONN;

if (!mongo_url) {
    console.error('[Amazon] MONGO_CONN is not set. Refusing to start.');
    process.exit(1);
}

mongoose.connect(mongo_url)
    .then(() => {
        console.log('MongoDB Connected....');
    })
    .catch((err) => {
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1);
    });
