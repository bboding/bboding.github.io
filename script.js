const moment = require('moment')
const axios = require('axios')
const fs = require('fs')
const readline = require('readline')
const { google } = require('googleapis')
const program = require('commander')
const util = require('util')

require('dotenv').config({ path: __dirname + '/.env' })

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH

const getData = util.promisify(fs.readFile)
const writeData = util.promisify(fs.writeFile)

const spreadsheetId = '17vx2FXgG1Ylzt2SWjuRkIre_4O3dsb49q1SmT408fQo'

let tokenData, sheets

async function getTokenData(tokenData) {
  const content = await getData(process.env.GOOGLE_CREDENTIAL_PATH)
  const credentials = JSON.parse(content)

  const { client_secret, client_id, redirect_uris } = credentials.installed

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  )
  try {
    tokenData = await getData(TOKEN_PATH)
  } catch (err) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    })
    console.log('Authorizse this app by visiting this url:', authUrl)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const code = await askCode(rl)
    const { tokens } = await oAuth2Client.getToken(code)
    oAuth2Client.setCredentials(tokens)
    await writeData(TOKEN_PATH, JSON.stringify(tokens))
    console.log('Token stored to', TOKEN_PATH)
    tokenData = await getData(TOKEN_PATH)
  }

  oAuth2Client.setCredentials(JSON.parse(tokenData))

  sheets = google.sheets({
    version: 'v4',
    auth: oAuth2Client
  })
}

program
  .command('gifa')
  .action(async () => {
    try {
      console.log('gifa-on-update', moment().format('YYMMDD HH:mm:ss'))

      await getTokenData(tokenData)

      let giftistarItems = []
      const response = await axios.post(
        'https://api.giftistar.com/parse/classes/Brand',
        {
          where: {
            show_buy: true
          },
          limit: 1000,
          order: 'order',
          _method: 'GET',
          _ApplicationId: 'giftistar',
          _ClientVersion: 'js1.10.0',
          _InstallationId: 'deb592bb-fb7b-f11c-5cce-b3ab549c6e1e'
        },
        {
          headers: {
            'content-type': 'text/plain'
          }
        }
      )
      const { results } = response.data

      let brands = []
      for (const result of results) {
        brands.push({
          id: result.objectId,
          name: result.name
        })
      }

      for (const brand of brands) {
        const res = await axios.post(
          'https://api.giftistar.com/parse/classes/Menu',
          {
            where: {
              brand: {
                __type: 'Pointer',
                className: 'Brand',
                objectId: brand.id
              },
              show_buy: true,
              hide: {
                $ne: true
              }
            },
            limit: 1000,
            order: 'order',
            _method: 'GET',
            _ApplicationId: 'giftistar',
            _ClientVersion: 'js1.10.0',
            _InstallationId: 'deb592bb-fb7b-f11c-5cce-b3ab549c6e1e'
          },
          {
            headers: {
              'content-type': 'application/json; charset=utf-8'
            }
          }
        )
        const { results } = res.data

        for (const result of results) {
          if (result.cupon_count === 0) {
            couponStockMoney = 0
          } else couponStockMoney = result.stock_money

          giftistarItems.push([
            result.objectId,
            brand.name,
            result.name,
            result.origin_price,
            `${result.buy_price - result.buy_step2}`,
            result.buy_price,
            `${result.price - result.discount_step2}`,
            result.price,
            result.cupon_count,
            couponStockMoney,
            result.margin_rate,
            result.average_sell_count,
            result.target_buy_count
          ])
        }
        console.log(brand.name)
        await sleep()
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'giftistar!A3:M99999',
        valueInputOption: 'RAW',
        resource: {
          values: giftistarItems
        }
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'giftistar!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [
            [
              `기프티스타 (시트 업데이트 ${moment().format(
                'YY년 MM월 DD일 HH:mm'
              )})`
            ]
          ]
        }
      })
      console.log('giftistar-updated', moment().format('YYMMDD HH:mm:ss'))
    } catch (err) {
      console.log(err)
    }
  })

program
  .command('ncnc')
  .action(async () => {
    try {
      console.log('ncnc-on-update', moment().format('YYMMDD HH:mm:ss'))

      await getTokenData(tokenData)

      const base64 = Buffer.from(
        unescape(
          encodeURIComponent(
            `${process.env.API_USERNAME}:${process.env.API_PASSWORD}`
          )
        )
      ).toString('base64')
      const result = await axios.request({
        method: 'post',
        url: `${process.env.API_URL}/admin-session/username`,
        headers: {
          Authorization: `Basic ${base64}`,
          [`Content-Type`]: 'application/json'
        }
      })

      const { token } = result.data.adminSession

      const axiosOptions = {
        headers: {
          Authorization: `Bear ${token}`
        }
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'ncnc!A3:G99999'
      })
      console.log('cleared')

      const responseConItem = await axios.get(
        `${process.env.API_URL}/con-items`,
        axiosOptions
      )
      const { conItems } = responseConItem.data
      let ncncConItems = []

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
              conItem.sfSellingPrice
            ]
          }
        }
        await sleepShort()
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'ncnc!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [
            [
              `니콘내콘 (시트 업데이트 ${moment().format(
                'YY년 MM월 DD일 HH:mm'
              )})`
            ]
          ]
        }
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'ncnc!A2:G2',
        valueInputOption: 'RAW',
        resource: {
          values: [
            [
              '상품Id',
              '브랜드',
              '상품명',
              '원가',
              '제시가',
              '앱판매가',
              '스팜판매가'
            ]
          ]
        }
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'ncnc!A1:H99999',
        valueInputOption: 'RAW',
        resource: {
          values: ncncConItems
        }
      })
      console.log('ncnc-updated', moment().format('YYMMDD HH:mm:ss'))
    } catch (err) {
      console.log(err)
    }
  })

program
  .command('comparison')
  .action(async () => {
    try {
      console.log('comparison-on-update', moment().format('YYMMDD HH:mm:ss'))

      await getTokenData(tokenData)

      const sheet1 = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'giftistar!A3:J99999'
      })
      const giftiDatas = sheet1.data.values

      const sheet2 = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'ncnc!A3:H99999'
      })
      const ncncDatas = sheet2.data.values

      let list = []
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
              ncncDatas[i][6]
            ])
          }
        }
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'comparison!A3:I99999',
        valueInputOption: 'RAW',
        resource: {
          values: list
        }
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'comparison!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [
            [
              `가격 비교 (시트 업데이트 ${moment().format(
                'YY년 MM월 DD일 HH:mm'
              )})`
            ]
          ]
        }
      })
      console.log('comparison-updated', moment().format('YYMMDD HH:mm:ss'))
    } catch (err) {
      console.log(err)
    }
  })

program
  .command('gifa-daily')
  .action(async () => {
    try {
      console.log('gifa-daily-on-update', moment().format('YYMMDD HH:mm:ss'))

      await getTokenData(tokenData)

      let giftistarDaily = []

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'giftistar!I1:J1'
      })
      const totalAmounts = res.data.values

      totalAmounts.map(totalAmount => {
        giftistarDaily[0] = moment().format('YY년 MM월 DD일 HH:mm')
        giftistarDaily[1] = totalAmount[0]
        giftistarDaily[2] = totalAmount[1]
      })

      const sheet1 = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'giftistar!A3:J99999'
      })
      const giftiDatas = sheet1.data.values
      const giftiDatasLength = giftiDatas.length

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
        range: 'giftistarDaily!A1:M999999'
      })
      const listGifa = sheetGifa.data.values
      const nextRow = listGifa.length + 1

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `giftistarDaily!A${nextRow}:M${nextRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: [giftistarDaily]
        }
      })
      console.log('giftistar-daily-updated', moment().format('YYMMDD HH:mm:ss'))
    } catch (err) {
      console.log(err)
    }
  })

program
  .command('gifa-buy-sell-count')
  .action(async () => {
    try {
      console.log('gifa-buy-sell-count-on-update', moment().format('YYMMDD HH:mm:ss'))

      await getTokenData(tokenData)

      const responseDayBuy = await axios.post(
        'https://api.giftistar.com/parse/classes/Analytics',
        {
          where: {
            type: 'daybuy'
          },
          limit: 7,
          order: '-stamp',
          _method: 'GET',
          _ApplicationId: 'giftistar',
          _ClientVersion: 'js1.10.0',
          _InstallationId: 'deb592bb-fb7b-f11c-5cce-b3ab549c6e1e'
        },
        {
          headers: {
            'content-type': 'application/json'
          }
        }
      )
      const dayBuys = responseDayBuy.data.results

      let dayBuyList = []

      for (const dayBuy of dayBuys) {
        dayBuyList.push([dayBuy.stamp, dayBuy.buy_sum, dayBuy.count])
      }

      const responseDaySell = await axios.post(
        'https://api.giftistar.com/parse/classes/Analytics',
        {
          where: {
            type: 'daysell'
          },
          limit: 7,
          order: '-stamp',
          _method: 'GET',
          _ApplicationId: 'giftistar',
          _ClientVersion: 'js1.10.0',
          _InstallationId: 'deb592bb-fb7b-f11c-5cce-b3ab549c6e1e'
        },
        {
          headers: {
            'content-type': 'application/json'
          }
        }
      )
      const daySells = responseDaySell.data.results

      let daySellList = []

      for (const daySell of daySells) {
        daySellList.push([
          daySell.sales,
          daySell.count,
          daySell.rate,
          daySell.balance
        ])
      }

      let dayBuySellList = []

      dayBuySellList.push([
        dayBuyList[1][0],
        dayBuyList[1][1],
        dayBuyList[1][2],
        daySellList[1][0],
        daySellList[1][1],
        daySellList[1][2],
        daySellList[1][3]
      ])

      const sheetBuySell = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'buySellCount!A1:G999999'
      })
      const buySellCount = sheetBuySell.data.values
      const buySellNextRow = buySellCount.length + 1

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `buySellCount!A${buySellNextRow}:G${buySellNextRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: dayBuySellList
        }
      })
      console.log('gifa-buy-sell-count-updated', moment().format('YYMMDD HH:mm:ss'))

    } catch (err) {
      console.log(err)
    }
  })

program.parse(process.argv)

function sleep() {
  return new Promise(resolve =>
    setTimeout(resolve, Math.random() * (2000 - 1000) + 5000)
  )
}

function sleepShort() {
  return new Promise(resolve => setTimeout(resolve, 100))
}

function askCode(rl) {
  return new Promise(resolve => {
    rl.question('Enter the code from that page here: ', code => {
      resolve(code)
    })
  })
}
