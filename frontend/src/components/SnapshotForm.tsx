"use client";

import { useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { type SnapshotData, type SnapshotItem } from "@/lib/api";

export type { SnapshotData };

export interface SnapshotFormProps {
  initialMonth: string;
  initialData?: SnapshotData;
  saveLabel: string;
  submitting: boolean;
  deleting?: boolean;
  error?: string | null;
  onSave: (month: string, data: SnapshotData) => void;
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

const SECTION_COLORS: Record<string, { header: string; headerText: string; sub: string; subText: string }> = {
  assets:      { header: "bg-[#111111]", headerText: "text-white", sub: "bg-[#F5F5F7]", subText: "text-[#6B6B6B]" },
  liabilities: { header: "bg-[#111111]", headerText: "text-white", sub: "bg-[#F5F5F7]", subText: "text-[#6B6B6B]" },
  income:      { header: "bg-[#111111]", headerText: "text-white", sub: "bg-[#F5F5F7]", subText: "text-[#6B6B6B]" },
  expenses:    { header: "bg-[#111111]", headerText: "text-white", sub: "bg-[#F5F5F7]", subText: "text-[#6B6B6B]" },
};

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

function fmt(val: number) {
  return val.toLocaleString();
}

function sumByCategory(data: SnapshotData, prefix: string): number {
  return Object.values(data)
    .filter((item) => item.category.startsWith(prefix))
    .reduce((s, item) => s + item.amount, 0);
}

export default function SnapshotForm({
  initialMonth,
  initialData = {},
  saveLabel,
  submitting,
  deleting,
  error,
  onSave,
  onDelete,
}: SnapshotFormProps) {
  const [data, setData] = useState<SnapshotData>(initialData);
  const [month, setMonth] = useState(initialMonth);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const newLabelInputRef = useRef<HTMLInputElement>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoValue, setMemoValue] = useState("");
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  function setAmount(itemId: string, raw: string) {
    const amount = parseInt(raw, 10) || 0;
    setData((prev) => ({ ...prev, [itemId]: { ...prev[itemId], amount } }));
  }

  function saveMemo(itemId: string) {
    setEditingMemoId(null);
    setData((prev) => ({ ...prev, [itemId]: { ...prev[itemId], memo: memoValue } }));
  }

  function handleDrop(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    setData((prev) => {
      const dragged = prev[draggedId];
      const target = prev[targetId];
      if (!dragged || !target || dragged.category !== target.category) return prev;
      const catItems = Object.entries(prev)
        .filter(([, item]) => item.category === dragged.category)
        .sort(([, a], [, b]) => a.sort_order - b.sort_order);
      const draggedIdx = catItems.findIndex(([id]) => id === draggedId);
      const targetIdx = catItems.findIndex(([id]) => id === targetId);
      const reordered = [...catItems];
      const [removed] = reordered.splice(draggedIdx, 1);
      reordered.splice(targetIdx, 0, removed);
      const updated = { ...prev };
      reordered.forEach(([id], i) => {
        updated[id] = { ...updated[id], sort_order: i };
      });
      return updated;
    });
    setDragItemId(null);
    setDragOverItemId(null);
  }

  function handleDeleteItem(itemId: string) {
    setData((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  function confirmAddItem() {
    if (!addingCategory || !newLabel.trim()) {
      setAddingCategory(null);
      setNewLabel("");
      return;
    }
    const catItems = Object.values(data).filter((i) => i.category === addingCategory);
    const maxOrder = catItems.length > 0 ? Math.max(...catItems.map((i) => i.sort_order)) : -1;
    const newId = crypto.randomUUID();
    setData((prev) => ({
      ...prev,
      [newId]: {
        label: newLabel.trim(),
        category: addingCategory,
        sort_order: maxOrder + 1,
        memo: "",
        amount: 0,
      },
    }));
    setAddingCategory(null);
    setNewLabel("");
  }

  function handleSave() {
    // amount=0인 항목 제외
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([, item]) => item.amount > 0),
    );
    onSave(month, filtered);
  }

  const totalAssets = sumByCategory(data, "assets.");
  const totalLiabilities = sumByCategory(data, "liabilities.");
  const netWorth = totalAssets - totalLiabilities;
  const totalIncome = sumByCategory(data, "income.");
  const totalExpenses = sumByCategory(data, "expenses.");
  const surplus = totalIncome - totalExpenses;

  function renderSection(sectionIdx: number) {
    const section = SECTIONS[sectionIdx];
    const colors = SECTION_COLORS[section.id];
    const sectionTotal = sumByCategory(data, section.id + ".");

    return (
      <div key={section.id}>
        <div className={`flex items-center justify-between border border-[#E4E4E7] px-3 py-2 ${colors.header}`}>
          <span className={`text-sm font-bold ${colors.headerText}`}>{section.label}</span>
          <span className={`text-sm font-semibold ${colors.headerText}`}>{fmt(sectionTotal)} 만원</span>
        </div>

        {section.subcategories.map((cat) => {
          const catItems = Object.entries(data)
            .filter(([, item]) => item.category === cat)
            .sort(([, a], [, b]) => a.sort_order - b.sort_order);
          const catTotal = catItems.reduce((s, [, item]) => s + item.amount, 0);

          return (
            <div key={cat}>
              <div className={`flex items-center justify-between border-x border-b border-[#E4E4E7] px-3 py-1.5 ${colors.sub}`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${colors.subText}`}>
                  {SUBCATEGORY_LABELS[cat]}
                </span>
                <span className={`text-xs ${colors.subText}`}>{catTotal > 0 ? fmt(catTotal) : "—"}</span>
              </div>

              {catItems.map(([itemId, item], idx) => (
                <div
                  key={itemId}
                  onDragOver={(e) => { e.preventDefault(); setDragOverItemId(itemId); }}
                  onDrop={(e) => { e.preventDefault(); dragItemId && handleDrop(dragItemId, itemId); }}
                  className={`flex items-center border-x border-b border-[#E4E4E7] ${idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"} ${dragOverItemId === itemId && dragItemId !== itemId ? "border-t-2 border-t-primary-400" : ""}`}
                >
                  <div
                    draggable
                    onDragStart={(e) => { setDragItemId(itemId); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragItemId(null); setDragOverItemId(null); }}
                    className="shrink-0 cursor-grab px-1 py-2.5 text-gray-300 hover:text-gray-400 active:cursor-grabbing"
                  >
                    <GripVertical size={12} />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(itemId)}
                    className="shrink-0 self-start px-1 pt-2.5 text-gray-300 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                  <div className="flex flex-1 flex-col py-1.5 pr-2">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    {editingMemoId === itemId ? (
                      <input
                        type="text"
                        autoFocus
                        value={memoValue}
                        onChange={(e) => setMemoValue(e.target.value)}
                        onBlur={() => saveMemo(itemId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveMemo(itemId);
                          if (e.key === "Escape") setEditingMemoId(null);
                        }}
                        placeholder="메모 입력"
                        className="mt-0.5 w-full bg-transparent text-xs text-gray-400 focus:outline-none focus:text-gray-600"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingMemoId(itemId); setMemoValue(item.memo ?? ""); }}
                        className="mt-0.5 text-left text-xs text-gray-400 hover:text-gray-600"
                      >
                        {item.memo ? item.memo : <span className="text-gray-300">+ 메모</span>}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 pr-3">
                    <input
                      type="number"
                      min={0}
                      value={item.amount || ""}
                      onChange={(e) => setAmount(itemId, e.target.value)}
                      placeholder="0"
                      className="w-28 bg-transparent py-1.5 text-right text-sm focus:bg-[#F5F5F7] focus:outline-none"
                    />
                    <span className="shrink-0 text-xs text-gray-400">만원</span>
                  </div>
                </div>
              ))}

              {addingCategory === cat ? (
                <div className="flex items-center gap-2 border-x border-b border-[#E4E4E7] bg-[#F5F5F7] px-3 py-1.5">
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
                    autoFocus
                  />
                  <button onClick={confirmAddItem} className="text-xs font-medium text-primary-600">확인</button>
                  <button onClick={() => { setAddingCategory(null); setNewLabel(""); }} className="text-xs text-gray-400">취소</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCategory(cat)}
                  className="w-full border-x border-b border-[#E4E4E7] px-8 py-1.5 text-left text-xs text-[#AAAAAA] hover:bg-[#F5F5F7] hover:text-primary-600"
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
      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-medium text-[#6B6B6B]">기준 월</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-[#E4E4E7] px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-4">
          {renderSection(0)}
          {renderSection(1)}
          <div className="flex items-center justify-between rounded border border-[#E4E4E7] bg-[#F5F5F7] px-3 py-2.5 text-sm font-semibold">
            <span className="text-[#6B6B6B]">순자산</span>
            <span className={netWorth >= 0 ? "text-[#111111]" : "text-negative"}>
              {fmt(netWorth)} 만원
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {renderSection(2)}
          {renderSection(3)}
          <div className="flex items-center justify-between rounded border border-[#E4E4E7] bg-[#F5F5F7] px-3 py-2.5 text-sm font-semibold">
            <span className="text-[#6B6B6B]">월잉여금</span>
            <span className={surplus >= 0 ? "text-positive" : "text-negative"}>
              {fmt(surplus)} 만원
            </span>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

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
          className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {submitting ? "저장 중..." : saveLabel}
        </button>
      </div>
    </div>
  );
}
