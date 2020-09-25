import moment from 'moment'
import {readGoogleSheet, writeGoogleSheetForRow} from '../utils'

const spreadsheetId = process.env.SPREADSHEET_ID
const dailySpreadsheetId = process.env.DAILY_SPREADSHEET_ID

async function updateGftUnderFifty(gftDatas) {
  const gftSheets = gftDatas

  const [titles]: any = await readGoogleSheet(
    spreadsheetId,
    '기프티 상품 분석',
    'A1',
    'M1',
  )

  gftSheets.sort((a, b) => {
    // 매입개수 순위로 정렬
    if ((a[10] && !b[10]) || a[10] > b[10]) return -1
    if ((!a[10] && b[10]) || a[10] < b[10]) return 1
    return 0
  })

  const soldCountTop200Items = gftSheets.slice(0, 200)

  const underFiftyItems = soldCountTop200Items.filter((item) => {
    return item[7] < 50
  })

  const values = []

  for (const item of underFiftyItems) {
    values.push([
      item[titles.indexOf('브랜드 상품')],
      item[titles.indexOf('목표 구매량')],
      item[titles.indexOf('매입개수')],
      item[titles.indexOf('재고')],
      item[titles.indexOf('판매가격')],
      item[titles.indexOf('매입액')],
    ])
  }

  await writeGoogleSheetForRow(
    spreadsheetId,
    '기프티 목표구매량 50개이하',
    values,
    'A2',
    'F',
  )

  await writeGoogleSheetForRow(
    spreadsheetId,
    '기프티 목표구매량 50개이하',
    [[`${moment().subtract(1, 'days').format('YYYY[.]MM[.]DD')} 기준`]],
    'O1',
    'O1',
  )
}

async function updateMatchedNcnc() {
  //
}

export async function updateUnderFifty() {
  console.log('목표구매량 50개 이하 시트 작성하기')

  const gftDatas: any = await readGoogleSheet(
    spreadsheetId,
    '기프티 상품 분석',
    'A2',
    'M',
  )

  await updateGftUnderFifty(gftDatas)

  await updateMatchedNcnc()
}
