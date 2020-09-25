import program from 'commander'
import {gifa, gifaBuySellCount} from './actions/gifa'
import {dailyMonitoring} from './actions/update-daily-monitoring'
import {recordGftCumulativeSales} from './actions/record-gft-cumulative-sales'
import {getNcncProduct} from './actions/get-ncnc-product'
import {updateNcncProduct} from './actions/update-ncnc-product'
import {getGftProduct} from './actions/get-gft-product'
import {updateGftProduct} from './actions/update-gft-product'
import {updateUnderFifty} from './actions/update-under-fifty'

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
  .description('기프티스타 누적판매량, 누적매입량을 기록합니다.')
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

program
  .command('get-ncnc-product')
  .description(
    `니콘내콘 모든 상품을 조회하고 기록합니다. ('니콘내콘 상품 분석' 시트 업데이트)`,
  )
  .action(async () => {
    await getNcncProduct()
    process.exit()
  })

program
  .command('update-ncnc-product')
  .description('니콘내콘 각 순위 차트를 작성합니다.')
  .action(async () => {
    await updateNcncProduct()
    process.exit()
  })

program
  .command('get-gft-product')
  .description(
    `기프티스타 모든 상품을 조회하고 기록합니다. ('기프티 상품 분석' 시트 업데이트)`,
  )
  .action(async () => {
    await getGftProduct()
    process.exit()
  })

program
  .command('update-gft-product')
  .description('기프티 각 순위 차트를 작성합니다.')
  .action(async () => {
    await updateGftProduct()
    process.exit()
  })

program
  .command('update-under-fifty')
  .description('기프티스타 목표구매량 50개 이하 상품을 업데이트합니다.')
  .action(async () => {
    await updateUnderFifty()
    process.exit()
  })
program.parse(process.argv)
