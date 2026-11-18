import { authService } from "./authService";
import { clinicalService } from "./clinicalService";
import { dispensaryService } from "./dispensaryService";
import { schedulingService } from "./schedulingService";
import { billingService } from "./billingService";
import { hospitalService } from "./hospitalService";
import { communicationService } from "./communicationService";

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
  platform: hospitalService.platform,
};

export default api;
