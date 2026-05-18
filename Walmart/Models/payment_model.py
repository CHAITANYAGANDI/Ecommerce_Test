from datetime import datetime
from mongoengine import Document, StringField, FloatField, DateTimeField, ReferenceField
from Models.order_model import Order


class Payment(Document):
    """Payment metadata only — raw card details are never stored. The card
    form on the checkout page validates client-side; this record holds just
    what's needed to reason about the transaction."""

    order = ReferenceField(Order, required=True)
    payment_provider = StringField(required=True, default='Stripe')
    transaction_id = StringField(required=True, unique=True)
    stripe_payment_intent_id = StringField()
    amount = FloatField(required=True)
    currency = StringField(default='usd')
    payment_status = StringField(
        required=True,
        choices=('pending', 'paid', 'failed', 'refunded'),
        default='paid'
    )
    card_last4 = StringField()
    card_brand = StringField()
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'indexes': [
            {'fields': ['transaction_id'], 'unique': True},
            'order',
        ],
        'collection': 'Walmart_Payments'
    }
