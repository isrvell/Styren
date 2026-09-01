export const APP_NAME = "Styren";

export const DEFAULT_STATUSES = [
  { name: "Backlog", category: "NOT_STARTED" as const, color: "#6B7280", position: 0 },
  { name: "To Do", category: "NOT_STARTED" as const, color: "#3B82F6", position: 1 },
  { name: "In Progress", category: "ACTIVE" as const, color: "#F59E0B", position: 2 },
  { name: "In Review", category: "ACTIVE" as const, color: "#8B5CF6", position: 3 },
  { name: "Done", category: "DONE" as const, color: "#22C55E", position: 4 },
];

export const PRIORITY_CONFIG = {
  NONE: { label: "No priority", color: "#6B7280", icon: "minus" },
  LOW: { label: "Low", color: "#22C55E", icon: "arrow-down" },
  MEDIUM: { label: "Medium", color: "#EAB308", icon: "arrow-right" },
  HIGH: { label: "High", color: "#F97316", icon: "arrow-up" },
  URGENT: { label: "Urgent", color: "#EF4444", icon: "alert-circle" },
} as const;

export const STATUS_CATEGORY_CONFIG = {
  NOT_STARTED: { label: "Not Started", color: "#6B7280" },
  ACTIVE: { label: "Active", color: "#3B82F6" },
  DONE: { label: "Done", color: "#22C55E" },
} as const;
