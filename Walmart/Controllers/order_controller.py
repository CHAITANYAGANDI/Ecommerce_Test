import os
import secrets
import time
import traceback
import urllib.request
import urllib.error
from threading import Thread
from flask import Blueprint, request, jsonify
from mongoengine.errors import NotUniqueError, ValidationError
import json
import stripe

from Models.guest_customer_model import GuestCustomer
from Models.address_model import Address
from Models.order_model import Order, OrderItem
from Models.payment_model import Payment
from Services.checkout_intent_service import (
    CheckoutIntentError,
    subtotal_for_items,
    trusted_items_for_referral,
)


order_api = Blueprint('order_api', __name__)

# Server-to-server callback to TrendyTreasures: tells the aggregator that the
# referral converted. Fire-and-forget — provider success doesn't depend on
# the aggregator's bookkeeping.
TT_GATEWAY_URL = os.environ.get('TT_GATEWAY_URL', 'http://localhost:7000')


def _generate_provider_order_id():
    return f"WMT-{int(time.time())}-{secrets.token_hex(2).upper()}"


def _ensure_stripe():
    secret = os.environ.get('STRIPE_SECRET_KEY')
    if not secret:
        return False
    stripe.api_key = secret
    return True


def _notify_aggregator(referral_code, provider_order_id):
    if not referral_code:
        return
    url = f"{TT_GATEWAY_URL}/api/v1/user/checkout/intent/{referral_code}/complete"
    payload = json.dumps({'providerOrderId': provider_order_id}).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            'Content-Type': 'application/json',
            **({'x-internal-auth': os.environ.get('INTERNAL_AUTH_SECRET')} if os.environ.get('INTERNAL_AUTH_SECRET') else {})
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as _:
            pass
    except (urllib.error.URLError, Exception) as e:
        print(f"[walmart] Failed to notify aggregator for referral {referral_code}: {e}", flush=True)


@order_api.route('/place', methods=['POST'])
def place_order():
    try:
        data = request.get_json() or {}

        customer_data = data.get('customer') or {}
        address_data = data.get('address') or {}
        referral_code = data.get('referralCode')
        payment_intent_id = data.get('paymentIntentId')
        trusted_items = trusted_items_for_referral(referral_code)

        if not customer_data.get('name') or not customer_data.get('email'):
            return jsonify({'message': 'customer.name and customer.email are required.'}), 400
        if not all(address_data.get(k) for k in ('line1', 'city', 'state', 'postalCode')):
            return jsonify({'message': 'shipping address is incomplete.'}), 400
        if not payment_intent_id:
            return jsonify({'message': 'paymentIntentId is required.'}), 400

        # Verify the Stripe charge ourselves — never trust client claims of "paid".
        if not _ensure_stripe():
            return jsonify({'message': 'Stripe is not configured. Set STRIPE_SECRET_KEY.'}), 503

        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        except stripe.error.StripeError as e:
            return jsonify({'message': f'Stripe verification failed: {e}'}), 502

        if intent.status != 'succeeded':
            return jsonify({'message': f'Payment not completed (status: {intent.status}).'}), 402
        metadata = getattr(intent, 'metadata', None) or {}
        if metadata.get('provider') != 'walmart':
            return jsonify({'message': 'PaymentIntent belongs to another provider.'}), 400
        if metadata.get('referralCode') != referral_code:
            return jsonify({'message': 'PaymentIntent does not match this checkout referral.'}), 400

        # Defense in depth: server-side total must match the amount Stripe captured.
        order_items = [
            OrderItem(
                provider_product_id=str(i['providerProductId']),
                product_name=i['productName'],
                product_price=float(i['productPrice']),
                quantity=int(i['quantity']),
            )
            for i in trusted_items
        ]
        subtotal = subtotal_for_items(trusted_items)
        expected_amount_cents = int(round(subtotal * 100))
        if intent.amount != expected_amount_cents:
            return jsonify({
                'message': f'Payment amount mismatch (paid {intent.amount}, expected {expected_amount_cents}).'
            }), 400

        # Idempotency: if this PaymentIntent already produced an order, return it
        # instead of double-shipping.
        existing_payment = Payment.objects(stripe_payment_intent_id=payment_intent_id).first()
        if existing_payment:
            existing_order = existing_payment.order
            return jsonify({
                'success': True,
                'providerOrderId': existing_order.provider_order_id,
                'orderStatus': existing_order.order_status,
                'total': existing_order.total,
                'duplicate': True,
            }), 200

        # Upsert the guest customer by email so a returning shopper reuses their record.
        email = customer_data['email'].strip().lower()
        try:
            customer = GuestCustomer.objects.get(email=email)
        except GuestCustomer.DoesNotExist:
            customer = GuestCustomer(name=customer_data['name'], email=email)
            customer.save()

        address = Address(
            customer=customer,
            full_name=address_data.get('fullName') or customer_data['name'],
            line1=address_data['line1'],
            line2=address_data.get('line2', ''),
            city=address_data['city'],
            state=address_data['state'],
            postal_code=address_data['postalCode'],
            country=address_data.get('country', 'USA'),
            phone=address_data.get('phone', ''),
        )
        address.save()

        order = Order(
            provider_order_id=_generate_provider_order_id(),
            referral_code=referral_code,
            customer=customer,
            address=address,
            items=order_items,
            subtotal=subtotal,
            total=intent.amount / 100.0,
            order_status='confirmed',
        )
        order.save()

        # Pull payment-method details out of the Stripe intent so the receipt
        # can show "Visa ending in 4242" without us ever touching raw card data.
        charge = intent.charges.data[0] if getattr(intent, 'charges', None) and intent.charges.data else None
        card = charge.payment_method_details.card if charge and charge.payment_method_details else None

        Payment(
            order=order,
            payment_provider='Stripe',
            transaction_id=payment_intent_id,
            stripe_payment_intent_id=payment_intent_id,
            amount=intent.amount / 100.0,
            currency=intent.currency or 'usd',
            payment_status='paid',
            card_last4=card.last4 if card else '',
            card_brand=card.brand if card else '',
        ).save()

        # Best-effort callback to TrendyTreasures, off the request path.
        Thread(
            target=_notify_aggregator,
            args=(order.referral_code, order.provider_order_id),
            daemon=True,
        ).start()

        return jsonify({
            'success': True,
            'providerOrderId': order.provider_order_id,
            'orderStatus': order.order_status,
            'total': order.total,
        }), 201

    except NotUniqueError:
        return jsonify({'message': 'Duplicate transaction.'}), 409
    except CheckoutIntentError as e:
        return jsonify({'message': str(e)}), e.status
    except ValidationError as ve:
        return jsonify({'message': 'Validation error', 'error': str(ve)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': 'Failed to place order.', 'error': str(e)}), 500
