import axios from 'axios'
import { client } from './client'
import { DEMO_CHECKUPS, DEMO_PERSON } from './healthDemo'

/* 건강검진 내역 조회 API (server/app/routers/health.py) */

export type Level = 'good' | 'warn' | 'risk'

export type CheckupRow = {
  item: string
  result: string
  unit: string
  reference: string
  judgment: string
  level: Level
  /** 연도별 추이 표에 쓰는 항목 이름 (bmi, bp, glucose …) */
  key?: string
  target?: string
}

export type HealthCheckup = {
  date: string
  hospital: string
  overall: { label: string; level: Level }
  findings: { title: string; status: string; level: Level; value: string; advice: string }[]
  sections: { title: string; rows: CheckupRow[] }[]
  interview?: { history: string[]; medication: string; lifestyle: string[] }
}

export type CheckupQuery = {
  name: string
  birth_date: string // YYYY-MM-DD
  gender: 'M' | 'F'
  phone: string // 숫자만
}

const isDemoPerson = (q: CheckupQuery) =>
  q.name === DEMO_PERSON.name &&
  q.birth_date === DEMO_PERSON.birth_date &&
  q.gender === DEMO_PERSON.gender &&
  q.phone === DEMO_PERSON.phone

/** 본인 확인 값으로 최근 검진 내역을 최신순으로 받아 옴 */
export async function fetchCheckups(query: CheckupQuery) {
  try {
    const { data } = await client.post<{ checkups: HealthCheckup[] }>('/api/health/checkups', query)
    return data.checkups
  } catch (error) {
    // 서버가 꺼져 있거나(응답 없음) DB에 테이블이 아직 없어 500이 날 때만,
    // 시연용 인물이면 같은 데이터를 대신 보여 줌. 404(내역 없음)는 그대로 오류로 보여 줌
    const serverDown = axios.isAxiosError(error) && (!error.response || error.response.status >= 500)
    if (serverDown && isDemoPerson(query)) {
      return DEMO_CHECKUPS
    }
    throw error
  }
}
