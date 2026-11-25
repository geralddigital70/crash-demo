const crypto = require('crypto');

/**
 * Generate a crash point from a server seed + client seed + nonce.
 * Returns a number >= 1.00 (the multiplier at which the round crashes).
 * Educational implementation — NOT for real money.
 */
function generateCrashPoint(serverSeed, clientSeed, nonce) {
  const hash = crypto
    .createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest('hex');

  // Convert the hash into a percentage between 0 and 1
  const h = parseInt(hash.slice(0, 8), 16);
  const e = Math.pow(2, 32);
  const p = h / e; // This gives a float between 0.0 and 1.0

  // House edge: 2% chance of instant crash at 1.00x
  if (p < 0.02) return 1.0;

  // Standard math for realistic crash distribution:
  // The formula 1 / (1 - p) creates a curve where low multipliers are common
  // and high multipliers are rare.
  const crash = 1 / (1 - p * 0.99); 
  
  // Cap the maximum crash point at 100x
  return Math.min(crash, 100);
}

/** Generate a random 32-byte hex seed. */
function randomSeed() {
  return crypto.randomBytes(32).toString('hex');
}

/** Hash a seed so we can reveal the hash before the round and the seed after. */
function hashSeed(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

module.exports = { generateCrashPoint, randomSeed, hashSeed };