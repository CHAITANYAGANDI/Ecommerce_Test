import React, { useEffect, useMemo, useState } from 'react';
import { fetchPriceHistory } from '../utils';

// Tailwind has the brand color palette; we just need raw hex values for SVG.
const LINE = '#4f46e5';      // brand-600
const AREA = '#6366f1';      // brand-500
const AXIS = '#94a3b8';      // ink-400-ish
const GRID = '#e2e8f0';      // ink-100

const RANGE_OPTIONS = [
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 }
];

const fmtPrice = (n) => `$${Number(n).toFixed(2)}`;
const fmtDate = (d) => {
    const x = new Date(d);
    return `${x.toLocaleString('en-US', { month: 'short' })} ${x.getDate()}`;
};

// Renders an SVG line chart from a list of { price, snapshotted_at } points.
// Inline SVG is enough at this scale (≤365 points) and avoids pulling in
// Recharts/Chart.js (~80kB gzipped each) into the production bundle.
function PriceHistoryChart({ provider, productId, currentPrice }) {
    const [days, setDays] = useState(30);
    const [snapshots, setSnapshots] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchPriceHistory(provider, productId, days).then((data) => {
            if (cancelled) return;
            setSnapshots(data || []);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [provider, productId, days]);

    const stats = useMemo(() => {
        if (!snapshots || snapshots.length === 0) return null;
        const prices = snapshots.map((s) => s.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const first = snapshots[0].price;
        const last = snapshots[snapshots.length - 1].price;
        const delta = last - first;
        const deltaPct = first > 0 ? (delta / first) * 100 : 0;
        return { min, max, first, last, delta, deltaPct };
    }, [snapshots]);

    // Pre-compute SVG geometry. ViewBox is 600x180 with 40/30/20/20 padding.
    const geometry = useMemo(() => {
        if (!snapshots || snapshots.length === 0) return null;
        const W = 600, H = 180;
        const P = { t: 20, r: 20, b: 30, l: 40 };
        const innerW = W - P.l - P.r;
        const innerH = H - P.t - P.b;

        const prices = snapshots.map((s) => s.price);
        let minY = Math.min(...prices);
        let maxY = Math.max(...prices);
        // Pad the range so a perfectly flat history still renders mid-chart
        // and isolated highs/lows have visual headroom.
        if (minY === maxY) { minY = minY * 0.9; maxY = maxY * 1.1; }
        const padY = (maxY - minY) * 0.1;
        minY -= padY; maxY += padY;

        const firstT = new Date(snapshots[0].snapshotted_at).getTime();
        const lastT = new Date(snapshots[snapshots.length - 1].snapshotted_at).getTime();
        const spanT = Math.max(1, lastT - firstT);

        const x = (t) => P.l + ((new Date(t).getTime() - firstT) / spanT) * innerW;
        const y = (price) => P.t + (1 - (price - minY) / (maxY - minY)) * innerH;

        const points = snapshots.map((s) => ({ x: x(s.snapshotted_at), y: y(s.price), ...s }));
        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(P.t + innerH).toFixed(1)} L${points[0].x.toFixed(1)},${(P.t + innerH).toFixed(1)} Z`;

        // Y-axis gridlines + labels (3 ticks: min, mid, max in price space).
        const yTicks = [minY, (minY + maxY) / 2, maxY].map((v) => ({ value: v, y: y(v) }));

        return { W, H, P, innerW, innerH, points, linePath, areaPath, yTicks, firstT, lastT };
    }, [snapshots]);

    return (
        <section className="rounded-2xl border border-ink-100 bg-white/90 p-5">
            <header className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-bold text-ink-900">Price history</h2>
                    <p className="text-xs text-ink-500 mt-0.5">
                        Snapshots are taken when shoppers view this product.
                    </p>
                </div>
                <div className="inline-flex rounded-full bg-ink-100/80 p-1">
                    {RANGE_OPTIONS.map((opt) => (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={() => setDays(opt.days)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                days === opt.days
                                    ? 'bg-white text-brand-700 shadow-sm'
                                    : 'text-ink-500 hover:text-ink-700'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="h-[180px] flex items-center justify-center text-sm text-ink-400 animate-pulse">
                    Loading price history…
                </div>
            ) : !snapshots || snapshots.length === 0 ? (
                <div className="h-[180px] flex flex-col items-center justify-center text-center gap-2 text-sm text-ink-500">
                    <p className="font-medium text-ink-700">No price history yet.</p>
                    <p className="text-xs">
                        We'll start tracking the price{currentPrice ? ` (${fmtPrice(currentPrice)})` : ''} from this view onward.
                    </p>
                </div>
            ) : (
                <>
                    {stats && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <Stat label="Current" value={fmtPrice(stats.last)} />
                            <Stat label={`${days}d low`} value={fmtPrice(stats.min)} />
                            <Stat label={`${days}d high`} value={fmtPrice(stats.max)} />
                            <Stat
                                label="Change"
                                value={`${stats.delta >= 0 ? '+' : ''}${fmtPrice(stats.delta)} (${stats.deltaPct.toFixed(1)}%)`}
                                tone={stats.delta < 0 ? 'good' : stats.delta > 0 ? 'bad' : 'neutral'}
                            />
                        </div>
                    )}

                    {geometry && (
                        <svg
                            viewBox={`0 0 ${geometry.W} ${geometry.H}`}
                            className="w-full h-auto"
                            role="img"
                            aria-label={`Price history line chart spanning ${days} days`}
                        >
                            <defs>
                                <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={AREA} stopOpacity="0.25" />
                                    <stop offset="100%" stopColor={AREA} stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            {/* Gridlines + Y labels */}
                            {geometry.yTicks.map((tick, i) => (
                                <g key={i}>
                                    <line
                                        x1={geometry.P.l}
                                        x2={geometry.W - geometry.P.r}
                                        y1={tick.y}
                                        y2={tick.y}
                                        stroke={GRID}
                                        strokeDasharray="3 4"
                                    />
                                    <text
                                        x={geometry.P.l - 6}
                                        y={tick.y + 3}
                                        textAnchor="end"
                                        fontSize="10"
                                        fill={AXIS}
                                    >
                                        {fmtPrice(tick.value)}
                                    </text>
                                </g>
                            ))}

                            {/* X axis labels (first + last snapshot date) */}
                            <text x={geometry.P.l} y={geometry.H - 8} fontSize="10" fill={AXIS}>
                                {fmtDate(geometry.firstT)}
                            </text>
                            <text x={geometry.W - geometry.P.r} y={geometry.H - 8} textAnchor="end" fontSize="10" fill={AXIS}>
                                {fmtDate(geometry.lastT)}
                            </text>

                            <path d={geometry.areaPath} fill="url(#priceArea)" />
                            <path d={geometry.linePath} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                            {/* Endpoint dot for emphasis on "current" price */}
                            {(() => {
                                const last = geometry.points[geometry.points.length - 1];
                                return (
                                    <circle cx={last.x} cy={last.y} r="3.5" fill={LINE} stroke="white" strokeWidth="1.5" />
                                );
                            })()}
                        </svg>
                    )}
                </>
            )}
        </section>
    );
}

function Stat({ label, value, tone = 'neutral' }) {
    const toneClass =
        tone === 'good' ? 'text-emerald-700' :
        tone === 'bad' ? 'text-red-600' :
        'text-ink-900';
    return (
        <div className="rounded-xl border border-ink-100 bg-white px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</p>
            <p className={`text-sm font-bold mt-0.5 ${toneClass}`}>{value}</p>
        </div>
    );
}

export default PriceHistoryChart;
