import {google} from 'googleapis'
import {WebClient} from '@slack/web-api'
import moment from 'moment'
import {config} from 'dotenv'
import fs from 'fs'

config({path: `${__dirname}/../.env`})

export async function getSheets() {
  const [accessFile, refreshFile] = await Promise.all([
    fs.promises.readFile(process.env.GOOGLE_CREDENTIAL_PATH, 'utf-8'),
    fs.promises.readFile(process.env.GOOGLE_TOKEN_PATH, 'utf-8'),
  ])

  const credentials = JSON.parse(accessFile)
  const refreshToken = JSON.parse(refreshFile)

  const {client_id, client_secret, redirect_uris} = credentials.installed

  const client = new google.auth.OAuth2(client_id, client_secret, redirect_uris)

  client.setCredentials(refreshToken)
  return google.sheets({version: 'v4', auth: client})
}

export async function writeGoogleSheetForRow(
  spreadsheetId,
  sheetName,
  values,
  start,
  end,
) {
  const sheets = await getSheets()

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${start}:${end}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  })
}

export async function writeGoogleSheetForColumn(
  spreadsheetId,
  sheetName,
  values,
  start,
  end,
) {
  const sheets = await getSheets()

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${start}:${end}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      majorDimension: 'COLUMNS',
      values,
    },
  })
}

export async function appendGoogleSheet(
  spreadsheetId,
  sheetName,
  values,
  start,
  end,
) {
  const sheets: any = await getSheets()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!${start}:${end}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  })
}

export async function readGoogleSheet(
  spreadsheetId,
  sheetName,
  start,
  end,
  keyword = null,
) {
  const sheets = await getSheets()

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    valueRenderOption: 'UNFORMATTED_VALUE',
    range: `'${sheetName}'!${start}:${end}`,
  })

  if (keyword) {
    for (let i = 2; i < result.data.values.length; i++) {
      if (result.data.values[i][0] === keyword) return i
    }
    return null
  }

  return result.data.values
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function clearGoogleSheet(spreadsheetId, sheetName, start, end) {
  const sheets = await getSheets()

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetName}'!${start}:${end}`,
  })
}

// 같은 날짜이면 셀을 합치고 새로운 날이면 구분선을 그립니다.
export const googleSheetFormatter = async (
  spreadsheetId,
  sheetName,
  sheetLength,
  sheetId,
) => {
  const sheets = await getSheets()

  const res = await readGoogleSheet(spreadsheetId, sheetName, 'A', 'A')
  let todayLocation = sheetLength

  for (let i = 2; i < sheetLength; i++) {
    if (res[i][0] === moment().format('YY.MM.DD (ddd)')) {
      todayLocation = i
      break
    }
  }
  if (todayLocation && todayLocation !== sheetLength) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            mergeCells: {
              mergeType: 'MERGE_COLUMNS',
              range: {
                endColumnIndex: 1,
                endRowIndex: sheetLength + 1,
                sheetId,
                startColumnIndex: 0,
                startRowIndex: todayLocation,
              },
            },
          },
        ],
      },
    })
  } else if (todayLocation && todayLocation === sheetLength) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateBorders: {
              range: {
                sheetId,
                startRowIndex: sheetLength,
                endRowIndex: sheetLength + 1,
                startColumnIndex: 0,
                endColumnIndex: 100,
              },
              top: {
                style: 'SOLID',
                width: 1,
                color: {
                  red: 0,
                  green: 0,
                  blue: 0,
                },
              },
            },
          },
        ],
      },
    })
  }
}

export async function sendSlackMessage(
  message,
  channel = 'a_battlefield',
  username = 'GiftistarSpyBot',
) {
  const client = new WebClient(process.env.SLACK_API_TOKEN)

  await client.chat.postMessage({
    text: message,
    channel,
    username,
  })
}
