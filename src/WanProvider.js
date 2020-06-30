const Transaction = require("wanchain-util").wanchainTx;
const HDWalletProvider = require('@truffle/hdwallet-provider');
const blockTagForPayload = require("web3-provider-engine/util/rpc-cache-utils.js").blockTagForPayload;
const ethUtil = require('ethereumjs-util');

class WanProvider extends HDWalletProvider {
  constructor(mnemonic, provider, addressIndex = 0, numAddresses = 10, shareNonce = true, walletHdpath = "m/44'/5718350'/0'/0/0") {
    super(mnemonic, provider, addressIndex, numAddresses, shareNonce, walletHdpath);

    this.signTransaction = (txParams, cb) => {
      let pkey;
      const from = txParams.from.toLowerCase();
      if (this.wallets[from]) {
        pkey = this.wallets[from].getPrivateKey();
      } else {
        cb("Account not found");
      }
      txParams.Txtype = 0x01;
      const tx = new Transaction(txParams);
      tx.sign(pkey);
      const rawTx = `0x${tx.serialize().toString("hex")}`;
      // console.log("rawTx:", rawTx)
      cb(null, rawTx);
    }

    this.customizeSubProvider('HookedWalletSubprovider', 'signTransaction', this.signTransaction);
    this.customizeSubProvider('NonceTrackerSubprovider', 'handleRequest', this.handleRequest);
  }

  customizeSubProvider(providerName, functionName, newFunction) {
    this.engine._providers.forEach(provider => {
      if (provider.constructor.name == providerName) {
        provider[functionName] = newFunction;
        // console.log("replace funcion %s", newFunction);
      }
    });
  }
 
  handleRequest(payload, next, end) {
    const self = this
  
    switch(payload.method) {
  
      case 'eth_getTransactionCount':
        var blockTag = blockTagForPayload(payload)
        var address = payload.params[0].toLowerCase()
        var cachedResult = self.nonceCache[address]
        // only handle requests against the 'pending' blockTag
        if (blockTag === 'pending') {
          // has a result
          if (cachedResult) {
            end(null, cachedResult)
          // fallthrough then populate cache
          } else {
            next(function(err, result, cb){
              if (err) return cb()
              if (self.nonceCache[address] === undefined) {
                self.nonceCache[address] = result
              }
              cb()
            })
          }
        } else {
          next()
        }
        return
  
      case 'eth_sendRawTransaction':
        // allow the request to continue normally
        next(function(err, result, cb){
          // only update local nonce if tx was submitted correctly
          if (err) return cb()
          // parse raw tx
          var rawTx = payload.params[0]
          var stripped = ethUtil.stripHexPrefix(rawTx)
          var rawData = Buffer.from(ethUtil.stripHexPrefix(rawTx), 'hex')
          var tx = new Transaction(Buffer.from(ethUtil.stripHexPrefix(rawTx), 'hex'))
          // extract address
          var address = '0x'+tx.getSenderAddress().toString('hex').toLowerCase()
          // extract nonce and increment
          var nonce = ethUtil.bufferToInt(tx.nonce)
          nonce++
          // hexify and normalize
          var hexNonce = nonce.toString(16)
          if (hexNonce.length%2) hexNonce = '0'+hexNonce
          hexNonce = '0x'+hexNonce
          // dont update our record on the nonce until the submit was successful
          // update cache
          self.nonceCache[address] = hexNonce
          cb()
        })
        return
  
      // Clear cache on a testrpc revert
      case 'evm_revert':
        self.nonceCache = {}
        next()
        return

      default:
        next()
        return
    }
  }
}

module.exports = WanProvider;