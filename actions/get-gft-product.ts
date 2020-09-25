import moment from 'moment'
import axios from 'axios'
import {
  clearGoogleSheet,
  readGoogleSheet,
  writeGoogleSheetForColumn,
  writeGoogleSheetForRow,
} from '../utils'

const spreadsheetId = process.env.SPREADSHEET_ID
const dailySpreadsheetId = process.env.DAILY_SPREADSHEET_ID
const buySellSpreadsheetId = process.env.BUY_SELL_COUNT_SPREADSHEET_ID

async function getAllGftProduct() {
  const values = []

  const {data} = await axios.post(
    'https://api.giftistar.com/parse/classes/Brand',
    {
      where: {
        show_buy: true,
      },
      limit: 1000,
      order: 'order',
      _method: 'GET',
      _ApplicationId: 'giftistar',
    },
    {
      headers: {
        'content-type': 'text/plain',
      },
    },
  )

  for (const brand of data.results) {
    const res = await axios.post(
      'https://api.giftistar.com/parse/classes/Menu',
      {
        where: {
          brand: {
            __type: 'Pointer',
            objectId: brand.objectId,
          },
          show_buy: true,
          hide: {
            $ne: true,
          },
        },
        limit: 2000,
        order: 'order',
        _method: 'GET',
        _ApplicationId: 'giftistar',
      },
    )

    for (const item of res.data.results) {
      values.push([
        `${item.brand_name} ${item.name}`,
        item.objectId,
        item.price,
        item.total_sell_count,
        item.buy_price,
        item.total_buy_count,
        item.cupon_count,
        item.target_buy_count,
      ])
    }
  }

  const yesterdayValues: any = await readGoogleSheet(
    spreadsheetId,
    '기프티 상품 분석',
    'A2',
    'H',
  )

  // 어제자 데이터 구하기 = (어제 기준 누적 데이터 - 오늘 기준 누적데이터)
  for (const value of values) {
    for (const yesterdayValue of yesterdayValues) {
      if (value[0] === yesterdayValue[0]) {
        value.push(
          value[3] - yesterdayValue[3] || 0, // 판매개수
          (value[3] - yesterdayValue[3]) * yesterdayValue[2] || 0, // 매출액
          value[5] - yesterdayValue[5] || 0, // 매입개수
          (value[5] - yesterdayValue[5]) * yesterdayValue[4] || 0, // 매입액
          (yesterdayValue[2] - yesterdayValue[4]) *
            (value[3] - yesterdayValue[3]) || 0, // 이익액
        )
        break
      }
    }
  }

  await clearGoogleSheet(spreadsheetId, '기프티 상품 분석', 'A2', 'M')
  await writeGoogleSheetForRow(
    spreadsheetId,
    '기프티 상품 분석',
    values,
    'A2',
    'M',
  )
}

async function getGftBuySell() {
  const res: any = await readGoogleSheet(
    buySellSpreadsheetId,
    'buySellCount',
    'A',
    'G',
  )

  const last = res[res.length - 1]

  if (last[0] === moment().subtract(1, 'day').format('YYYY-MM-DD')) {
    await writeGoogleSheetForColumn(
      spreadsheetId,
      '기프티 상품 분석',
      [
        [
          last[0], // 날짜
          last[3], // 매출액
          last[1], // 매입액
          last[5], // 이익액
        ],
      ],
      'Q1',
      'Q4',
    )
  } else {
    console.log(
      `buySellCount 시트의 어제 데이터가 없습니다. spreadsheetId: (${dailySpreadsheetId})`,
    )
  }
}

export async function getGftProduct() {
  console.log('get-all-gft-product', moment().format('dddd HH:mm:ss'))
  await getAllGftProduct()

  console.log('get-gft-buy-sell', moment().format('dddd HH:mm:ss'))
  await getGftBuySell()
}
