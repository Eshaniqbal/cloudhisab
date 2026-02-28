"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { AuthGuard } from "@/components/AuthGuard";
import { LIST_EXPENSES } from "@/lib/graphql/queries";
import { ADD_EXPENSE, DELETE_EXPENSE } from "@/lib/graphql/mutations";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, X, Loader2, Wallet, TrendingDown, Trash2 } from "lucide-react";

const CATEGORIES = ["RENT", "SALARY", "ELECTRICITY", "TRANSPORT", "MARKETING", "MAINTENANCE", "PURCHASE", "OTHER"];
const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER"];

const CAT_COLORS: any = {
    RENT: "badge-red", SALARY: "badge-indigo", ELECTRICITY: "badge-yellow",
    TRANSPORT: "badge-green", MARKETING: "badge-indigo", MAINTENANCE: "badge-yellow",
    PURCHASE: "badge-red", OTHER: "badge-indigo",
};

function AddExpenseModal({ onClose, refetch, month }: any) {
    const [form, setForm] = useState({ amount: "", category: "RENT", description: "", date: new Date().toISOString().split("T")[0], paymentMethod: "CASH" });
    const [addExpense, { loading }] = useMutation<any, any>(ADD_EXPENSE);
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addExpense({ variables: { input: { ...form, amount: +form.amount } } } as any);
        await refetch();
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold">Add Expense</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="form-group">
                            <label>Amount (₹)</label>
                            <input type="number" step="0.01" className="input" placeholder="0.00" value={form.amount} onChange={e => set("amount", e.target.value)} required min="0.01" />
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <select className="input" value={form.category} onChange={e => set("category", e.target.value)}>
                                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group col-span-2">
                            <label>Description</label>
                            <input className="input" placeholder="e.g. Monthly shop rent" value={form.description} onChange={e => set("description", e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="date" className="input" value={form.date} onChange={e => set("date", e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Payment Method</label>
                            <select className="input" value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)}>
                                {PAYMENT_METHODS.map(m => <option key={m}>{m.replace("_", " ")}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            Add Expense
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ExpensesPage() {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [month, setMonth] = useState(currentMonth);
    const [modal, setModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; desc: string } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const { data, loading, refetch } = useQuery<any, any>(LIST_EXPENSES, {
        variables: { month },
        fetchPolicy: "cache-and-network",
    } as any);

    const expenses = data?.listExpenses?.items || [];
    const total = data?.listExpenses?.totalAmount || 0;
    const byCategory = data?.listExpenses?.byCategory || [];

    const [deleteExpense] = useMutation<any, any>(DELETE_EXPENSE);
    const handleDelete = (id: string, desc: string) => {
        setDeleteTarget({ id, desc });
    };
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteExpense({ variables: { expenseId: deleteTarget.id } } as any);
            refetch();
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    };

    return (
        <AuthGuard>
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Expense"
                message={`Remove "${deleteTarget?.desc}" from your records?`}
                confirmLabel="Yes, Delete"
                loading={deleteLoading}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Expenses</h1>
                        <p className="page-subtitle">Track your business costs</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="month" className="input w-40" value={month} onChange={e => setMonth(e.target.value)} />
                        <button className="btn btn-primary" onClick={() => setModal(true)}>
                            <Plus size={16} /> Add Expense
                        </button>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="stat-card col-span-2 lg:col-span-1">
                        <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total This Month</div>
                        <div className="text-2xl font-bold text-red-400 num">₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-slate-500 mt-1">{expenses.length} entries</div>
                    </div>
                    {byCategory.slice(0, 3).map((c: any) => (
                        <div key={c.category} className="stat-card">
                            <div className="text-xs text-slate-400 mb-1">{c.category}</div>
                            <div className="text-lg font-bold text-white num">₹{c.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                            <div className="text-xs text-slate-500">{c.count} entries</div>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Payment</th>
                                <th>Amount</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={5} className="text-center py-12 text-slate-500"><Loader2 size={20} className="animate-spin inline" /></td></tr>
                            )}
                            {!loading && expenses.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-16">
                                        <Wallet size={32} className="mx-auto text-slate-600 mb-2" />
                                        <p className="text-slate-500">No expenses recorded for {month}</p>
                                    </td>
                                </tr>
                            )}
                            {expenses.map((e: any) => (
                                <tr key={e.expenseId}>
                                    <td className="text-slate-400 text-xs">{e.date}</td>
                                    <td><span className={`badge ${CAT_COLORS[e.category] || "badge-indigo"}`}>{e.category}</span></td>
                                    <td className="text-white">{e.description}</td>
                                    <td className="text-slate-400 text-xs">{e.paymentMethod}</td>
                                    <td className="num font-semibold text-red-400">₹{e.amount.toFixed(2)}</td>
                                    <td>
                                        <button className="btn btn-danger px-2 py-1.5" onClick={() => handleDelete(e.expenseId, e.description)}>
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {expenses.length > 0 && (
                                <tr className="border-t border-indigo-500/20 bg-indigo-500/5">
                                    <td colSpan={5} className="text-right font-bold text-slate-300 py-3 pr-4">Total</td>
                                    <td className="num font-bold text-red-400 text-base">₹{total.toFixed(2)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {modal && <AddExpenseModal onClose={() => setModal(false)} refetch={refetch} month={month} />}
            </div>
        </AuthGuard>
    );
}
