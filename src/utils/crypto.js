const crypto = require('crypto');

// This key should be set as an environment variable in Railway
// Never hardcode this in your application
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  // Make sure the key is the right length for AES-256
  return crypto.scryptSync(key, 'salt', 32);
};

// Encrypt token data
const encrypt = (data) => {
  const iv = crypto.randomBytes(16); // Initialization vector
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV and encrypted data
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt token data
const decrypt = (encryptedData) => {
  try {
    const [ivHex, encryptedText] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
};

module.exports = {
  encrypt,
  decrypt
};
