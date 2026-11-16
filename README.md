# US Equity & ETF 4-Tier Options Microstructure Terminal

미국 주식 및 주요 지수 ETF(QQQ, SPY, NVDA, AAPL, ADBE 등)의 옵션 체인 데이터를 기반으로 딜러 감마 노출(GEX), 핵심 변곡점 레벨, 교차 그릭스 및 장중 체결 집중도를 추적하는 DB-less 웹 터미널입니다.

- **Live Terminal**: `https://chart.blanket6612.workers.dev`

---

## 1. System Architecture & Data Pipeline

별도의 데이터베이스 없이 클라이언트 연산 엔진과 서버리스 프록시만으로 구동되도록 경량화되어 있습니다.

- **Options Chain & Spot (15m Delayed)**: Cboe Global Markets 지연 시세 JSON (`cdn.cboe.com`) 데이터를 Cloudflare Workers 백엔드(`/proxy`)를 통해 CORS 차단 없이 5분 주기로 폴링합니다.
  - **거래량(Volume) 및 내재변동성(IV)**: OPRA(미국 옵션시세보고기구) 통합 피드 기반 15분 지연 데이터
  - **미결제약정(Open Interest)**: OCC(미국 옵션청산소)의 당일 정규장 개장 전 정산 확정 데이터
- **Real-time Futures & Basis**: Binance TradFi 무기한 선물 공개 웹소켓(`aggTrade`, `markPrice@1s`) 및 REST 폴백을 연동하여 실시간 체결가, 현물 대비 베이시스(Basis), 펀딩비를 상단 고정 프레임에 표시합니다.
- **Client-side State**: 종목별 워치리스트, 배당수익률 프리셋, 시점 비교용 스냅샷(`Δ`) 데이터는 브라우저 `localStorage`에 분리 저장됩니다.

---

## 2. Quantitative Engine Specifications

기존 크립토 선물 옵션 모형을 미국 주식·ETF 현물 옵션 규격에 맞춰 전면 보정하였습니다.

1. **Black-Scholes-Merton (BSM) 금리·배당 보정**
   - 무위험 이자율($r$, 미 3개월물 국채금리 기준)과 종목별 연간 배당수익률($q$)을 편미분 수식에 반영하여 중장기 월물의 델타·감마 오차를 제거했습니다.
   - 표준 계약 승수(`1계약 = 100주`)를 모든 달러 감마($ GEX) 및 환산 주식 수 노출도에 일괄 적용합니다.
2. **세션 동기화 시계 (Session-Synced Clock)**
   - 미국 정규장 휴장 시간대(야간·주말·공휴일)에는 옵션 IV가 직전 마감치로 고정되므로, 잔존만기($T$) 기준 시각 역시 직전 정규장 마감 시각(16:00 ET)으로 자동 고정하여 단기 세타(Theta) 및 참(Charm) 과대 산출 왜곡을 방지합니다.
3. **누락 IV 선형 보간 (Linear IV Interpolation)**
   - 장 마감 직후 호가 스프레드 확대로 특정 행사가의 IV가 `0`으로 수신될 경우, 동일 만기 인접 유효 행사가의 IV를 선형 보간하여 감마 스캔 누락을 차단합니다.
4. **4-Tier 만기 자동 감지 및 이월**
   - 종목별 상장 주기(주 5일 데일리, 월·수·금 위클리, 금요일 위클리)를 자동 판별합니다.
   - 단기 슬롯(T1·T2)이 매월 세 번째 금요일 정기 월물(Monthly OpEx)과 겹치는 주간에는 중장기 슬롯(T3·T4)을 차월물 및 차차월물로 자동 이월하여 중복 배치를 방지합니다.

---

## 3. Core Metrics & Screening Guide

| 지표명 | 산출 기준 및 시장 미시구조 해석 |
| :--- | :--- |
| **Zero Gamma (감마 플립)** | 딜러 순감마($ GEX) 합계가 0이 되는 분기점. 상회 시 역추세 완충 헤징(변동성 억제), 하회 시 추세 추종 헤징(스퀴즈·변동성 확대) 우위 |
| **Zero Delta (델타 수렴)** | 시장 전체 옵션 미결제약정의 순 델타 합계가 중립(0)이 되는 가격 균형선 |
| **Max Pain** | 만기 결제 시 옵션 매수자의 손실이 최대화되고 매도자 이익이 극대화되는 행사가 |
| **Net Gamma ($ GEX)** | 기초자산 1% 변동 시 딜러가 리밸런싱해야 하는 명목 달러 규모 (표준 지수 모델 `Call +1 / Put -1` 및 모멘텀 모델 전환 지원) |
| **Net Delta (sh)** | 전체 미결제약정 델타 합계에 승수(100주)를 곱한 시장 순 델타 환산 주식 수 |
| **Net Vanna / Charm** | 딜러 포지션 기준 내재변동성 1%p 변화당(`dΔ/dIV`), 1거래일 경과당(`dΔ/dt`) 발생하는 기계적 델타 헤징 물량 |
| **25D Skew** | 25델타 풋 IV와 25델타 콜 IV의 스프레드(`Put IV - Call IV`). 양수(+) 확대 시 하방 테일 리스크 방어 수요 우세 |
| **OI Wall vs. Active Vol** | 거시적 지지·저항 프레임은 누적 재고가 두터운 **당월물(T3) C-Wall / P-Wall**을 기준으로 삼고, 장중 단기 변곡점은 **최근접물(T1) 거래량 상위 및 고회전율(`Vol/OI > 100%`)** 행사가로 보완 판독 |

---

## 4. Repository Structure & Deployment

Cloudflare Workers (Static Assets + Worker Script) 환경에서 GitHub 연동 자동 빌드로 배포됩니다.

```text
chart/
├── public/
│   └── index.html      # 프론트엔드 UI 및 BSM 퀀트 연산 엔진
├── worker.js           # /proxy 엔드포인트 Cboe API 중계 및 정적 자산 라우팅
├── wrangler.jsonc      # Cloudflare Workers 바인딩 및 디렉토리 설정
└── README.md           # 프로젝트 문서
