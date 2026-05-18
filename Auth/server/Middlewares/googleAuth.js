const axios = require('axios');
require('dotenv').config();

const getRedirectUri = () =>
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback';

function getGoogleAuthURL(state) {
    const redirectUri = getRedirectUri();
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        redirect_uri: redirectUri,
        scope: 'openid email profile',
        response_type: 'code',
        access_type: 'online',
        prompt: 'select_account'
    });
    if (state) params.set('state', state);
    return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
}

async function getGoogleUser(code) {
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: getRedirectUri(),
        grant_type: 'authorization_code'
    });

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return { user: userResponse.data, accessToken };
}

module.exports = { getGoogleAuthURL, getGoogleUser };
