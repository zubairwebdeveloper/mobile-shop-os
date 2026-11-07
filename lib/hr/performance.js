import "server-only";
import { periodWindow, windowDocs } from "@/lib/finance/data";
import { col, iso } from "@/lib/inventory/common";
import { listBranches } from "@/lib/tenant/branches";
import { listEmployees } from "./employees";
import { branchPerformance, commissionFor, monthRange, salesByEmployee, targetProgress } from "./pure";

/**
 * Staff and branch performance (employees:read). Sales are credited to the team member who rang them up (sale.createdBy), through the
 * employee record linked to that account. Returns are charged back to the ORIGINAL sale, even if processed later. Values are net sales
 * without tax. Profit is deliberately not shown here (purchase cost is private; see Finance).
 */

export async function employeePerformance(ctx, { from, to, branchId }) {
  const { start, end } = await periodWindow(ctx, { from, to });
  const [employees, saleDocs] = await Promise.all([listEmployees(ctx, { branchId }), windowDocs(ctx, "sales", "createdAt", start, end, branchId)]);
  const byUid = new Map(employees.filter((e) => e.memberUid).map((e) => [e.memberUid, e.id]));
  const totals = salesByEmployee(saleDocs.map((d) => d.data()), byUid);
  const month = monthRange(from.slice(0, 7));
  const isFullMonth = from === month.from && to === month.to;
  const rows = employees.map((e) => {
    const t = totals.get(e.id) ?? { salesCount: 0, netSales: 0 };
    return {
      employeeId: e.id, name: e.name, designation: e.designation, branchId: e.branchId, status: e.status, linked: Boolean(e.memberUid),
      salesCount: t.salesCount, netSales: t.netSales, monthlyTarget: e.monthlyTarget, targetPercent: isFullMonth ? targetProgress(t.netSales, e.monthlyTarget) : null,
      commissionBps: e.commissionBps, commissionPreview: commissionFor(t.netSales, e.commissionBps),
    };
  }).sort((a, b) => b.netSales - a.netSales);
  const unlinked = totals.get("unlinked") ?? { salesCount: 0, netSales: 0 };
  return { period: { from, to, isFullMonth }, rows, unlinked };
}

/** Sales of one employee for a period (used to finalise commission from the server's own data). */
export async function netSalesOf(ctx, employee, { from, to }) {
  if (!employee.memberUid) return { salesCount: 0, netSales: 0 };
  const { start, end } = await periodWindow(ctx, { from, to });
  const docs = await windowDocs(ctx, "sales", "createdAt", start, end, employee.branchId);
  return salesByEmployee(docs.map((d) => d.data()).filter((s) => s.createdBy === employee.memberUid), new Map([[employee.memberUid, employee.id]])).get(employee.id) ?? { salesCount: 0, netSales: 0 };
}

export async function branchAnalytics(ctx, { from, to, branchId }) {
  const { start, end } = await periodWindow(ctx, { from, to });
  const [sales, returns, repairs, attendance, branches] = await Promise.all([
    windowDocs(ctx, "sales", "createdAt", start, end, branchId),
    windowDocs(ctx, "returns", "createdAt", start, end, branchId, { cap: 2000 }),
    windowDocs(ctx, "repairJobs", "deliveredAt", start, end, branchId, { cap: 2000 }),
    windowDocs(ctx, "attendance", "date", from, to, branchId, { inclusive: true }),
    listBranches(ctx),
  ]);
  const group = (docs) => docs.reduce((m, d) => m.set(d.data().branchId, [...(m.get(d.data().branchId) ?? []), d.data()]), new Map());
  const [s, r, rp, a] = [sales, returns, repairs, attendance].map(group);
  const ids = [...new Set([...s.keys(), ...r.keys(), ...rp.keys(), ...a.keys()])];
  const names = new Map(branches.map((b) => [b.id, b.name]));
  const rows = ids.map((id) => ({
    branchId: id, branchName: names.get(id) ?? id,
    ...branchPerformance({ sales: s.get(id), returns: r.get(id), repairs: rp.get(id), attendance: a.get(id) }),
  })).sort((x, y) => y.netSales - x.netSales);
  return { period: { from, to }, rows };
}

/** Recent actions by the team member linked to an employee (audit:read only). Action names and targets, no amounts. */
export async function employeeActivity(ctx, employee, limit = 50) {
  if (!employee.memberUid) return [];
  const snap = await col(ctx, "auditLogs").where("actorUid", "==", employee.memberUid).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, action: d.data().action, targetType: d.data().targetType ?? "", targetId: d.data().targetId ?? "", createdAt: iso(d.data().createdAt) }));
}
