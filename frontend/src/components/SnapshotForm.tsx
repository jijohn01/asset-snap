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
  assets:      { header: "bg-[#191f28]", headerText: "text-white", sub: "bg-[#f2f4f6]", subText: "text-[#6b7684]" },
  liabilities: { header: "bg-[#191f28]", headerText: "text-white", sub: "bg-[#f2f4f6]", subText: "text-[#6b7684]" },
  income:      { header: "bg-[#191f28]", headerText: "text-white", sub: "bg-[#f2f4f6]", subText: "text-[#6b7684]" },
  expenses:    { header: "bg-[#191f28]", headerText: "text-white", sub: "bg-[#f2f4f6]", subText: "text-[#6b7684]" },
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
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);

  function setAmount(itemId: string, raw: string) {
    const amount = parseInt(raw, 10) || 0;
    setData((prev) => ({ ...prev, [itemId]: { ...prev[itemId], amount } }));
  }

  function saveMemo(itemId: string) {
    setEditingMemoId(null);
    setData((prev) => ({ ...prev, [itemId]: { ...prev[itemId], memo: memoValue } }));
  }

  function clearDragState() {
    setDragItemId(null);
    setDragOverItemId(null);
    setDragOverCat(null);
  }

  function handleDrop(draggedId: string, targetId: string) {
    if (draggedId === targetId) { clearDragState(); return; }
    setData((prev) => {
      const dragged = prev[draggedId];
      const target = prev[targetId];
      if (!dragged || !target) return prev;
      const newCat = target.category;
      const oldCat = dragged.category;
      const without = { ...prev };
      delete without[draggedId];
      if (oldCat !== newCat) {
        Object.entries(without)
          .filter(([, item]) => item.category === oldCat)
          .sort(([, a], [, b]) => a.sort_order - b.sort_order)
          .forEach(([id], i) => { without[id] = { ...without[id], sort_order: i }; });
      }
      const newCatItems = Object.entries(without)
        .filter(([, item]) => item.category === newCat)
        .sort(([, a], [, b]) => a.sort_order - b.sort_order);
      const targetIdx = newCatItems.findIndex(([id]) => id === targetId);
      newCatItems.splice(targetIdx, 0, [draggedId, { ...dragged, category: newCat }]);
      const updated = { ...without };
      newCatItems.forEach(([id, item], i) => { updated[id] = { ...item, sort_order: i }; });
      return updated;
    });
    clearDragState();
  }

  function handleDropOnCat(draggedId: string, cat: string) {
    setData((prev) => {
      const dragged = prev[draggedId];
      if (!dragged) return prev;
      const oldCat = dragged.category;
      const without = { ...prev };
      delete without[draggedId];
      if (oldCat !== cat) {
        Object.entries(without)
          .filter(([, item]) => item.category === oldCat)
          .sort(([, a], [, b]) => a.sort_order - b.sort_order)
          .forEach(([id], i) => { without[id] = { ...without[id], sort_order: i }; });
      }
      const catItems = Object.values(without).filter((item) => item.category === cat);
      const maxOrder = catItems.length > 0 ? Math.max(...catItems.map((item) => item.sort_order)) : -1;
      return { ...without, [draggedId]: { ...dragged, category: cat, sort_order: maxOrder + 1 } };
    });
    clearDragState();
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
        <div className={`flex items-center justify-between border border-[#e5e8eb] px-3 py-2 ${colors.header}`}>
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
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOverCat(cat); setDragOverItemId(null); }}
                onDrop={(e) => { e.preventDefault(); dragItemId && handleDropOnCat(dragItemId, cat); }}
                onDragLeave={() => setDragOverCat(null)}
                className={`flex items-center justify-between border-x border-b border-[#e5e8eb] px-3 py-1.5 ${colors.sub} ${dragOverCat === cat && dragItemId ? "ring-2 ring-inset ring-primary-400" : ""}`}
              >
                <span className={`text-xs font-semibold uppercase tracking-wide ${colors.subText}`}>
                  {SUBCATEGORY_LABELS[cat]}
                </span>
                <span className={`text-xs ${colors.subText}`}>{catTotal > 0 ? fmt(catTotal) : "—"}</span>
              </div>

              {catItems.map(([itemId, item], idx) => (
                <div
                  key={itemId}
                  onDragOver={(e) => { e.preventDefault(); setDragOverItemId(itemId); setDragOverCat(null); }}
                  onDrop={(e) => { e.preventDefault(); dragItemId && handleDrop(dragItemId, itemId); }}
                  className={`flex items-center border-x border-b border-[#e5e8eb] ${idx % 2 === 0 ? "bg-white" : "bg-[#f2f4f6]"} ${dragOverItemId === itemId && dragItemId !== itemId ? "border-t-2 border-t-primary-400" : ""}`}
                >
                  <div
                    draggable
                    onDragStart={(e) => { setDragItemId(itemId); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={clearDragState}
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
                      className="w-28 bg-transparent py-1.5 text-right text-sm focus:bg-[#f2f4f6] focus:outline-none"
                    />
                    <span className="shrink-0 text-xs text-gray-400">만원</span>
                  </div>
                </div>
              ))}

              {addingCategory === cat ? (
                <div className="flex items-center gap-2 border-x border-b border-[#e5e8eb] bg-[#f2f4f6] px-3 py-1.5">
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
                  className="w-full border-x border-b border-[#e5e8eb] px-8 py-1.5 text-left text-xs text-[#AAAAAA] hover:bg-[#f2f4f6] hover:text-primary-600"
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
        <label className="text-sm font-medium text-[#8b95a1]">기준 월</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-3 py-1.5 text-sm text-[#333d4b] focus:border-[#3182f6] focus:outline-none transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-4">
          {renderSection(0)}
          {renderSection(1)}
          <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-bold shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[#8b95a1]">순자산</span>
            <span className={netWorth >= 0 ? "text-[#191f28]" : "text-negative"}>
              {fmt(netWorth)} 만원
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {renderSection(2)}
          {renderSection(3)}
          <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-bold shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <span className="text-[#8b95a1]">월잉여금</span>
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
            className="rounded-2xl bg-[rgba(240,68,82,0.08)] px-4 py-2.5 text-sm font-semibold text-[#f04452] hover:bg-[rgba(240,68,82,0.15)] disabled:opacity-40 transition-colors"
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
          className="rounded-2xl bg-[#3182f6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2272eb] disabled:opacity-40 transition-colors"
        >
          {submitting ? "저장 중..." : saveLabel}
        </button>
      </div>
    </div>
  );
}
