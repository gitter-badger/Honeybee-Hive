'use strict';
//Import forge for encryption
const forge = require('node-forge');
//Import our error handling module
const errorHandler = require('../../Utils/errorHandler.js');
//Import our encryption modules
const RSA = require('simple-encryption').RSA;
const AES = require('simple-encryption').AES;
//Should return an AES key
module.exports = function(message, socket, eventEmitter, key) {
  //If the encrypted payload is not present, fail
  if(message.payload == null) {
    //Send an error, and disconnect
    errorHandler.sendError(socket, 'GENERIC_PAYLOAD_MISSING', true);
    //Return to prevent further execution
    return;
  }
  //Declare decrypted letiable for try/catch
  let decrypted;
  //Attempt to decrypt the payload
  try {
    decrypted = JSON.parse(RSA.decrypt(key, message.payload));
  } catch(e) {
    //If an error was thrown stop
    errorHandler.sendError(socket, 'SECURITY_DECRYPTION_FAILURE', true);
    //Return to prevent further execution
    return;
  }
  //Check if key exists in JSON
  if(decrypted.key == null) {
    //Tell user that the key wasn't found
    errorHandler.sendError(socket, 'STAGE_HANDSHAKE_KEY_MISSING', true);
    //Return to prevent further execution
    return;
  }
  //Check if key is in correct format
  if(typeof decrypted.key !== 'string' ||
    forge.util.decode64(decrypted.key).length !== 32
  ) {
    //Not a string or not 256 bits, so fail
    errorHandler.sendError(socket, 'SECURITY_INVALID_KEY', true);
    //Return to prevent further execution
    return;
  }
  //Generate a 12 byte IV for AES-GCM
  const iv = AES.generateIV();
  //Declare encrypted letiable for try/catch
  let encrypted;
  try {
    encrypted = AES.encrypt(decrypted.key, iv, JSON.stringify('success'));
  } catch(e) {
    errorHandler.sendError(socket, 'SECURITY_ENCRYPTION_FAILURE', true);
    //Stop execution
    return;
  }
  //Send message to user
  try {
    socket.sendMessage({'payload': encrypted.encrypted, 'tag': encrypted.tag,
      'iv': iv});
  } catch(e) {
    //Destroy socket on failure
    socket.destroy();
    return;
  }
  //Return the key to the connection handler
  return decrypted.key;
};
