/**
 * Reverses a string.
 * @param {string} str - The string to reverse.
 * @returns {string} - The reversed string.
 */
function reverseString(str) {
  return str.split('').reverse().join('');
}

// Example usage
const original = "Hello, World!";
const reversed = reverseString(original);

console.log(`Original: ${original}`);
console.log(`Reversed: ${reversed}`);
