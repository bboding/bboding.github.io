import program from 'commander'
import {gifa, gifaBuySellCount} from './actions/gifa'

program.version('1.0')

program.command('gifa').action(async () => {
  await gifa()
  process.exit()
})

program.command('gifa-buy-sell-count').action(async () => {
  await gifaBuySellCount()
  process.exit()
})

program.parse(process.argv)
