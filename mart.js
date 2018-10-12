const moment = require('moment')
const axios = require('axios')
const fs = require('fs')
const readline = require('readline')
const {
  google
} = require('googleapis')
const program = require('commander')
const util = require('util')
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const TOKEN_PATH = 'token.json'
const getData = util.promisify(fs.readFile)
const writeData = util.promisify(fs.writeFile)

let ncncConItems = []

program
  .version('0.1.0')
  .command('list')
  .option('-t, --token [token]', '토큰을 입력합니다.')
  .action(async options => {
    let {
      token
    } = options
    try {
      const axiosOptions = {
        headers: {
          Authorization: `Bear ${token}`
        }
      }
      const response = await axios.get(`http://localhost:3010/cms/con-category2s?conCategory1Id=62`,
      axiosOptions)
      const { conCategory2s } = response.data

      for (const conCategory2 of conCategory2s) {
        // console.log(conCategory2.name)
        const response = await axios.get(
          `http://localhost:3010/cms/con-items?conCategory2Id=${
            conCategory2.id
          }`,
          axiosOptions
        )
        const { conItems } = response.data

        for (const conItem of conItems) {
          if (
          conItem.askingPrice > 10 &&
          conItem.ncSellingPrice > 10 &&
          conItem.isBlock === 0  &&
          conItem.isClearance === 0
          ) {
            ncncConItems.push([
              conCategory2.name,
              conItem.name,
              conItem.askingPrice
            ])
          }
        }
        sleepShort()
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

      const spreadsheetId = '1NLJJ6huyL3kwrJXUaWj6J04U_ZkMxqT9nMVaryKaFPI'

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'A3:C999',
      })

      const none = {
        style: "NONE"
      }
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            updateBorders: {
              range: {
                startRowIndex: 2,
                endRowIndex: 999,
                startColumnIndex: 0,
                endColumnIndex: 3
              },
              top: none,
              bottom: none,
              innerHorizontal: none,
              innerVertical: none,
              right: none
            }
          }]
        }
      })
      console.log('cleared')

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            unmergeCells: {
              range: {
                startRowIndex: 1,
                endRowIndex: 999,
                startColumnIndex: 0,
                endColumnIndex: 3
              }
            }
          }]
        }
      })
      console.log('unmerged')

      let mergeFormat = []
      const startRow = 2 // 맨위 고정값들이 있으므로
      for (let i = 0; i < ncncConItems.length; i++) {
        if (!ncncConItems[i + 1] || ncncConItems[i][0] !== ncncConItems[i + 1][0]) {
          mergeFormat.push({
            mergeCells: {
              mergeType: 'MERGE_ALL',
              range: {
                startRowIndex: mergeFormat.length === 0 ? startRow : mergeFormat[mergeFormat.length - 1].mergeCells.range.endRowIndex,
                endRowIndex: i + 3,
                startColumnIndex: 0,
                endColumnIndex: 1
              }
            }
          })
        }
      }
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: mergeFormat
        }
      })
      console.log('merged')

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A3:C999',
        valueInputOption: 'RAW',
        resource: {
          values: ncncConItems
        }
      })
      console.log('listed')

      const solid = {
        style: "SOLID"
      }
      borderFormat = []
      for (let i = 0; i < ncncConItems.length; i++) {
        if (!ncncConItems[i + 1] || ncncConItems[i][0] !== ncncConItems[i + 1][0]) {
          borderFormat.push({
            updateBorders: {
              range: {
                startRowIndex: borderFormat.length === 0 ? startRow : borderFormat[borderFormat.length - 1].updateBorders.range.endRowIndex,
                endRowIndex: i + 3,
                startColumnIndex: 0,
                endColumnIndex: 3
              },
              top: solid,
              bottom: solid,
              innerHorizontal: none,
              innerVertical: none,
              right: solid
            }
          })
        }
      }
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: borderFormat
        }
      })
      console.log('bordered')

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A1',
        valueInputOption: 'RAW',
        resource: {
          values: [
            [`업데이트된 날짜 (${moment().format('YY년 MM월 DD일')})`]
          ]
        }
      })
      console.log('dated')

      process.exit()
    } catch (error) {
      console.log(error)
      process.exit()
    }
  })

program.parse(process.argv)

function askCode(rl) {
  return new Promise(resolve => {
    rl.question('Enter the code from that page here: ', code => {
      resolve(code)
    })
  })
}

function sleepShort() {
  return new Promise(resolve =>
    setTimeout(resolve, Math.random() * (3000 - 1000) + 5000))
}

