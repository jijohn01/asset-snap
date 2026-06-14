"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserItem {
  id: string;
  category: string;
  label: string;
  sort_order: number;
}

const STEPS = ["자산", "부채", "소득", "지출"];

const STEP_CATEGORIES: string[][] = [
  ["assets.cash_savings", "assets.investments", "assets.insurance_pension", "assets.real_estate", "assets.personal_use"],
  ["liabilities.short_term", "liabilities.long_term"],
  ["income.employment", "income.business", "income.capital_gains", "income.interest_dividend", "income.rental", "income.pension_insurance", "income.other"],
  ["expenses.savings_investment", "expenses.debt_repayment", "expenses.fixed_consumption", "expenses.variable_consumption"],
];

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

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SnapshotNewPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<UserItem[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [month, setMonth] = useState(currentMonth);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 항목 추가 상태
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const newLabelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/user-items/`)
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setError("항목을 불러오지 못했습니다."));
  }, []);

  useEffect(() => {
    if (addingCategory) newLabelInputRef.current?.focus();
  }, [addingCategory]);

  const grouped = STEP_CATEGORIES[step].reduce<Record<string, UserItem[]>>((acc, cat) => {
    const catItems = items
      .filter((i) => i.category === cat)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (catItems.length > 0 || true) acc[cat] = catItems; // 항목 없어도 카테고리 표시
    return acc;
  }, {});

  function handleAmountChange(id: string, value: string) {
    setAmounts((prev) => ({ ...prev, [id]: value }));
  }

  function startAdding(category: string) {
    setAddingCategory(category);
    setNewLabel("");
  }

  function cancelAdding() {
    setAddingCategory(null);
    setNewLabel("");
  }

  async function handleDeleteItem(id: string) {
    try {
      await fetch(`${API_URL}/api/v1/user-items/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      setAmounts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      // 삭제 실패 무시
    }
  }

  async function confirmAddItem() {
    if (!addingCategory || !newLabel.trim()) {
      cancelAdding();
      return;
    }

    const maxOrder = Math.max(
      0,
      ...items.filter((i) => i.category === addingCategory).map((i) => i.sort_order),
    );

    try {
      const res = await fetch(`${API_URL}/api/v1/user-items/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: addingCategory,
          label: newLabel.trim(),
          sort_order: maxOrder + 1,
        }),
      });
      if (res.ok) {
        const created: UserItem = await res.json();
        setItems((prev) => [...prev, created]);
      }
    } catch {
      // 생성 실패해도 UI는 닫기
    }
    cancelAdding();
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const data: Record<string, Record<string, Record<string, number>>> = {
        assets: {},
        liabilities: {},
        income: {},
        expenses: {},
      };

      for (const item of items) {
        const [section, subcategory] = item.category.split(".");
        const val = parseInt(amounts[item.id] ?? "0", 10);
        if (!isNaN(val) && val > 0) {
          if (!data[section][subcategory]) data[section][subcategory] = {};
          data[section][subcategory][item.id] = val;
        }
      }

      const res = await fetch(`${API_URL}/api/v1/snapshots/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot_month: `${month}-01`, data }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        setError("저장에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;
  const isLoading = items.length === 0 && !error;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">스냅샷 입력</h2>
      <p className="mt-1 text-sm text-gray-500">이번 달 자산 현황을 입력하세요</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Step indicator */}
        <div className="flex items-center gap-8 text-sm">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={
                i === step
                  ? "font-semibold text-indigo-600"
                  : i < step
                    ? "text-gray-400"
                    : "text-gray-300"
              }
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {/* Month picker — first step only */}
        {step === 0 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">
              기준 월
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="ml-3 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
          </div>
        )}

        {/* Item inputs */}
        <div className="mt-6 space-y-8">
          {isLoading && <p className="text-sm text-gray-400">불러오는 중...</p>}

          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {SUBCATEGORY_LABELS[cat]}
              </h3>

              <div className="mt-2 space-y-2">
                {catItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="rounded p-0.5 text-gray-300 hover:bg-red-50 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={amounts[item.id] ?? ""}
                        onChange={(e) => handleAmountChange(item.id, e.target.value)}
                        placeholder="0"
                        className="w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-right text-sm focus:border-indigo-500 focus:outline-none"
                      />
                      <span className="w-8 text-sm text-gray-400">만원</span>
                    </div>
                  </div>
                ))}

                {/* 항목 추가 인라인 입력 */}
                {addingCategory === cat ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={newLabelInputRef}
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmAddItem();
                        if (e.key === "Escape") cancelAdding();
                      }}
                      placeholder="항목 이름"
                      className="flex-1 rounded-lg border border-indigo-400 px-3 py-1.5 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={confirmAddItem}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      확인
                    </button>
                    <button
                      type="button"
                      onClick={cancelAdding}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startAdding(cat)}
                    className="mt-1 text-xs text-indigo-500 hover:text-indigo-700"
                  >
                    + 항목 추가
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          >
            이전
          </button>
          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              다음
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
