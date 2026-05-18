const CartModel = require('../Models/Cart');

const normalizeSource = (source) => {
  const value = String(source || '').trim().toLowerCase();
  return ['amazon', 'walmart'].includes(value) ? value : undefined;
};

const deriveSource = (source, soldBy) => {
  const normalized = normalizeSource(source);
  if (normalized) return normalized;

  const seller = String(soldBy || '').toLowerCase();
  if (seller.includes('walmart')) return 'walmart';
  if (seller.includes('amazon')) return 'amazon';
  return undefined;
};

// The cart is keyed by the buyer's email, which is the stable identifier
// already present on req.user after Authorization middleware runs. Trusting
// a client-supplied userId here was an IDOR — any logged-in buyer could
// read or mutate any other buyer's cart by passing a different email.
const buyerEmail = (req) => req.user && req.user.email;


const getCartItems = async (req, res) => {
  try {
    const userId = buyerEmail(req);
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const cartItems = await CartModel.find({ userId });

    if (cartItems.length === 0) {
      return res.status(404).json({ message: "No items found in the cart." });
    }

    res.status(200).json({ cartItems });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).json({ message: "Error fetching cart items." });
  }
};


const postCartDetails = async (req, res) => {
  try {
    const userId = buyerEmail(req);
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const {
      productName,
      productDescription,
      productImageUrl,
      productPrice,
      productQuantity,
      productSoldBy,
      source,
      providerProductId,
    } = req.body;

    if (
      !productName ||
      !productPrice ||
      !productImageUrl ||
      !productQuantity ||
      !productSoldBy
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (productQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than zero." });
    }

    const normalizedSource = deriveSource(source, productSoldBy);
    const normalizedProviderProductId = providerProductId ? String(providerProductId) : undefined;
    const lookupOptions = [];

    if (normalizedSource && normalizedProviderProductId) {
      lookupOptions.push({ source: normalizedSource, providerProductId: normalizedProviderProductId });
    }
    if (normalizedSource) {
      lookupOptions.push({ productName, source: normalizedSource });
    }
    lookupOptions.push({ productName, source: { $exists: false } });
    lookupOptions.push({ productName, source: null });

    const existingCartItem = await CartModel.findOne({
      userId,
      $or: lookupOptions,
    });

    if (existingCartItem) {
      existingCartItem.productQuantity += Number(productQuantity);
      existingCartItem.productDescription = productDescription || existingCartItem.productDescription;
      existingCartItem.productImageUrl = productImageUrl || existingCartItem.productImageUrl;
      existingCartItem.productPrice = productPrice || existingCartItem.productPrice;
      existingCartItem.productSoldBy = productSoldBy || existingCartItem.productSoldBy;
      if (normalizedSource) existingCartItem.source = normalizedSource;
      if (normalizedProviderProductId) existingCartItem.providerProductId = normalizedProviderProductId;
      const updated = await existingCartItem.save();

      return res.status(200).json({
        success: true,
        message: "Cart item quantity updated.",
        cartItem: updated,
      });
    }

    const cartItem = {
      userId,
      productName,
      productDescription,
      productImageUrl,
      productPrice,
      productQuantity,
      productSoldBy,
      source: normalizedSource,
      providerProductId: normalizedProviderProductId,
    };

    const savedCartItem = await CartModel.create(cartItem);

    return res.status(201).json({
      success: true,
      message: "Product added to cart successfully.",
      cartItem: savedCartItem,
    });

  } catch (error) {
    console.error("Error adding product to cart:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};


const updateCartItem = async (req, res) => {
  try {
    const userId = buyerEmail(req);
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { productName, productQuantity } = req.body;

    if (!productName || productQuantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: productName and productQuantity.",
      });
    }

    if (productQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero.",
      });
    }

    const cartItem = await CartModel.findOne({ userId, productName });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    cartItem.productQuantity = productQuantity;
    const updatedCartItem = await cartItem.save();

    return res.status(200).json({
      success: true,
      message: "Cart item updated successfully.",
      cartItem: updatedCartItem,
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


const removeCartItem = async (req, res) => {
  try {
    const userId = buyerEmail(req);
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { productName } = req.body;

    if (!productName) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: productName.",
      });
    }

    const deletedItem = await CartModel.findOneAndDelete({ userId, productName });

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart item removed successfully.",
      deletedItem,
    });
  } catch (error) {
    console.error("Error removing cart item:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};


module.exports = { getCartItems, postCartDetails, updateCartItem, removeCartItem };
