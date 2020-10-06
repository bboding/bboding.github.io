import axios from 'axios'
import moment from 'moment'
import {getSheets} from '../utils'

const spreadsheetId = process.env.BUY_SELL_COUNT_SPREADSHEET_ID

function sleep() {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.random() * (2000 - 1000) + 5000),
  )
}

function sleepShort() {
  return new Promise((resolve) => setTimeout(resolve, 100))
}

export const gifa = async () => {
  const sheets = await getSheets()
  try {
    console.log('gifa-on-update', moment().format('YYMMDD HH:mm:ss'))

    const giftistarItems = []

    const {results: brands} = (
      await axios.post(
        'https://api.giftistar.com/parse/classes/Brand',
        {
          where: {
            show_buy: true,
          },
          limit: 1000,
          order: 'order',
          _method: 'GET',
          _ApplicationId: 'giftistar',
          _ClientVersion: 'js1.10.0',
          _InstallationId: 'deb592bb-fb7b-f11c-5cce-b3ab549c6e1e',
        },
        {
          headers: {
            'content-type': 'text/plain',
          },
        },
      )
    ).data

    for (const brand of brands) {
      const {results: items} = (
        await axios.post(
          'https://api.giftistar.com/parse/classes/Menu',
          {
            where: {
              brand: {
                __type: 'Pointer',
                className: 'Brand',
                objectId: brand.objectId,
              },
              show_buy: true,
              hide: {
                $ne: true,
              },
            },
            limit: 1000,
            order: 'order',
            _method: 'GET',
            _ApplicationId: 'giftistar',
            _ClientVersion: 'js1.10.0',
            _InstallationId: 'deb592bb-fb7b-f11c-5cce-b3ab549c6e1e',
          },
          {
            headers: {
              'content-type': 'application/json; charset=utf-8',
            },
          },
        )
      ).data

      for (const item of items) {
        let couponStockMoney = 0
        if (item.cupon_count !== 0) {
          couponStockMoney = item.stock_money
        }
        giftistarItems.push([
          item.objectId,
          item.name,
          brand.name,
          item.origin_price,
          `${item.buy_price - item.buy_step2}`,
          item.buy_price,
          `${item.price - item.discount_step2}`,
          item.price,
          item.cupon_count,
          couponStockMoney,
          item.margin_rate,
          item.average_sell_count,
          item.target_buy_count,
        ])
      }
      console.log(brand.name)
      await sleep()
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'giftistar!A3:M99999',
      valueInputOption: 'RAW',
      requestBody: {
        values: giftistarItems,
      },
    })

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'giftistar!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            `기프티스타 (시트 업데이트 ${moment().format(
              'YY년 MM월 DD일 HH:mm',
            )})`,
          ],
        ],
      },
    })
    console.log('giftistar-updated', moment().format('YYMMDD HH:mm:ss'))

    console.log('ncnc-on-update', moment().format('YYMMDD HH:mm:ss'))

    const base64 = Buffer.from(
      unescape(
        encodeURIComponent(
          `${process.env.API_USERNAME}:${process.env.API_PASSWORD}`,
        ),
      ),
    ).toString('base64')
    const result = await axios.request({
      method: 'post',
      url: `${process.env.API_URL}/admin-session/username`,
      headers: {
        Authorization: `Basic ${base64}`,
        'Content-Type': 'application/json',
      },
    })

    const {token} = result.data.adminSession

    const axiosOptions = {
      headers: {
        Authorization: `Bear ${token}`,
      },
    }

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'ncnc!A3:G99999',
    })
    console.log('cleared')

    const responseConItem = await axios.get(
      `${process.env.API_URL}/con-items`,
      axiosOptions,
    )
    const {conItems} = responseConItem.data
    const ncncConItems = []

    for (let i = 1; i <= conItems[conItems.length - 1].id; i++) {
      ncncConItems.push([])
      for (const conItem of conItems) {
        if (conItem.id === i) {
          ncncConItems[i - 1] = [
            conItem.id,
            conItem.conCategory2.name,
            conItem.name,
            conItem.originalPrice,
            conItem.askingPrice,
            conItem.ncSellingPrice,
            conItem.sfSellingPrice,
          ]
        }
      }
      await sleepShort()
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'ncnc!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            `니콘내콘 (시트 업데이트 ${moment().format(
              'YY년 MM월 DD일 HH:mm',
            )})`,
          ],
        ],
      },
    })

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'ncnc!A2:G2',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            '상품Id',
            '브랜드',
            '상품명',
            '원가',
            '제시가',
            '앱판매가',
            '스팜판매가',
          ],
        ],
      },
    })

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'ncnc!A1:H99999',
      valueInputOption: 'RAW',
      requestBody: {
        values: ncncConItems,
      },
    })
    console.log('ncnc-updated', moment().format('YYMMDD HH:mm:ss'))

    console.log('comparison-on-update', moment().format('YYMMDD HH:mm:ss'))

    const sheet1 = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'giftistar!A3:J99999',
    })
    const giftiDatas = sheet1.data.values

    const sheet2 = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'ncnc!A3:H99999',
    })
    const ncncDatas = sheet2.data.values

    const list = []
    const ncncDatasLength = ncncDatas.length
    const giftiDatasLength = giftiDatas.length
    for (let i = 0; i < ncncDatasLength; i++) {
      for (let k = 0; k < giftiDatasLength; k++) {
        if (giftiDatas[k][0] === ncncDatas[i][7]) {
          list.push([
            ncncDatas[i][0],
            ncncDatas[i][1],
            ncncDatas[i][2],
            ncncDatas[i][3],
            giftiDatas[k][5],
            ncncDatas[i][4],
            giftiDatas[k][7],
            ncncDatas[i][5],
            ncncDatas[i][6],
          ])
        }
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'comparison!A3:I99999',
      valueInputOption: 'RAW',
      requestBody: {
        values: list,
      },
    })

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'comparison!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            `가격 비교 (시트 업데이트 ${moment().format(
              'YY년 MM월 DD일 HH:mm',
            )})`,
          ],
        ],
      },
    })
    console.log('comparison-updated', moment().format('YYMMDD HH:mm:ss'))

    console.log('gifa-daily-on-update', moment().format('YYMMDD HH:mm:ss'))

    const giftistarDaily = []

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'giftistar!I1:J1',
    })
    const totalAmounts = res.data.values

    totalAmounts.map((totalAmount) => {
      giftistarDaily[0] = moment().format('YY년 MM월 DD일 HH:mm')
      giftistarDaily[1] = totalAmount[0]
      giftistarDaily[2] = totalAmount[1]
    })

    // YXmMasiZGG = 스타벅스 카페아메리카노
    for (let i = 0; i < giftiDatasLength; i++) {
      if (giftiDatas[i][0] === 'YXmMasiZGG') {
        giftistarDaily[3] = giftiDatas[i][8]
        giftistarDaily[4] = giftiDatas[i][9]
        giftistarDaily[5] = giftiDatas[i][5]
        giftistarDaily[6] = giftiDatas[i][7]
      }
    }

    // cLBdgWlMh1 = 이디야 카페아메리카노
    for (let i = 0; i < giftiDatasLength; i++) {
      if (giftiDatas[i][0] === 'cLBdgWlMh1') {
        giftistarDaily[7] = giftiDatas[i][8]
        giftistarDaily[8] = giftiDatas[i][5]
        giftistarDaily[9] = giftiDatas[i][7]
      }
    }

    // cjGsVBgQUN = 투썸 아메리카노 R
    for (let i = 0; i < giftiDatasLength; i++) {
      if (giftiDatas[i][0] === 'cjGsVBgQUN') {
        giftistarDaily[10] = giftiDatas[i][8]
        giftistarDaily[11] = giftiDatas[i][5]
        giftistarDaily[12] = giftiDatas[i][7]
      }
    }

    const sheetGifa = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'giftistarDaily!A1:M999999',
    })
    const listGifa = sheetGifa.data.values
    const nextRow = listGifa.length + 1

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `giftistarDaily!A${nextRow}:M${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [giftistarDaily],
      },
    })
    console.log('giftistar-daily-updated', moment().format('YYMMDD HH:mm:ss'))
  } catch (err) {
    console.log(err)
  }
}

export async function gifaBuySellCount() {
  try {
    console.log(
      'gifa-buy-sell-count-on-update',
      moment().format('YYMMDD HH:mm:ss'),
    )

    const sheets = await getSheets()

    const responseDayBuy = await axios.post(
      'https://api.giftistar.com/parse/classes/Analytics',
      {
        where: {
          type: 'daybuy',
        },
        limit: 7,
        order: '-stamp',
        _method: 'GET',
        _ApplicationId: 'giftistar',
        _ClientVersion: 'js1.10.0',
        _InstallationId: 'deb592bb-fb7b-f11c-5cce-b3ab549c6e1e',
      },
      {
        headers: {
          'content-type': 'application/json',
        },
      },
    )
    const dayBuys = responseDayBuy.data.results

    const dayBuyList = []

    for (const dayBuy of dayBuys) {
      dayBuyList.push([dayBuy.stamp, dayBuy.buy_sum, dayBuy.count])
    }

    const responseDaySell = await axios.post(
      'https://api.giftistar.com/parse/classes/Analytics',
      {
        where: {
          type: 'daysell',
        },
        limit: 7,
        order: '-stamp',
        _method: 'GET',
        _ApplicationId: 'giftistar',
        _ClientVersion: 'js1.10.0',
        _InstallationId: 'deb592bb-fb7b-f11c-5cce-b3ab549c6e1e',
      },
      {
        headers: {
          'content-type': 'application/json',
        },
      },
    )
    const daySells = responseDaySell.data.results

    const daySellList = []

    for (const daySell of daySells) {
      daySellList.push([
        daySell.sales,
        daySell.count,
        daySell.rate,
        daySell.balance,
      ])
    }

    const dayBuySellList = []

    dayBuySellList.push([
      dayBuyList[1][0],
      dayBuyList[1][1],
      dayBuyList[1][2],
      daySellList[1][0],
      daySellList[1][1],
      daySellList[1][2],
      daySellList[1][3],
    ])

    const sheetBuySell = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'buySellCount!A1:G999999',
    })
    const buySellCount = sheetBuySell.data.values
    const buySellNextRow = buySellCount.length + 1

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `buySellCount!A${buySellNextRow}:G${buySellNextRow}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: dayBuySellList,
      },
    })
    console.log(
      'gifa-buy-sell-count-updated',
      moment().format('YYMMDD HH:mm:ss'),
    )
  } catch (err) {
    console.log(err)
  }
}
