import { client } from './client'

/* 건강 종합 리포트 API (server/app/routers/report.py) */

/** 질병 하나의 DNA·건강검진 위험도. stage 는 5단계 눈금 (고위험군 5, 위험군 3, 일반군·평가불가 1) */
export type ReportDisease = {
  disease: string
  dna_risk: string
  dna_stage: number
  dna_summary: string | null
  checkup_risk: string
  checkup_stage: number
  checkup_summary: string | null
  checkup_values: string | null
  checkup_opinion: string | null
  insurance_view: string | null
}

/** 칸마다 서버가 위험도 높은 순으로 골라 준 상위 질병 */
export type Report = {
  matrix: ReportDisease[]
  checkup: ReportDisease[]
  dna: ReportDisease[]
}

export async function fetchReport(userId: number) {
  const { data } = await client.get<Report>(`/api/report/${userId}`)
  return data
}
