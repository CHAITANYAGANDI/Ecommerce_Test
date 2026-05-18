import os
from flask import Blueprint, request, jsonify
import stripe
from Services.checkout_intent_service import (
    CheckoutIntentError,
    subtotal_for_items,
    trusted_items_for_referral,
)


payment_api = Blueprint('payment_api', __name__)


def _ensure_stripe():
    """Configure Stripe lazily so the service still boots without keys; the
    endpoint just returns a clear 503 instead."""
    secret = os.environ.get('STRIPE_SECRET_KEY')
    if not secret:
        return False
    stripe.api_key = secret
    return True


@payment_api.route('/create-intent', methods=['POST'])
def create_payment_intent():
    """Create a Stripe PaymentIntent for the cart total. Amount is converted
    to the smallest currency unit (cents for USD). The browser uses the
    returned clientSecret to confirm the card via Stripe.js; the /orders/place
    endpoint then verifies the PaymentIntent succeeded server-side before
    persisting the order."""
    if not _ensure_stripe():
        return jsonify({'message': 'Stripe is not configured. Set STRIPE_SECRET_KEY.'}), 503

    try:
        data = request.get_json() or {}
        referral_code = data.get('referralCode', '')
        currency = data.get('currency', 'usd')
        items = trusted_items_for_referral(referral_code)
        amount = subtotal_for_items(items)

        intent = stripe.PaymentIntent.create(
            amount=int(round(amount * 100)),
            currency=currency,
            automatic_payment_methods={'enabled': True},
            metadata={
                'provider': 'walmart',
                'referralCode': referral_code,
            },
        )

        return jsonify({
            'clientSecret': intent.client_secret,
            'paymentIntentId': intent.id,
        }), 200

    except CheckoutIntentError as e:
        return jsonify({'message': str(e)}), e.status
    except stripe.error.StripeError as e:
        return jsonify({'message': str(e)}), 500
    except Exception as e:
        return jsonify({'message': f'Failed to create payment intent: {e}'}), 500
