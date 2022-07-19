const env = require('node-env-file')
env(__dirname + '/../.env')

const { ethers } = require('ethers')
const { dbPools } = require('../db')
const { spike } = require('../models/ss/ta')
const { getHigh, getLow } = spike
const { etherscan } = require('../external')
const { multiEth, dateutils, decimals } = require('../utils')
const { d } = decimals
const { getContract, getLastBlock, getBlock } = multiEth
const { timeFmtDb, getReverseGrid, nearestInterval, epochFromDate, localTimeToDbTime, dateNowBKK } = dateutils

  /* 
    A method for pulling k-line "candlesticks" off of uniswap pools
    This is intended to provide a means to get most recent price data off chain
    Due to the immense number of requests it performs on an RPC it is not recommended 
    for longer time frame k-line lookups
  */
  ; (async () => {
    try {
      const pools = await dbPools.poolList('mainnet')
      const ending = 'now' // 'now' or timeFmtDb timestamp
      const intervalMinutes = 1
      const numberOfPeriods = 15
      const useEtherscan = false
      for (let i = 0; i < pools.length; i++) {
        if (pools[i].type === 'UniswapV3Pool') {
          const klines = await deriveKlinesFromPoolData(pools[i], ending, intervalMinutes, numberOfPeriods, useEtherscan)
          // console.log(klines)
          klines.forEach((k) => {
            console.log(k.date + '  open: ' + String(k.open).padEnd(15) + 'high: ' + String(k.high).padEnd(15) + 'low: ' + String(k.low).padEnd(15) + 'close: ' + String(k.close).padEnd(15))
          })
          process.exit()
        }
      }
    } catch (error) {
      console.log(error)
    }
    process.exit()
  })()

/* 
  Polling etherscan for a nearby block is more accurate than guessing by block duration.
*/
const deriveKlinesFromPoolData = async (pool, ending, intervalMinutes, numberOfPeriods, useEtherscan) => {

  const guessBlockFromTimestamp = async (timestamp) => {
    const blockHeight = await getLastBlock('mainnet')
    const block = await getBlock(blockHeight, 'mainnet')
    const diff = block.timestamp - timestamp
    const blockDuration = 13 // Source: https://ycharts.com/indicators/ethereum_blocks_per_day / 86400
    const numberOfBlocksBack = Math.floor(diff / blockDuration)
    const guess = blockHeight - numberOfBlocksBack
    return guess
  }

  // derive beginning and ending blockHeights
  let endingTs
  let endingBlock
  if (ending === 'now') {
    endingBlock = await getLastBlock('mainnet')
    const block = await getBlock(endingBlock, 'mainnet')
    endingTs = epochFromDate(block.timestamp * 1000) / 1000
  } else {
    endingTs = epochFromDate(ending) / 1000
    if (useEtherscan) {
      endingBlock = await etherscan.getBlockAtTimestamp(epochFromDate(ending) / 1000)
    } else {
      endingBlock = guessBlockFromTimestamp(epochFromDate(ending) / 1000)
    }
  }
  const endingBlockData = await getBlock(endingBlock, 'mainnet')
  const duration = intervalMinutes * numberOfPeriods * 60 * 1000 // 75minutes * 60 seconds * 1000 ms
  const beginningTs = endingBlockData.timestamp * 1000 - duration
  let startingBlock
  if (useEtherscan) {
    startingBlock = await etherscan.getBlockAtTimestamp(beginningTs)
  } else {
    startingBlock = await guessBlockFromTimestamp(beginningTs / 1000)
  }

  // Poll the chain for oracle information
  const difference = endingBlock - startingBlock
  let oracle = await getContract('0xf3e834be475ad2ac1c4c7842073c9b62c9d91358')
  const requests = []
  let thisBlock = endingBlock
  for (let i = 0; i < difference; i++) {
    requests.push(quoteAtBlock(oracle, pool, thisBlock))
    thisBlock -= 1
  }
  console.log(timeFmtDb(dateNowBKK()) + ' pool_lookup:' + pool.asymbol + '-' + pool.bsymbol + ' processing ' + requests.length * 3 + ' rpc calls')
  const responses = await Promise.all(requests)
  return makeCandles(pool.asymbol, pool.bsymbol, responses, endingTs, Math.floor(beginningTs / 1000), intervalMinutes)
}


/*
  Returns an array of K-Line data, Zero index being latest. Item at Zero 
  index is the latest Timestamp; everything else is rounded off to 'minutes'
*/
const makeCandles = (f, t, data, before, after, minutes) => {
  try {
    const bef = nearestInterval(before * 1000, minutes, true)
    const aft = nearestInterval(after * 1000, minutes, false)
    const grid = getReverseGrid(timeFmtDb(bef), timeFmtDb(aft), minutes)
    let latestTimestamp = 0
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < grid.length; j++) {
        if (data[i].timestamp >= grid[j][0] && data[i].timestamp <= grid[j][1]) {
          grid[j][3].push(data[i])
        }
        if (data[i].timestamp > latestTimestamp) {
          latestTimestamp = data[i].timestamp
        }
      }
    }
    let klines = []
    grid.forEach((g) => {
      const all = g[3].sort((a, b) => (a.timestamp > b.timestamp) ? 1 : -1)
      let quotes = []
      all.forEach((k) => {
        quotes.push(Number(k.quotef))
      })
      if (quotes.length !== 0) {
        const datelocal = g[2]
        const date = timeFmtDb(localTimeToDbTime(epochFromDate(g[2])))
        const open = quotes[0]
        let high = getHigh(quotes)
        if (String(high) === 'NaN') {
          high = open
        }
        let low = getLow(quotes)
        if (String(low) === 'NaN') {
          low = open
        }
        const close = quotes[quotes.length - 1]
        const volume = ''
        klines.push({
          f, t, date, datelocal, open, high, low, close, volume
        })
      }
    })
    klines = klines.reverse()
    klines[0].date = timeFmtDb(localTimeToDbTime(latestTimestamp)) // insert now times to klines[0]
    klines[0].datelocal = timeFmtDb(latestTimestamp)
    return klines
  } catch (error) {
    console.log(error)
    console.log('Error generating kline data')
  }
}

const oracleQuote = async (fromBlock, amount, a, b, address, oracle) => {
  const [arithmeticMeanTick] = await oracle.consult(address, 1, { blockTag: Number(fromBlock) })
  return await oracle.getQuoteAtTick(arithmeticMeanTick, amount, a, b, { blockTag: Number(fromBlock) })
}

const quoteAtBlock = async (oracle, poolInfo, fromBlock) => {
  try {
    const timestamp = getBlock(fromBlock, 'mainnet')
    const amount = ethers.utils.parseUnits('1', poolInfo.adecimals)
    const [block, quote] = await Promise.all([
      timestamp,
      oracleQuote(fromBlock, amount, poolInfo.tokena, poolInfo.tokenb, poolInfo.address, oracle)
    ])
    return { timestamp: block.timestamp * 1000, timestampf: timeFmtDb(block.timestamp * 1000), quote: quote.toString(), quotef: d(quote.toString(), poolInfo.bdecimals) }
  } catch (error) {
    console.log(error)
    console.log('There was an error calling for quote at block')
  }
}