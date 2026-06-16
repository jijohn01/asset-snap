"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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

const ASSET_LABELS: Record<string, string> = {
  cash_savings: "현금/저축",
  investments: "투자",
  insurance_pension: "보험/연금",
  real_estate: "부동산",
  personal_use: "개인사용자산",
};

const PIE_COLORS = ["#3182F6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

function sumValues(items: Record<string, number>) {
  return Object.values(items).reduce((s, v) => s + v, 0);
}

function fmt(val: number) {
  return val.toLocaleString() + "만원";
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

  const cards = [
    { label: "순자산", value: latest ? fmt(latest.metrics.net_worth) : "—" },
    { label: "자기자본비율", value: latest ? `${latest.metrics.equity_ratio}%` : "—" },
    { label: "월소득", value: latest ? fmt(latest.metrics.monthly_income) : "—" },
    { label: "월잉여금", value: latest ? fmt(latest.metrics.monthly_surplus) : "—" },
  ];

  const trendData = snapshots.map((s) => ({
    month: s.snapshot_month.slice(2, 4) + "." + s.snapshot_month.slice(5, 7),
    순자산: s.metrics.net_worth,
  }));

  const pieData = latest
    ? Object.entries(latest.data.assets)
        .map(([key, items]) => ({ name: ASSET_LABELS[key] ?? key, value: sumValues(items) }))
        .filter((d) => d.value > 0)
    : [];

  const hasData = !loading && snapshots.length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
      <p className="mt-1 text-sm text-gray-500">
        {latest ? `${latest.snapshot_month.slice(0, 7)} 스냅샷 기준` : "최신 스냅샷 기준"} 자산 현황
      </p>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {cards.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${hasData ? "text-gray-900" : "text-gray-300"}`}>
              {loading ? "—" : value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">순자산 트렌드</p>
          {hasData ? (
            <ResponsiveContainer width="100%" height={160} className="mt-4">
              <LineChart data={trendData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v.toLocaleString()} width={60} />
                <Tooltip formatter={(v: number) => [fmt(v), "순자산"]} />
                <Line type="monotone" dataKey="순자산" stroke="#3182F6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="mt-4 flex h-40 items-center justify-center text-sm text-gray-300">
              {loading ? "불러오는 중..." : "스냅샷 데이터 없음"}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">자산 구성</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160} className="mt-2">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [fmt(v)]} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
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
