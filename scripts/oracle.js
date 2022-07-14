const env = require('node-env-file')
env(__dirname + '/../.env')
const hre = require('hardhat')
const fs = require('fs')
const readline = require('readline')
const bigDecimal = require('js-big-decimal')
const ethers = hre.ethers

let deployed = false // switch to true once you deploy the contract on a active network to save time/gas

let usdc, weth, pool
switch (process.env.HARDHAT_NETWORK) {
  case 'ropsten': 
    // uses uni/weth pool
    usdc = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' // is actually UNI
    weth = '0xc778417E063141139Fce010982780140Aa0cD5Ab' // is actually WETH
    pool = '0x188680AF5736b20a852180ED5C217A386270d319' // works, but numbers will look odd
  break
  case 'hardhat':
  case 'mainnet':
    usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    pool = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640' // usdc eth
  break
}

const run = async (deployed) => {

  let oracle
  let oracleAddr

  if (deployed) {
    // Call an existing contract
    const oracleAbi = require('./lib/oracle.json')
    oracleAddr = await readFile(__dirname + '/lib/oracleAddress.json')
    oracle = new ethers.Contract(oracleAddr, oracleAbi, ethers.provider)
    console.log("Connected to:", oracleAddr)
  } else {

    // Deploy the contract
    console.log("Deploying contract...")
    const Oracle = await ethers.getContractFactory("Oracle")
    oracle = await Oracle.deploy()
    await oracle.deployed()
    const json = await readFile(__dirname + '/../artifacts/contracts/Oracle.sol/Oracle.json')
    await writeFile(__dirname + '/lib/oracle.json', JSON.stringify((JSON.parse(json).abi), null, 2)) // write the abi to a file
    await writeFile(__dirname + '/lib/oracleAddress.json', oracle.address)
    oracleAddr = oracle.address
    console.log("Oracle contract deployed to:", oracle.address)
  }

  // 1. call consult to get the latest tick from 1 second ago
  const secondsAgo = 1
  const [arithmeticMeanTick, harmonicMeanLiquidity] = await oracle.consult(pool, secondsAgo)

  // 2. get a quote from the oracle
  const usdcBal = 10000
  const price = await oracle.getQuoteAtTick(
    arithmeticMeanTick,
    10000000000, // 10k
    usdc,
    weth
  )

  // 3. The last price of the asset is basically what you gave / what you can get
  const last = bigD(String(usdcBal)).divide(bigD(String(d(price.toString(), 18))))
  console.log('Last price: ' + last.getValue())

}

// utilities below

const bigD = (value) => {
  let raw
  if (typeof value !== 'string') {
    raw = value.toString()
  } else {
    raw = value
  }
  return new bigDecimal(raw)
}

const d = (amount, decimals, precision) => {
  if (precision) {
    return Math.round(ethers.utils.formatUnits(amount, decimals), precision)
  }
  return ethers.utils.formatUnits(amount, decimals)
}

const readFile = async (file) => {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch (error) {
    if (error.errno === -2) {
      console.log('\nError: File not found.')
    } else {
      console.log(error)
    }
  }
}

const writeFile = async (file, content) => {
  try {
    const response = await fs.writeFileSync(file, content);
    return response
  } catch (error) {
    console.log(error)
  }
}

;( async()=> { 
  try {
    if (process.env.HARDHAT_NETWORK === 'hardhat') {
      deployed = false
    }
    await run(deployed)
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
  process.exit(0)
})()