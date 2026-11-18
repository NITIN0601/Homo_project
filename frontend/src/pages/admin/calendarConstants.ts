export const BLOCKING_REASON_TEMPLATES: Record<"ooo" | "holiday" | "leave", string[]> = {
  ooo: [
    "Doctor Out of Office — CME & Medical Conference",
    "Doctor Out of Office — Hospital Rounds & Surgery",
    "Doctor Unavailable — Clinical Research Review",
    "Doctor Travel — Out of Station",
  ],
  holiday: [
    "Clinic Closed — Public & Festival Holiday",
    "Clinic Closed — Gazetted National Holiday",
    "Clinic Closed — Regional Festive Observance",
  ],
  leave: [
    "Clinic Maintenance, Sanitization & Upgrade",
    "Doctor Personal Leave — Family Obligation",
    "Facility Audit & Inventory Restock",
  ],
};

