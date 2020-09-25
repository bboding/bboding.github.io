import moment from 'moment'
import {config} from 'dotenv'
import {readGoogleSheet, writeGoogleSheetForColumn} from '../utils'
import {getGftItem} from './update-daily-monitoring'

config({path: `${__dirname}/../.env`})

const spreadsheetId = process.env.SPREADSHEET_ID

export async function getGftCumulativeSales() {
  console.log('get-gft-cumulative-sales', moment().format('dddd HH:mm:ss'))
  const gftIds = (
    await readGoogleSheet(spreadsheetId, '어제의 기프티', 'b2', 'q2')
  )[0]
  const record = []
  const cgvId = 'D0qFbBb620'

  for (const gftId of gftIds) {
    let data

    if (gftId === cgvId) {
      const item1 = await getGftItem('D0qFbBb620')
      const item2 = await getGftItem('U0Yuz27pq1')

      data = [
        moment().format('YY.MM.DD(ddd) HH:mm:ss'),
        item1.total_sell_count + item2.total_sell_count,
        item1.total_buy_count + item2.total_buy_count,
      ]
    } else {
      const item = await getGftItem(gftId)
      data = [
        moment().format('YY.MM.DD(ddd) HH:mm:ss'),
        item.total_sell_count,
        item.total_buy_count,
      ]
    }

    record.push(data)
  }

  await writeGoogleSheetForColumn(
    spreadsheetId,
    '어제의 기프티',
    record,
    'b3',
    'q5',
  )
}
