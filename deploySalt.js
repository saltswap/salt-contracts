const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx').Transaction;

const Token = require('./build/contracts//SaltToken.json');
const MasterChef = require('./build/contracts//MasterChef.json');
const SmartChef = require('./build/contracts//SmartChef.json');
// const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json');

const config = require('./config-deploy.json');
require('dotenv').config();

const mainAccount = {
    address: process.env.address,
    privateKey: process.env.privateKey
}

// Setup web3
const INFURA_API_KEY = config.infuraApiKey;
const NETWORK_ID = config.networkId;

// const web3 = new Web3(new Web3.providers.HttpProvider(`https://bsc-dataseed.binance.org/`));
const web3 = new Web3(new Web3.providers.HttpProvider(`https://data-seed-prebsc-2-s1.binance.org:8545/`));

const TokenContract = new web3.eth.Contract(Token.abi);
const MasterChefContract = new web3.eth.Contract(MasterChef.abi);
const SmartChefContract = new web3.eth.Contract(SmartChef.abi);
// const ERC20 = new web3.eth.Contract(IERC20.abi);

// setup();

async function setup() {
    const privateKey = mainAccount.privateKey;
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(mainAccount.address);
    console.log(nonce);
    let balance = await web3.eth.getBalance(mainAccount.address);
    console.log(balance);

    deployTokenContract(account, nonce);
}

async function deployTokenContract(account, nonce) {
    TokenContract.deploy({
        data: Token.bytecode,
    })
    .send({
        nonce: web3.utils.toHex(nonce++),
        from: mainAccount.address,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
    })
    .then((newContractInstance) => {
        console.log(`Token contract deployed at ${newContractInstance.options.address}`);
        // setUniswapPool(newContractInstance.options.address, account, ++nonce);
        // unpause(newContractInstance.options.address, account, ++nonce);
        deployMasterChef(newContractInstance.options.address, account, nonce);
        const aRandomTokenToEarn = "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee" // BUSD
        const rewardAmount = 0.01
        deploySmartChef(newContractInstance.options.address, aRandomTokenToEarn, rewardAmount, account, nonce);
    });
}

async function deployMasterChef(tokenContractAddress, account, nonce) {
    const saltPerBlock = web3.utils.toWei('1', 'ether');

    MasterChefContract.deploy({
        data: MasterChef.bytecode,
        arguments: [ tokenContractAddress, account.address, account.address, saltPerBlock, 6347879 ]
    })
    .send({
        nonce: web3.utils.toHex(nonce++),
        from: mainAccount.address,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
    })
    .then((newContractInstance) => {
        console.log(`MasterChef contract deployed at ${newContractInstance.options.address}`);

        // SALT 4x 0% deposit fee
        add(newContractInstance.options.address, 4000, tokenContractAddress, 0, true, account, nonce++);

        // unpause(newContractInstance.options.address, account, ++nonce);
        // deployCrowdsaleContract(newContractInstance.options.address, account, nonce++);
    });
}

async function add(masterChefAddress, allocPoint, lpTokenAddress, depositFee, withUpdate, account, nonce) {
    // function add(uint256 _allocPoint, IBEP20 _lpToken, uint16 _depositFeeBP, bool _withUpdate) public onlyOwner {
    const txOptions = {
        nonce: web3.utils.toHex(nonce),
        from: mainAccount.address,
        to: masterChefAddress,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
        data: MasterChefContract.methods.add(allocPoint, lpTokenAddress, depositFee, withUpdate).encodeABI()
    }
    const signed  = await web3.eth.accounts.signTransaction(txOptions, account.privateKey);
    web3.eth.sendSignedTransaction(signed.rawTransaction)
    .on('error', function(err) {
        console.log('error', err);
    })
    .on('transactionHash', function(transactionHash) {
        console.log('transactionHash', transactionHash);
    })
    .on('receipt', function(receipt) {
        var transactionHash = receipt.transactionHash;
        console.log('receipt', receipt);
    });
}

async function setupSmartChef() {
    const privateKey = mainAccount.privateKey
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    let nonce = await web3.eth.getTransactionCount(account.address);
    console.log("nonce:",nonce);

    const SALTaddress = "0x89dcddca577f3658a451775d58ea99da532263c8"
    const aRandomTokenToEarn = "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee" // BUSD
    const rewardAmount = 0.01
    deploySmartChef(SALTaddress, aRandomTokenToEarn, rewardAmount, account, nonce);
}

setupSmartChef()

async function deploySmartChef(tokenContractAddress, rewardTokenAddress, rewardAmount, account, nonce) {
    const rewardPerBlock = web3.utils.toWei('0.0001', 'ether');
    const startBlock = 6572920
    const endBlock = 6671920
    console.log("gaslimit,",config.gasLimit)
    console.log("gasPrice,",config.gasPrice)

    SmartChefContract.deploy({
        data: SmartChef.bytecode,
        arguments: [ tokenContractAddress, rewardTokenAddress, rewardPerBlock, startBlock, endBlock ]
    })
    .send({
        nonce: web3.utils.toHex(nonce),
        from: account.address,
        gas: web3.utils.toHex(config.gasLimit),
        gasPrice: web3.utils.toHex(config.gasPrice),
    })
    .then((newContractInstance) => {
        console.log(`SmartChef contract deployed at ${newContractInstance.options.address}`);

        // now we need to deposit rewardTokenAddress
        SafeBEP20.safeTransferFrom(rewardTokenAddress, newContractInstance, rewardAmount)

    });
}