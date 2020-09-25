import moment from 'moment'
import {db, Op} from '@doublenc-inc/ncnc-models'
import {
  sleep,
  clearGoogleSheet,
  writeGoogleSheetForRow,
  readGoogleSheet,
  appendGoogleSheet,
} from '../utils'

const spreadsheetId = process.env.SPREADSHEET_ID

function getConLogCodeId(conLogCodes, key) {
  return conLogCodes
    .filter((conLogCode) => {
      return conLogCode.key === key
    })
    .map((conLogCode) => {
      return conLogCode.id
    })[0]
}

async function getAllNcncProduct() {
  const yesterdayStart = moment()
    .subtract(1, 'days')
    .startOf('day')
    .format('YYYY-MM-DD HH:mm:ss')
  const yesterdayEnd = moment()
    .subtract(1, 'days')
    .endOf('day')
    .format('YYYY-MM-DD HH:mm:ss')

  const conItems = await db.ConItem.findAll({
    attributes: [
      'id',
      'name',
      'count',
      'sfSellingPrice',
      'ncSellingPrice',
      'askingPrice',
    ],
    include: [
      {
        model: db.ConCategory2,
        attributes: ['id', 'name'],
      },
    ],
  })

  const conLogCodes = await db.ConLogCode.findAll({
    attributes: ['id', 'key'],
    where: {
      key: {
        [Op.or]: ['inSale', 'sold', 'soldOtherMarket'],
      },
    },
  })

  const sheet = []

  for (const conItem of conItems) {
    const appSoldCount = await db.ConLog.count({
      where: {
        createdAt: {
          [Op.between]: [yesterdayStart, yesterdayEnd],
        },
        conLogCodeId: getConLogCodeId(conLogCodes, 'sold'),
      },
      distinct: true,
      include: [
        {
          model: db.Con,
          where: {
            conItemId: conItem.id,
          },
        },
      ],
    })

    await sleep(300)

    const naverStoreSoldCount = await db.ConLog.count({
      where: {
        createdAt: {
          [Op.between]: [yesterdayStart, yesterdayEnd],
        },
        conLogCodeId: getConLogCodeId(conLogCodes, 'soldOtherMarket'),
      },
      distinct: true,
      include: [
        {
          model: db.Con,
          where: {
            conItemId: conItem.id,
          },
        },
      ],
    })
    await sleep(300)

    const ncncBuyCount = await db.ConLog.count({
      where: {
        createdAt: {
          [Op.between]: [yesterdayStart, yesterdayEnd],
        },
        conLogCodeId: getConLogCodeId(conLogCodes, 'inSale'),
      },
      distinct: true,
      include: [
        {
          model: db.Con,
          where: {
            conItemId: conItem.id,
          },
        },
      ],
    })
    await sleep(300)

    sheet.push([
      conItem.id,
      `${conItem.conCategory2.name} ${conItem.name}`,
      appSoldCount,
      appSoldCount ? `=${conItem.ncSellingPrice} * ${appSoldCount}` : 0,
      appSoldCount
        ? `=(${conItem.ncSellingPrice} - ${conItem.askingPrice}) * ${appSoldCount}`
        : 0,
      naverStoreSoldCount,
      naverStoreSoldCount
        ? `=${conItem.sfSellingPrice} * ${naverStoreSoldCount}`
        : 0,
      naverStoreSoldCount
        ? `=(${conItem.sfSellingPrice} - ${conItem.askingPrice}) * ${naverStoreSoldCount}`
        : '',
      ncncBuyCount,
      ncncBuyCount ? `=${conItem.askingPrice} * ${ncncBuyCount}` : 0,
      conItem.count,
      conItem.ncSellingPrice,
      conItem.sfSellingPrice,
      conItem.askingPrice,
    ])
  }

  await clearGoogleSheet(spreadsheetId, '니콘내콘 상품 분석', 'a2', 'n')
  await writeGoogleSheetForRow(
    spreadsheetId,
    '니콘내콘 상품 분석',
    sheet,
    'a2',
    'n',
  )
  await writeGoogleSheetForRow(
    spreadsheetId,
    '니콘내콘 상품 분석',
    [[moment().subtract(1, 'days').format('YYYY.MM.DD(ddd)')]],
    'o1',
    'o1',
  )
}

async function recordAppSalesRatio() {
  const ncncInfo = await readGoogleSheet(
    spreadsheetId,
    '니콘내콘 상품 분석',
    'p2',
    'r8',
  )

  await appendGoogleSheet(
    spreadsheetId,
    '니콘내콘 상품 분석',
    [
      [
        moment().subtract(1, 'days').format('YYYY.MM.DD'),
        ncncInfo[1][0],
        ncncInfo[3][0],
        ncncInfo[4][0],
        ncncInfo[4][1],
        ncncInfo[0][2],
        ncncInfo[2][2],
        ncncInfo[6][0],
      ],
    ],
    't',
    'aa',
  )
}

export async function getNcncProduct() {
  console.log('get-all-ncnc-product', moment().format('dddd HH:mm:ss'))
  await getAllNcncProduct()
  await sleep(10000)

  console.log('record-app-sales-ratio', moment().format('dddd HH:mm:ss'))
  await recordAppSalesRatio()
}
