import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  CLINIC,
  DOCTOR,
  OFFICE_HOURS,
  WHATSAPP,
  DEFAULT_LIFESTYLE_ADVICE,
  LOGISTICS,
  THEME_GRADIENTS,
  THEME_SHADOWS,
} from "../config";
import { api } from "../services/api";
import { getMappedSessionHours } from "../utils/timezone";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id:        string;
  sender:    "bot" | "user";
  text:      string;
  time:      string;
  actions?:  { label: string; page?: "appointments" | "visit-summary" | "about"; query?: string; whatsapp?: string; scrollTo?: string }[];
}

// ─── Bot Knowledge Base (100% SSOT Aligned) ──────────────────────────────────
type BotResponse = { text: string; actions?: ChatMessage["actions"] };

interface ParsedChatMessage {
  preview: string;
  details: string;
  hasMore: boolean;
}

function parseChatMessageContent(text: string): ParsedChatMessage {
  if (text.includes("---MORE---")) {
    const [preview, ...rest] = text.split("---MORE---");
    return {
      preview: preview.trim(),
      details: rest.join("---MORE---").trim(),
      hasMore: true,
    };
  }

  // Automatic collapsible fallback for very long bot responses (>= 4 paragraphs or text > 500 chars)
  // Ensure that the preview always contains at least 2 to 3 substantive lines before any collapsible details.
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length >= 4 || (paragraphs.length >= 3 && text.length > 500)) {
    const preview = paragraphs.slice(0, 2).join("\n\n").trim();
    const details = paragraphs.slice(2).join("\n\n").trim();
    if (preview && details) {
      return { preview, details, hasMore: true };
    }
  }

  return { preview: text, details: "", hasMore: false };
}

function getBotResponse(input: string, patientName: string, userTz?: string): BotResponse {
  const q = input.toLowerCase().trim();
  const sessionHours = getMappedSessionHours(undefined, userTz);

  // ── 1. Greetings ──
  if (/^(hi|hello|hey|namaste|good\s*(morning|evening|afternoon))/.test(q)) {
    return {
      text:
        `Hello${patientName !== "Patient" ? `, ${patientName}` : ""}! 👋 I'm **AgastyaBot**, your ${CLINIC.NAME} AI assistant.\n\n` +
        `• **Classical Healing:** Personalized constitutional consultations with ${DOCTOR.TITLE}.\n` +
        `• **Patient Services:** In-clinic consultations, online tele-care, and direct remedy dispensing.\n` +
        `• **Quick Navigation:** Instant booking, clinic schedules, and verified visit summaries.\n\n` +
        `How can I assist you with your health today?`,
      actions: [
        { label: "📅 Book Consultation Slot",    page: "appointments" },
        { label: "📋 View My Visit Summary",     page: "visit-summary" },
        { label: "🩺 Treated Specialisations",   page: "about", scrollTo: "specialisations" },
        { label: "🕐 Check Clinic Hours",        page: "about", scrollTo: "clinic-schedule" },
      ],
    };
  }

  // ── 2. Office Hours & Timings ──
  if (/hour|timing|time|open|close|when|schedule\b/.test(q)) {
    const hoursText =
      `🕐 *${CLINIC.FULL_NAME} Consultation Hours:*\n\n` +
      `• *${sessionHours.morning.fullSessionName}:* ${sessionHours.morning.display} (${OFFICE_HOURS.MORNING.mode})\n` +
      `• *${sessionHours.evening.fullSessionName}:* ${sessionHours.evening.display} (${OFFICE_HOURS.EVENING.mode})\n` +
      `• *Sunday:* ${OFFICE_HOURS.SUNDAY.hours}\n\n` +
      `Appointments are recommended to avoid wait times. Evening walk-ins are also welcome.`;

    return {
      text: hoursText,
      actions: [
        { label: "📅 Book Consultation Slot", page: "appointments" },
        { label: "🕒 View Schedule on Page",  page: "about", scrollTo: "clinic-schedule" },
        { label: "📍 Clinic Location Details", page: "about", scrollTo: "clinic-location" },
      ],
    };
  }

  // ── 3. Walk-in Consultations ──
  if (/walk|direct|queue|token|without\s*appoint|walk-in/.test(q)) {
    const walkinHours = sessionHours.evening.display;

    return {
      text:
        `🚶‍♂️ *Walk-in Consultations at ${CLINIC.FULL_NAME}:*\n\n` +
        `• *Walk-ins Welcome:* ${OFFICE_HOURS.EVENING.days} during ${sessionHours.evening.fullSessionName} (*${walkinHours}*) at ${CLINIC.ADDRESS.SHORT}.\n` +
        `• *Morning & Sunday Sessions:* Conducted strictly by prior appointment for detailed case-taking.\n` +
        `• *Queue Tokens:* Issued on a first-come, first-served basis at the clinic reception desk upon arrival.\n\n` +
        `We recommend booking your slot online to ensure minimal waiting time!`,
      actions: [
        { label: "📅 Book Online Slot",      page: "appointments" },
        { label: "🕒 View Clinic Timings",   page: "about", scrollTo: "clinic-schedule" },
        { label: "📍 View Clinic Directions", page: "about", scrollTo: "clinic-location" },
      ],
    };
  }

  // ── 4. Location & Address & Directions ──
  if (/location|address|map|where|directions|reach|hub|malleshwaram|bengaluru/.test(q)) {
    return {
      text:
        `📍 *${CLINIC.FULL_NAME} Address & Contact:*\n\n` +
        `• *Address:* ${CLINIC.ADDRESS.FULL}\n` +
        `• *Accessibility:* Conveniently situated in ${CLINIC.ADDRESS.AREA} with easy access from major roads.\n` +
        `• *Direct Contact:* 📞 ${CLINIC.PHONE_DISPLAY} | 📧 ${CLINIC.SUPPORT_EMAIL}\n\n` +
        `Click below to view the address and interactive map on the clinic page.`,
      actions: [
        { label: "📍 View Map & Address on Page", page: "about", scrollTo: "clinic-location" },
        { label: "📅 Book Clinic Visit",          page: "appointments" },
        { label: "👩‍⚕️ About Dr. Bramarambha",     page: "about", scrollTo: "doctor-profile" },
      ],
    };
  }

  // ── 5. Areas We Treat / Specialisations ──
  if (/treat|special|condition|disease|problem|respiratory|skin|pcos|digest|migraine|allergy|hair|pediatric/.test(q)) {
    return {
      text:
        `🩺 *Specialised Clinical Practice at ${CLINIC.FULL_NAME}:*\n\n` +
        `• *Respiratory & Allergies:* Allergic rhinitis, bronchitis, asthma, sinusitis, and dust allergies.\n` +
        `• *Dermatology & Hair:* Eczema, psoriasis, urticaria, adult/teen acne, alopecia, and hair fall.\n` +
        `• *Women's & Chronic Health:* PCOS, thyroid dysfunction, migraine, gastric disorders, and arthritis.\n` +
        `• *Pediatric Care:* Childhood immunity, recurrent infections, and behavioral/developmental support.\n\n` +
        `Treatment is planned through individualized constitutional case assessment.`,
      actions: [
        { label: "🩺 View All Specialisations on Page", page: "about", scrollTo: "specialisations" },
        { label: "📅 Book Consultation Slot",          page: "appointments" },
        { label: "👩‍⚕️ Doctor Profile & Credentials",     page: "about", scrollTo: "doctor-profile" },
      ],
    };
  }

  // ── 6a. About Us & Clinic Story ──
  if (/^(about\s*(us|clinic)|clinic\s*(story|overview|philosophy)|who\s*we\s*are)$/.test(q) || q === "about us" || q === "about clinic") {
    return {
      text:
        `🌿 *About ${CLINIC.FULL_NAME}:*\n\n` +
        `• *Holistic & Classical:* A dedicated classical homoeopathy clinic providing individualized, root-cause healing without toxic side-effects.\n` +
        `• *Expert Leadership:* Led by **${DOCTOR.TITLE}**, ${DOCTOR.QUALIFICATIONS} (${DOCTOR.COLLEGE}).\n` +
        `• *Patient Care:* Comprehensive in-clinic assessments in ${CLINIC.ADDRESS.AREA}, secure video tele-care, and direct remedy dispensing.\n` +
        `• *Gentle Philosophy:* Healing guided by natural law and classical totality evaluation tailored to each patient.`,
      actions: [
        { label: "🌿 Read About Us & Clinic Story", page: "about" },
        { label: "📅 Book Consultation Slot",       page: "appointments" },
        { label: "🩺 Treated Specialisations",      page: "about", scrollTo: "specialisations" },
      ],
    };
  }

  // ── 6b. About the Doctor & Clinic Profile ──
  if (/about\s*doctor|doctor|physician|who\s*(is|are)|bio|biography|profile|qualification|credentials?|alma\s*mater|background|philosophy|bramarambha/.test(q) || q === "about doctor") {
    return {
      text:
        `👩‍⚕️ *About ${DOCTOR.TITLE}:*\n\n` +
        `• *Qualifications:* ${DOCTOR.QUALIFICATIONS} (${DOCTOR.ALMA_MATER}, ${DOCTOR.RANK}).\n` +
        `• *Faculty & Experience:* ${DOCTOR.DESIGNATION} at ${DOCTOR.COLLEGE} with ${DOCTOR.EXPERIENCE_DESC}.\n` +
        `• *Classical Methodology:* Strict adherence to constitutional case-taking, totality evaluation, and gentle healing.\n` +
        `• *Certification:* ${DOCTOR.CERTIFICATION}.`,
      actions: [
        { label: "👩‍⚕️ View Doctor Profile & Credentials", page: "about", scrollTo: "doctor-profile" },
        { label: "🩺 View Services & Specialisations",  page: "about", scrollTo: "specialisations" },
        { label: "📅 Book Consultation with Doctor",    page: "appointments" },
      ],
    };
  }

  // ── 7. Online Tele-Consultation vs In-Person Visits ──
  if (/online|tele|video|remote|virtual|distance|zoom|call\s*consult|video\s*consult/.test(q)) {
    return {
      text:
        `💻 *Consultation Modes at ${CLINIC.FULL_NAME}:*\n\n` +
        `• *🌿 In-Person Clinic Visits:* In-depth constitutional case-taking at our ${CLINIC.ADDRESS.AREA} clinic with physical assessment.\n` +
        `• *💻 Online Video Consultations:* Secure, comprehensive tele-consultations for outstation, national, and international patients.\n` +
        `• *📦 Courier Medicine Dispatch:* Prescribed remedies are prepared in accredited potencies and shipped via ${LOGISTICS.DEFAULT_PARTNER} directly to your home.`,
      actions: [
        { label: "📅 Book Tele or Clinic Slot", page: "appointments" },
        { label: "🕒 View Clinic Timings",      page: "about", scrollTo: "clinic-schedule" },
        { label: "📍 View Clinic Address",      page: "about", scrollTo: "clinic-location" },
      ],
    };
  }

  // ── 8. Appointment Booking ──
  if (/appoint|book|schedule|slot|consultation\s*booking/.test(q)) {
    return {
      text:
        `📅 *Book a Consultation with ${DOCTOR.TITLE}:*\n\n` +
        `• *Morning Consultations:* ${sessionHours.morning.display} (${OFFICE_HOURS.MORNING.mode})\n` +
        `• *Evening Consultations:* ${sessionHours.evening.display} (${OFFICE_HOURS.EVENING.mode})\n` +
        `• *Consultation Type:* Select In-Person Clinic Visit or Online Video Tele-Consultation.\n\n` +
        `Head to our booking page to pick your date, session, and secure your slot instantly.`,
      actions: [
        { label: "📅 Go to Appointment Booking", page: "appointments" },
        { label: "🕒 View Clinic Schedule",      page: "about", scrollTo: "clinic-schedule" },
        { label: "📋 My Existing Appointments",  page: "visit-summary" },
      ],
    };
  }

  // ── 9. Diet, Coffee & Lifestyle Precautions ──
  if (/coffee|diet|food|restriction|antidote|eat|drink|tea|camphor|mint|precautions?|rules?/.test(q)) {
    return {
      text:
        `🍃 *Homeopathic Remedy Precautions & Lifestyle Guidance:*\n\n` +
        `• *${DEFAULT_LIFESTYLE_ADVICE}*\n` +
        `• *Dispensing Rules:* Take medicated sugar globules directly on the tongue using the bottle cap — never touch pills with bare fingers.\n` +
        `• *Substances to Avoid:* Raw coffee, menthol, camphor, eucalyptus, and strong mint close to remedy ingestion, as strong scents may antidote remedies.\n` +
        `• *Storage Care:* Keep remedy vials in a cool, dark place away from direct sunlight, pungent spices, and electronic devices.`,
      actions: [
        { label: "📋 View My Prescriptions & Advice", page: "visit-summary" },
        { label: "👩‍⚕️ Doctor's Care Approach",        page: "about", scrollTo: "doctor-profile" },
        { label: "📅 Book Follow-Up Slot",            page: "appointments" },
      ],
    };
  }

  // ── 10. Classical Homoeopathy & Safety / Side Effects ──
  if (/classical|how\s*it\s*works|side\s*effects?|safe|gentle|holistic|principles?|natural/.test(q)) {
    return {
      text:
        `🌿 *Classical Homoeopathy Principles at ${CLINIC.FULL_NAME}:*\n\n` +
        `• *Gentle & Non-Toxic:* Classical remedies stimulate your innate vital force without chemical side effects, organ toxicity, or dependency.\n` +
        `• *Constitutional Totality:* We evaluate your physical symptoms, emotional characteristics, and medical history rather than isolated disease labels.\n` +
        `• *Official Pharmacopoeia:* All dispensed remedies conform to accredited homeopathic pharmacopoeia standards and highest quality potencies.`,
      actions: [
        { label: "👩‍⚕️ Read Doctor Philosophy",    page: "about", scrollTo: "doctor-profile" },
        { label: "🩺 View Treated Conditions",   page: "about", scrollTo: "specialisations" },
        { label: "📅 Book Consultation",          page: "appointments" },
      ],
    };
  }

  // ── 11. Medicine / Prescriptions / Dispensing ──
  if (/medicine|remedy|remedies|order|prescription|prescribed|buy|purchase|cart/.test(q)) {
    return {
      text:
        `💊 *Remedy Dispensing & Prescriptions at ${CLINIC.FULL_NAME}:*\n\n` +
        `• *In-Clinic Classical Dispensary:* Customized remedies and potencies are dispensed directly after ${DOCTOR.TITLE}'s case analysis.\n` +
        `• *Clear Instructions:* Dosage frequency, administration guidelines, and lifestyle advice are recorded in your clinical notes.\n` +
        `• *Verified Summary:* Review your current remedies, dosage, and case history anytime in your Visit Summary.\n` +
        `• *Home Dispatch:* Prescriptions for tele-consultation patients are packaged safely and shipped via courier.`,
      actions: [
        { label: "📋 View Prescriptions in Summary", page: "visit-summary" },
        { label: "📅 Book Consultation for Remedy",   page: "appointments" },
        { label: "📍 Clinic Address & Dispensary",    page: "about", scrollTo: "clinic-location" },
      ],
    };
  }

  // ── 12. Tracking & Delivery Queries ──
  if (/track|deliver|shipment|status|where.*order|order.*status|bluedart|delhivery|courier/.test(q)) {
    return {
      text:
        `📦 *Prescription Delivery & Courier Tracking:*\n\n` +
        `• *Courier Dispatch:* Remote prescriptions are dispatched via trusted couriers (${LOGISTICS.PARTNERS.join(", ")}).\n` +
        `• *Live Checkpoints:* Real-time tracking numbers, courier partner info, and dispatch timestamps appear under your Visit Summary.\n` +
        `• *Clinic Pickup:* In-person patients may collect their freshly dispensed remedies directly from our reception desk.\n` +
        `• *Delivery Time:* Metro orders typically arrive within 24–48 hours; regional deliveries take 2–4 business days.`,
      actions: [
        { label: "📋 Open Visit Summary & Tracking", page: "visit-summary" },
        { label: "📍 View Clinic Address for Pickup", page: "about", scrollTo: "clinic-location" },
        { label: "🕒 Check Reception Hours",          page: "about", scrollTo: "clinic-schedule" },
      ],
    };
  }

  // ── 13. Visit Summary / Medical History ──
  if (/visit|summary|history|past|previous|prescription|diagnosis|record/.test(q)) {
    return {
      text:
        `📋 *Your Clinical Records & Invoices Portal:*\n\n` +
        `• *Complete Consultation History:* View your diagnoses, constitutional assessments, and doctor's clinical notes.\n` +
        `• *Remedies & Advice:* Review active prescriptions, dosage schedules, dietary rules, and recommended follow-up dates.\n` +
        `• *Billing & Invoices:* Download itemized invoices, view payment statuses, and print clinical summaries anytime.`,
      actions: [
        { label: "📋 Go to Visit Summary & Invoices", page: "visit-summary" },
        { label: "📅 Book Follow-Up Consultation",    page: "appointments" },
        { label: "👩‍⚕️ View Doctor's Credentials",     page: "about", scrollTo: "doctor-profile" },
      ],
    };
  }

  // ── 14. Contact / Reception / Helpdesk ──
  if (/contact|phone|call|reach|support|help|reception|email|helpline|desk/.test(q)) {
    return {
      text:
        `📞 *Contact ${CLINIC.FULL_NAME}:*\n\n` +
        `• *Phone / WhatsApp:* ${CLINIC.PHONE_DISPLAY} (Direct reception assistance).\n` +
        `• *Clinic Address:* ${CLINIC.ADDRESS.FULL}\n` +
        `• *Email:* ${CLINIC.SUPPORT_EMAIL} (Official queries & record requests)\n` +
        `• *Assistance:* Our front desk is happy to help with bookings, timings, and directions during clinic hours.`,
      actions: [
        { label: "📍 View Location & Map on Page", page: "about", scrollTo: "clinic-location" },
        { label: "🕒 View Clinic Timings",         page: "about", scrollTo: "clinic-schedule" },
        { label: "📱 Message Clinic on WhatsApp",  whatsapp: WHATSAPP.TEMPLATES.INQUIRY },
      ],
    };
  }

  // ── 15. Payment / Billing / Fees ──
  if (/pay|payment|bill|invoice|gpay|upi|card|cost|fee/.test(q)) {
    return {
      text:
        `💳 *Consultation Fees & Invoicing:* \n\n` +
        `• *Transparent Settlement:* Consultation and remedy fees are settled at the clinic reception desk upon arrival or appointment confirmation.\n` +
        `• *Payment Methods:* UPI (${DOCTOR.UPI_ID}), cash, and digital payments are accepted.\n` +
        `• *Verified Receipts:* Download official GST-compliant tax invoices and track payment reconciliation directly in your Visit Summary.\n` +
        `• *Portal Security:* No card numbers or banking passwords are collected or stored on this portal.`,
      actions: [
        { label: "📋 View Invoices & Payment Status", page: "visit-summary" },
        { label: "📅 Book Consultation Slot",         page: "appointments" },
        { label: "🕒 Check Reception Hours",          page: "about", scrollTo: "clinic-schedule" },
      ],
    };
  }

  // ── 16. Emergency & Critical Care Policy ──
  if (/emergency|urgent|icu|casualty|ambulance|hospital|trauma|severe\s*chest/.test(q)) {
    return {
      text:
        `🚨 *Emergency Medical Notice:*\n\n` +
        `• *Outpatient Facility:* ${CLINIC.FULL_NAME} is an outpatient classical homoeopathy clinic and does not operate emergency casualty or ICU units.\n` +
        `• *Immediate Action:* If you or someone in your care experiences severe chest pain, breathing distress, sudden weakness, or major trauma, please immediately dial **112 / 108** or go to the nearest multi-specialty emergency hospital.\n` +
        `• *Non-Urgent Queries:* For acute homeopathic consultations during clinic hours, contact our desk directly.`,
      actions: [
        { label: "📍 Clinic Address & Location", page: "about", scrollTo: "clinic-location" },
        { label: "🕒 Check Clinic Hours",        page: "about", scrollTo: "clinic-schedule" },
        { label: "📞 Call Clinic Reception",     whatsapp: WHATSAPP.TEMPLATES.INQUIRY },
      ],
    };
  }

  // ── 17. Fallback ──
  return {
    text:
      `🌿 *${CLINIC.FULL_NAME} — Patient Assistance:*\n\n` +
      `• *Consultation Booking:* Reserve an in-clinic or video tele-consultation with ${DOCTOR.TITLE}.\n` +
      `• *Records & Care:* Review your clinical visit summaries, remedies, diet precautions, and invoices.\n` +
      `• *Clinic Info:* View clinic timings, address, directions, and areas of specialization.\n\n` +
      `Please tap an option below to navigate directly, or message our front desk.`,
    actions: [
      { label: "📅 Book Consultation",       page: "appointments" },
      { label: "📋 My Visit Summary",        page: "visit-summary" },
      { label: "🩺 Specialisations & Care",   page: "about", scrollTo: "specialisations" },
      { label: "🕒 Clinic Schedule",         page: "about", scrollTo: "clinic-schedule" },
    ],
  };
}

// ─── Now() ───────────────────────────────────────────────────────────────────
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ─── ChatbotWidget ────────────────────────────────────────────────────────────
export const ChatbotWidget: React.FC = () => {
  const { state, navigateTo, userTimezone } = useApp();
  const { authUser } = state;
  const patientName = authUser?.name ?? "Patient";

  const [isOpen,      setIsOpen]      = useState(false);
  const [inputValue,  setInputValue]  = useState("");
  const [isTyping,    setIsTyping]    = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const widgetRef  = useRef<HTMLDivElement>(null);

  // Outside click / tap listener to close bot automatically on mobile and desktop
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  const quickFilters = [
    "About us",
    "Book Appointment",
    ...(authUser ? ["My summary"] : []),
    "Specialization",
    "about doctor",
    "location& map",
    "contact clinic",
  ];

  const welcomeMessage: ChatMessage = {
    id:     "msg-welcome",
    sender: "bot",
    text:
      `Hello${authUser ? `, ${authUser.name.split(" ")[0]}` : ""}! 👋 I'm **AgastyaBot**, your ${CLINIC.NAME} AI assistant.\n\n` +
      `• **Classical Homeopathy:** Individualized holistic care with ${DOCTOR.TITLE}.\n` +
      `• **Portal Navigation:** Book appointments, ${authUser ? "view your clinical summary, " : ""}explore specialisations, or connect with our clinic.\n\n` +
      `How can I help you today? Tap an option below or type your question:`,
    time:   now(),
    actions: [
      { label: "🌿 About us",                page: "about" },
      { label: "📅 Book Appointment",         page: "appointments" },
      ...(authUser ? [{ label: "📋 My summary", page: "visit-summary" as const }] : []),
      { label: "🩺 Specialization",           page: "about", scrollTo: "specialisations" },
      { label: "👩‍⚕️ About doctor",           page: "about", scrollTo: "doctor-profile" },
      { label: "📍 Location & map",           page: "about", scrollTo: "clinic-location" },
      { label: "📞 Contact clinic",           page: "about", scrollTo: "clinic-location" },
    ],
  };

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);

  useEffect(() => {
    if (isOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Reset to welcome when re-opened after close
  useEffect(() => {
    if (isOpen && messages.length === 0) setMessages([welcomeMessage]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});

  const toggleExpandMessage = (msgId: string) => {
    setExpandedMessages((prev) => {
      const nextVal = !prev[msgId];
      if (nextVal) {
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 120);
      }
      return { ...prev, [msgId]: nextVal };
    });
  };

  const handleAction = (action: NonNullable<ChatMessage["actions"]>[number]) => {
    if (action.page) {
      // Auto-collapse bot back to button so user has an immediate, clear view of the target page and section
      setIsOpen(false);
      navigateTo(action.page);
      if (action.scrollTo) {
        window.location.hash = action.scrollTo;
        const scrollTarget = () => {
          const el = document.getElementById(action.scrollTo!);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        };
        setTimeout(scrollTarget, 120);
        setTimeout(scrollTarget, 350);
      } else {
        // Ensure user is smoothly scrolled directly to the top of the destination page
        try {
          window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        } catch {
          window.scrollTo(0, 0);
        }
      }
    }
    if (action.query)     handleQuickQuestion(action.query);
    if (action.whatsapp)  api.whatsapp.openChat(action.whatsapp, authUser);
  };

  const renderFormattedLine = (line: string) => {
    if (!line) return null;
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("*") && part.endsWith("*"))) {
        const clean = part.replace(/^(\*\*|\*)+|(\*\*|\*)+$/g, "");
        return <strong key={index} className="font-bold text-stone-900">{clean}</strong>;
      }
      return part;
    });
  };

  const handleSend = (e: React.FormEvent | string) => {
    if (typeof e !== "string") e.preventDefault();
    const text = typeof e === "string" ? e : inputValue.trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: `usr-${Date.now()}`, sender: "user", text, time: now() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getBotResponse(text, patientName, userTimezone);
      const botMsg: ChatMessage = {
        id:      `bot-${Date.now()}`,
        sender:  "bot",
        text:    response.text,
        time:    now(),
        actions: response.actions?.filter((a) => authUser || a.page !== "visit-summary"),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleQuickQuestion = (question: string) => handleSend(question);

  return (
    <>
      {/* ── Mobile Click-Outside Dimmer Backdrop ──────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[0.5px] md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        ref={widgetRef}
        className="fixed bottom-[4.25rem] md:bottom-6 right-3 md:right-6 z-[65] flex flex-col items-end gap-2 text-xs select-none"
      >

        {/* ── Chat Window ─────────────────────────────────────────────────── */}
        {isOpen && (
          <div
            className="w-[calc(100vw-1.5rem)] max-w-[380px] bg-white rounded-3xl shadow-2xl border border-stone-100 flex flex-col overflow-hidden mb-2 animate-fadeIn"
            style={{
              boxShadow: THEME_SHADOWS.CHATBOT_POPUP,
              height: "min(530px, calc(100dvh - 8rem))",
            }}
          >
            {/* Header */}
            <div
              className="p-4 text-white flex items-center justify-between flex-shrink-0"
              style={{ background: THEME_GRADIENTS.PRIMARY }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl border border-white/30">
                    🌿
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-emerald-900" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-tight">AgastyaBot AI Assistant</h3>
                  <p className="text-[10px] text-emerald-200 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online · {CLINIC.FULL_NAME}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => api.whatsapp.openChat(undefined, authUser)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors text-xs font-extrabold flex items-center gap-1 shadow-sm"
                  title="Chat on WhatsApp Business"
                  aria-label="Open WhatsApp chat"
                >
                  <span>📱</span> WA
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs flex items-center justify-center transition-colors font-bold"
                  aria-label="Close AgastyaBot"
                >✕</button>
              </div>
            </div>

            {/* Quick topics bar (Strictly in requested order; dynamically adds 'My summary' when logged in) */}
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide bg-emerald-50/60 border-b border-emerald-100 flex-shrink-0">
              {quickFilters.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuickQuestion(q)}
                  className="flex-shrink-0 text-[10px] font-bold bg-white border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-full hover:bg-emerald-700 hover:text-white hover:border-emerald-700 transition-all cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Messages body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/50">
              {messages.map((msg) => {
                const isBot = msg.sender === "bot";
                const { preview, details, hasMore } = isBot
                  ? parseChatMessageContent(msg.text)
                  : { preview: msg.text, details: "", hasMore: false };
                const isExpanded = !!expandedMessages[msg.id];

                return (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-emerald-700 text-white rounded-br-none shadow-sm"
                          : "bg-white text-stone-800 border border-stone-200/80 rounded-bl-none shadow-sm"
                      }`}
                    >
                      {/* Render preview text lines (at least 2-3 lines always visible inside bot) */}
                      {preview.split("\n").map((line, i) => (
                        <p key={i} className={i > 0 ? "mt-1" : ""}>
                          {renderFormattedLine(line)}
                        </p>
                      ))}

                      {/* Collapsible Details & Load More Toggle */}
                      {hasMore && (
                        <div className="mt-2.5">
                          {isExpanded ? (
                            <div className="pt-2.5 border-t border-stone-100 space-y-1 animate-fadeIn">
                              {details.split("\n").map((line, i) => (
                                <p key={i} className={i > 0 ? "mt-1" : ""}>
                                  {renderFormattedLine(line)}
                                </p>
                              ))}
                              <button
                                type="button"
                                onClick={() => toggleExpandMessage(msg.id)}
                                className="mt-2 w-full py-1.5 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                              >
                                <span>▴ Show Less</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleExpandMessage(msg.id)}
                              className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-[11px] border border-emerald-200/90 flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-98 cursor-pointer"
                            >
                              <span>📖 Load More Details ▾</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Action buttons (direct to page and section, auto-collapsing bot to button) */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-2.5">
                          {msg.actions.map((action) => (
                            <button
                              key={action.label}
                              onClick={() => handleAction(action)}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-stone-400 mt-1 px-1">{msg.time}</span>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-3 py-2 rounded-2xl w-fit shadow-sm">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input footer */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 flex items-center gap-2 flex-shrink-0">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask AgastyaBot anything…"
                className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                aria-label="Message AgastyaBot"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                aria-label="Send message"
              >
                ➔
              </button>
            </form>
          </div>
        )}

        {/* ── Floating AgastyaBot AI Toggle Button ────────────────────────── */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? "Close AgastyaBot chat" : "Open AgastyaBot AI assistant"}
          className="relative flex items-center gap-2 px-4 py-3 rounded-full text-white font-extrabold text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xl border border-emerald-400/30"
          style={{ background: THEME_GRADIENTS.PRIMARY }}
        >
          <span className="text-lg leading-none" role="img" aria-hidden="true">
            {isOpen ? "✕" : "🌿"}
          </span>
          <span className="inline font-bold">
            {isOpen ? "Close" : "AgastyaBot"}
          </span>
          {!isOpen && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export default ChatbotWidget;
