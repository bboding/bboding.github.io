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

program
  .version('0.1.0')
  .command('giftistar')
  .action(async () => {
    try {
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
        console.log(brand.name)
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
        let giftistarItems = []
        for (const result of results) {
          giftistarItems.push([
            result.objectId,
            brand.name,
            result.name,
            result.origin_price,
            `${result.buy_price - result.buy_step2}`,
            result.buy_price,
            `${result.price - result.discount_step2}`,
            result.price,
            result.cupon_count
          ])
        }
        await sleep()
      }

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

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A3:I99999',
        valueInputOption: 'RAW',
        resource: {
          values: giftistarItems
        }
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A1',
        valueInputOption: 'RAW',
        resource: {
          values: [
            [`기프티스타 (업데이트된 날짜 ${moment().format('YY년 MM월 DD일')})`]
          ]
        }
      })
      console.log('dated')

    } catch (error) {
      console.log(error)
      process.exit()
    }
  })

program
  .version('0.1.0')
  .command('ncnc')
  .option('-t, --token [token]', '토큰을 입력합니다.')
  .action(async options => {
    let { token } = options

    try {
      const axiosOptions = {
        headers: {
          Authorization: `Bear ${token}`
        }
      }
      const response = await axios.get(
        'http://localhost:3010/cms/con-category1s',
        axiosOptions
      )
      const { conCategory1s } = response.data

      for (const conCategory1 of conCategory1s) {
        const response = await axios.get(
          `http://localhost:3010/cms/con-category2s?conCategory1Id=${
            conCategory1.id
          }`,
          axiosOptions
        )
        const { conCategory2s } = response.data

        for (const conCategory2 of conCategory2s) {
          const response = await axios.get(
            `http://localhost:3010/cms/con-items?conCategory2Id=${
              conCategory2.id
            }`,
            axiosOptions
          )
          const { conItems } = response.data
          let ncncConItems = []
          for (const conItem of conItems) {
            ncncConItems.push([
              conItem.id,
              conCategory2.name,
              conItem.name,
              conItem.originalPrice,
              conItem.askingPrice,
              conItem.ncSellingPrice,
              conItem.sfSellingPrice
            ])
          }
          sleepShort()
        }
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'sheet2!A3:G99999',
        valueInputOption: 'RAW',
        resource: {
          values: ncncConItems
        }
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'sheet2!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [
            [`니콘내콘 (업데이트된 날짜 ${moment().format('YY년 MM월 DD일')})`]
          ]
        }
      })
      console.log('dated')

    } catch (error) {
      console.log(error)
      process.exit()
    }
  })
program.parse(process.argv)

program
  .version('0.1.0')
  .command('sheet3')
  .option('-t, --token [token]', '토큰을 입력합니다.')
  .action(async options => {
    let { token } = options

    try {
      const axiosOptions = {
        headers: {
          Authorization: `Bear ${token}`
        }
      }
      const response = await axios.get(
        'http://localhost:3010/cms/con-items',
        axiosOptions
      )
      const { conItems } = response.data
      let sheet3ConItems = []
      for (const conItem of conItems) {
        sheet3ConItems.push([
          conItem.id,
          conItem.conCategory2.name,
          conItem.name,
        ])
      }
      sleepShort()

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'sheet3!A3:C99999',
        valueInputOption: 'RAW',
        resource: {
          values: sheet3ConItems
        }
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'sheet3!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [
            [`짝맞추기 (업데이트된 날짜 ${moment().format('YY년 MM월 DD일')})`]
          ]
        }
      })
      console.log('dated')


      updateSheets()
    } catch (error) {
      console.log(error)
      process.exit()
    }
  })
program.parse(process.argv)


function sleep() {
  return new Promise(resolve =>
    setTimeout(resolve, Math.random() * (20000 - 10000) + 5000)
  )
}

function sleepShort() {
  return new Promise(resolve =>
    setTimeout(resolve, Math.random() * (5000 - 1000) + 5000))
}

function askCode(rl) {
  return new Promise(resolve => {
    rl.question('Enter the code from that page here: ', code => {
      resolve(code)
    })
  })
}