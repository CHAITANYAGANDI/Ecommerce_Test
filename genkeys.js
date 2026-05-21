const { generateKeyPairSync } = require('crypto');

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const escape = (pem) => pem.replace(/\n/g, '\\n');

console.log('');
console.log('=== PASTE THIS INTO Render -> API Gateway -> GATEWAY_PRIVATE_KEY ===');
console.log(escape(privateKey));
console.log('');
console.log('=== PASTE THIS INTO Render -> Auth server -> GATEWAY_PUBLIC_KEY ===');
console.log(escape(publicKey));
console.log('');
