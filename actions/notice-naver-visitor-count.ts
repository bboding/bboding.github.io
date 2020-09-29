import axios from 'axios'
import moment from 'moment'
import {sendSlackMessage} from '../utils'

const baroconId = 500230212
const niconyId = 100209148
const gftId = 100110413

async function getVisitorCount(storeId) {
  try {
    const {data} = await axios.get(
      `https://smartstore.naver.com/i/v1/visit/${storeId}`,
    )

    return data.today
  } catch (err) {
    console.log(err)
  }
}

export async function noticeNaverVisitorCount() {
  console.log('notice-naver-visitor-count', moment().format('dddd HH:mm:ss'))

  const baroconCount = await getVisitorCount(baroconId)
  const niconyCount = await getVisitorCount(niconyId)
  const gftCount = await getVisitorCount(gftId)

  await sendSlackMessage(
    `바로콘+니코니 현재 방문자수: ${
      baroconCount + niconyCount
    } (${baroconCount}+${niconyCount})\n기프티스타 현재 방문자수: ${gftCount}`,
  )
}
