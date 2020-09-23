import {db, Op} from '@doublenc-inc/ncnc-models'
import moment from 'moment'
import {sleep, clearGoogleSheet, writeGoogleSheetForRow} from '../utils'

const spreadsheetId = process.env.SPREADSHEET_ID

const items = [
  [137, 7247],
  [1105, 7309],
  [180, 7259],
  [77, 7260],
  [3949, 7308],
  [3308, 7622],
  [501, 7248],
  [84, 7466],
  [1420, 7391],
  [2391, 7573],
  [1163, 7328],
]

export async function ncncProductAnalysis() {
  console.log('각 기준 순위차트 작성하기:', moment().format('dddd hh:mm:ss'))
}
