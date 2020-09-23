import axios from 'axios'
import cheerio from 'cheerio'
import moment from 'moment'
import {db, Op} from '@doublenc-inc/ncnc-models'
import {config} from 'dotenv'
import {
  readGoogleSheet,
  sleep,
  googleSheetFormatter,
  appendGoogleSheet,
  writeGoogleSheetForRow,
} from '../utils'

config({path: `${__dirname}/../.env`})

const spreadsheetId = process.env.SPREADSHEET_ID
const dailySpreadsheetId = process.env.DAILY_SPREADSHEET_ID
const naverStores = ['기프티스타', '바로콘', '니코니', '베리굿세일', '디비디비']

export async function getGftItem(itemId) {
  try {
    const {data} = await axios.post(
      `https://api.giftistar.com/parse/classes/Menu/${itemId}`,
      {
        _method: 'GET',
        _ApplicationId: 'giftistar',
      },
    )

    return data
  } catch (err) {
    console.log(err)
    return null
  }
}

async function getGftNaverSellPrice(productName) {
  try {
    const products: any = await readGoogleSheet(
      spreadsheetId,
      '상품명 비교',
      'a2',
      'b',
    )

    for (const product of products) {
      if (product[0] === productName) return product[1]
    }
  } catch (err) {
    return null
  }
}

async function getNaverRanking(keyword) {
  try {
    const search = await axios.get(
      `https://openapi.naver.com/v1/search/shop.json?display=50&query=${encodeURI(
        keyword,
      )}&start=1`,
      {
        headers: {
          'X-Naver-Client-Id': 'Da61xy8Qks7RVzsHy3SM',
          'X-Naver-Client-Secret': 'u8d41pOZJf',
        },
      },
    )
    const {items} = search.data
    let outRank
    let inRank

    for (const naverStore of naverStores) {
      for (const [index, item] of items.entries()) {
        // item.productType 가 1이면 카탈로그 내, 2면 카탈로그 외
        if (item.productType === '1') {
          try {
            await sleep(Math.random() * (2000 - 1000) + 1000)
            const res = await axios.get(
              `https://search.shopping.naver.com/detail/detail.nhn?nv_mid=${item.productId}`,
            )
            const $ = await cheerio.load(res.data)
            let rank = null

            $('.mall a').each((i, ele) => {
              const mallName = ele.children[0].data.replace(/ |\n/gi, '')
              if (mallName === naverStore) {
                rank = i
              }
            })

            if (rank) {
              inRank = inRank
                ? `${inRank}${rank + 1}위: ${naverStore}\n`
                : `${rank + 1}위: ${naverStore}\n`
              break
            }
          } catch (err) {
            console.log('error occurred during get naverRanking shopping', err)
            break
          }
        }

        if (item.productType === '2' && item.mallName === naverStore) {
          outRank = outRank
            ? `${outRank}${index + 1}위: ${naverStore}\n`
            : `${index + 1}위: ${naverStore}\n`
          break
        }
      }
    }

    outRank = outRank ? `카탈로그 외\n${outRank}` : '카탈로그 외\n 순위없음'
    inRank = inRank ? `카탈로그 내\n${inRank}` : '카탈로그 내\n 순위없음'

    return {outRank, inRank}
  } catch (err) {
    console.log('error occurred during get naverRanking', err)
    return null
  }
}

async function updateNaverRanking(parameters) {
  for (const parameter of parameters) {
    const keyword1Rank = parameter[6]
      ? await getNaverRanking(parameter[6])
      : null
    const keyword2Rank = parameter[7]
      ? await getNaverRanking(parameter[7])
      : null
    const keyword3Rank = parameter[8]
      ? await getNaverRanking(parameter[8])
      : null
    const keyword4Rank = parameter[9]
      ? await getNaverRanking(parameter[9])
      : null
    const keyword5Rank = parameter[10]
      ? await getNaverRanking(parameter[10])
      : null

    const list = [
      keyword1Rank ? keyword1Rank.outRank : '',
      keyword1Rank ? keyword1Rank.inRank : '',
      keyword2Rank ? keyword2Rank.outRank : '',
      keyword2Rank ? keyword2Rank.inRank : '',
      keyword3Rank ? keyword3Rank.outRank : '',
      keyword3Rank ? keyword3Rank.inRank : '',
      keyword4Rank ? keyword4Rank.outRank : '',
      keyword4Rank ? keyword4Rank.inRank : '',
      keyword5Rank ? keyword5Rank.outRank : '',
      keyword5Rank ? keyword5Rank.inRank : '',
    ]

    const itemName = parameter[0]

    await appendGoogleSheet(
      dailySpreadsheetId,
      itemName,
      [list],
      itemName === 'CGV' ? 'AE' : 'AC',
      itemName === 'CGV' ? 'AN' : 'AL',
    )
  }
}

export async function getNcncCount(param, conItemIds) {
  try {
    const conLogCodes = await db.ConLogCode.findAll({
      attributes: ['id', 'key'],
      where: {
        key: {
          [Op.or]: ['inSale', 'sold', 'soldOtherMarket'],
        },
      },
    })

    let conLogCodeId = null

    if (param === 'sell') {
      conLogCodeId = {
        [Op.or]: conLogCodes
          .filter((conLogCode) => {
            return (
              conLogCode.key === 'sold' || conLogCode.key === 'soldOtherMarket'
            )
          })
          .map((conLogCode) => {
            return conLogCode.id
          }),
      }
    } else if (param === 'buy') {
      conLogCodeId = conLogCodes
        .filter((conLogCode) => {
          return conLogCode.key === 'inSale'
        })
        .map((conLogCode) => {
          return conLogCode.id
        })[0]
    }

    let where: any = {
      createdAt: {
        [Op.gte]: moment().startOf('day').format(),
      },
      conLogCodeId,
    }
    if (param === 'buy') {
      where = {...where, description: {[Op.notLike]: '%재개%'}}
    }

    return db.ConLog.count({
      where,
      distinct: true,
      include: [
        {
          model: db.Con,
          where: {
            conItemId: {
              [Op.or]: conItemIds,
            },
          },
        },
      ],
    })
  } catch (err) {
    console.log(err)
    return null
  }
}

async function monitoring(parameter) {
  const isCgv = parameter[12]
  const itemName = parameter[0]

  const sheet: any = await readGoogleSheet(
    dailySpreadsheetId,
    itemName,
    'B',
    'B',
  )
  const nextRow = sheet.length + 1

  const gftItemId = parameter[2]
  const gft = await getGftItem(gftItemId)

  const gftNaverName = parameter[3]
  const gftNaverSellPrice = (await getGftNaverSellPrice(gftNaverName)) || ''
  let gftMargin = gft.cupon_count ? `=E${nextRow}*0.955-C${nextRow}` : ''

  const yesterdayGft = await readGoogleSheet(
    spreadsheetId,
    '어제의 기프티',
    'B4',
    'Q5',
  )
  let gftSellCount = gft.total_sell_count - yesterdayGft[0][parameter[11]]
  let gftBuyCount = gft.total_buy_count - yesterdayGft[1][parameter[11]]
  const gftAuction: any = isCgv ? await getGftItem(parameter[12]) : ''
  const gftStock = isCgv
    ? `=${gft.cupon_count} + ${gftAuction.cupon_count}`
    : gft.cupon_count
  const gftBuyStatus = gft.open_buy ? '매입중' : '매입종료'

  const baroConItemId = parameter[4]
  const barocon = await db.ConItem.findOne({
    attributes: [
      'id',
      'askingPrice',
      'count',
      'sfSellingPrice',
      'ncSellingPrice',
      'isRefuse',
    ],
    where: {
      id: baroConItemId,
    },
  })
  const baroconSfSellingPrice = barocon.count ? barocon.sfSellingPrice : ''
  let baroconMargin = barocon.count ? `=G${nextRow}*0.947-D${nextRow}` : ''

  const niconyConItemId = parameter[5]
  const nicony = await db.ConItem.findOne({
    attributes: [
      'id',
      'askingPrice',
      'count',
      'sfSellingPrice',
      'ncSellingPrice',
      'isRefuse',
    ],
    where: {
      id: niconyConItemId,
    },
  })
  const niconySfSellingPrice = nicony.count ? nicony.sfSellingPrice : ''
  let niconyMargin = nicony.count ? `=H${nextRow}*0.9492-D${nextRow}` : ''

  let ncncMargin =
    barocon.askingPrice && barocon.ncSellingPrice
      ? `=I${nextRow}*0.97-D${nextRow}`
      : ''
  const ncncSellCount = await getNcncCount('sell', [
    baroConItemId,
    niconyConItemId,
  ])
  const ncncBuyCount =
    niconyConItemId === '7248'
      ? await getNcncCount('buy', [baroConItemId, niconyConItemId])
      : await getNcncCount('buy', [baroConItemId])
  const ncncStock = `=${barocon.count} + ${nicony ? nicony.count : 0}`
  const ncncBuyStatus = barocon.isRefuse ? '매입종료' : '매입중'

  let list

  if (isCgv) {
    const gftAuctionMargin = gftAuction.cupon_count
      ? `=F${nextRow}*0.955-D${nextRow}`
      : ''
    ncncMargin = `=J${nextRow}*0.97-E${nextRow}`
    gftMargin = gft.cupon_count ? `=F${nextRow}*0.955-C${nextRow}` : ''
    baroconMargin = barocon.count ? `=H${nextRow}*0.947-E${nextRow}` : ''
    niconyMargin = nicony ? `=H${nextRow}*0.9429-D${nextRow}` : ''
    gftSellCount += gftAuction.total_sell_count
    gftBuyCount += gftAuction.total_buy_count

    list = [
      moment().format('YY.MM.DD (ddd)'),
      moment().format('HH:mm:ss'),
      gft.buy_price || '',
      gftAuction.buy_price || '',
      barocon.askingPrice || '',
      gftNaverSellPrice,
      gft.price || '',
      baroconSfSellingPrice,
      niconySfSellingPrice,
      barocon.ncSellingPrice || '',
      gftMargin,
      gftAuctionMargin,
      baroconMargin,
      niconyMargin,
      ncncMargin,
      gftSellCount,
      gftBuyCount,
      ncncSellCount,
      ncncBuyCount,
      gft.current_buy_count || '',
      gft.target_buy_count || '',
      gft.average_sell_count || '',
      gftStock,
      ncncStock,
      gftBuyStatus,
      ncncBuyStatus,
      '',
      '',
      '',
      '모니터링봇',
    ]
  } else {
    list = [
      moment().format('YY.MM.DD (ddd)'),
      moment().format('HH:mm:ss'),
      gft.buy_price || '',
      barocon.askingPrice || '',
      gftNaverSellPrice,
      gft.price || '',
      baroconSfSellingPrice,
      niconySfSellingPrice,
      barocon.ncSellingPrice || '',
      gftMargin,
      baroconMargin,
      niconyMargin,
      ncncMargin,
      gftSellCount,
      gftBuyCount,
      ncncSellCount,
      ncncBuyCount,
      gft.current_buy_count || '',
      gft.target_buy_count || '',
      gft.average_sell_count || '',
      gftStock,
      ncncStock,
      gftBuyStatus,
      ncncBuyStatus,
      '',
      '',
      '',
      '모니터링봇',
    ]
  }

  await writeGoogleSheetForRow(
    dailySpreadsheetId,
    itemName,
    [list],
    nextRow,
    nextRow,
  )

  const sheetId = parameter[1]

  await googleSheetFormatter(
    dailySpreadsheetId,
    itemName,
    sheet.length,
    sheetId,
  )
}

export async function dailyMonitoring() {
  const parameters: any = await readGoogleSheet(
    spreadsheetId,
    '어제의 기프티',
    'A11',
    'M26',
  )

  for (const parameter of parameters) {
    await monitoring(parameter)
  }

  await updateNaverRanking(parameters)
}
