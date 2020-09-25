import moment from 'moment'
import {
  sleep,
  clearGoogleSheet,
  readGoogleSheet,
  writeGoogleSheetForRow,
} from '../utils'

const spreadsheetId = process.env.SPREADSHEET_ID

async function updateEachSheet(sheetName, ncncDatas, titles) {
  let ncncSheets = ncncDatas

  const relatedConItemIdsArray = [
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

  const mergeAppAndNaver = (sheets, appIndex, naverIndex) => {
    let appData
    let naverData

    for (const sheet of sheets) {
      appData = sheet[appIndex]
      naverData = sheet[naverIndex]

      sheet.unshift(appData + naverData)
    }
    for (const relatedConItemIds of relatedConItemIdsArray) {
      const [mainId, subId] = relatedConItemIds

      for (const barocon of sheets) {
        const baroconId = barocon[1]

        if (baroconId === mainId) {
          for (const [index, nicony] of sheets.entries()) {
            const niconyId = nicony[1]

            if (niconyId === subId) {
              barocon[0] += nicony[0] // 앱+스팜 데이터
              barocon[appIndex + 1] += nicony[appIndex + 1] // 앱 데이터
              barocon[naverIndex + 1] = `${barocon[naverIndex + 1]} + ${
                nicony[naverIndex + 1]
              }` // 네이버 데이터
              barocon[11] = `${barocon[11].toLocaleString()}개 + ${nicony[11].toLocaleString()}개(니코니)` // 재고
              barocon[13] = `${barocon[13].toLocaleString()}원(니코니:${nicony[13].toLocaleString()}원)` // 스팜 판매가
              sheets.splice(index, 1)
            }
          }
        }
      }
    }
    return sheets
  }

  const deleteNicony = (sheets, appIndex) => {
    for (const sheet of sheets) {
      const appData = sheet[appIndex]
      sheet.unshift(appData)
    }

    for (const relatedConItemIds of relatedConItemIdsArray) {
      const [mainId, subId] = relatedConItemIds

      for (const [index, nicony] of sheets.entries()) {
        const niconyId = nicony[0]

        if (niconyId === subId) {
          sheets.splice(index, 1)
          break
        }
      }
    }
    return sheets
  }

  let appIndex
  let naverIndex

  if (sheetName === '매출액') {
    appIndex = titles.indexOf('앱 판매액')
    naverIndex = titles.indexOf('네이버스토어 판매액')
  } else if (sheetName === '이익액') {
    appIndex = titles.indexOf('앱 이익액')
    naverIndex = titles.indexOf('네이버스토어 이익액')
  } else if (sheetName === '판매개수') {
    appIndex = titles.indexOf('앱 판매개수')
    naverIndex = titles.indexOf('네이버스토어 판매개수')
  } else if (sheetName === '매입액') {
    appIndex = titles.indexOf('매입액')
  } else if (sheetName === '매입개수') {
    appIndex = titles.indexOf('니콘내콘 매입개수')
  }

  if (naverIndex) {
    ncncSheets = mergeAppAndNaver(ncncSheets, appIndex, naverIndex)
  } else {
    ncncSheets = deleteNicony(ncncSheets, appIndex)
  }

  ncncSheets.sort((a, b) => {
    if (a[0] > b[0]) return -1
    if (a[0] < b[0]) return 1
    return 0
  })

  for (const [index, sheet] of ncncSheets.entries()) {
    sheet.unshift(sheet[0] > 0 ? index + 1 : '-')
  }

  const matchedNames: any = await readGoogleSheet(
    spreadsheetId,
    '상품명 비교',
    'E2',
    'F',
  )

  const gftRank100Names: any = await readGoogleSheet(
    spreadsheetId,
    `기프티 ${sheetName} 순위`,
    'C2',
    'C',
  )

  const values = []

  for (let gftName of gftRank100Names) {
    gftName = gftName[0]
    let isExist = 0

    for (const matchedName of matchedNames) {
      const gft = matchedName[0]
      const ncnc = matchedName[1]

      if (gftName === gft) {
        for (const sheet of ncncSheets) {
          const ncncName = sheet[3]

          if (ncncName === ncnc) {
            if (naverIndex) {
              values.push([
                sheet[0], // 순위
                sheet[1], // 앱+스팜 데이터
                sheet[3], // 이름
                sheet[appIndex + 2], // 앱 데이터
                sheet[naverIndex + 2], // 네이버 데이터
                sheet[12], // 재고
                sheet[13], // 앱 판매가
                sheet[14], // 스팜 판매가
                sheet[15], // 제시가
              ])
            } else {
              values.push([
                sheet[0], // 순위
                sheet[appIndex + 2], // 앱 데이터
                sheet[3], // 이름
                sheet[12], // 재고
                sheet[13], // 앱 판매가
                sheet[14], // 스팜 판매가
                sheet[15], // 제시가
              ])
            }
            isExist = 1
            break
          }
        }
      }
      if (isExist) break
    }

    if (!isExist) values.push(['일치하는 상품 없음'])
  }
  if (naverIndex) {
    await clearGoogleSheet(spreadsheetId, `기프티 ${sheetName} 순위`, 'I2', 'Q')
  } else {
    await clearGoogleSheet(spreadsheetId, `기프티 ${sheetName} 순위`, 'I2', 'O')
  }

  await writeGoogleSheetForRow(
    spreadsheetId,
    `기프티 ${sheetName} 순위`,
    values,
    'I2',
    'U',
  )

  await writeGoogleSheetForRow(
    spreadsheetId,
    `기프티 ${sheetName} 순위`,
    [[`${moment().subtract(1, 'days').format('YYYY[.]MM[.]DD')} 기준`]],
    'I1',
    'I1',
  )
}

export async function updateNcncChart() {
  console.log(
    '니콘내콘 각 순위 차트 작성하기:',
    moment().format('dddd hh:mm:ss'),
  )

  const ncncDatas: any = await readGoogleSheet(
    spreadsheetId,
    '니콘내콘 상품 분석',
    'A2',
    'N',
  )

  const [titles]: any = await readGoogleSheet(
    spreadsheetId,
    '니콘내콘 상품 분석',
    'A1',
    'N1',
  )

  const sheetNames = ['매출액', '이익액', '판매개수', '매입액', '매입개수']

  for (const sheetName of sheetNames) {
    await updateEachSheet(sheetName, ncncDatas, titles)
    await sleep(10000)
  }
}
