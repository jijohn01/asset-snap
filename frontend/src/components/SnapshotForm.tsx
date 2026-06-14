"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface UserItem {
  id: string;
  category: string;
  label: string;
  sort_order: number;
}

export type SnapshotDataPayload = {
  assets: Record<string, Record<string, number>>;
  liabilities: Record<string, Record<string, number>>;
  income: Record<string, Record<string, number>>;
  expenses: Record<string, Record<string, number>>;
};

export interface SnapshotFormProps {
  initialMonth: string;
  initialAmounts?: Record<string, string>;
  saveLabel: string;
  submitting: boolean;
  deleting?: boolean;
  error?: string | null;
  onSave: (month: string, data: SnapshotDataPayload) => void;
  onDelete?: () => void;
}

const SECTIONS = [
  {
    id: "assets",
    label: "자산",
    subcategories: [
      "assets.cash_savings",
      "assets.investments",
      "assets.insurance_pension",
      "assets.real_estate",
      "assets.personal_use",
    ],
  },
  {
    id: "liabilities",
    label: "부채",
    subcategories: ["liabilities.short_term", "liabilities.long_term"],
  },
  {
    id: "income",
    label: "소득",
    subcategories: [
      "income.employment",
      "income.business",
      "income.capital_gains",
      "income.interest_dividend",
      "income.rental",
      "income.pension_insurance",
      "income.other",
    ],
  },
  {
    id: "expenses",
    label: "지출",
    subcategories: [
      "expenses.savings_investment",
      "expenses.debt_repayment",
      "expenses.fixed_consumption",
      "expenses.variable_consumption",
    ],
  },
] as const;

const SUBCATEGORY_LABELS: Record<string, string> = {
  "assets.cash_savings": "현금/저축",
  "assets.investments": "투자",
  "assets.insurance_pension": "보험/연금",
  "assets.real_estate": "부동산",
  "assets.personal_use": "개인사용자산",
  "liabilities.short_term": "단기부채",
  "liabilities.long_term": "장기부채",
  "income.employment": "근로소득",
  "income.business": "사업소득",
  "income.capital_gains": "자본이득",
  "income.interest_dividend": "이자/배당",
  "income.rental": "임대소득",
  "income.pension_insurance": "연금/보험수령",
  "income.other": "기타소득",
  "expenses.savings_investment": "저축/투자",
  "expenses.debt_repayment": "부채상환",
  "expenses.fixed_consumption": "고정소비",
  "expenses.variable_consumption": "변동소비",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function sumItems(items: UserItem[], amounts: Record<string, string>) {
  return items.reduce((s, i) => s + (parseInt(amounts[i.id] ?? "0", 10) || 0), 0);
}

function fmt(val: number) {
  return val.toLocaleString();
}

export default function SnapshotForm({
  initialMonth,
  initialAmounts = {},
  saveLabel,
  submitting,
  deleting,
  error,
  onSave,
  onDelete,
}: SnapshotFormProps) {
  const [items, setItems] = useState<UserItem[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>(initialAmounts);
  const [month, setMonth] = useState(initialMonth);
  const [loadingItems, setLoadingItems] = useState(true);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const newLabelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/user-items/`)
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoadingItems(false));
  }, []);

  useEffect(() => {
    if (addingCategory) newLabelInputRef.current?.focus();
  }, [addingCategory]);

  async function handleDeleteItem(id: string) {
    await fetch(`${API_URL}/api/v1/user-items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setAmounts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function confirmAddItem() {
    if (!addingCategory || !newLabel.trim()) {
      setAddingCategory(null);
      setNewLabel("");
      return;
    }
    const maxOrder = Math.max(
      0,
      ...items.filter((i) => i.category === addingCategory).map((i) => i.sort_order),
    );
    const res = await fetch(`${API_URL}/api/v1/user-items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: addingCategory, label: newLabel.trim(), sort_order: maxOrder + 1 }),
    });
    if (res.ok) {
      const created: UserItem = await res.json();
      setItems((prev) => [...prev, created]);
    }
    setAddingCategory(null);
    setNewLabel("");
  }

  function handleSave() {
    const data: SnapshotDataPayload = { assets: {}, liabilities: {}, income: {}, expenses: {} };
    for (const item of items) {
      const [section, subcategory] = item.category.split(".");
      const val = parseInt(amounts[item.id] ?? "0", 10);
      if (!isNaN(val) && val > 0) {
        const s = section as keyof SnapshotDataPayload;
        if (!data[s][subcategory]) data[s][subcategory] = {};
        data[s][subcategory][item.id] = val;
      }
    }
    onSave(month, data);
  }

  // 요약 계산
  const totalAssets = sumItems(items.filter((i) => i.category.startsWith("assets.")), amounts);
  const totalLiabilities = sumItems(items.filter((i) => i.category.startsWith("liabilities.")), amounts);
  const netWorth = totalAssets - totalLiabilities;
  const totalIncome = sumItems(items.filter((i) => i.category.startsWith("income.")), amounts);
  const totalExpenses = sumItems(items.filter((i) => i.category.startsWith("expenses.")), amounts);
  const surplus = totalIncome - totalExpenses;

  function renderSection(sectionIdx: number) {
    const section = SECTIONS[sectionIdx];
    const sectionItems = items.filter((i) => i.category.startsWith(section.id + "."));
    const sectionTotal = sumItems(sectionItems, amounts);

    return (
      <div key={section.id}>
        {/* 섹션 헤더 */}
        <div className="flex items-center justify-between border border-gray-300 bg-gray-100 px-3 py-2">
          <span className="text-sm font-bold text-gray-800">{section.label}</span>
          <span className="text-sm font-semibold text-gray-600">{fmt(sectionTotal)} 만원</span>
        </div>

        {section.subcategories.map((cat) => {
          const catItems = items
            .filter((i) => i.category === cat)
            .sort((a, b) => a.sort_order - b.sort_order);
          const catTotal = sumItems(catItems, amounts);

          return (
            <div key={cat}>
              {/* 소분류 헤더 */}
              <div className="flex items-center justify-between border-x border-b border-gray-200 bg-gray-50 px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {SUBCATEGORY_LABELS[cat]}
                </span>
                <span className="text-xs text-gray-400">{catTotal > 0 ? fmt(catTotal) : "—"}</span>
              </div>

              {/* 항목 행 */}
              {catItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center border-x border-b border-gray-200 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="shrink-0 px-2 py-2 text-gray-300 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                  <span className="flex-1 py-2 pr-2 text-sm text-gray-700">{item.label}</span>
                  <div className="flex items-center gap-1 pr-3">
                    <input
                      type="number"
                      min={0}
                      value={amounts[item.id] ?? ""}
                      onChange={(e) =>
                        setAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="0"
                      className="w-28 bg-transparent py-1.5 text-right text-sm focus:bg-indigo-50 focus:outline-none"
                    />
                    <span className="shrink-0 text-xs text-gray-400">만원</span>
                  </div>
                </div>
              ))}

              {/* 항목 추가 행 */}
              {addingCategory === cat ? (
                <div className="flex items-center gap-2 border-x border-b border-indigo-300 bg-indigo-50 px-3 py-1.5">
                  <input
                    ref={newLabelInputRef}
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmAddItem();
                      if (e.key === "Escape") { setAddingCategory(null); setNewLabel(""); }
                    }}
                    placeholder="항목 이름"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <button onClick={confirmAddItem} className="text-xs font-medium text-indigo-600">확인</button>
                  <button onClick={() => { setAddingCategory(null); setNewLabel(""); }} className="text-xs text-gray-400">취소</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCategory(cat)}
                  className="w-full border-x border-b border-gray-200 px-8 py-1.5 text-left text-xs text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  + 항목 추가
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {/* 기준 월 */}
      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">기준 월</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {loadingItems ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : (
        <>
          {/* 2열 그리드 */}
          <div className="grid grid-cols-2 gap-5">
            {/* 왼쪽: 자산 + 부채 */}
            <div className="space-y-4">
              {renderSection(0)}
              {renderSection(1)}
              <div className="flex items-center justify-between rounded bg-indigo-50 px-3 py-2.5 text-sm font-semibold">
                <span className="text-indigo-700">순자산</span>
                <span className={netWorth >= 0 ? "text-indigo-700" : "text-red-600"}>
                  {fmt(netWorth)} 만원
                </span>
              </div>
            </div>

            {/* 오른쪽: 소득 + 지출 */}
            <div className="space-y-4">
              {renderSection(2)}
              {renderSection(3)}
              <div className="flex items-center justify-between rounded bg-emerald-50 px-3 py-2.5 text-sm font-semibold">
                <span className="text-emerald-700">월잉여금</span>
                <span className={surplus >= 0 ? "text-emerald-700" : "text-red-600"}>
                  {fmt(surplus)} 만원
                </span>
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          {/* 액션 버튼 */}
          <div className="mt-6 flex items-center justify-between">
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : "스냅샷 삭제"}
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "저장 중..." : saveLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
