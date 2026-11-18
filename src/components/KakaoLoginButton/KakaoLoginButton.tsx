import { useState } from 'react'
import { kakaoError, startKakaoLogin } from '../../api/kakao'
import styles from './style.module.css'

/** 카카오 디자인 가이드: 노란 배경(#FEE500) + 검은 말풍선 심볼 + "카카오 로그인" */
function KakaoLoginButton({ redirectPath = '/main' }: { redirectPath?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onClick = async () => {
    setError('')
    setLoading(true)
    try {
      await startKakaoLogin(redirectPath) // 성공하면 카카오 페이지로 이동하므로 아래로 내려오지 않음
    } catch (e) {
      setError(kakaoError(e, '카카오 로그인을 시작하지 못했어요.'))
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" className={styles.button} onClick={onClick} disabled={loading}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.symbol}>
          <path d="M12 3C6.48 3 2 6.54 2 10.9c0 2.82 1.87 5.3 4.69 6.7l-.95 3.48c-.08.3.26.54.52.37l4.14-2.74c.53.06 1.06.1 1.6.1 5.52 0 10-3.54 10-7.91S17.52 3 12 3z" />
        </svg>
        {loading ? '카카오로 이동 중…' : '카카오 로그인'}
      </button>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  )
}

export default KakaoLoginButton
