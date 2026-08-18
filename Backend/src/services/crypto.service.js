// src/services/crypto.service.js

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
// A chave secreta DEVE ter 32 caracteres (256 bits)
const SECRET_KEY = process.env.CRYPTO_SECRET_KEY; 
// O IV DEVE ter 16 caracteres (128 bits)
const IV = process.env.CRYPTO_IV;

if (!SECRET_KEY || SECRET_KEY.length !== 32) {
    throw new Error("ERRO CRÍTICO: A variável de ambiente CRYPTO_SECRET_KEY é obrigatória e deve ter exatamente 32 caracteres.");
}

if (!IV || IV.length !== 16) {
    throw new Error("ERRO CRÍTICO: A variável de ambiente CRYPTO_IV é obrigatória e deve ter exatamente 16 caracteres.");
}

/**
 * Encrypts a piece of text.
 * @param {string} text The text to encrypt.
 * @returns {string} The encrypted text in hex format.
 */
function encrypt(text) {
    if (text === null || typeof text === 'undefined') {
        return text;
    }
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), Buffer.from(IV));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

/**
 * Decrypts a piece of text.
 * @param {string} encryptedText The encrypted text in hex format.
 * @returns {string} The decrypted text.
 */
function decrypt(encryptedText) {
    if (encryptedText === null || typeof encryptedText === 'undefined') {
        return encryptedText;
    }
    try {
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), Buffer.from(IV));
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error("Erro ao desencriptar o token. O token pode estar corrompido ou a chave de encriptação mudou.", error);
        return null; // Retorna nulo se a desencriptação falhar
    }
}

module.exports = {
    encrypt,
    decrypt
};
