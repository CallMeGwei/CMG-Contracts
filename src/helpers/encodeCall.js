const abi = require('web3-eth-abi');

function encodeParams(types, rawValues) {
  return abi.encodeParameters(types, rawValues);
}

function encodeCall(name, types, rawValues) {
  const encodedParameters = encodeParams(types, rawValues).substring(2);
  const signatureHash = abi.encodeFunctionSignature(`${name}(${types.join(',')})`).substring(2, 10);
  return `0x${signatureHash}${encodedParameters}`;
}

function decodeCall(types, data){
  return abi.decodeParameters(types, data);
}

module.exports = {
  encodeCall: encodeCall,
  decodeCall: decodeCall
}