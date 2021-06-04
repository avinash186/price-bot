require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const http = require('http')
const Web3 = require('web3')
const HDWalletProvider = require('@truffle/hdwallet-provider')
const moment = require('moment-timezone')
const numeral = require('numeral')
const _ = require('lodash')
const axios = require('axios')
const abook = require('./abook')

// SERVER CONFIG
const PORT = process.env.PORT || 5000
const app = express();
const server = http.createServer(app).listen(PORT, () => console.log(`Listening on ${ PORT }`))

// WEB3 CONFIG
const web3 = new Web3(process.env.main)

// Uniswap Factory Contract: https://etherscan.io/address/0xc0a47dfe034b400b47bdad5fecda2621de6c4d95#code
const uniswapFactoryContract = new web3.eth.Contract(abook.UNISWAP.factoryABI, abook.UNISWAP.factoryAddress)

// Uniswap Exchange Template: https://etherscan.io/address/0x09cabec1ead1c0ba254b09efb3ee13841712be14#code
const UNISWAP_EXCHANGE_ABI = abook.UNISWAP.exchangeABI

// Kyber mainnet "Expected Rate": https://etherscan.io/address/0x96b610046d63638d970e6243151311d8827d69a5#readContract
const kyberRateContract = new web3.eth.Contract(abook.KYBER.rateABI, abook.KYBER.rateAddress)

async function checkPair(args) {
  console.log(1);
  const { inputTokenSymbol, inputTokenAddress, outputTokenSymbol, outputTokenAddress, inputAmount } = args

  console.log(2);
  const exchangeAddress = await uniswapFactoryContract.methods.getExchange(outputTokenAddress).call()
  console.log(3);
  const exchangeContract = new web3.eth.Contract(UNISWAP_EXCHANGE_ABI, exchangeAddress)
  console.log(4);

  const uniswapResult = await exchangeContract.methods.getEthToTokenInputPrice(inputAmount).call()
  console.log(5);
  //let kyberResult = await kyberRateContract.methods.getExpectedRate(inputTokenAddress, outputTokenAddress, inputAmount, true).call()
  console.log(6);

  console.table([{
    'Input Token': inputTokenSymbol,
    'Output Token': outputTokenSymbol,
    'Input Amount': web3.utils.fromWei(inputAmount, 'Ether'),
    'Uniswap Return': web3.utils.fromWei(uniswapResult, 'Ether'),
    // 'Kyber Expected Rate': web3.utils.fromWei(kyberResult.expectedRate, 'Ether'),
    // 'Kyber Min Return': web3.utils.fromWei(kyberResult.slippageRate, 'Ether'),
    'Timestamp': moment().tz('America/Chicago').format(),
  }])
}

let priceMonitor
let monitoringPrice = false

async function monitorPrice() {
  if(monitoringPrice) {
    return
  }

  console.log("Checking prices...")
  monitoringPrice = true

  try {

    // ADD YOUR CUSTOM TOKEN PAIRS HERE!!!

    await checkPair({
      inputTokenSymbol: 'ETH',
      inputTokenAddress: abook.tokens.ETH,
      outputTokenSymbol: 'DAI',
      outputTokenAddress: abook.tokens.DAI,
      inputAmount: web3.utils.toWei('1', 'ETHER')
    })

//    await checkPair({
//      inputTokenSymbol: 'ETH',
//      inputTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
//      outputTokenSymbol: 'DAI',
//      outputTokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
//      inputAmount: web3.utils.toWei('1', 'ETHER')
//    })
//
//    await checkPair({
//      inputTokenSymbol: 'ETH',
//      inputTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
//      outputTokenSymbol: 'KNC',
//      outputTokenAddress: '0xdd974d5c2e2928dea5f71b9825b8b646686bd200',
//      inputAmount: web3.utils.toWei('1', 'ETHER')
//    })
//
//    await checkPair({
//      inputTokenSymbol: 'ETH',
//      inputTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
//      outputTokenSymbol: 'LINK',
//      outputTokenAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
//      inputAmount: web3.utils.toWei('1', 'ETHER')
//    })

  } catch (error) {
    console.error(error)
    monitoringPrice = false
    clearInterval(priceMonitor)
    return
  }

  monitoringPrice = false
}

// Check markets every n seconds
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000 // 3 Seconds
priceMonitor = setInterval(async () => { await monitorPrice() }, POLLING_INTERVAL)
