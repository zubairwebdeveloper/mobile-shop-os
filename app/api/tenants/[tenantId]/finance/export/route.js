import { PERMISSIONS } from "@/lib/permissions/matrix";
import { badRequest } from "@/lib/security/errors";
import { route } from "@/lib/security/http";
import { requireTenantAccess } from "@/lib/tenant/context";
import { windowDocs, periodWindow } from "@/lib/finance/data";
import { financeReport } from "@/lib/finance/reports";
import { toCsv } from "@/lib/finance/pure";
import { periodSchema } from "@/lib/validations/finance";

export const runtime = "nodejs";

const pkr = (paisa) => (paisa / 100).toFixed(0);
const csv = (name, body) => new Response(`﻿${body}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" } });

/** CSV export (finance:read). type = expenses | payments | report. Amounts are whole rupees. Cells that could run as spreadsheet formulas are neutralised. */
export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.FINANCE_READ });
  const q = new URL(request.url).searchParams;
  const type = q.get("type");
  const period = periodSchema.parse({ from: q.get("from"), to: q.get("to"), branchId: q.get("branchId") ?? undefined });
  const name = `${type}-${period.from}-to-${period.to}.csv`;

  if (type === "expenses") {
    const docs = await windowDocs(ctx, "expenses", "date", period.from, period.to, period.branchId, { inclusive: true, cap: 2000 });
    const rows = docs.map((d) => d.data()).sort((a, b) => a.date.localeCompare(b.date)).map((e) => [e.number, e.date, e.branchName, e.category, pkr(e.amount), e.method, e.paidTo, e.note, e.status, e.voidReason ?? ""]);
    return csv(name, toCsv(["Number", "Date", "Branch", "Category", "Amount (PKR)", "Method", "Paid to", "Note", "Status", "Void reason"], rows));
  }
  if (type === "payments") {
    const { start, end } = await periodWindow(ctx, period);
    const docs = await windowDocs(ctx, "payments", "createdAt", start, end, period.branchId);
    const rows = docs.map((d) => d.data()).map((p) => [p.number, p.createdAt?.toDate?.().toISOString() ?? "", p.targetNumber, p.customerName, p.customerPhone, pkr(p.amount), p.method, p.reference, pkr(p.balanceAfter ?? 0)]);
    return csv(name, toCsv(["Receipt", "Received at (UTC)", "For", "Customer", "Phone", "Amount (PKR)", "Method", "Reference", "Balance after (PKR)"], rows));
  }
  if (type === "report") {
    const r = await financeReport(ctx, period);
    const lines = [
      ["Net sales", r.revenue.netSales], ["Repair revenue", r.revenue.repairRevenue], ["Total revenue", r.revenue.total], ["Tax collected (not revenue)", r.revenue.taxCollected],
      ["Cost of goods sold", r.costs.cogs], ["Repair parts cost", r.costs.repairPartsCost], ["Gross profit", r.grossProfit], ["Expenses", r.expenses.total], ["Net profit", r.netProfit],
      ["Net cash movement", r.cash.netTotal], ["Receivables now", r.position.receivables.total], ["Supplier payables now", r.position.payables.total],
    ].map(([label, v]) => [label, pkr(v)]);
    return csv(name, toCsv(["Line", "PKR"], [["Period", `${period.from} to ${period.to}`], ...lines]));
  }
  throw badRequest("Unknown export type.");
});
