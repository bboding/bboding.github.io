import {CronJob} from 'cron'
import {gifa, gifaBuySellCount} from './actions/gifa'
import {updateDailyMonitoring} from './actions/update-daily-monitoring'
import {getGftCumulativeSales} from './actions/get-gft-cumulative-sales'
import {getNcncProduct} from './actions/get-ncnc-product'
import {updateNcncChart} from './actions/update-ncnc-chart'
import {getGftProduct} from './actions/get-gft-product'
import {updateGftChart} from './actions/update-gft-chart'
import {updateUnderFifty} from './actions/update-under-fifty'
import {updateMatchedProduct} from './actions/update-matched-product'
import {noticeDailyStats} from './actions/notice-daily-Stats'
import {noticeNaverVisitorCount} from './actions/notice-naver-visitor-count'
import {checkCurrentGftBuyPrice} from './actions/check-current-gft-buy-price'
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
  {
    name: '전략 상품 누적판매량, 누적매입량 기록하기',
    cronTime: '0 0 0 * * *',
    action: getGftCumulativeSales,
  },
  {
    name: '기프티 상품 분석 시트 업데이트하기',
    cronTime: '0 0 0 * * *',
    action: getGftProduct,
  },
  {
    name: '기프티 각 순위 차트를 작성하기',
    cronTime: '0 0 2 * * *',
    action: updateGftChart,
  },
  {
    name: '니콘내콘 상품 분석 시트 업데이트',
    cronTime: '0 0 3 * * *',
    action: getNcncProduct,
  },
  {
    name: '전략상품 모니터링 시트 작성하기',
    cronTime: '0 0 5,8,9,10,11,12,13,14,15,16,17,18,19,22 * * *',
    action: updateDailyMonitoring,
  },
  {
    name: '전략상품 모니터링 시트 작성하기',
    cronTime: '0 57 23 * * *',
    action: updateDailyMonitoring,
  },
  {
    name: '새로 추가된 상품명 매칭하여 저장하기',
    cronTime: '0 0 7 * * *',
    action: updateMatchedProduct,
  },
  {
    name:
      '기프티스타 상품 중 목표구매량 50개 이하 니콘내콘과 매칭하여 작성하기',
    cronTime: '0 30 7 * * *',
    action: updateUnderFifty,
  },
  {
    name: '니콘내콘 각 순위 차트를 작성하기',
    cronTime: '0 0 8 30 * *',
    action: updateNcncChart,
  },
  {
    name: '기프티스타와 니콘내콘 매출/매입/이익 슬랙에 전송하기',
    cronTime: '0 0 10 * * *',
    action: noticeDailyStats,
  },
  {
    name: '기프티스타 매입개수 top50에서 판매가 변경있는 상품 슬랙에 전송하기',
    cronTime: '0 0 10,14,18 * * MON-FRI',
    action: checkCurrentGftBuyPrice,
  },
  {
    name: '네이버 스토어 방문자수 슬랙에 전송하기',
    cronTime: '0 30 12,18 * * *',
    action: noticeNaverVisitorCount,
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
