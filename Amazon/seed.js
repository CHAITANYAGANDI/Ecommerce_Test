/**
 * Seeds the Amazon products collection from the public DummyJSON API.
 *
 * Usage:
 *   node seed.js                # add new products, skip duplicates
 *   node seed.js --clear        # delete all products first, then seed
 *   node seed.js --count=100    # how many products to fetch (max 100)
 *   node seed.js --skip=50      # offset (use to pull different items than Walmart)
 *
 * Requires Node 18+ (uses native fetch).
 * Reads MONGO_CONN from .env.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ProductsModel = require('./Models/Product');


const args = process.argv.slice(2);
const clear = args.includes('--clear');
const count = parseInt((args.find((a) => a.startsWith('--count=')) || '--count=50').split('=')[1], 10);
const skip = parseInt((args.find((a) => a.startsWith('--skip=')) || '--skip=0').split('=')[1], 10);


const transform = (p) => ({
    name: p.title,
    description: p.description,
    price: p.price,
    category: p.category,
    brand: p.brand || 'Generic',
    features: [
        p.brand ? `Brand: ${p.brand}` : `Category: ${p.category}`,
        `Rating: ${p.rating}/5`,
        `Stock: ${p.stock} units`
    ],
    soldBy: 'Amazon',
    imageUrl: p.thumbnail || (Array.isArray(p.images) && p.images[0]) || '',
    inventory: {
        stock: p.stock,
        supplier: p.brand || 'Default Supplier',
        lastUpdated: new Date()
    },
    isActive: true,
    inStock: p.stock > 0
});


async function seed() {
    if (!process.env.MONGO_CONN) {
        console.error('MONGO_CONN not set in .env');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_CONN);
    console.log('[seed] Connected to MongoDB');

    if (clear) {
        const { deletedCount } = await ProductsModel.deleteMany({});
        console.log(`[seed] Cleared ${deletedCount} existing products`);
    }

    const url = `https://dummyjson.com/products?limit=${count}&skip=${skip}`;
    console.log(`[seed] Fetching ${url}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`DummyJSON returned ${resp.status}`);
    const { products } = await resp.json();
    console.log(`[seed] Got ${products.length} products`);

    const docs = products.map(transform).filter((d) => d.name && d.imageUrl);

    try {
        const result = await ProductsModel.insertMany(docs, { ordered: false });
        console.log(`[seed] Inserted ${result.length} products`);
    } catch (e) {
        const dupCount = (e.writeErrors || []).length;
        const inserted = (e.result && e.result.nInserted) || (e.insertedDocs && e.insertedDocs.length) || 0;
        console.log(`[seed] Inserted ${inserted} new, ${dupCount} duplicates skipped`);
    }

    await mongoose.disconnect();
    console.log('[seed] Done');
}


seed().catch((e) => {
    console.error('[seed] Failed:', e.message);
    process.exit(1);
});
