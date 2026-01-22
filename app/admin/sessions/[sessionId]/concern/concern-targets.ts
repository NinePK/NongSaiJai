export type ConcernScope =
  | "PM"
  | "PROJECT_TEAM"
  | "BACKOFFICE"
  | "MANAGEMENT"
  | "CUSTOMER"
  | "VENDOR"

export type BackofficeTeamCode =
  | "CASC"
  | "ACCOUNTING"
  | "IT_SUPPORT"
  | "PURCHASE"
  | "LEGAL"
  | "HR"
  | "ALL";

export const CONCERN_SCOPES: Array<{ scope: ConcernScope; label: string }> = [
  { scope: "PM", label: "PM" },
  { scope: "PROJECT_TEAM", label: "Project Team" },
  { scope: "BACKOFFICE", label: "Backoffice" },
  { scope: "MANAGEMENT", label: "Management" },
  { scope: "CUSTOMER", label: "Customer" },
  { scope: "VENDOR", label: "Vendor" },
];

export const BACKOFFICE_TEAMS: Array<{
  team_code: BackofficeTeamCode;
  team_label: string;
  group_mail: string;
}> = [
  { team_code: "CASC", team_label: "ทีมสื่อสาร", group_mail: "CASC@mfec.co.th" },
  { team_code: "ACCOUNTING", team_label: "ทีมบัญชี", group_mail: "Accounting@mfec.co.th" },
  { team_code: "IT_SUPPORT", team_label: "ทีม IT", group_mail: "itsupport@mfec.co.th" },
  { team_code: "PURCHASE", team_label: "ทีมจัดซื้อ", group_mail: "purchase@mfec.co.th" },
  { team_code: "LEGAL", team_label: "ทีมกฎหมาย", group_mail: "legal@mfec.co.th" },
  { team_code: "ALL", team_label: "รวม Backoffice", group_mail: "backoffice@mfec.co.th" },
  { team_code: "HR", team_label: "ทีม PE / HR", group_mail: "hr@mfec.co.th" },
];
