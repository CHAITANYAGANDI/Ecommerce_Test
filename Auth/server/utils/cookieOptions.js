const isProd = () => process.env.NODE_ENV === 'production';

const baseCookieOptions = () => ({
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'None' : 'Lax',
    path: '/'
});

const authCookieOptions = (maxAgeMs) => ({
    ...baseCookieOptions(),
    maxAge: maxAgeMs
});

const clearCookieOptions = () => baseCookieOptions();

module.exports = {
    authCookieOptions,
    clearCookieOptions
};
