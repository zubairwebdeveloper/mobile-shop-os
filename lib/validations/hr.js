import { z } from "zod";
import { isSafeId } from "../security/ids.js";
import { isValidDateStr } from "../customers/pure.js";
import { ATTENDANCE_STATUSES, LEAVE_TYPES, isValidMonth, ratePercentToBps } from "../hr/pure.js";

const safeId = (label) => z.string().refine(isSafeId, `Invalid ${label}`);
const date = z.string().refine(isValidDateStr, "Use a real date (YYYY-MM-DD)");
const text = (max) => z.string().trim().max(max, `At most ${max} characters`).default("");
const rupeesOpt = z.string().trim().regex(/^\d{0,9}$/, "Whole rupees only").default("");

export const employeeSchema = z.object({
  name: z.string().trim().min(2, "Enter the name").max(80),
  phone: text(30),
  designation: text(60),
  branchId: safeId("branch"),
  memberUid: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(6).max(128).refine(isSafeId, "Invalid account").optional()),
  joinDate: date,
  commissionPercent: z.string().trim().default("0").refine((v) => ratePercentToBps(v) !== null, "Use 0 to 20, up to 2 decimals"),
  monthlyTarget: rupeesOpt,
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  note: text(300),
});

export const attendanceSheetSchema = z.object({
  branchId: safeId("branch"),
  date,
  entries: z.array(z.object({ employeeId: safeId("employee"), status: z.enum(ATTENDANCE_STATUSES), note: text(120) })).min(1, "Mark at least one person").max(100),
});

export const leaveRequestSchema = z.object({
  employeeId: safeId("employee"),
  type: z.enum(LEAVE_TYPES),
  from: date,
  to: date,
  reason: text(200),
});

export const leaveDecisionSchema = z.object({ decision: z.enum(["APPROVED", "REJECTED", "CANCELLED"]), note: text(200) });

export const monthSchema = z.object({ month: z.string().refine(isValidMonth, "Use YYYY-MM"), branchId: safeId("branch").optional() });

export const commissionActionSchema = z.object({ action: z.enum(["FINALIZE", "MARK_PAID"]), employeeId: safeId("employee"), month: z.string().refine(isValidMonth, "Use YYYY-MM") });

export const performanceSchema = z.object({ from: date, to: date, branchId: safeId("branch").optional() }).refine((v) => v.from <= v.to, "The start date must not be after the end date").refine(
  (v) => (Date.parse(v.to) - Date.parse(v.from)) / 86400000 <= 366, "Choose at most one year at a time");
