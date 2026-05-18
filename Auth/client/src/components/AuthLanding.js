import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const ACCENT = '#426fe7';
const ACCENT_DEEP = '#2155cd';
const BG = '#0c0e15';
const BG_2 = '#11131b';
const SURFACE = '#1d1f27';
const SURFACE_HIGH = '#282a32';
const BORDER = '#33343d';
const TEXT = '#e2e1ed';
const TEXT_MUTED = '#c3c6d6';
const TEXT_DIM = '#8d909f';

function AuthLanding() {
    const navigate = useNavigate();

    useEffect(() => {
        const body = document.body;
        const root = document.getElementById('root');
        const prev = {
            bodyDisplay: body.style.display,
            bodyAlignItems: body.style.alignItems,
            bodyJustifyContent: body.style.justifyContent,
            bodyMinHeight: body.style.minHeight,
            bodyBackground: body.style.background,
            rootWidth: root ? root.style.width : '',
            rootMinHeight: root ? root.style.minHeight : ''
        };
        body.style.display = 'block';
        body.style.alignItems = 'stretch';
        body.style.justifyContent = 'flex-start';
        body.style.minHeight = '100vh';
        body.style.background = BG;
        if (root) {
            root.style.width = '100%';
            root.style.minHeight = '100vh';
        }
        return () => {
            body.style.display = prev.bodyDisplay;
            body.style.alignItems = prev.bodyAlignItems;
            body.style.justifyContent = prev.bodyJustifyContent;
            body.style.minHeight = prev.bodyMinHeight;
            body.style.background = prev.bodyBackground;
            if (root) {
                root.style.width = prev.rootWidth;
                root.style.minHeight = prev.rootMinHeight;
            }
        };
    }, []);

    return (
        <div
            className="font-body antialiased min-h-screen w-full"
            style={{ background: BG, color: TEXT }}
        >
            <TopNav onSignIn={() => navigate('/auth/login')} onGetStarted={() => navigate('/auth/register')} />

            <Hero onPrimary={() => navigate('/auth/register')} onSecondary={() => navigate('/auth/login')} />

            <Features />

            <HowItWorks />

            <CodeExample />

            <BigCTA onClick={() => navigate('/auth/register')} />

            <Footer />
        </div>
    );
}

function TopNav({ onSignIn, onGetStarted }) {
    return (
        <header
            className="sticky top-0 z-50 w-full"
            style={{
                background: 'rgba(12, 14, 21, 0.75)',
                backdropFilter: 'blur(12px) saturate(160%)',
                WebkitBackdropFilter: 'blur(12px) saturate(160%)',
                borderBottom: `1px solid ${BORDER}`
            }}
        >
            <div className="flex items-center justify-between px-6 md:px-12 h-16 w-full">
                <Link to="/" className="flex items-center gap-2 active:scale-95 transition-all">
                    <span
                        className="material-symbols-outlined fill text-3xl"
                        style={{ color: ACCENT }}
                    >
                        shield
                    </span>
                    <span className="font-headline font-bold text-2xl" style={{ color: TEXT }}>
                        AuthShield
                    </span>
                </Link>
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: TEXT_MUTED }}>
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
                    <a href="#code" className="hover:text-white transition-colors">Developers</a>
                </nav>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onSignIn}
                        className="text-sm font-medium transition-colors bg-transparent border-0 cursor-pointer hidden sm:inline"
                        style={{ color: TEXT_MUTED }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
                    >
                        Sign in
                    </button>
                    <button
                        onClick={onGetStarted}
                        className="text-sm font-semibold px-4 py-2 rounded transition-all cursor-pointer"
                        style={{ background: ACCENT, color: '#fff', border: 'none' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = ACCENT_DEEP)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
                    >
                        Get started
                    </button>
                </div>
            </div>
        </header>
    );
}

function Hero({ onPrimary, onSecondary }) {
    return (
        <section
            className="relative w-full overflow-hidden"
            style={{
                background:
                    `radial-gradient(800px circle at 80% -10%, rgba(66,111,231,0.18), transparent 50%), ` +
                    `radial-gradient(600px circle at 0% 20%, rgba(33,85,205,0.12), transparent 60%)`
            }}
        >
            <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), ' +
                        'linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
                    backgroundSize: '48px 48px'
                }}
            />
            <div className="relative w-full px-6 md:px-12 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-[1400px] mx-auto">
                <div>
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-xs font-medium"
                        style={{
                            background: 'rgba(66,111,231,0.12)',
                            color: ACCENT,
                            border: `1px solid rgba(66,111,231,0.25)`
                        }}
                    >
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        Developer-first identity platform
                    </div>
                    <h1
                        className="font-headline font-bold text-4xl md:text-6xl leading-tight tracking-tight mb-6"
                        style={{ color: TEXT }}
                    >
                        Ship secure API access
                        <br />
                        <span style={{ color: ACCENT }}>without the auth headaches.</span>
                    </h1>
                    <p
                        className="text-lg md:text-xl mb-10 leading-relaxed max-w-xl"
                        style={{ color: TEXT_MUTED }}
                    >
                        AuthShield is the self-serve credentials portal where any developer can
                        register an application, mint a client ID and secret, and start authorizing
                        API requests in minutes — no boilerplate, no kludgy session glue.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onPrimary}
                            className="text-base font-semibold px-6 py-3 rounded transition-all flex items-center justify-center gap-2 cursor-pointer"
                            style={{ background: ACCENT, color: '#fff', border: 'none' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = ACCENT_DEEP)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
                        >
                            Get started — it's free
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                        <button
                            onClick={onSecondary}
                            className="text-base font-semibold px-6 py-3 rounded transition-colors cursor-pointer"
                            style={{
                                background: 'transparent',
                                color: TEXT,
                                border: `1px solid ${BORDER}`
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = ACCENT;
                                e.currentTarget.style.color = ACCENT;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = BORDER;
                                e.currentTarget.style.color = TEXT;
                            }}
                        >
                            Sign in
                        </button>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: TEXT_DIM }}>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base" style={{ color: '#10b981' }}>check_circle</span>
                            Free to start
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base" style={{ color: '#10b981' }}>check_circle</span>
                            One-click secret rotation
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base" style={{ color: '#10b981' }}>check_circle</span>
                            JWT-backed sessions
                        </span>
                    </div>
                </div>

                <HeroVisual />
            </div>
        </section>
    );
}

function HeroVisual() {
    return (
        <div className="relative">
            <div
                className="absolute -inset-8 rounded-3xl blur-3xl opacity-40 pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, transparent 60%)` }}
            />
            <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                    background: 'rgba(29, 31, 39, 0.7)',
                    backdropFilter: 'blur(28px)',
                    WebkitBackdropFilter: 'blur(28px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)'
                }}
            >
                <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: '#10b981' }} />
                    <span className="ml-3 text-xs font-mono" style={{ color: TEXT_DIM }}>
                        authshield · production credential
                    </span>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>
                                Application
                            </div>
                            <div className="font-headline font-semibold text-lg" style={{ color: TEXT }}>
                                Payments Service v2
                            </div>
                        </div>
                        <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
                        >
                            Active
                        </span>
                    </div>
                    <div className="space-y-3">
                        <FakeField label="Client ID" value="auth_pk_live_8f92a4c1…b3e7d6f5" />
                        <FakeField label="Client Secret" value="••••••••••••••••••••••••" mono />
                        <FakeField label="Redirect URI" value="https://app.example.com/callback" />
                    </div>
                    <div className="mt-6 flex gap-2">
                        <FakePill icon="content_copy">Copy Client ID</FakePill>
                        <FakePill icon="autorenew">Rotate Secret</FakePill>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FakeField({ label, value, mono }) {
    return (
        <div>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>
                {label}
            </div>
            <div
                className={`px-3 py-2 rounded text-xs ${mono ? 'font-mono' : 'font-mono'} break-all`}
                style={{
                    background: BG,
                    color: TEXT,
                    border: `1px solid ${BORDER}`
                }}
            >
                {value}
            </div>
        </div>
    );
}

function FakePill({ icon, children }) {
    return (
        <span
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
            style={{
                background: SURFACE_HIGH,
                color: TEXT_MUTED,
                border: `1px solid ${BORDER}`
            }}
        >
            <span className="material-symbols-outlined text-sm">{icon}</span>
            {children}
        </span>
    );
}

function Features() {
    const items = [
        {
            icon: 'vpn_key',
            title: 'Client credentials in seconds',
            body:
                'Spin up a unique client_id and a signed client_secret per application. ' +
                'Server-generated, cryptographically random, and never replayed.'
        },
        {
            icon: 'autorenew',
            title: 'One-click secret rotation',
            body:
                'Compromised or just hygienic? Rotate the secret without redeploying ' +
                'or filing a ticket. Old secrets stop working immediately.'
        },
        {
            icon: 'route',
            title: 'Per-app redirect & API config',
            body:
                'Configure each application\'s base URL and OAuth redirect URI so ' +
                'callbacks land at the right service every time.'
        },
        {
            icon: 'lock',
            title: 'Strong password policy',
            body:
                'Enforced at signup, change-password, and reset-password — no weak ' +
                'passwords slip through to your account.'
        },
        {
            icon: 'mail',
            title: 'Email-based password reset',
            body:
                'Forgot your password? Get a 6-digit OTP delivered to your inbox, ' +
                'verified server-side with rate-limited attempts.'
        },
        {
            icon: 'google',
            title: 'Sign in with Google',
            body:
                'Skip the password entirely. Provision an account from your Google ' +
                'identity and you\'re in.'
        }
    ];
    return (
        <section id="features" className="w-full px-6 md:px-12 py-24" style={{ background: BG_2 }}>
            <div className="max-w-[1400px] mx-auto">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium"
                        style={{
                            background: 'rgba(66,111,231,0.12)',
                            color: ACCENT,
                            border: `1px solid rgba(66,111,231,0.25)`
                        }}
                    >
                        Features
                    </div>
                    <h2 className="font-headline font-bold text-3xl md:text-5xl mb-4 tracking-tight" style={{ color: TEXT }}>
                        Everything you need to authorize API access
                    </h2>
                    <p className="text-base md:text-lg" style={{ color: TEXT_MUTED }}>
                        A complete developer portal: identity, credentials, and configuration —
                        wired into a clean dashboard.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((f) => (
                        <FeatureCard key={f.title} {...f} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function FeatureCard({ icon, title, body }) {
    return (
        <div
            className="rounded-xl p-6 transition-colors h-full"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
        >
            <div
                className="inline-flex items-center justify-center w-11 h-11 rounded-lg mb-4"
                style={{ background: 'rgba(66,111,231,0.15)', color: ACCENT }}
            >
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <h3 className="font-headline font-semibold text-lg mb-2" style={{ color: TEXT }}>
                {title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                {body}
            </p>
        </div>
    );
}

function HowItWorks() {
    const steps = [
        {
            n: '01',
            icon: 'person_add',
            title: 'Create your account',
            body: 'Sign up with email or Google. We hash passwords with bcrypt and enforce a strong password policy at every step.'
        },
        {
            n: '02',
            icon: 'add_circle',
            title: 'Register an application',
            body: 'Give it a name, your API base URL, and an OAuth redirect URI. We generate a client_id and signed client_secret instantly.'
        },
        {
            n: '03',
            icon: 'rocket_launch',
            title: 'Ship your integration',
            body: 'Drop the credentials into your service, point your callback at the redirect URI, and you\'re authorizing requests in minutes.'
        }
    ];
    return (
        <section id="how-it-works" className="w-full px-6 md:px-12 py-24" style={{ background: BG }}>
            <div className="max-w-[1400px] mx-auto">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium"
                        style={{
                            background: 'rgba(66,111,231,0.12)',
                            color: ACCENT,
                            border: `1px solid rgba(66,111,231,0.25)`
                        }}
                    >
                        How it works
                    </div>
                    <h2 className="font-headline font-bold text-3xl md:text-5xl mb-4 tracking-tight" style={{ color: TEXT }}>
                        Live in three steps
                    </h2>
                    <p className="text-base md:text-lg" style={{ color: TEXT_MUTED }}>
                        From zero to authorized API requests — no infrastructure to spin up.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {steps.map((s) => (
                        <div
                            key={s.n}
                            className="rounded-xl p-8 relative"
                            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                        >
                            <div
                                className="font-mono text-5xl font-bold mb-4 opacity-30"
                                style={{ color: ACCENT }}
                            >
                                {s.n}
                            </div>
                            <div
                                className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-4"
                                style={{ background: 'rgba(66,111,231,0.15)', color: ACCENT }}
                            >
                                <span className="material-symbols-outlined">{s.icon}</span>
                            </div>
                            <h3 className="font-headline font-semibold text-xl mb-2" style={{ color: TEXT }}>
                                {s.title}
                            </h3>
                            <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                                {s.body}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CodeExample() {
    return (
        <section id="code" className="w-full px-6 md:px-12 py-24" style={{ background: BG_2 }}>
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium"
                        style={{
                            background: 'rgba(66,111,231,0.12)',
                            color: ACCENT,
                            border: `1px solid rgba(66,111,231,0.25)`
                        }}
                    >
                        For developers
                    </div>
                    <h2 className="font-headline font-bold text-3xl md:text-4xl mb-4 tracking-tight" style={{ color: TEXT }}>
                        Drop-in client credentials
                    </h2>
                    <p className="text-base md:text-lg mb-6 leading-relaxed" style={{ color: TEXT_MUTED }}>
                        Use your AuthShield credentials anywhere you need to authorize a
                        request. No SDK required — your client_id and client_secret are
                        all you need to start.
                    </p>
                    <ul className="space-y-3 text-sm" style={{ color: TEXT_MUTED }}>
                        <CheckListItem>Works with any HTTP client — curl, fetch, axios, you name it.</CheckListItem>
                        <CheckListItem>Server re-verifies tokens on every authenticated request.</CheckListItem>
                        <CheckListItem>15-minute access tokens with seamless refresh under the hood.</CheckListItem>
                    </ul>
                </div>
                <div
                    className="rounded-xl overflow-hidden"
                    style={{
                        background: BG,
                        border: `1px solid ${BORDER}`,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
                    }}
                >
                    <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                        <span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
                        <span className="w-3 h-3 rounded-full" style={{ background: '#10b981' }} />
                        <span className="ml-3 text-xs font-mono" style={{ color: TEXT_DIM }}>
                            terminal — fetch a protected resource
                        </span>
                    </div>
                    <pre
                        className="p-5 text-xs leading-relaxed overflow-x-auto"
                        style={{ color: TEXT, fontFamily: '"JetBrains Mono", monospace' }}
                    >
{`# 1. Authorize with your AuthShield credentials
$ curl -X POST https://auth.example.com/auth/token \\
       -u "auth_pk_live_8f92a4c1...:auth_sk_live_b3e7d6f5..." \\
       -d "grant_type=client_credentials"
{ "access_token": "eyJhbGciOi...", "expires_in": 900 }

# 2. Use the token to call your protected API
$ curl https://api.example.com/v1/orders \\
       -H "Authorization: Bearer eyJhbGciOi..."
{ "orders": [...] }`}
                    </pre>
                </div>
            </div>
        </section>
    );
}

function CheckListItem({ children }) {
    return (
        <li className="flex items-start gap-2">
            <span className="material-symbols-outlined text-base mt-0.5" style={{ color: '#10b981' }}>
                check_circle
            </span>
            <span>{children}</span>
        </li>
    );
}

function BigCTA({ onClick }) {
    return (
        <section className="w-full px-6 md:px-12 py-24" style={{ background: BG }}>
            <div
                className="max-w-[1100px] mx-auto rounded-2xl p-10 md:p-16 text-center relative overflow-hidden"
                style={{
                    background:
                        `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DEEP} 100%)`,
                    boxShadow: '0 24px 80px rgba(66,111,231,0.35)'
                }}
            >
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage:
                            'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}
                />
                <div className="relative">
                    <h2 className="font-headline font-bold text-3xl md:text-5xl mb-4 text-white tracking-tight">
                        Ready when you are.
                    </h2>
                    <p className="text-base md:text-lg mb-8 text-white/85 max-w-2xl mx-auto">
                        Create your AuthShield account and issue your first credential in
                        under a minute.
                    </p>
                    <button
                        onClick={onClick}
                        className="text-base font-semibold px-7 py-3 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer mx-auto"
                        style={{ background: '#fff', color: ACCENT_DEEP, border: 'none' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                        Get started — it's free
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                </div>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer
            className="w-full px-6 md:px-12 py-10"
            style={{ background: BG, borderTop: `1px solid ${BORDER}`, color: TEXT_DIM }}
        >
            <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span
                        className="material-symbols-outlined fill text-xl"
                        style={{ color: ACCENT }}
                    >
                        shield
                    </span>
                    <span className="font-headline font-bold text-base" style={{ color: TEXT }}>
                        AuthShield
                    </span>
                </div>
                <div className="text-xs">
                    © {new Date().getFullYear()} AuthShield. Built for developers.
                </div>
                <div className="flex items-center gap-5 text-xs">
                    <Link to="/auth/login" className="hover:text-white transition-colors">Sign in</Link>
                    <Link to="/auth/register" className="hover:text-white transition-colors">Get started</Link>
                </div>
            </div>
        </footer>
    );
}

export default AuthLanding;
