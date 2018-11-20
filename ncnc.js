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
program
  .version('0.1.0')
  .command('ncnc')
  .option('-t, --token [token]', '토큰을 입력합니다.')
  .action(async options => {
    let { token } = options

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

      const response = await axios.get(
        'http://localhost:3010/cms/con-items',
        axiosOptions
      )
      const { conItems } = response.data
      let ncncConItems = []
     
      for (let i = 1; i <= conItems[conItems.length - 1].id; i++) {
        ncncConItems.push([])
        for (const conItem of conItems) {
          if (conItem.id === i) {
            ncncConItems[i-1] = [
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
        sleepShort()
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'ncnc!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [
            [`니콘내콘 (시트 업데이트 ${moment().format('YY년 MM월 DD일 HH:mm')})`]
          ]
        }
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'ncnc!A2:G2',
        valueInputOption: 'RAW',
        resource: {
          values: [
            ['상품Id', '브랜드', '상품명',	'원가',	'제시가',	'앱판매가',	'스팜판매가']
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
      console.log('updated')


      const sheet1 = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'giftistar!A3:H99999'
      })
      const giftiDatas = sheet1.data.values

      const sheet2 = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'ncnc!A3:H99999'
      })
      const ncncDatas = sheet2.data.values

      let matchedItems = []
      for (let i = 0; i < ncncDatas.length; i++) {
        if(ncncDatas[i][7]) {
          matchedItems.push([
            ncncDatas[i][0],
            ncncDatas[i][7]
          ])
        }
      }

      let list = []
      for (let i = 0; i < ncncDatas.length; i++) {
        for (let j = 0; j < matchedItems.length; j++) {
          if (ncncDatas[i][0] === matchedItems[j][0]) {
            for (let k = 0; k < giftiDatas.length; k++) {
              if (giftiDatas[k][0] === matchedItems[j][1]) {
                list.push([
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
        }
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'comparison!A3:H99999',
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
            [`가격 비교 (시트 업데이트 ${moment().format('YY년 MM월 DD일 HH:mm')})`]
          ]
        }
      })

    } catch (error) {
      console.log(error)
      process.exit()
    }
  })
program.parse(process.argv)

