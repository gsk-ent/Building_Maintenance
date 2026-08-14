/**
 * Hand-maintained database types for the Building Maintenance Platform.
 * Keep in sync with supabase/migrations. Regenerate with:
 *   npx supabase gen types typescript --linked > types/database.ts
 */
export type AppRole =
  | "admin"
  | "property_manager"
  | "maintenance_manager"
  | "technician"
  | "resident"
  | "vendor";

export type RequestStatus =
  | "open"
  | "triaged"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "closed"
  | "cancelled";

export type RequestPriority = "low" | "medium" | "high" | "urgent";

export type WorkOrderStatus =
  "draft" | "assigned" | "in_progress" | "completed" | "cancelled";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: "active" | "suspended";
  last_login_at: string | null;
  login_count: number;
  created_at: string;
  updated_at: string;
};

export type UserRole = {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
};

export type Property = {
  id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Building = {
  id: string;
  property_id: string;
  name: string;
  floors_count: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Unit = {
  id: string;
  building_id: string;
  unit_number: string;
  floor: number | null;
  default_monthly_amount: number | null;
  created_at: string;
  updated_at: string;
};

export type PropertyUserAssignment = {
  id: string;
  property_id: string;
  user_id: string;
  relationship: "admin" | "manager" | "resident" | "technician" | "vendor";
  unit_id: string | null;
  created_at: string;
};

export type MaintenanceCategory = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type MaintenanceRequest = {
  id: string;
  property_id: string;
  building_id: string | null;
  unit_id: string | null;
  category_id: string | null;
  title: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  requested_by: string;
  assigned_to: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceRequestComment = {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type WorkOrder = {
  id: string;
  request_id: string;
  property_id: string;
  title: string;
  instructions: string | null;
  status: WorkOrderStatus;
  assigned_to: string | null;
  vendor_id: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
  cost_estimate: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Vendor = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  services: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type UserActivity = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type Document = {
  id: string;
  property_id: string | null;
  request_id: string | null;
  work_order_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  created_at: string;
};

export type PropertyPaymentSettings = {
  id: string;
  property_id: string;
  upi_id: string | null;
  upi_number: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseCategory = {
  id: string;
  property_id: string;
  name: string;
  created_at: string;
};

export type Expense = {
  id: string;
  property_id: string;
  category_id: string | null;
  period: string;
  amount: number;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type MonthlyDue = {
  id: string;
  property_id: string;
  unit_id: string;
  period: string;
  amount_due: number;
  amount_paid: number;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Minimal Supabase Database generic. */
type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      user_roles: TableDef<UserRole>;
      properties: TableDef<Property>;
      buildings: TableDef<Building>;
      units: TableDef<Unit>;
      property_user_assignments: TableDef<PropertyUserAssignment>;
      maintenance_categories: TableDef<MaintenanceCategory>;
      maintenance_requests: TableDef<MaintenanceRequest>;
      maintenance_request_comments: TableDef<MaintenanceRequestComment>;
      work_orders: TableDef<WorkOrder>;
      vendors: TableDef<Vendor>;
      notifications: TableDef<AppNotification>;
      user_activity: TableDef<UserActivity>;
      documents: TableDef<Document>;
      property_payment_settings: TableDef<PropertyPaymentSettings>;
      expense_categories: TableDef<ExpenseCategory>;
      expenses: TableDef<Expense>;
      monthly_dues: TableDef<MonthlyDue>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      app_role: AppRole;
      request_status: RequestStatus;
      request_priority: RequestPriority;
      work_order_status: WorkOrderStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
