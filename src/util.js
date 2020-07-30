const VALID_CHARACTERS_REGEX = /[^a-zA-Z0-9 ]/ig;

function removeSpecialCharacters(value = '') {
  return value.replace(VALID_CHARACTERS_REGEX, '').toLocaleLowerCase();
}

module.exports = {
  removeSpecialCharacters
};
