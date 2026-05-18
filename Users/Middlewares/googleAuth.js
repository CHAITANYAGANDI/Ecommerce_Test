const axios = require('axios');
const UserModel = require("../Models/User");

require('dotenv').config();


const getRedirectUri = () =>
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:7001/auth/google/callback';


function getGoogleAuthURL() {
  const redirectUri = getRedirectUri();

  return `https://accounts.google.com/o/oauth2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile&response_type=code`;
}

async function getGoogleUser(code) {
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code'
  });


  const accessToken = response.data.access_token;
  const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const email = userResponse.data.email;
  const name = userResponse.data.name;
  const emailVerified = userResponse.data.email_verified === true || userResponse.data.email_verified === 'true';

  if (!emailVerified) {
    const err = new Error('Google email is not verified');
    err.code = 'GOOGLE_EMAIL_UNVERIFIED';
    throw err;
  }

  const googleUser = await UserModel.findOne({ email });

  if (!googleUser) {
    const googleUserModel = new UserModel({ name, email, isGoogleUser: true });
    await googleUserModel.save();
  }


  return {
    accessToken: accessToken,
    user: userResponse.data
  };
}

module.exports = {
  getGoogleAuthURL,
  getGoogleUser,
};
