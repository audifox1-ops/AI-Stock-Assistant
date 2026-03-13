# AI Stock Assistant Brand Guidelines

본 문서는 'AI Stock' 앱의 핵심 DNA와 UI/UX 표준을 정의합니다. 모든 개발 및 디자인 작업은 이 가이드를 준수해야 합니다.

## 1. 핵심 가치 (Brand DNA)
- **타겟 고객**: 30~50대 한국인 직장인 투자자
- **브랜드 무드**: 신뢰감(Trust), 전문성(Expertise), 직관성(Simplicity)
- **SOP**: 복잡한 주식 데이터를 AI가 분석하여 3줄 핵심 요약으로 제공

## 2. 디자인 시스템 (Layout & Constraints)

### 베이스 테마: 다크 모드 (Dark Mode)
- **Main Background**: `bg-slate-900` (#0f172a)
- **Section/Card Background**: `bg-slate-800` (#1e293b)
- **Border/Divider**: `border-slate-700/50` or `border-white/10`

### 포인트 컬러 (Color Palette)
- **긍정/강조 (Emphasis)**: `text-blue-500` / `bg-blue-500`
- **주가 상승 (Stock Up)**: `text-red-500` (한국 증시 표준)
- **주가 하락 (Stock Down)**: `text-blue-400` (한국 증시 표준)
- **텍스트 (Primary)**: `text-slate-100`
- **텍스트 (Secondary)**: `text-slate-400`

### UI 컴포넌트 구조
- **Card**: 모든 리스트 및 섹션은 모서리가 둥근 카드(`rounded-2xl` 또는 `rounded-3xl`) 형태 유지
- **Navigation**: 하단 탭 바(`Bottom Navigation`) 고정 형태 유지 (홈, 보유종목, 관심종목, 차트, 설정)
- **Interactions**: 모바일 친화적인 터치 영역 확보 및 매끄러운 트랜지션 (`animate-in`, `fade-in`)

## 3. 기술적 제약 및 배포 전략 (World)
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS Only
- **Icons**: Lucide React
- **Client/Server Boundary**: 
  - `styled-jsx` 대신 Tailwind CSS 전용 사용
  - 인터랙션 및 상태관리가 필요한 곳에만 `"use client"` 명시
  - Vercel 배포 시 환경 변수(`GEMINI_API_KEY`) 사용에 주의
- **Output Rule**: 코드 수정 시 항상 파일의 **전체 코드**를 출력

---
*최종 업데이트: 2026-03-13*
