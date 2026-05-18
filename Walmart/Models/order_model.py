from datetime import datetime
from mongoengine import (
    Document, EmbeddedDocument, StringField, FloatField,
    DateTimeField, IntField, ReferenceField, ListField,
    EmbeddedDocumentField
)
from Models.guest_customer_model import GuestCustomer
from Models.address_model import Address


class OrderItem(EmbeddedDocument):
    provider_product_id = StringField(required=True)
    product_name = StringField(required=True)
    product_price = FloatField(required=True)
    quantity = IntField(required=True, min_value=1)


class Order(Document):
    """Order owned by Walmart (the provider). The referral_code field links
    back to the TrendyTreasures CheckoutIntent that drove this conversion."""

    provider_order_id = StringField(required=True, unique=True)
    referral_code = StringField()
    customer = ReferenceField(GuestCustomer, required=True)
    address = ReferenceField(Address, required=True)
    items = ListField(EmbeddedDocumentField(OrderItem))
    subtotal = FloatField(required=True)
    total = FloatField(required=True)
    order_status = StringField(
        required=True,
        choices=('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
        default='confirmed'
    )
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'indexes': [
            {'fields': ['provider_order_id'], 'unique': True},
            'referral_code',
        ],
        'collection': 'Walmart_Orders'
    }

    def to_json(self):
        return {
            '_id': str(self.id),
            'providerOrderId': self.provider_order_id,
            'referralCode': self.referral_code,
            'customerId': str(self.customer.id) if self.customer else None,
            'addressId': str(self.address.id) if self.address else None,
            'items': [
                {
                    'providerProductId': i.provider_product_id,
                    'productName': i.product_name,
                    'productPrice': i.product_price,
                    'quantity': i.quantity,
                }
                for i in self.items
            ],
            'subtotal': self.subtotal,
            'total': self.total,
            'orderStatus': self.order_status,
            'createdAt': self.created_at,
        }
