const mongoose = require('mongoose');

const uri = process.env.MONGO_CONN;

if (!uri) {
    console.warn('MONGO_CONN is not set; APIGateway cannot inject product access tokens until it is configured.');
} else {
    mongoose.connect(uri)
        .then(() => console.log('APIGateway connected to MongoDB'))
        .catch((err) => console.error('APIGateway MongoDB connection error:', err.message));
}
