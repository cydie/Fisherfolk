import { Badge } from "react-bootstrap";

const map: Record<string, string> = {
  Active: "success",
  Approved: "success",
  Released: "primary",
  Verified: "info",
  Pending: "warning",
  Expired: "danger",
  Inactive: "danger",
  "Fully Paid": "success",
  "Partially Paid": "info",
  "Head Admin": "purple",
  Staff: "primary",
  Cashier: "teal",
};

export function StatusBadge({ value }: { value: string }) {
  const variant = map[value] || "secondary";
  const extra =
    variant === "purple"
      ? "bg-purple"
      : variant === "teal"
        ? "text-bg-success"
        : undefined;
  if (variant === "purple") {
    return (
      <Badge bg="secondary" style={{ background: "#7c3aed" }}>
        {value}
      </Badge>
    );
  }
  return (
    <Badge bg={variant === "teal" ? "success" : (variant as any)} className={extra}>
      {value}
    </Badge>
  );
}
