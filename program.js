const program = require('commander')
const { gifa, gifaBuySellCount } = require('./actions/gifa.js')

const { version } = require('./package.json')

program.version(version)

program.command('gifa').action(async () => {
  await gifa()
  process.exit()
})

program.command('gifa-buy-sell-count').action(async () => {
  await gifaBuySellCount()
  process.exit()
})
program.parse(process.argv)
