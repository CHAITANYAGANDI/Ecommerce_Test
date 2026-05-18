from datetime import datetime
from mongoengine import Document, StringField, DateTimeField


class GuestCustomer(Document):
    """Customer identity collected on Walmart's own checkout page. Deduped by
    email so a returning shopper reuses their record."""

    name = StringField(required=True)
    email = StringField(required=True, unique=True)
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'indexes': [{'fields': ['email'], 'unique': True}],
        'collection': 'Walmart_GuestCustomers'
    }

    def to_json(self):
        return {
            '_id': str(self.id),
            'name': self.name,
            'email': self.email,
            'createdAt': self.created_at,
        }
