export interface CustomerFeedback {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  rating: number; // 1 to 5
  status: "pending" | "approved" | "hidden" | "deleted";
  topic: string; // "topic: Consultation & Diagnosis" | "topic: Remedy Effectiveness & Recovery" | "topic: Clinic Experience & Scheduling"
  comments: string;
  recoveryStatus?: string;
  submittedAt: string;
  googleReviewSyncUrl?: string;
  publishedToGoogle?: boolean;
}

export const INITIAL_CUSTOMER_FEEDBACKS: CustomerFeedback[] = [
  {
    id: "fb-101",
    patientId: "usr-001",
    patientName: "John Doe",
    patientEmail: "john@agastyahomoeo.com",
    rating: 5,
    status: "approved",
    topic: "topic: Consultation & Diagnosis",
    comments: "Doctor took exceptional time to listen to my chronic migraine symptoms and triggers. The holistic assessment was incredibly thorough.",
    recoveryStatus: "Significantly Better",
    submittedAt: "2026-10-18 11:30 AM",
    publishedToGoogle: true,
  },
  {
    id: "fb-102",
    patientId: "usr-002",
    patientName: "Priya Sharma",
    patientEmail: "priya@example.com",
    rating: 5,
    status: "pending",
    topic: "topic: Remedy Effectiveness & Recovery",
    comments: "Knee swelling subsided remarkably within 2 weeks of Arnica and Rhus Tox. Very satisfied with the individualized treatment approach.",
    recoveryStatus: "Moderate Relief / Improving",
    submittedAt: "2026-10-24 04:15 PM",
    publishedToGoogle: false,
  },
  {
    id: "fb-103",
    patientId: "usr-003",
    patientName: "Amit Patel",
    patientEmail: "amit@example.com",
    rating: 4,
    status: "approved",
    topic: "topic: Clinic Experience & Scheduling",
    comments: "Clean clinic ambiance and on-time appointment without long waiting room delays. Online medicine courier arrived within 48 hours.",
    recoveryStatus: "Significantly Better",
    submittedAt: "2026-10-28 02:00 PM",
    publishedToGoogle: true,
  },
];

