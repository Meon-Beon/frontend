type GeneLogoProps = {
  /** 로고 뒤 배경색. 가닥이 엇갈리는 틈을 이 색으로 그려 겹침을 표현함 */
  background?: string
  /** 앞쪽(남색 계열) 가닥 */
  strandColor?: string
  /** 뒤쪽(밝은) 가닥 */
  lightColor?: string
  /** GE / NE 글자 */
  textColor?: string
  className?: string
  /** 스크린리더용 이름. 옆에 브랜드명 글자가 있으면 ''로 넘겨 장식으로 처리 */
  title?: string
}

// 원본 로고(세로형 · 파란 바탕)의 나선을 사인 곡선으로 옮긴 좌표
const STRAND_A =
  'M424.8 190 L444.5 202 L464.9 214 L485.9 226 L507.1 238 L528.1 250 L548.8 262 L568.7 274 L587.7 286 L605.5 298 L621.7 310 L636.3 322 L648.9 334 L659.4 346 L667.7 358 L673.6 370 L677 382 L678 394 L676.4 406 L672.3 418 L665.8 430 L657 442 L645.9 454 L632.8 466 L617.8 478 L601.2 490 L583.1 502 L563.8 514 L543.7 526 L522.9 538 L501.8 550 L480.6 562 L459.8 574 L439.5 586 L420.1 598 L401.8 610 L384.8 622 L369.5 634 L356.1 646 L344.7 658 L335.5 670 L328.6 682 L324.1 694 L322.1 706 L322.6 718 L325.7 730 L331.2 742 L339 754 L349.2 766 L361.5 778 L375.7 790 L391.7 802 L409.2 814 L428 826 L447.9 838 L468.4 850 L489.4 862 L510.6 874 L531.6 886 L552.1 898 L572 910'
const STRAND_B =
  'M575.2 190 L555.5 202 L535.1 214 L514.1 226 L492.9 238 L471.9 250 L451.2 262 L431.3 274 L412.3 286 L394.5 298 L378.3 310 L363.7 322 L351.1 334 L340.6 346 L332.3 358 L326.4 370 L323 382 L322 394 L323.6 406 L327.7 418 L334.2 430 L343 442 L354.1 454 L367.2 466 L382.2 478 L398.8 490 L416.9 502 L436.2 514 L456.3 526 L477.1 538 L498.2 550 L519.4 562 L540.2 574 L560.5 586 L579.9 598 L598.2 610 L615.2 622 L630.5 634 L643.9 646 L655.3 658 L664.5 670 L671.4 682 L675.9 694 L677.9 706 L677.4 718 L674.3 730 L668.8 742 L661 754 L650.8 766 L638.5 778 L624.3 790 L608.3 802 L590.8 814 L572 826 L552.1 838 L531.6 850 L510.6 862 L489.4 874 L468.4 886 L447.9 898 L428 910'
// 위·아래 교차점에서는 A 가닥이 위로 지나가므로 그 구간만 다시 그림
const STRAND_A_TOP =
  'M424.8 190 L444.5 202 L464.9 214 L485.9 226 L507.1 238 L528.1 250 L548.8 262 L568.7 274 L587.7 286'
const STRAND_A_BOTTOM =
  'M409.2 814 L428 826 L447.9 838 L468.4 850 L489.4 862 L510.6 874 L531.6 886 L552.1 898 L572 910'

const STROKE = 26
const GAP = 64

/** 내:GENE설계 브랜드 마크. 어두운 배경 기준 색이 기본값 */
export default function GeneLogo({
  background = '#13254a',
  strandColor = '#7aa6e8',
  lightColor = '#e8f4fc',
  textColor = '#ffffff',
  className,
  title = '내:GENE설계',
}: GeneLogoProps) {
  const line = {
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const

  return (
    <svg
      className={className}
      viewBox="290 165 420 770"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      <path d={STRAND_A} stroke={strandColor} strokeWidth={STROKE} {...line} />
      <path d={STRAND_B} stroke={background} strokeWidth={GAP} {...line} />
      <path d={STRAND_B} stroke={lightColor} strokeWidth={STROKE} {...line} />
      {[STRAND_A_TOP, STRAND_A_BOTTOM].map((d) => (
        <g key={d}>
          <path d={d} stroke={background} strokeWidth={GAP} {...line} strokeLinecap="butt" />
          <path d={d} stroke={strandColor} strokeWidth={STROKE} {...line} />
        </g>
      ))}
      <g
        fill={textColor}
        fontFamily="'Pretendard Variable', Pretendard, sans-serif"
        fontSize="150"
        fontWeight="800"
        textAnchor="middle"
      >
        <text x="436" y="450">G</text>
        <text x="566" y="450">E</text>
        <text x="436" y="766">N</text>
        <text x="566" y="766">E</text>
      </g>
    </svg>
  )
}
