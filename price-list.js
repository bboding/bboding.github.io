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
  .command('price-list')
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
      const response = await axios.get(
        'http://localhost:3010/cms/con-items?conCategory2Id=63',
        axiosOptions
      )
      const { conItems } = response.data

      for (const conItem of conItems) {
        if (conItem.askingPrice) {
          ncncConItems.push([
            conItem.name,
            conItem.askingPrice
          ])
        }
      }
      request.range = 'sheet2!A3:B1000'
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
