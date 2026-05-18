from flask import Blueprint, jsonify
from mongoengine.errors import DoesNotExist
from Models.product_model import Product
from Middlewares.authorization import ensure_authenticated

product_api = Blueprint('product_api', __name__)


@product_api.route('/get', methods=['GET'])
@ensure_authenticated
def get_all_products():
    try:
        products = Product.objects.all()
        if not products:
            return jsonify({'message': "No products found."}), 404
        return jsonify([product.to_json() for product in products]), 200
    except Exception as e:
        return jsonify({'message': "Error fetching products.", 'error': str(e)}), 500


@product_api.route('/<string:product_id>', methods=['GET'])
@ensure_authenticated
def get_product_details(product_id):
    try:
        product = Product.objects.get(id=product_id)
        return jsonify(product.to_json()), 200
    except DoesNotExist:
        return jsonify({'message': "Product not found."}), 404
    except Exception as e:
        return jsonify({'message': "Error fetching product details.", 'error': str(e)}), 500
