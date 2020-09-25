import moment from 'moment'
import {readGoogleSheet, writeGoogleSheetForRow} from '../utils'

const spreadsheetId = process.env.SPREADSHEET_ID
const dailySpreadsheetId = process.env.DAILY_SPREADSHEET_ID

async function updateGftUnderFifty() {
  const gftSheets: any = await readGoogleSheet(
    spreadsheetId,
    '기프티 상품 분석',
    'A2',
    'M',
  )

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

async function updateNcncMatchedUnderFifty() {
  const matchedNames: any = await readGoogleSheet(
    spreadsheetId,
    '상품명 비교',
    'E2',
    'F',
  )

  const underFiftyItems: any = await readGoogleSheet(
    spreadsheetId,
    '기프티 목표구매량 50개이하',
    'A2',
    'A',
  )

  const ncncSheets: any = await readGoogleSheet(
    spreadsheetId,
    '니콘내콘 상품 분석',
    'A2',
    'N',
  )

  const [titles]: any = await readGoogleSheet(
    spreadsheetId,
    '니콘내콘 상품 분석',
    'A1',
    'N1',
  )

  const values = []

  for (const item of underFiftyItems) {
    const gftName = item[0]
    let isMatched = 0

    for (const matchedName of matchedNames) {
      const gft = matchedName[0]
      const ncnc = matchedName[1]

      if (gftName === gft) {
        values.push([ncnc])
        isMatched = 1
        break
      }
    }
    if (!isMatched) values.push(['일치하는 상품 없음'])
  }

  for (const value of values) {
    for (const sheet of ncncSheets) {
      if (value[0] === sheet[1]) {
        value.push(
          sheet[titles.indexOf('니콘내콘 매입개수')],
          sheet[titles.indexOf('재고')],
          sheet[titles.indexOf('앱 판매가')],
          sheet[titles.indexOf('스토어 판매가')],
          sheet[titles.indexOf('제시가')],
          sheet[titles.indexOf('앱 판매개수')],
          sheet[titles.indexOf('네이버스토어 판매개수')],
        )
        break
      }
    }
  }

  await writeGoogleSheetForRow(
    spreadsheetId,
    '기프티 목표구매량 50개이하',
    values,
    'G2',
    'N',
  )
}

export async function updateUnderFifty() {
  console.log('update-under-fifty', moment().format('dddd HH:mm:ss'))
  await updateGftUnderFifty()

  console.log(
    'update-ncnc-matched-under-fifty',
    moment().format('dddd HH:mm:ss'),
  )
  await updateNcncMatchedUnderFifty()
}
