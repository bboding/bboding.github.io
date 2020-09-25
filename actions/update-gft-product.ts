import moment from 'moment'
import {title} from 'process'
import {
  getSheets,
  readGoogleSheet,
  sleep,
  writeGoogleSheetForRow,
} from '../utils'

const spreadsheetId = process.env.SPREADSHEET_ID

async function updateEachSheet(sheetName, gftDatas, titles) {
  const gftSheets = gftDatas

  const extracted = []

  for (const sheet of gftSheets) {
    extracted.push([
      sheet[titles.indexOf(sheetName)],
      sheet[titles.indexOf('브랜드 상품')],
      sheet[titles.indexOf('판매가격')],
      sheet[titles.indexOf('구매가격')],
      sheet[titles.indexOf('재고')],
      sheet[titles.indexOf('목표 구매량')],
    ])
  }

  extracted.sort((a, b) => {
    if ((a[0] && !b[0]) || a[0] > b[0]) return -1
    if ((!a[0] && b[0]) || a[0] < b[0]) return 1
    return 0
  })

  const newTop100Items = extracted.slice(0, 100)

  const existingTop100Items: any = await readGoogleSheet(
    spreadsheetId,
    `기프티 ${sheetName} 순위`,
    'B2',
    'H101',
  )
  for (const [index, newItem] of newTop100Items.entries()) {
    for (const existing of existingTop100Items) {
      if (newItem[1] === existing[1]) {
        const rankLogs = existing[6].split('->')

        if (rankLogs.length >= 7) {
          rankLogs.shift()
          existing[6] = rankLogs.join('->')
        }

        newItem.push(`${existing[6]}->${index + 1}위`)
      }
    }
    if (newItem.length >= 8) {
      newItem.splice(7)
    }
    if (newItem.length === 6) {
      newItem.push('첫 차트진입')
    }
  }

  await writeGoogleSheetForRow(
    spreadsheetId,
    `기프티 ${sheetName} 위`,
    newTop100Items,
    'B2',
    'H',
  )

  await writeGoogleSheetForRow(
    spreadsheetId,
    `기프티 ${sheetName} 위`,
    [[`${moment().subtract(1, 'days').format('YYYY[.]MM[.]DD')} 기준`]],
    'A1',
    'A1',
  )
}

export async function updateGftProduct() {
  console.log('기프티 각 순위 차트 작성하기:', moment().format('dddd hh:mm:ss'))

  const gftDatas: any = await readGoogleSheet(
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

  const sheetNames = ['매출액', '이익액', '판매개수', '매입액', '매입개수']

  for (const sheetName of sheetNames) {
    await updateEachSheet(sheetName, gftDatas, titles)
  }
}
