# 대시보드 월별 순자산 복합 차트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드 "월별 순자산 구성" BarChart를 ComposedChart로 전환하고, 스냅샷 없는 달은 막대를 숨기되 순자산 꺾은선으로 추세를 연결한다.

**Architecture:** 단일 파일 `frontend/src/app/(app)/page.tsx`만 수정. `buildChartData`에서 isFilled 달의 카테고리 값을 0, net_worth를 null로 설정(carry-forward 제거). 차트는 BarChart → ComposedChart 교체 후 Line 추가.

**Tech Stack:** recharts (ComposedChart, Line — 기존 패키지에 포함), TypeScript, Next.js 15 App Router

## Global Constraints

- 수정 파일: `frontend/src/app/(app)/page.tsx` 하나
- recharts 버전 업그레이드 없음 (ComposedChart, Line은 이미 포함됨)
- 새 Y축 없음 (단일 Y축 유지)
- 차트 height/레이아웃 변경 없음
- 새 API 호출 없음

---

### Task 1: ChartPoint 타입 + buildChartData 수정

**Files:**
- Modify: `frontend/src/app/(app)/page.tsx` — ChartPoint 타입 + buildChartData 함수

**Interfaces:**
- Consumes: `Snapshot.metrics.net_worth: number`
- Produces: `ChartPoint.net_worth: number | null` — Task 2의 `<Line dataKey="net_worth">` 가 사용

- [ ] **Step 1: ChartPoint 타입에 net_worth 추가**

`ChartPoint` 타입 전체를 아래로 교체:

```ts
type ChartPoint = {
  month: string;
  isFilled: boolean;
  cash_savings: number;
  investments: number;
  insurance_pension: number;
  real_estate: number;
  personal_use: number;
  net_worth: number | null;
};
```

- [ ] **Step 2: buildChartData 함수 전체 교체**

`buildChartData` 함수 전체를 아래로 교체한다.  
핵심 변경: isFilled 달에 `lastTotals` carry-forward 하던 로직 제거 → 카테고리 값 0, net_worth null.

```ts
function buildChartData(snapshots: Snapshot[]): ChartPoint[] {
  if (snapshots.length === 0) return [];

  const snapByMonth: Record<string, Snapshot> = {};
  for (const s of snapshots) snapByMonth[s.snapshot_month.slice(0, 7)] = s;

  const startMonth = snapshots[0].snapshot_month.slice(0, 7);
  const endMonth = snapshots[snapshots.length - 1].snapshot_month.slice(0, 7);

  const result: ChartPoint[] = [];

  let cur = startMonth;
  while (cur <= endMonth) {
    const snap = snapByMonth[cur];
    if (snap) {
      const raw = {
        cash_savings:      sumCategory(snap.data, "assets.cash_savings"),
        investments:       sumCategory(snap.data, "assets.investments"),
        insurance_pension: sumCategory(snap.data, "assets.insurance_pension"),
        real_estate:       sumCategory(snap.data, "assets.real_estate"),
        personal_use:      sumCategory(snap.data, "assets.personal_use"),
      };
      const totalAssets = Object.values(raw).reduce((s, v) => s + v, 0);
      const scale = totalAssets > 0 ? snap.metrics.net_worth / totalAssets : 1;
      result.push({
        month: cur.slice(2, 4) + "." + cur.slice(5, 7),
        isFilled: false,
        cash_savings:      Math.round(raw.cash_savings      * scale),
        investments:       Math.round(raw.investments       * scale),
        insurance_pension: Math.round(raw.insurance_pension * scale),
        real_estate:       Math.round(raw.real_estate       * scale),
        personal_use:      Math.round(raw.personal_use      * scale),
        net_worth: snap.metrics.net_worth,
      });
    } else {
      result.push({
        month: cur.slice(2, 4) + "." + cur.slice(5, 7),
        isFilled: true,
        cash_savings: 0,
        investments: 0,
        insurance_pension: 0,
        real_estate: 0,
        personal_use: 0,
        net_worth: null,
      });
    }
    cur = addOneMonth(cur);
  }
  return result;
}
```

- [ ] **Step 3: TypeScript 검사**

```bash
cd frontend && npm run lint
```

Expected: 에러 없음. net_worth 타입 관련 에러 발생 시 Task 2 완료 후 재실행.

---

### Task 2: 차트 컴포넌트 + 범례 교체

**Files:**
- Modify: `frontend/src/app/(app)/page.tsx` — import + JSX

**Interfaces:**
- Consumes: `ChartPoint.net_worth: number | null` (Task 1에서 추가됨)
- Consumes: `colors.primary[500]` — `#3182F6`, 기존 import

- [ ] **Step 1: import 변경**

기존 recharts import:
```ts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
```

아래로 교체 (`BarChart` → `ComposedChart`, `Line` 추가):
```ts
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
```

- [ ] **Step 2: BarChart → ComposedChart 교체**

JSX에서 `<BarChart` → `<ComposedChart`, `</BarChart>` → `</ComposedChart>` 로 변경.

- [ ] **Step 3: Cell fillOpacity 분기 제거**

기존:
```tsx
{ASSET_CATEGORIES.map((cat) => (
  <Bar key={cat.key} dataKey={cat.key} stackId="a" fill={cat.color} name={cat.label}>
    {chartData.map((entry, i) => (
      <Cell key={i} fill={cat.color} fillOpacity={entry.isFilled ? 0.25 : 1} />
    ))}
  </Bar>
))}
```

변경 후 (Cell 제거, 자기닫힘 태그):
```tsx
{ASSET_CATEGORIES.map((cat) => (
  <Bar key={cat.key} dataKey={cat.key} stackId="a" fill={cat.color} name={cat.label} />
))}
```

- [ ] **Step 4: Line 컴포넌트 추가**

Bar들 목록 바로 아래에 추가:
```tsx
<Line
  dataKey="net_worth"
  name="순자산"
  type="monotone"
  stroke={colors.primary[500]}
  strokeWidth={2}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dot={(props: any) =>
    props.payload.isFilled ? (
      <g key={`dot-${props.cx}`} />
    ) : (
      <circle key={`dot-${props.cx}`} cx={props.cx} cy={props.cy} r={3} fill={colors.primary[500]} />
    )
  }
  connectNulls={true}
/>
```

- [ ] **Step 5: 범례 변경**

범례 영역에서 기존 추정값 설명 span을 제거하고 순자산 항목으로 교체.

기존 (제거):
```tsx
<span className="flex items-center gap-1 text-xs text-[#b0b8c1]">
  <span className="inline-block h-2 w-2 rounded-full bg-[#e5e8eb]" />
  연한 색 = 추정값 (이전 스냅샷 유지)
</span>
```

추가:
```tsx
<span className="flex items-center gap-1 text-xs text-[#8b95a1]">
  <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: colors.primary[500] }} />
  순자산
</span>
```

- [ ] **Step 6: 빌드 검사**

```bash
cd frontend && npm run build
```

Expected: 에러 없이 완료. 타입 에러 발생 시 dot prop을 `dot={false}` 로 단순화하고 시각 확인으로 대체 가능.

- [ ] **Step 7: 시각 확인**

개발 서버 실행:
```bash
cd frontend && npm run dev
```

http://localhost:3000 접속 후 확인 항목:
- 스냅샷 있는 달: 카테고리별 누적 막대 + 파란 점(●) 표시
- 스냅샷 없는 달: 막대 없이 X축 간격만 차지 + 꺾은선이 앞뒤 달을 연결
- 툴팁 hover 시 "순자산" 항목 표시
- 범례에 파란 가로선 + "순자산" 텍스트

- [ ] **Step 8: 커밋**

```bash
git add frontend/src/app/(app)/page.tsx
git commit -m "feat: 대시보드 월별 순자산 복합 차트 추가 (#15)"
```
