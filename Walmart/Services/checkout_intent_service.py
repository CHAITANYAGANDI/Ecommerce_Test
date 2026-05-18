import json
import os
from urllib.parse import quote
from urllib.request import urlopen
from urllib.error import HTTPError, URLError

from mongoengine.errors import DoesNotExist, ValidationError

from Models.product_model import Product


TT_GATEWAY_URL = os.environ.get('TT_GATEWAY_URL', 'http://localhost:7000')
PROVIDER = 'walmart'


class CheckoutIntentError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def _fetch_checkout_intent(referral_code):
    if not isinstance(referral_code, str) or not referral_code:
        raise CheckoutIntentError('referralCode is required.', 400)

    url = f"{TT_GATEWAY_URL}/api/v1/user/checkout/intent/{quote(referral_code, safe='')}"
    try:
        with urlopen(url, timeout=5) as resp:
            payload = json.loads(resp.read().decode('utf-8'))
    except HTTPError as e:
        try:
            payload = json.loads(e.read().decode('utf-8'))
            message = payload.get('message') or 'Checkout referral not found.'
        except Exception:
            message = 'Checkout referral not found.'
        raise CheckoutIntentError(message, e.code)
    except URLError:
        raise CheckoutIntentError('Checkout referral service is unavailable.', 502)

    if payload.get('provider') != PROVIDER:
        raise CheckoutIntentError('Checkout referral belongs to another provider.', 400)
    if payload.get('status') == 'completed':
        raise CheckoutIntentError('This checkout has already been completed.', 409)
    return payload


def trusted_items_for_referral(referral_code):
    intent = _fetch_checkout_intent(referral_code)
    items = []

    for item in intent.get('items') or []:
        product_id = str(item.get('providerProductId') or '')
        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except (DoesNotExist, ValidationError):
            raise CheckoutIntentError('Checkout referral contains an unavailable product.', 409)

        quantity = max(1, int(item.get('quantity') or 1))
        items.append({
            'providerProductId': str(product.id),
            'productName': product.name,
            'productPrice': float(product.price),
            'quantity': quantity,
        })

    if not items:
        raise CheckoutIntentError('Checkout referral has no items.', 400)

    return items


def subtotal_for_items(items):
    return sum(float(item['productPrice']) * int(item['quantity']) for item in items)
