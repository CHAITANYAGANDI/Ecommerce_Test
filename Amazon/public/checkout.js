// Amazon's own checkout page. Reads only the referralCode from the URL,
// looks up the cart items via TrendyTreasures' public intent endpoint (no
// PII flows across the boundary), then collects customer / shipping details
// on this page, charges the card via Stripe, and posts an order to Amazon's
// own API. The order endpoint re-verifies the Stripe PaymentIntent server-
// side before persisting, so a tampered client can't fake "paid".

const TT_GATEWAY_URL = window.TT_GATEWAY_URL || 'http://localhost:7000';
const TRENDY_TREASURES_URL = window.TRENDY_TREASURES_URL || 'http://localhost:3001';
const PROVIDER_API = '';  // same origin (Amazon)
const SOURCE = 'amazon';

const $loading = document.getElementById('amz-loading');
const $error = document.getElementById('amz-error');
const $form = document.getElementById('amz-form');
const $items = document.getElementById('amz-items');
const $subtotal = document.getElementById('amz-subtotal');
const $total = document.getElementById('amz-total');
const $place = document.getElementById('amz-place');
const $cardElement = document.getElementById('amz-card-element');
const $cardError = document.getElementById('amz-card-error');

const fmt = (n) => `$${Number(n).toFixed(2)}`;

const showError = (msg) => {
    $loading.hidden = true;
    $form.hidden = true;
    $error.hidden = false;
    $error.innerHTML = msg;
};

const showCardError = (msg) => {
    $cardError.hidden = false;
    $cardError.textContent = msg;
};

const clearCardError = () => {
    $cardError.hidden = true;
    $cardError.textContent = '';
};

const fetchIntent = async (referralCode) => {
    const res = await fetch(`${TT_GATEWAY_URL}/api/v1/user/checkout/intent/${encodeURIComponent(referralCode)}`);
    if (!res.ok) throw new Error('This checkout link is invalid or has expired.');
    return res.json();
};

const renderItems = (items) => {
    let subtotal = 0;
    $items.innerHTML = items.map((item) => {
        const price = Number(item.productPrice || 0);
        const qty = Number(item.quantity || 1);
        subtotal += price * qty;
        return `
            <div class="amz-item">
                <img class="amz-item-img" src="${item.productImageUrl || ''}" alt="${item.productName || ''}">
                <div>
                    <h3 class="amz-item-name">${item.productName || 'Product'}</h3>
                    <p class="amz-item-meta">Sold by Amazon</p>
                    <p class="amz-item-meta">Quantity: ${qty}</p>
                    <p class="amz-item-meta" style="color:var(--amz-success);">Eligible for free Prime shipping</p>
                </div>
                <div class="amz-item-price">${fmt(price * qty)}</div>
            </div>`;
    }).join('');
    return subtotal;
};

const enrichItemsWithProductDetails = async (items) => {
    return Promise.all(items.map(async (item) => {
        if (item.productImageUrl) return item;
        try {
            const res = await fetch(`${TT_GATEWAY_URL}/api/v1/amazon/products/${encodeURIComponent(item.providerProductId)}`);
            if (!res.ok) return item;
            const data = await res.json();
            const product = data.product || data;
            return {
                ...item,
                productImageUrl: product.imageUrl,
                productName: item.productName || product.name,
                productPrice: item.productPrice ?? product.price
            };
        } catch {
            return item;
        }
    }));
};

const createPaymentIntent = async (amount, referralCode) => {
    const res = await fetch(`${PROVIDER_API}/payments/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'usd', referralCode })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Could not initialize payment.');
    return data;
};

const placeOrderOnServer = async ({ referralCode, items, form, paymentIntentId }) => {
    const payload = {
        referralCode,
        paymentIntentId,
        customer: {
            name: form.customerName.value.trim(),
            email: form.customerEmail.value.trim()
        },
        address: {
            fullName: form.customerName.value.trim(),
            line1: form.addressLine1.value.trim(),
            line2: form.addressLine2.value.trim(),
            city: form.city.value.trim(),
            state: form.state.value.trim(),
            postalCode: form.postalCode.value.trim(),
            country: form.country.value.trim() || 'USA',
            phone: form.phone.value.trim()
        },
        items: items.map((i) => ({
            providerProductId: i.providerProductId,
            productName: i.productName,
            productPrice: i.productPrice,
            quantity: i.quantity
        }))
    };

    const res = await fetch(`${PROVIDER_API}/orders/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Amazon could not complete your order.');
    return data;
};

const init = async () => {
    const params = new URLSearchParams(window.location.search);
    const referralCode = params.get('ref');

    if (!referralCode) {
        showError('Missing referral code. Please return to TrendyTreasures and try again.');
        return;
    }
    if (!window.Stripe || !window.STRIPE_PK) {
        showError('Stripe is not configured on this server. Set STRIPE_PUBLISHABLE_KEY in Amazon/.env and restart.');
        return;
    }

    try {
        const intent = await fetchIntent(referralCode);
        if (intent.provider !== SOURCE) {
            showError(`This checkout was meant for ${intent.provider}, not Amazon.`);
            return;
        }
        if (intent.status === 'completed') {
            showError('This order has already been placed.');
            return;
        }

        const items = await enrichItemsWithProductDetails(intent.items || []);
        const subtotal = renderItems(items);
        $subtotal.textContent = fmt(subtotal);
        $total.textContent = fmt(subtotal);

        // Create the Stripe PaymentIntent up-front so the buyer's submit click
        // doesn't pay a network round-trip before being able to charge.
        const { clientSecret, paymentIntentId } = await createPaymentIntent(subtotal, referralCode);

        const stripe = window.Stripe(window.STRIPE_PK);
        const elements = stripe.elements();
        const card = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#0F1111',
                    fontFamily: 'Amazon Ember, Arial, sans-serif',
                    '::placeholder': { color: '#888' }
                },
                invalid: { color: '#B12704' }
            }
        });
        card.mount($cardElement);
        card.on('change', (e) => {
            if (e.error) showCardError(e.error.message);
            else clearCardError();
        });

        $loading.hidden = true;
        $form.hidden = false;

        $form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearCardError();
            $place.disabled = true;
            $place.textContent = 'Processing payment…';

            try {
                const billingName = $form.customerName.value.trim();
                const billingEmail = $form.customerEmail.value.trim();

                const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                    payment_method: {
                        card,
                        billing_details: {
                            name: billingName,
                            email: billingEmail,
                            address: {
                                line1: $form.addressLine1.value.trim(),
                                line2: $form.addressLine2.value.trim(),
                                city: $form.city.value.trim(),
                                state: $form.state.value.trim(),
                                postal_code: $form.postalCode.value.trim(),
                                country: 'US'
                            }
                        }
                    }
                });

                if (stripeError) {
                    showCardError(stripeError.message);
                    $place.disabled = false;
                    $place.textContent = 'Place your order';
                    return;
                }
                if (!paymentIntent || paymentIntent.status !== 'succeeded') {
                    showCardError('Payment could not be completed.');
                    $place.disabled = false;
                    $place.textContent = 'Place your order';
                    return;
                }

                $place.textContent = 'Placing your order…';
                const result = await placeOrderOnServer({
                    referralCode,
                    items,
                    form: $form,
                    paymentIntentId: paymentIntent.id
                });
                window.location.href = `/confirmation?orderId=${encodeURIComponent(result.providerOrderId)}&total=${encodeURIComponent(subtotal.toFixed(2))}&items=${items.length}`;
            } catch (err) {
                $place.disabled = false;
                $place.textContent = 'Place your order';
                showError(err.message);
            }
        });
    } catch (err) {
        showError(err.message || 'Something went wrong loading this checkout.');
    }
};

window.TRENDY_TREASURES_BACK = `${TRENDY_TREASURES_URL}/home`;
init();
