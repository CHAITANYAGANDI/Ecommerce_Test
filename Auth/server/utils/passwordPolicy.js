const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const STRONG_PASSWORD_MESSAGE =
    'Password must be at least 8 characters and include uppercase, lowercase, and a digit.';

const isStrongPassword = (pw) =>
    typeof pw === 'string' &&
    pw.length >= 8 &&
    pw.length <= 100 &&
    STRONG_PASSWORD_REGEX.test(pw);

module.exports = {
    STRONG_PASSWORD_REGEX,
    STRONG_PASSWORD_MESSAGE,
    isStrongPassword
};
