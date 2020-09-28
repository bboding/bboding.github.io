import moment from 'moment'
import {readGoogleSheet, writeGoogleSheetForRow} from '../utils'

const spreadsheetId = process.env.SPREADSHEET_ID

function editDistance(longer, shorter) {
  const longerWord = longer.toLowerCase().replace(/ /gi, '')
  const shorterWord = shorter.toLowerCase().replace(/ /gi, '')

  const costs = []

  for (let i = 0; i <= longerWord.length; i++) {
    let last = i

    for (let j = 0; j <= shorterWord.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]

        if (longerWord.charAt(i - 1) !== shorterWord.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, last), costs[j]) + 1
        }
        costs[j - 1] = last
        last = newValue
      }
    }
    if (i > 0) costs[shorterWord.length] = last
  }
  return costs[shorterWord.length]
}

async function getSimilarity(word1, word2) {
  if (word1.length === 0 || word2.length === 0) return 1.0

  let longer = word1
  let shorter = word2

  if (word1.length < word2.length) {
    shorter = word1
    longer = word2
  }

  return (
    (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length)
  )
}

// 기프티스타 상품명에 매칭하는 니콘내콘 상품명 업데이트 (첫 세팅)
async function setMatching(gftNames, ncncNames) {
  let idx = 0
  const values = []

  for (const gftName of gftNames) {
    idx++
    let max = 0
    let ncnc

    for (const ncncName of ncncNames) {
      const wordSimilarity = await getSimilarity(gftName[0], ncncName[0])

      if (max < wordSimilarity) {
        max = wordSimilarity
        ncnc = ncncName[0]
      }
    }
    values.push([ncnc])

    console.log(idx)
  }

  await writeGoogleSheetForRow(
    spreadsheetId,
    '기프티 상품 분석',
    values,
    'S2',
    'S',
  )
}

export async function updateMatchedProduct() {
  console.log('update-matched-product', moment().format('dddd HH:mm:ss'))

  const ncncNames: any = await readGoogleSheet(
    spreadsheetId,
    '니콘내콘 상품 분석',
    'B2',
    'B',
  )

  const gftNames: any = await readGoogleSheet(
    spreadsheetId,
    '기프티 상품 분석',
    'A2001',
    'A',
  )

  const matchedNcncNames: any = await readGoogleSheet(
    spreadsheetId,
    '기프티 상품 분석',
    'S2',
    'S',
  )

  const values = []

  for (const [index, matchedNcncName] of matchedNcncNames.entries()) {
    if (!matchedNcncName[0]) {
      // 매칭된 니콘내콘 상품명이 비어있는 경우만 업데이트
      let max = 0
      let matchedNcnc = '-'

      for (const ncncName of ncncNames) {
        const wordSimilarity = await getSimilarity(
          gftNames[index][0],
          ncncName[0],
        )

        if (max < wordSimilarity) {
          max = wordSimilarity

          matchedNcnc = ncncName[0]
        }
        values.push([matchedNcnc])
      }

      await writeGoogleSheetForRow(
        spreadsheetId,
        '기프티 상품 분석',
        [[matchedNcnc]],
        `S${index + 2}`,
        `S${index + 2}`,
      )
    }
  }
}
