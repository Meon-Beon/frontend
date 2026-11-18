import { client } from './client'

/* 보험설계 API (server/app/routers/insurance.py) */

/** 보장 하나. 금액은 "1000만원", "3일초과 1일당 1만원 …" 처럼 원문 문자열 */
export type Coverage = {
  coverage_name: string
  coverage_detail: string | null
  coverage_amount: string | null
}

/** 이미 가입한 보험 상품 하나 */
export type OwnedProduct = {
  id: number
  company_name: string
  product_name: string
  premium: number
  /** 보장명으로 분류한 카테고리, 많은 순 (암, 교통 상해 …) */
  categories: string[]
  coverages: Coverage[]
  features: { feature_name: string; feature_detail: string | null }[]
}

export type ExistingInsurance = {
  total_premium: number
  /** 가입한 보장 전체에서 가장 많은 카테고리. 가입한 보험이 없으면 null */
  main_category: string | null
  products: OwnedProduct[]
}

/** 추천 보험 상품 하나 */
export type Recommendation = {
  id: number
  rec_rank: number
  company_name: string
  product_name: string
  insurer_type: string | null
  product_type: string | null
  /** 월 예시 보험료(본인 견적 아님). 없을 수 있음 */
  premium: number | null
  premium_basis: string | null
  join_age: string | null
  /** 이 상품이 대비하는 질병 (당뇨, 심장, 뇌혈관 …) */
  target_diseases: string[]
  reason: string | null
  checks: string | null
  fit_status: string | null
  coverages: Coverage[]
}

export type GapStatus = '공백의심' | '보장확인' | '정보부족'

/** 질병 하나의 보장 공백 점검 결과 */
export type CoverageGap = {
  disease: string
  /** DNA·검진상 잠재 위험 대상인지 */
  at_risk: boolean
  diagnosed: string | null
  status: GapStatus
  current_summary: string | null
  gap_detail: string | null
}

export type InsuranceDesign = {
  recommendations: Recommendation[]
  gaps: CoverageGap[]
}

export async function fetchExistingInsurance(userId: number) {
  const { data } = await client.get<ExistingInsurance>(`/api/insurance/existing/${userId}`)
  return data
}

export async function fetchInsuranceDesign(userId: number) {
  const { data } = await client.get<InsuranceDesign>(`/api/insurance/design/${userId}`)
  return data
}
