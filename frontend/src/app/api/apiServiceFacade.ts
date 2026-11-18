import { authService } from "../../domains/iam-auth/api/authService";
import { clinicalService } from "../../domains/clinical-ehr/api/clinicalService";
import { dispensaryService } from "../../domains/dispensary-pharmacy/api/dispensaryService";
import { schedulingService } from "../../domains/scheduling/api/schedulingService";
import { billingService } from "../../domains/billing-finance/api/billingService";
import { hospitalService } from "../../domains/tenant-governance/api/hospitalService";
import { communicationService } from "../../domains/patient-engagement/api/communicationService";

export {
  authService,
  clinicalService,
  dispensaryService,
  schedulingService,
  billingService,
  hospitalService,
  communicationService,
};

export const api = {
  auth: authService,
  remedies: clinicalService.remedies,
  ai: clinicalService.ai,
  patient: clinicalService.patient,
  visits: clinicalService.visits,
  orders: dispensaryService.orders,
  inventory: dispensaryService.inventory,
  whatsapp: communicationService.whatsapp,
  email: communicationService.email,
  geo: communicationService.geo,
  appointments: schedulingService.appointments,
  calendar: schedulingService.calendar,
  invoices: billingService.invoices,
  hospitals: hospitalService.hospitals,
  clinics: hospitalService.hospitals,
  platform: hospitalService.platform,
};

export default api;
