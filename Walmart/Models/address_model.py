from datetime import datetime
from mongoengine import Document, StringField, DateTimeField, ReferenceField
from Models.guest_customer_model import GuestCustomer


class Address(Document):
    """Shipping address as entered on Walmart's own checkout. Stored separately
    from orders so a customer can have multiple addresses on file."""

    customer = ReferenceField(GuestCustomer, required=True)
    full_name = StringField(required=True)
    line1 = StringField(required=True)
    line2 = StringField()
    city = StringField(required=True)
    state = StringField(required=True)
    postal_code = StringField(required=True)
    country = StringField(required=True, default='USA')
    phone = StringField()
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'indexes': ['customer'],
        'collection': 'Walmart_Addresses'
    }

    def to_json(self):
        return {
            '_id': str(self.id),
            'customerId': str(self.customer.id) if self.customer else None,
            'fullName': self.full_name,
            'line1': self.line1,
            'line2': self.line2,
            'city': self.city,
            'state': self.state,
            'postalCode': self.postal_code,
            'country': self.country,
            'phone': self.phone,
            'createdAt': self.created_at,
        }
