wanchain-truffle-sdk
========

A truffle SDK for deploying smart contracts on Wanchain.

## Installation
Use NPM or Yarn to install the package:
```bash
npm install --save wanchain-truffle-sdk
```
## Usage

Step 1: Modify truffle-config.js

<li> import Wanchain provider </li>

```javascript
const WanProvider = require('wanchain-truffle-sdk').WanProvider;
const wanProvider = new WanProvider("your-mnemonic-or-private-key", "wanchain-node-or-iwan-url");
```

<li> add Wanchain definition in networks </li>

```javascript
module.exports = {
  networks: {
    ......
    wan: {
      provider: wanProvider,
      network_id: "*"
    }
    ......
  }
}
```

Step 2: Use truffle command to deploy contracts

```bash
truffle migrate --network wan
```