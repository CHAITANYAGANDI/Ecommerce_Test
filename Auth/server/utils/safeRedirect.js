// URL safety helpers. Used to validate redirect URIs and outbound callback
// targets so an attacker who controls a credential record (or who tampers
// with form input) can't pivot us into hitting internal services or
// turning the server into an open redirector.

const dns = require('dns').promises;
const net = require('net');

const isProd = () => process.env.NODE_ENV === 'production';

const PRIVATE_V4_CIDRS = [
    [0x00000000, 8],         // 0.0.0.0/8
    [0x0A000000, 8],         // 10.0.0.0/8
    [0x7F000000, 8],         // 127.0.0.0/8
    [0xA9FE0000, 16],        // 169.254.0.0/16
    [0xAC100000, 12],        // 172.16.0.0/12
    [0xC0A80000, 16],        // 192.168.0.0/16
    [0xC6120000, 15]         // 198.18.0.0/15
];

const ipv4ToInt = (ip) =>
    ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;

const isPrivateIPv4 = (ip) => {
    const num = ipv4ToInt(ip);
    for (const [base, bits] of PRIVATE_V4_CIDRS) {
        const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
        if ((num & mask) === (base & mask)) return true;
    }
    return false;
};

const isPrivateIPv6 = (ip) => {
    const lc = ip.toLowerCase();
    return (
        lc === '::1' ||
        lc.startsWith('fc') ||
        lc.startsWith('fd') ||
        lc.startsWith('fe80:') ||
        lc.startsWith('::ffff:127.') ||
        lc.startsWith('::ffff:10.') ||
        lc.startsWith('::ffff:192.168.') ||
        lc.startsWith('::ffff:172.')
    );
};

// Synchronous static checks — no DNS. Good for blocking obvious
// `localhost`, `127.0.0.1`, and literal private IPs at credential
// creation time. For runtime SSRF protection use `assertSafeOutbound`.
const isStaticallySafeUrl = (raw) => {
    try {
        const u = new URL(raw);
        if (u.protocol !== 'https:' && !(u.protocol === 'http:' && !isProd())) return false;
        const host = u.hostname;
        if (!host) return false;
        const lh = host.toLowerCase();
        if (lh === 'localhost' || lh === 'localhost.localdomain') return false;
        if (lh.endsWith('.local') || lh.endsWith('.internal')) return false;
        if (net.isIPv4(host) && isPrivateIPv4(host)) return false;
        if (net.isIPv6(host) && isPrivateIPv6(host)) return false;
        return true;
    } catch {
        return false;
    }
};

// Runtime SSRF check: resolve the hostname, refuse if any A/AAAA record
// points at a private range. DNS-rebinding-aware callers should pin the
// resolved IP and reuse it for the actual request.
const assertSafeOutbound = async (raw) => {
    const u = new URL(raw);
    const host = u.hostname;

    // Literal IPs: check directly.
    if (net.isIP(host)) {
        if (net.isIPv4(host) && isPrivateIPv4(host)) {
            throw new Error('Refusing to call private IPv4 address');
        }
        if (net.isIPv6(host) && isPrivateIPv6(host)) {
            throw new Error('Refusing to call private IPv6 address');
        }
        return host;
    }

    // Hostname: resolve and verify every record is public.
    const records = await dns.lookup(host, { all: true });
    for (const r of records) {
        if (r.family === 4 && isPrivateIPv4(r.address)) {
            throw new Error(`Refusing to call ${host}: resolves to private IPv4 ${r.address}`);
        }
        if (r.family === 6 && isPrivateIPv6(r.address)) {
            throw new Error(`Refusing to call ${host}: resolves to private IPv6 ${r.address}`);
        }
    }
    return records[0]?.address || host;
};

module.exports = {
    isStaticallySafeUrl,
    assertSafeOutbound
};
