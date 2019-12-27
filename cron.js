const { CronJob } = require('cron')
const { gifa, gifaBuySellCount } = require('./actions/gifa')
// * * * * * *
// 초/분/시/날짜/달/요일
// 0 */30 14-18 * * 1-5
// 30분 마다 14-18 시 사이 월~금요일만

const jobs = [
  {
    name: 'gifa',
    cronTime: '0 44 8 * * *',
    action: gifa,
  },
  {
    name: 'gifa-buy-sell-count',
    cronTime: '0 3 9 * * *',
    action: gifaBuySellCount,
  },
]

console.log('스케쥴링이 시작되었습니다.')

for (const job of jobs) {
  new CronJob(
    job.cronTime,
    async () => {
      console.log(`${job.name} job has started.`)
      await job.action()
      console.log(`${job.name} job has finished.`)
    },
    null,
    true,
    'Asia/Seoul',
  )
}
