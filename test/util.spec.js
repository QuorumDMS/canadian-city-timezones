const {removeSpecialCharacters} = require('../src/util');

describe('util', () => {
  describe('removeSpecialCharacters', () => {
    it('retains letters, numbers, and spaces', () => {
      const result = removeSpecialCharacters('hello world! 123\'s-!@#$');
      expect(result).toBe('hello world 123s');
    });
  });
});
