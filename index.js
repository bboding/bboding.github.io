const axios = require('axios')
const fs = require('fs')
const readline = require('readline')
const { google } = require('googleapis')
const program = require('commander')

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const TOKEN_PATH = 'token.json'

let giftistarItems = []
let ncncConItems = []

let request = {
  spreadsheetId: '17vx2FXgG1Ylzt2SWjuRkIre_4O3dsb49q1SmT408fQo',
  range: null,
  valueInputOption: 'RAW',
  resource: {
    values: null
  }
}

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

        for (const result of results) {
          giftistarItems.push([
            brand.id,
            brand.name,
            result.objectId,
            result.name,
            result.origin_price,
            `${result.buy_price - result.buy_step2}`,
            result.buy_price,
            `${result.price - result.discount_step2}`,
            result.price
          ])
        }
        await sleep()
      }

      request.range = 'A2:I99999'
      request.resource.values = giftistarItems

      updateSheets()
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
          console.log(conCategory2.name)
          const response = await axios.get(
            `http://localhost:3010/cms/con-items?conCategory2Id=${
              conCategory2.id
            }`,
            axiosOptions
          )
          const { conItems } = response.data

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
      request.range = 'M2:S99999'
      request.resource.values = ncncConItems

      updateSheets()
    } catch (error) {
      console.log(error)
      process.exit()
    }
  })
program.parse(process.argv)

function updateSheets() {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err)

    authorize(JSON.parse(content), listMajors)
  })
}

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  )

  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback)
    oAuth2Client.setCredentials(JSON.parse(token))
    callback(oAuth2Client)
  })
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  })
  console.log('Authorizse this app by visiting this url:', authUrl)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  rl.question('Enter the code from that page here: ', code => {
    rl.close()
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err)
      oAuth2Client.setCredentials(token)
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) console.error(err)
        console.log('Token stored to', TOKEN_PATH)
      })
      callback(oAuth2Client)
    })
  })
}

function listMajors(auth) {
  const sheets = google.sheets({
    version: 'v4',
    auth
  })

  sheets.spreadsheets.values.update(request, function(err) {
    if (err) {
      console.log(err)
    }
  })
  console.log('success')
}

function sleep() {
  return new Promise(resolve =>
    setTimeout(resolve, Math.random() * (30000 - 10000) + 10000)
  )
}

function sleepShort() {
  return new Promise(resolve =>
    setTimeout(resolve, Math.random() * (3000 - 1000) + 5000))
}