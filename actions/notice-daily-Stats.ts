import moment from 'moment'
import {readGoogleSheet, sendSlackMessage} from '../utils'

const buySellCountSpreadsheetId = process.env.BUY_SELL_COUNT_SPREADSHEET_ID
const mainStatsSpreadsheetId = process.env.MAIN_STATS_SPREADSHEET_ID
const spreadsheetId = process.env.SPREADSHEET_ID

export async function noticeDailyStats() {
  console.log('notice-daily-stats', moment().format('dddd HH:mm:ss'))

  try {
    const yesterday = (format) => {
      return moment().subtract(1, 'day').format(format)
    }

    let errMessage

    let gftStats: any = await readGoogleSheet(
      buySellCountSpreadsheetId,
      'buySellCount',
      'A',
      'F',
    )

    if (gftStats[gftStats.length - 1][0] !== yesterday('YYYY-MM-DD')) {
      errMessage = 'buySellCount 시트 아직 업데이트 안됨'
    } else {
      gftStats = gftStats[gftStats.length - 1]
    }

    let ncncSell: any = await readGoogleSheet(
      mainStatsSpreadsheetId,
      '시트1',
      'A',
      'T',
    )

    if (ncncSell[ncncSell.length - 1][0] !== yesterday('YYYY-MM-DD')) {
      errMessage = '주요 수치 시트 업데이트 안됨'
    } else {
      ncncSell = ncncSell[ncncSell.length - 1]
    }

    const ncncBuy: any = await readGoogleSheet(
      spreadsheetId,
      '니콘내콘 상품 분석',
      'O1',
      'R8',
    )

    if (ncncBuy[0][0] !== yesterday('YYYY.MM.DD(ddd)')) {
      errMessage = '니콘내콘 상품 분석 시트 업데이트 안됨'
    }

    if (errMessage) {
      await sendSlackMessage(
        `yesterday(
        'YYYY[년] M[월] DD[일] dddd[ 리포트]',
      )}_:sun_with_face:\nerr:${errMessage}`,
      )
    } else {
      await sendSlackMessage(
        `_${yesterday(
          'YYYY[년] M[월] DD[일] dddd[ 리포트]',
        )}_:sun_with_face:\n>니콘내콘 매출액: ${(
          ncncSell[1] + ncncSell[14]
        ).toLocaleString()}원 (앱: ${ncncSell[1].toLocaleString()}원 네이버스토어: ${ncncSell[14].toLocaleString()}원)\n>기프티스타 매출액: ${gftStats[3].toLocaleString()}원\n\n>니콘내콘 매입액: ${ncncBuy[7][1].toLocaleString()}원\n>기프티스타 매입액: ${gftStats[1].toLocaleString()}원\n\n>니콘내콘 매출이익: ${ncncBuy[3][3].toLocaleString()}원\n>기프티스타 매출이익: ${gftStats[5].toLocaleString()}원`,
      )
    }
  } catch (err) {
    console.log(err)
  }
}
