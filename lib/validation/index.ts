import { z } from "zod";

/** Any 8-4-4-4-12 hex GUID (Postgres uuid accepts all variants). */
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = (msg = "Invalid id") => z.string().regex(UUID_RE, msg);

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(255);

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(72)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+0-9 ()-]*$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

export const propertySchema = z.object({
  name: z.string().trim().min(2).max(150),
  addressLine1: z.string().trim().min(2).max(200),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const buildingSchema = z.object({
  propertyId: uuid(),
  name: z.string().trim().min(1).max(150),
  floorsCount: z.coerce.number().int().min(0).max(200).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const maintenanceRequestSchema = z.object({
  propertyId: uuid("Select a property"),
  buildingId: uuid().optional().or(z.literal("")),
  unitId: uuid().optional().or(z.literal("")),
  categoryId: uuid().optional().or(z.literal("")),
  title: z.string().trim().min(4, "Give the request a short title").max(150),
  description: z.string().trim().min(10, "Describe the issue").max(5000),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

export const requestStatusSchema = z.enum([
  "open",
  "triaged",
  "in_progress",
  "on_hold",
  "completed",
  "closed",
  "cancelled",
]);

export const commentSchema = z.object({
  requestId: uuid(),
  body: z.string().trim().min(1, "Comment cannot be empty").max(5000),
});

export const workOrderSchema = z.object({
  requestId: uuid(),
  title: z.string().trim().min(4).max(150),
  instructions: z.string().trim().max(5000).optional().or(z.literal("")),
  assignedTo: uuid().optional().or(z.literal("")),
  scheduledFor: z.string().optional().or(z.literal("")),
  costEstimate: z.coerce.number().min(0).optional(),
});

export const uuidSchema = uuid();

/** Flattens a ZodError into { field: message } for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const periodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM format")
  .transform((v) => `${v}-01`);

export const paymentSettingsSchema = z.object({
  propertyId: uuid(),
  upiId: z.string().trim().max(100).optional().or(z.literal("")),
  upiNumber: z.string().trim().max(20).optional().or(z.literal("")),
  bankAccountName: z.string().trim().max(150).optional().or(z.literal("")),
  bankAccountNumber: z.string().trim().max(30).optional().or(z.literal("")),
  bankIfsc: z.string().trim().max(20).optional().or(z.literal("")),
  bankName: z.string().trim().max(150).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const expenseSchema = z.object({
  propertyId: uuid(),
  categoryId: uuid().optional().or(z.literal("")),
  period: periodSchema,
  amount: z.coerce.number().min(0).max(10_000_000),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const expenseCategorySchema = z.object({
  propertyId: uuid(),
  name: z.string().trim().min(2).max(100),
});

export const generateDuesSchema = z.object({
  propertyId: uuid(),
  buildingId: uuid(),
  period: periodSchema,
});

export const recordDuePaymentSchema = z.object({
  dueId: uuid(),
  amountPaid: z.coerce.number().min(0).max(10_000_000),
  paymentMethod: z.string().trim().max(50).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const setDueAmountSchema = z.object({
  dueId: uuid(),
  amountDue: z.coerce.number().min(0).max(10_000_000),
});

export const unitSchema = z.object({
  buildingId: uuid(),
  unitNumber: z.string().trim().min(1).max(20),
  floor: z.coerce.number().int().min(-2).max(200).optional(),
  defaultMonthlyAmount: z.coerce.number().min(0).max(1_000_000).optional(),
});

export const addMemberSchema = z.object({
  propertyId: uuid(),
  email: emailSchema,
  relationship: z.enum(["manager", "resident", "technician", "vendor"]),
  unitId: uuid().optional().or(z.literal("")),
});
