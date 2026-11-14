import React from "react";
import type { ConsultationInvoiceStatus } from "../../types";
import { Badge } from "../ui/Badge";

export interface InvoiceStatusBadgeProps {
  status: ConsultationInvoiceStatus;
  size?: "micro" | "sm" | "md";
  className?: string;
}

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({
  status,
  size = "sm",
  className = "",
}) => {
  switch (status) {
    case "paid":
      return (
        <Badge
          variant="success"
          size={size}
          icon={<span aria-hidden="true">✓</span>}
          className={className}
        >
          Confirmed &amp; Settled
        </Badge>
      );
    case "processing":
      return (
        <Badge
          variant="info"
          size={size}
          pulse
          icon={<span aria-hidden="true">🔔</span>}
          className={className}
        >
          Verification Required
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge
          variant="warning"
          size={size}
          icon={<span aria-hidden="true">⏳</span>}
          className={className}
        >
          Payment Due
        </Badge>
      );
  }
};

