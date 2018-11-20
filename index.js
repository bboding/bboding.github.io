const moment = require('moment')
const axios = require('axios')
const fs = require('fs')
const readline = require('readline')
const { google } = require('googleapis')
const program = require('commander')
const util = require('util')

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const TOKEN_PATH = 'token.json'

const getData = util.promisify(fs.readFile)
const writeData = util.promisify(fs.writeFile)

const spreadsheetId = '17vx2FXgG1Ylzt2SWjuRkIre_4O3dsb49q1SmT408fQo'

function sleep() {
  return new Promise(resolve =>
    setTimeout(resolve, Math.random() * (2000 - 1000) + 500)
  )
}

function askCode(rl) {
  return new Promise(resolve => {
    rl.question('Enter the code from that page here: ', code => {
      resolve(code)
    })
  })
}

program
  .version('0.1.0')
  .command('giftistar')
  .action(async () => {
    try {
      const content = await getData('credentials.json')
      const credentials = JSON.parse(content)

      const {
        client_secret,
        client_id,
        redirect_uris
      } = credentials.installed

      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      )

      let tokenData
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

        const {tokens} = await oAuth2Client.getToken(code)

        oAuth2Client.setCredentials(tokens)

        await writeData(TOKEN_PATH, JSON.stringify(tokens))

        console.log('Token stored to', TOKEN_PATH)

        tokenData = await getData(TOKEN_PATH)
      }

      oAuth2Client.setCredentials(JSON.parse(tokenData))

      console.log('onUpdate')
      const sheets = google.sheets({
        version: 'v4',
        auth: oAuth2Client
      })

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
            couponStockMoney
          ])
        }
        console.log(brand.name)
        await sleep()
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'giftistar!A3:J99999',
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
            [`기프티스타 (시트 업데이트 ${moment().format('YY년 MM월 DD일 HH:mm')})`]
          ]
        }
      })
      console.log('dated')

      let giftistarDaily = []
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'giftistar!I1:J1'
      })
      const rows = res.data.values
      rows.map((row) => {
        giftistarDaily.push([
          moment().format('YY년 MM월 DD일 HH:mm'),
          row[0],
          row[1]
        ])
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'giftistarDaily!A27:C27',
        valueInputOption: 'RAW',
        resource: {
          values: giftistarDaily
        }
      })

      let starbucksDaily = []
      const res2 = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'giftistar!I4:J4',
      })
      const row2 = res2.data.values
      row2.map((row) => {
        starbucksDaily.push([
          row[0],
          row[1]
        ])
      })
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'giftistarDaily!D27:E27',
        valueInputOption: 'RAW',
        resource: {
          values: starbucksDaily
        }
      })

    } catch (error) {
      console.log(error)
    }
  })
program.parse(process.argv)

