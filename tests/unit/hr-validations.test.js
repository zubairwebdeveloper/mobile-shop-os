import { describe, expect, it } from "bun:test";
import { attendanceSheetSchema, commissionActionSchema, employeeSchema, leaveRequestSchema, monthSchema } from "../../src/lib/validations/hr.js";

const base = { name: "Bilal", branchId: "b1", joinDate: "2026-01-05" };
describe("hr validations", () => {
  it("employee defaults and limits", () => {
    const e = employeeSchema.parse(base);
    expect(e).toMatchObject({ commissionPercent: "0", status: "ACTIVE", monthlyTarget: "", phone: "" });
    expect(employeeSchema.safeParse({ ...base, commissionPercent: "25" }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...base, name: "B" }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...base, joinDate: "2026-02-30" }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...base, monthlyTarget: "5.5" }).success).toBe(false);
    expect(employeeSchema.parse({ ...base, memberUid: "" }).memberUid).toBeUndefined();
  });
  it("attendance sheet", () => {
    const ok = { branchId: "b1", date: "2026-11-05", entries: [{ employeeId: "e1", status: "PRESENT" }] };
    expect(attendanceSheetSchema.safeParse(ok).success).toBe(true);
    expect(attendanceSheetSchema.safeParse({ ...ok, entries: [] }).success).toBe(false);
    expect(attendanceSheetSchema.safeParse({ ...ok, entries: [{ employeeId: "e1", status: "SLEEPING" }] }).success).toBe(false);
  });
  it("leave, month, commission action", () => {
    expect(leaveRequestSchema.safeParse({ employeeId: "e1", type: "SICK", from: "2026-11-05", to: "2026-11-06" }).success).toBe(true);
    expect(leaveRequestSchema.safeParse({ employeeId: "e1", type: "HOLIDAY", from: "2026-11-05", to: "2026-11-06" }).success).toBe(false);
    expect(monthSchema.safeParse({ month: "2026-11" }).success).toBe(true);
    expect(monthSchema.safeParse({ month: "2026-00" }).success).toBe(false);
    expect(commissionActionSchema.safeParse({ action: "PAY", employeeId: "e1", month: "2026-11" }).success).toBe(false);
  });
});
