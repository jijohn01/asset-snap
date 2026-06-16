"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";

interface SnapshotMetrics {
  net_worth: number;
  equity_ratio: number;
  monthly_income: number;
  monthly_surplus: number;
}

interface Snapshot {
  id: string;
  snapshot_month: string;
  data: { assets: Record<string, Record<string, number>> };
  metrics: SnapshotMetrics;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const ASSET_CATEGORIES = [
  { key: "cash_savings",      label: "현금/저축",  color: "#3182F6" },
  { key: "investments",       label: "투자",       color: "#00B493" },
  { key: "insurance_pension", label: "보험/연금",  color: "#F0A33B" },
  { key: "real_estate",       label: "부동산",     color: "#8B5CF6" },
  { key: "personal_use",      label: "개인사용",   color: "#6B7684" },
];

type ChartPoint = {
  month: string;
  isFilled: boolean;
  cash_savings: number;
  investments: number;
  insurance_pension: number;
  real_estate: number;
  personal_use: number;
};

function addOneMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function sumItems(items: Record<string, number>): number {
  return Object.values(items).reduce((s, v) => s + v, 0);
}

function buildChartData(snapshots: Snapshot[]): ChartPoint[] {
  if (snapshots.length === 0) return [];

  const snapByMonth: Record<string, Snapshot> = {};
  for (const s of snapshots) snapByMonth[s.snapshot_month.slice(0, 7)] = s;

  const startMonth = snapshots[0].snapshot_month.slice(0, 7);
  const endMonth = snapshots[snapshots.length - 1].snapshot_month.slice(0, 7);

  let lastTotals = { cash_savings: 0, investments: 0, insurance_pension: 0, real_estate: 0, personal_use: 0 };
  const result: ChartPoint[] = [];

  let cur = startMonth;
  while (cur <= endMonth) {
    const snap = snapByMonth[cur];
    if (snap) {
      lastTotals = {
        cash_savings: sumItems(snap.data.assets.cash_savings ?? {}),
        investments: sumItems(snap.data.assets.investments ?? {}),
        insurance_pension: sumItems(snap.data.assets.insurance_pension ?? {}),
        real_estate: sumItems(snap.data.assets.real_estate ?? {}),
        personal_use: sumItems(snap.data.assets.personal_use ?? {}),
      };
    }
    result.push({ month: cur.slice(2, 4) + "." + cur.slice(5, 7), isFilled: !snap, ...lastTotals });
    cur = addOneMonth(cur);
  }
  return result;
}

function fmt(val: number) {
  return val.toLocaleString() + "만원";
}

function DiffBadge({ amount, pct, isRatio }: { amount: number; pct: number; isRatio: boolean }) {
  const up = amount >= 0;
  const sign = up ? "▲" : "▼";
  const cls = up ? "text-emerald-500" : "text-red-500";
  const text = isRatio
    ? `${sign} ${Math.abs(amount).toFixed(1)}%p`
    : `${sign} ${Math.abs(amount).toLocaleString()}만원 (${Math.abs(pct).toFixed(1)}%)`;
  return <span className={`text-xs font-medium ${cls}`}>{text}</span>;
}

export default function DashboardPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/snapshots/`)
      .then((r) => r.json())
      .then((data: Snapshot[]) =>
        setSnapshots(data.sort((a, b) => a.snapshot_month.localeCompare(b.snapshot_month)))
      )
      .finally(() => setLoading(false));
  }, []);

  const latest = snapshots.at(-1);
  const prev = snapshots.at(-2);
  const hasData = !loading && snapshots.length > 0;

  const cardDefs = latest
    ? [
        { label: "순자산",       curr: latest.metrics.net_worth,      prevVal: prev?.metrics.net_worth,      display: fmt(latest.metrics.net_worth),       isRatio: false },
        { label: "자기자본비율", curr: latest.metrics.equity_ratio,    prevVal: prev?.metrics.equity_ratio,   display: `${latest.metrics.equity_ratio}%`,   isRatio: true  },
        { label: "월소득",       curr: latest.metrics.monthly_income,  prevVal: prev?.metrics.monthly_income, display: fmt(latest.metrics.monthly_income),   isRatio: false },
        { label: "월잉여금",     curr: latest.metrics.monthly_surplus, prevVal: prev?.metrics.monthly_surplus,display: fmt(latest.metrics.monthly_surplus),  isRatio: false },
      ]
    : null;

  const chartData = buildChartData(snapshots);

  const pieData = latest
    ? ASSET_CATEGORIES.map((cat) => ({
        name: cat.label,
        color: cat.color,
        value: sumItems(latest.data.assets[cat.key] ?? {}),
      })).filter((d) => d.value > 0)
    : [];

  const totalPieValue = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
      <p className="mt-1 text-sm text-gray-500">
        {latest ? `${latest.snapshot_month.slice(0, 7)} 스냅샷 기준` : "최신 스냅샷 기준"} 자산 현황
      </p>

      {/* 상단 카드 */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        {!hasData
          ? ["순자산", "자기자본비율", "월소득", "월잉여금"].map((label) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-300">{loading ? "..." : "—"}</p>
              </div>
            ))
          : cardDefs!.map(({ label, curr, prevVal, display, isRatio }) => {
              const diff =
                prevVal !== undefined && prevVal !== 0
                  ? { amount: curr - prevVal, pct: ((curr - prevVal) / Math.abs(prevVal)) * 100 }
                  : null;
              return (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{display}</p>
                  {diff && (
                    <div className="mt-1">
                      <DiffBadge amount={diff.amount} pct={diff.pct} isRatio={isRatio} />
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {/* 차트 영역 */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* 월별 자산 유형 스택 막대그래프 */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">월별 자산 구성</p>
          {hasData ? (
            <>
              <ResponsiveContainer width="100%" height={180} className="mt-3">
                <BarChart data={chartData} barCategoryGap="25%">
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => (v >= 10000 ? `${(v / 10000).toFixed(0)}억` : v.toLocaleString())}
                    width={52}
                  />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  {ASSET_CATEGORIES.map((cat) => (
                    <Bar key={cat.key} dataKey={cat.key} stackId="a" fill={cat.color} name={cat.label}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={cat.color} fillOpacity={entry.isFilled ? 0.25 : 1} />
                      ))}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {ASSET_CATEGORIES.map((cat) => (
                  <span key={cat.key} className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.label}
                  </span>
                ))}
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
                  연한 색 = 추정값 (이전 스냅샷 유지)
                </span>
              </div>
            </>
          ) : (
            <div className="mt-4 flex h-44 items-center justify-center text-sm text-gray-300">
              {loading ? "불러오는 중..." : "스냅샷 데이터 없음"}
            </div>
          )}
        </div>

        {/* 자산 구성 도넛 차트 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">자산 구성</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140} className="mt-2">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                  >
                    <Label
                      position="center"
                      content={({ viewBox }) => {
                        const vb = viewBox as { cx: number; cy: number };
                        return (
                          <text x={vb.cx} y={vb.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={vb.cx} dy="-8" fontSize="10" fill="#6B7280">총 자산</tspan>
                            <tspan x={vb.cx} dy="17" fontSize="12" fontWeight="bold" fill="#111827">
                              {totalPieValue.toLocaleString()}
                            </tspan>
                          </text>
                        );
                      }}
                    />
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-gray-500">{d.value.toLocaleString()}만</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 flex h-40 items-center justify-center text-sm text-gray-300">
              {loading ? "불러오는 중..." : "스냅샷 데이터 없음"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
