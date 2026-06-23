"use client";

import { useEffect, useState } from "react";
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
import { User, Users } from "lucide-react";
import { colors } from "@/lib/colors";
import { fetchSnapshots, fetchGroups, type Snapshot, type SnapshotData, type Group } from "@/lib/api";

const ASSET_CATEGORIES = [
  { key: "cash_savings",      label: "현금/저축",  color: colors.primary[500] },
  { key: "investments",       label: "투자",       color: colors.positive },
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
  net_worth: number | null;
};

function sumCategory(data: SnapshotData, category: string): number {
  return Object.values(data)
    .filter((item) => item.category === category)
    .reduce((s, item) => s + item.amount, 0);
}

function addOneMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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

function fmt(val: number) {
  return val.toLocaleString() + "만원";
}

function DiffBadge({ amount, pct, isRatio }: { amount: number; pct: number; isRatio: boolean }) {
  const up = amount >= 0;
  const sign = up ? "▲" : "▼";
  const cls = up ? "text-positive" : "text-negative";
  const text = isRatio
    ? `${sign} ${Math.abs(amount).toFixed(1)}%p`
    : `${sign} ${Math.abs(amount).toLocaleString()}만원 (${Math.abs(pct).toFixed(1)}%)`;
  return <span className={`text-xs font-medium ${cls}`}>{text}</span>;
}

export default function DashboardPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  useEffect(() => {
    function loadGroup() {
      fetchGroups().then((gs) => {
        const savedId = typeof window !== "undefined" ? localStorage.getItem("activeGroupId") : null;
        const current = (savedId && gs.find((g) => g.id === savedId)) || gs.find((g) => g.type === "personal") || gs[0];
        if (current) setActiveGroup(current);
      }).catch(() => {});
    }

    function load() {
      setLoading(true);
      loadGroup();
      fetchSnapshots()
        .then((data) =>
          setSnapshots(data.sort((a, b) => a.snapshot_month.localeCompare(b.snapshot_month)))
        )
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    load();
    window.addEventListener("group-changed", load);
    return () => window.removeEventListener("group-changed", load);
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

  const heroCard = cardDefs ? cardDefs[0] : null;
  const heroDiff =
    heroCard && heroCard.prevVal !== undefined && heroCard.prevVal !== 0
      ? {
          amount: heroCard.curr - heroCard.prevVal,
          pct: ((heroCard.curr - heroCard.prevVal) / Math.abs(heroCard.prevVal)) * 100,
        }
      : null;

  const chartData = buildChartData(snapshots);

  const pieData = latest
    ? ASSET_CATEGORIES.map((cat) => ({
        name: cat.label,
        color: cat.color,
        value: sumCategory(latest.data, `assets.${cat.key}`),
      })).filter((d) => d.value > 0)
    : [];

  const totalPieValue = pieData.reduce((s, d) => s + d.value, 0);

  const yearBands = chartData.reduce<{ year: string; start: string; end: string }[]>((bands, point) => {
    const year = point.month.slice(0, 2);
    if (bands.length === 0 || bands[bands.length - 1].year !== year) {
      bands.push({ year, start: point.month, end: point.month });
    } else {
      bands[bands.length - 1].end = point.month;
    }
    return bands;
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#191f28]">대시보드</h2>
      <p className="mt-1 text-sm text-[#8b95a1]">
        {latest ? `${latest.snapshot_month.slice(0, 7)} 스냅샷 기준` : "최신 스냅샷 기준"} 자산 현황
      </p>
      {activeGroup && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold"
          style={{ background: "rgba(100,168,255,0.15)", color: "#2272eb" }}>
          {activeGroup.type === "group" ? <Users size={11} /> : <User size={11} />}
          {activeGroup.name}
        </div>
      )}

      {/* 순자산 히어로 */}
      <div className="mt-6 rounded-xl bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8b95a1]">순자산</p>
        {!hasData ? (
          <p className="mt-1 text-[30px] font-bold text-[#e5e8eb]">{loading ? "..." : "—"}</p>
        ) : (
          <>
            <p className="mt-1 text-[30px] font-bold text-[#191f28] tabular-nums">{heroCard!.display}</p>
            {heroDiff && (
              <div className="mt-2">
                <DiffBadge amount={heroDiff.amount} pct={heroDiff.pct} isRatio={false} />
              </div>
            )}
          </>
        )}
      </div>

      {/* 보조 지표 */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {!hasData
          ? ["자기자본비율", "월소득", "월잉여금"].map((label) => (
              <div key={label} className="rounded-xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                <p className="text-xs font-medium text-[#8b95a1]">{label}</p>
                <p className="mt-2 text-[22px] font-bold text-[#e5e8eb]">{loading ? "..." : "—"}</p>
              </div>
            ))
          : cardDefs!.slice(1).map(({ label, curr, prevVal, display, isRatio }) => {
              const diff =
                prevVal !== undefined && prevVal !== 0
                  ? { amount: curr - prevVal, pct: ((curr - prevVal) / Math.abs(prevVal)) * 100 }
                  : null;
              return (
                <div key={label} className="rounded-xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                  <p className="text-xs font-medium text-[#8b95a1]">{label}</p>
                  <p className="mt-2 text-[22px] font-bold text-[#191f28] tabular-nums">{display}</p>
                  {diff && (
                    <div className="mt-1">
                      <DiffBadge amount={diff.amount} pct={diff.pct} isRatio={isRatio} />
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-semibold text-[#333d4b]">월별 순자산 구성</p>
          {hasData ? (
            <>
              <ResponsiveContainer width="100%" height={180} className="mt-3">
                <ComposedChart data={chartData} barCategoryGap="25%">
                  {yearBands.map((band, i) => (
                    <ReferenceArea key={band.year} x1={band.start} x2={band.end} fill={i % 2 === 0 ? "#f2f4f6" : "transparent"} strokeOpacity={0} />
                  ))}
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8b95a1" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#8b95a1" }}
                    tickFormatter={(v) => (v >= 10000 ? `${(v / 10000).toFixed(0)}억` : v.toLocaleString())}
                    width={52}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  {ASSET_CATEGORIES.map((cat) => (
                    <Bar key={cat.key} dataKey={cat.key} stackId="a" fill={cat.color} name={cat.label} />
                  ))}
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
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {ASSET_CATEGORIES.map((cat) => (
                  <span key={cat.key} className="flex items-center gap-1 text-xs text-[#8b95a1]">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.label}
                  </span>
                ))}
                <span className="flex items-center gap-1 text-xs text-[#8b95a1]">
                  <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: colors.primary[500] }} />
                  순자산
                </span>
              </div>
            </>
          ) : (
            <div className="mt-4 flex h-44 items-center justify-center text-sm text-[#D0D0D0]">
              {loading ? "불러오는 중..." : "스냅샷 데이터 없음"}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-semibold text-[#333d4b]">자산 구성</p>
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
                            <tspan x={vb.cx} dy="-8" fontSize="10" fill="#8b95a1">총 자산</tspan>
                            <tspan x={vb.cx} dy="17" fontSize="12" fontWeight="bold" fill="#191f28">
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
                  <div key={d.name} className="flex items-center justify-between text-xs text-[#8b95a1]">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-[#8b95a1]">{d.value.toLocaleString()}만</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 flex h-40 items-center justify-center text-sm text-[#D0D0D0]">
              {loading ? "불러오는 중..." : "스냅샷 데이터 없음"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
