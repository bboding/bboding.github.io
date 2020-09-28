import axios from 'axios'
import moment from 'moment'
import {
  readGoogleSheet,
  sendSlackMessage,
  writeGoogleSheetForRow,
} from '../utils'

const spreadsheetId = process.env.SPREADSHEET_ID

async function getGftCurrentBuyPrice() {
  const values = []

  const {data: brands} = await axios.post(
    'https://api.giftistar.com/parse/classes/Brand',
    {
      where: {
        show_buy: true,
      },
      limit: 1000,
      order: 'order',
      _method: 'GET',
      _ApplicationId: 'giftistar',
    },
    {
      headers: {
        'content-type': 'text/plain',
      },
    },
  )

  for (const brand of brands.results) {
    const {data: items} = await axios.post(
      'https://api.giftistar.com/parse/classes/Menu',
      {
        where: {
          brand: {
            __type: 'Pointer',
            objectId: brand.objectId,
          },
          show_buy: true,
          hide: {
            $ne: true,
          },
        },
        limit: 2000,
        order: 'order',
        _method: 'GET',
        _ApplicationId: 'giftistar',
      },
    )

    for (const item of items.results) {
      values.push([
        `${item.brand_name} ${item.name}`,
        item.objectId,
        item.price,
        item.buy_price,
      ])
    }
  }

  return values
}

export async function updateCurrentGftBuyPrice() {
  console.log('update-current-gft-buy-price', moment().format('dddd HH:mm:ss'))

  const gftBuyCountTop50Items: any = await readGoogleSheet(
    spreadsheetId,
    '기프티 매입개수 순위',
    'A2',
    'E51',
  )

  const gftCurrentDatas: any = await getGftCurrentBuyPrice()

  for (const gftBuyCountTop50Item of gftBuyCountTop50Items) {
    const name = gftBuyCountTop50Item[2]
    const buyPrice = gftBuyCountTop50Item[4]
    const rank = gftBuyCountTop50Item[0]

    for (const gftCurrentData of gftCurrentDatas) {
      const currentName = gftCurrentData[0]
      const currentBuyPrice = gftCurrentData[3]

      if (name === currentName && buyPrice !== currentBuyPrice) {
        await sendSlackMessage(
          `${name} (매입수 ${rank}위) || 기프티스타 매입가: ${buyPrice.toLocaleString()}원 -> ${currentBuyPrice.toLocaleString()}원 변경`,
        )

        gftBuyCountTop50Item[4] = currentBuyPrice
      }
    }
  }

  await writeGoogleSheetForRow(
    spreadsheetId,
    gftBuyCountTop50Items,
    '기프티 매입개수 순위',
    'A2',
    'E',
  )
}
