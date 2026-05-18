const ProductsModel = require('../Models/Product');


const getAllProductDetails = async (req, res) => {
  try {
    const products = await ProductsModel.find();

    if (!products.length) {
      return res.status(404).json({ message: "No products found." });
    }

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products." });
  }
};


const getProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await ProductsModel.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: "Error fetching product details." });
  }
};


module.exports = {
  getAllProductDetails,
  getProductDetails
};
