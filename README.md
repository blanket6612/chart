# chart
tiger
index.html >> 데리비트 4채널 옵션 데이터 스크리닝 페이지


>>261023
>>HTML 페이지 내의 Net Vanna(바나)와 Net Charm(참) 연산 및 지표 설명이 Net Gamma(GEX)와 동일한 딜러 포지션(Dealer Position) 관점으로 일관되게 수정되었습니다.1. 계산 엔진(Quant Engine) 방향성 수정기존 문제점:
Net Gamma($GEX) 연산에서는 딜러 관점의 포지션 승수(opt.isCall ? 1.0 : -1.0)가 적용되어 있었으나, netVanna와 netCharm은 단순 롱 옵션 오픈인터레스트 합산(+ greeks.vanna * opt.oi, + greeks.charm * opt.oi)으로 누적되어 있어 딜러의 실제 옵션 북 방향성과 반대로 왜곡되는 현상이 있었습니다.수정 로직:
비트코인(Deribit) 옵션 시장의 지배적 수급 구조인 채굴자/고래의 현물 담보 콜 매도(Covered Call) $\rightarrow$ 딜러 Long Call(+1.0) 및 다운사이드 하방 헤지 풋 매수(Protective Put) $\rightarrow$ 딜러 Short Put(-1.0) 기준을 Vanna와 Charm 누적식에도 동일하게 적용하였습니다.
