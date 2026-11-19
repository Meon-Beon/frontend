import axios from 'axios'

// 서버 주소. 배포할 때는 Vercel 환경변수 VITE_API_URL 에 서버 주소를 넣는다 (예: https://gene-api.vercel.app)
// 없으면 로컬 개발 서버
export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
})
