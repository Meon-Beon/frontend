/* 카카오(다음) 우편번호 서비스. 회원가입과 마이페이지 정보 수정에서 함께 씀 */
const POSTCODE_SCRIPT = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

export type PostcodeData = { zonecode: string; roadAddress: string; jibunAddress: string }
type PostcodeConstructor = new (options: { oncomplete: (data: PostcodeData) => void }) => {
  open: () => void
}

declare global {
  interface Window {
    kakao?: { Postcode?: PostcodeConstructor }
    daum?: { Postcode?: PostcodeConstructor }
  }
}

let postcodeLoading: Promise<PostcodeConstructor> | null = null

/** 우편번호 스크립트를 처음 필요할 때 한 번만 불러옴 */
export function loadPostcode() {
  const find = () => window.kakao?.Postcode ?? window.daum?.Postcode
  const loaded = find()
  if (loaded) return Promise.resolve(loaded)

  postcodeLoading ??= new Promise<PostcodeConstructor>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = POSTCODE_SCRIPT
    script.onload = () => {
      const Postcode = find()
      if (Postcode) resolve(Postcode)
      else reject(new Error('우편번호 서비스를 찾을 수 없습니다.'))
    }
    script.onerror = () => {
      postcodeLoading = null // 다음에 누르면 다시 시도
      reject(new Error('우편번호 스크립트를 불러오지 못했습니다.'))
    }
    document.head.appendChild(script)
  })
  return postcodeLoading
}
