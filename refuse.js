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

program
  .version('0.1.0')
  .command('refuse')
  .action(async () => {
    try {
      const base64 = Buffer.from(unescape(encodeURIComponent(`${process.env.API_USERNAME}:${process.env.API_PASSWORD}`))).toString('base64')
      const result = await axios.request({method: 'post', url: `${process.env.API_URL}/admin-session/username`, headers: { Authorization: `Basic ${base64}`, [`Content-Type`]: 'application/json'} })

      const { token } = result.data.adminSession

      const axiosOptions = {
        headers: {
          Authorization: `Bear ${token}`
        }
      }

      const response = await axios.get(`${process.env.API_URL}/con-items/refuse`,
        axiosOptions)

      const {
        conItems
      } = response.data

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

      console.log('onUpdate')
      const sheets = google.sheets({
        version: 'v4',
        auth: oAuth2Client
      })

      const spreadsheetId = '1ENkBTEK0QAlWbzuTMduetQ9u-rQ7uIJ7AzPLBwkaBZE'

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'A7:B999',
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
                endColumnIndex: 2
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
                endColumnIndex: 2
              }
            }
          }]
        }
      })
      console.log('unmerged')

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A7:B999',
        valueInputOption: 'RAW',
        resource: {
          values: conItems.map(conItem => [
            conItem.conCategory2.name,
            conItem.name
          ])
        }
      })
      console.log('refuse-list-updated')

      let mergeFormat = []
      const startRow = 6 // 맨위 고정값들이 있으므로

      for (let i = 1; i < conItems.length + 1; i++) {
        if (!conItems[i] || conItems[i - 1].conCategory2.id !== conItems[i].conCategory2.id) {
          mergeFormat.push({
            mergeCells: {
              mergeType: 'MERGE_ALL',
              range: {
                startRowIndex: mergeFormat.length === 0 ? startRow : mergeFormat[mergeFormat.length - 1].mergeCells.range.endRowIndex,
                endRowIndex: i + startRow,
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

      const solid = {
        style: "SOLID"
      }

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            updateBorders: {
              range: {
                startRowIndex: 2,
                endRowIndex: conItems.length + startRow,
                startColumnIndex: 0,
                endColumnIndex: 2
              },
              top: solid,
              bottom: solid,
              innerHorizontal: solid,
              innerVertical: solid,
              right: solid
            }
          }]
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
      console.log(moment().format('YYMMDD HH:mm:ss'))

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