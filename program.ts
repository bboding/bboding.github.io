import program from 'commander'
import {gifa, gifaBuySellCount} from './actions/gifa'
import {dailyMonitoring} from './actions/daily-monitoring'
import {recordGftCumulativeSales} from './actions/record-gft-cumulative-sales'

program.version('1.0')

program.command('gifa').action(async () => {
  await gifa()
  process.exit()
})

program.command('gifa-buy-sell-count').action(async () => {
  await gifaBuySellCount()
  process.exit()
})

program
  .command('record-gft-cumulative-sales')
  .description(
    '기프티스타 실시간으로 판매량, 매입량 알기위해 0시에 기프티스타 누적판매량, 누적매입량을 기록합니다.',
  )
  .action(async () => {
    await recordGftCumulativeSales()
    process.exit()
  })

program
  .command('daily-monitoring')
  .description('전략 상품 모니터링 시트를 작성합니다.')
  .action(async () => {
    await dailyMonitoring()
    process.exit()
  })
program.parse(process.argv)
