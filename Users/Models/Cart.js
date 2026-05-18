const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productDescription: {
    type: String,
    required: true
  },
  productImageUrl: {
    type: String,
    required: true
  },
  productPrice: {
    type: Number,
    required: true
  },
  productQuantity: {
    type: Number,
    required: true
  },
  productSoldBy: {
    type: String,
    required: true
  },
  source: {
    type: String,
    lowercase: true,
    enum: ['amazon', 'walmart', undefined]
  },
  providerProductId: {
    type: String
  }
});

const Cart = mongoose.model('cart', cartSchema);

module.exports = Cart;
