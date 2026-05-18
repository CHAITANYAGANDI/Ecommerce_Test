// Username rules — matches Auth/client/src/utils.js isValidUsername.
// - 3-30 characters
// - First and last char must be a letter or digit
// - Middle may include letters, digits, dot, underscore, hyphen
const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,28}[a-zA-Z0-9]$/;

const USERNAME_MESSAGE =
    'Username must be 3-30 characters, start and end with a letter or digit, and may contain letters, digits, dots, underscores, or hyphens.';

const isValidUsername = (u) =>
    typeof u === 'string' && USERNAME_REGEX.test(u);

module.exports = { USERNAME_REGEX, USERNAME_MESSAGE, isValidUsername };
