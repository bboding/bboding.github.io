const moment = require('moment')
const axios = require('axios')
const fs = require('fs')
const readline = require('readline')
const { google } = require('googleapis')
const program = require('commander')
const util = require('util')

require('dotenv').config({path:__dirname+'/.env'})

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH
const getData = util.promisify(fs.readFile)
const writeData = util.promisify(fs.writeFile)

let ncncConItems = []

program
  .version('0.1.0')
  .command('list')
  .action(async () => {
    try {
      const content = await getData(process.env.GOOGLE_CREDENTIAL_PATH)
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

      const base64 = Buffer.from(unescape(encodeURIComponent(`${process.env.API_USERNAME}:${process.env.API_PASSWORD}`))).toString('base64')
      const result = await axios.request({method: 'post', url: `${process.env.API_URL}/admin-session/username`, headers: { Authorization: `Basic ${base64}`, [`Content-Type`]: 'application/json'} })

      const { token } = result.data.adminSession

      const axiosOptions = {
        headers: {
          Authorization: `Bear ${token}`
        }
      }
      
      const res = await axios.get(`${process.env.API_URL}/con-category1s`, axiosOptions)
      const { conCategory1s } = res.data

      for (conCategory1 of conCategory1s) {
        const response = await axios.get(`${process.env.API_URL}/con-category2s?conCategory1Id=${conCategory1.id}`,
        axiosOptions)
        const { conCategory2s } = response.data

        console.log(conCategory1.name)

        ncncConItems = []

        for (const conCategory2 of conCategory2s) {
          const response = await axios.get(
            `${process.env.API_URL}/con-items?conCategory2Id=${
              conCategory2.id
            }`,
            axiosOptions
          )
          const { conItems } = response.data
          for (const conItem of conItems) {
            if (conItem.askingPrice > 10 && conItem.ncSellingPrice > 10 &&
            conItem.isBlock === 0  &&
            conItem.isClearance === 0) {
              ncncConItems.push([
                conCategory2.name,
                conItem.name,
                conItem.askingPrice
              ])
            }
          }
          await sleepShort()
        }
        await sleep()

        let spreadsheetId = ''

        if (conCategory1.id === 67) {
          spreadsheetId = '1ynQhO1Yhnr8iKwOoBgFlJKdmu2rOuLjlKvW8aplk57k'
        } else if (conCategory1.id === 62) {
          spreadsheetId = '1NLJJ6huyL3kwrJXUaWj6J04U_ZkMxqT9nMVaryKaFPI'
        } else if (conCategory1.id === 60) {
          spreadsheetId = '1ZasRnHyVP7jT0w-dwDKD7ASOcl1eY0o451mYaQKQr6E'
        } else if (conCategory1.id === 61) {
          spreadsheetId = '1EaWwpQM-bUW-Gzb2jCRjd7U8-XDT2VTtiXXg0hf8rrw'
        } else if (conCategory1.id === 65) {
          spreadsheetId = '13nRy68jZi2gksQnYSetyXDv6rEvP7euo_tQqW2t2cUc'
        } else if (conCategory1.id === 129) {
          spreadsheetId = '1dzftXbViA65wKeeB89ZYnFN7GODtpGnYWpuhEysW4HA'
        } else if (conCategory1.id === 69) {
          spreadsheetId = '11SFiUyzCFZNryfmcWFudm4Q_1TA13xZoLXJEj6QB7b0'
        } else process.exit()

        console.log('onUpdate')
        const sheets = google.sheets({
          version: 'v4',
          auth: oAuth2Client
        })

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

        mergeFormat = []
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
        console.log(ncncConItems)

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

        sleepShort()
      }

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

function sleep() {
  return new Promise(resolve => 
    setTimeout(resolve, 15000))
}


