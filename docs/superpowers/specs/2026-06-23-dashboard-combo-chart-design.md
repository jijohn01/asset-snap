# 대시보드 월별 순자산 복합 차트 (막대+꺾은선) 설계

**Issue:** #15  
**Branch:** `15-feat-대시보드-월별-순자산-복합-차트-막대꺾은선`  
**Date:** 2026-06-23

---

## 목표

대시보드의 "월별 순자산 구성" 차트를 복합 차트(ComposedChart)로 전환한다.  
자산 카테고리별 누적 막대 위에 순자산 꺾은선을 추가해 월별 추세를 직관적으로 표현한다.

---

## 변경 범위

**파일 1개만 수정:** `frontend/src/app/(app)/page.tsx`

새 API 호출 없음. 새 파일 없음. 다른 페이지/컴포넌트 손 안 댐.

---

## 데이터 모델

### ChartPoint 타입 변경

```ts
// 기존
type ChartPoint = {
  month: string;
  isFilled: boolean;
  cash_savings: number;
  investments: number;
  insurance_pension: number;
  real_estate: number;
  personal_use: number;
};

// 변경
type ChartPoint = {
  month: string;
  isFilled: boolean;
  cash_savings: number;
  investments: number;
  insurance_pension: number;
  real_estate: number;
  personal_use: number;
  net_worth: number | null;  // 추가: 스냅샷 없는 달은 null
};
```

### buildChartData 변경

| 달 종류 | 카테고리 값 | net_worth |
|---------|------------|-----------|
| 스냅샷 있음 (`!isFilled`) | 기존 스케일링 로직 유지 | `snap.metrics.net_worth` |
| 스냅샷 없음 (`isFilled`) | 모두 **0** (막대 미렌더) | **null** (꺾은선 점 없음) |

**제거:** `lastTotals` carry-forward 로직 (isFilled 달에 이전 값 유지하던 부분).

---

## 차트 컴포넌트

### recharts import 변경

```ts
// 추가
import { ComposedChart, Line } from "recharts";
// 제거
import { BarChart } from "recharts";
```

### BarChart → ComposedChart

```tsx
// 기존
<BarChart data={chartData} barCategoryGap="25%">

// 변경
<ComposedChart data={chartData} barCategoryGap="25%">
```

### Line 추가 (Bar들 아래에 선언)

```tsx
<Line
  dataKey="net_worth"
  name="순자산"
  type="monotone"
  stroke={colors.primary[500]}
  strokeWidth={2}
  dot={(props) => props.payload.isFilled ? <></> : <circle cx={props.cx} cy={props.cy} r={3} fill={colors.primary[500]} />}
  connectNulls={true}
/>
```

- `connectNulls={true}`: 스냅샷 없는 달(null)을 건너뛰고 앞뒤 실제 포인트를 직선으로 연결
- `dot`: 스냅샷 있는 달만 점 표시
- Y축 공유: 꺾은선 값(net_worth) = 막대 합계이므로 동일 스케일

### Cell fillOpacity 제거

기존 `isFilled` 달의 투명도(0.25) 처리 코드 제거. 모든 셀 opacity = 1 (isFilled 달은 값이 0이므로 막대가 렌더되지 않음).

---

## 툴팁

기존 `formatter={(v: number) => fmt(v)}`에 `net_worth` 키의 name이 "순자산"으로 표시되므로 별도 수정 불필요.

---

## 범례 변경

```tsx
// 제거
<span className="flex items-center gap-1 text-xs text-[#b0b8c1]">
  <span className="inline-block h-2 w-2 rounded-full bg-[#e5e8eb]" />
  연한 색 = 추정값 (이전 스냅샷 유지)
</span>

// 추가
<span className="flex items-center gap-1 text-xs text-[#8b95a1]">
  <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: colors.primary[500] }} />
  순자산
</span>
```

---

## 시각적 결과

```
순자산(만원)
    │         ●
    │        /│\
    │       / │ \●
    │      /  │  │\
    │    ●/   │  │ ●
    │    │    │  │ │
    └──Jan──Feb──Mar──Apr──
          (스냅샷 없음: 막대 없음, 선만 연결)
```

- Jan, Mar, Apr: 실제 스냅샷 → 막대 + 선 점
- Feb: 스냅샷 없음 → 막대 없이 빈 X축 간격, 선이 Jan→Mar 직선으로 연결

---

## 스코프 외 (이번에 안 함)

- 차트 높이/레이아웃 변경
- 파이차트, 보조지표 카드 변경
- 이중 Y축 도입
- 애니메이션 커스텀
