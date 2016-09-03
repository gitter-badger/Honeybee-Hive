'use strict';
//Require the encryption modules
let RSA = require('simple-encryption').RSA;
let AES = require('simple-encryption').AES;
//Error handler
let errorHandler = require('../Utils/errorHandler.js');
//Export main function
module.exports = function(socket, serverPublicKey, callback) {
  //Generate a session key
  let sessionKey = AES.generateKey();
  //Encrypt it with the serverPublicKey
  let encrypted;
  //Attempt to encrypt, otherwise error to user
  try {
    encrypted = RSA.encrypt(serverPublicKey, JSON.stringify({key: sessionKey}));
  } catch(e) {
    console.log('Error: SECURITY_ENCRYPTION_FAILURE');
    return;
  }
  //Listen only once
  socket.once('message', function(message) {
    if(errorHandler.findError(message.error)) {
      //Error has occured
      console.log('Error: ' + errorHandler.findError(message.error));
      return;
    }
    let payload = message.payload;
    let tag = message.tag;
    let iv = message.iv;
    //Try to decrypt
    let decrypted;
    try {
      decrypted = JSON.parse(AES.decrypt(sessionKey, iv, tag, payload));
    } catch(e) {
      console.log('Error: SECURITY_DECRYPTION_FAILURE');
      return;
    }
    //Tag wasn't correct
    if(decrypted == null) {
      console.log('Error: STAGE_HANDSHAKE_GENERIC');
      return;
    }
    //Encrypted text wasn't correct
    if(decrypted !== 'success') {
      console.log('Error: STAGE_HANDSHAKE_GENERIC');
      return;
    }
    //Callback to the caller with the sessionKey
    callback(sessionKey);
  });
  //Send a message
  try {
    socket.sendMessage({type: 'handshake', payload: encrypted});
  } catch(e) {
    //Destroy socket
    socket.destroy();
    return;
  }
};
