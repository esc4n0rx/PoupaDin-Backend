 
const bcrypt = require('bcrypt');
const saltRounds = 10;

/**
 * Gera o hash de uma senha.
 * @param {string} password - A senha em texto plano.
 * @returns {Promise<string>} O hash da senha.
 */
const hashPassword = async (password) => {
    return bcrypt.hash(password, saltRounds);
};

/**
 * Compara uma senha em texto plano com um hash.
 * @param {string} password - A senha em texto plano.
 * @param {string} hash - O hash armazenado.
 * @returns {Promise<boolean>} True se a senha corresponder ao hash.
 */
const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

module.exports = {
    hashPassword,
    comparePassword,
};