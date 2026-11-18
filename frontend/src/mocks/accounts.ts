import type { UserProfile } from "@core/types";
import { HOSPITAL, DEMO_CREDENTIALS, DOCTOR, USE_MOCK_DATA } from "../core/config";

// Enterprise Security Guard (OWASP A07 / Defense in Depth):
// In production non-mock mode, redact hardcoded passwords so mock secrets are never bundled or exposed in client memory.
const isProdStrict = Boolean(import.meta.env?.PROD && !USE_MOCK_DATA);
const getGuardedPassword = (pass: string) => (isProdStrict ? "[REDACTED_IN_PRODUCTION]" : pass);

export const MOCK_ACCOUNTS: Record<string, { password: string; profile: UserProfile }> = {
  [DEMO_CREDENTIALS.SUPER_ADMIN.email]: {
    password: getGuardedPassword(DEMO_CREDENTIALS.SUPER_ADMIN.password),
    profile: {
      id:       DEMO_CREDENTIALS.SUPER_ADMIN.id,
      name:     DEMO_CREDENTIALS.SUPER_ADMIN.name,
      initials: "SA",
      email:    DEMO_CREDENTIALS.SUPER_ADMIN.email,
      role:     "super_admin",
      phone:    "+91 99999 00000",
      address: {
        street:  "Global Platform Healthtech Hub",
        city:    "Bengaluru",
        state:   "Karnataka",
        pincode: "560001",
      },
    },
  },
  "superadmin@platform.internal": {
    password: getGuardedPassword("admin123"),
    profile: {
      id:       "usr-superadmin-002",
      name:     "Platform Systems Architect",
      initials: "PA",
      email:    "superadmin@platform.internal",
      role:     "super_admin",
      phone:    "+91 99999 00001",
      address: {
        street:  "Global Platform Healthtech Hub",
        city:    "Bengaluru",
        state:   "Karnataka",
        pincode: "560001",
      },
    },
  },
  [DEMO_CREDENTIALS.ADMIN.email]: {
    password: getGuardedPassword(DEMO_CREDENTIALS.ADMIN.password),
    profile: {
      id:       "usr-admin-001",
      name:     HOSPITAL.DOCTOR_NAME,
      initials: "BK",
      email:    HOSPITAL.DOCTOR_EMAIL,
      role:     "admin",
      phone:    HOSPITAL.PHONE_DISPLAY,
      address: {
        street:  HOSPITAL.ADDRESS.STREET,
        city:    HOSPITAL.ADDRESS.CITY,
        state:   HOSPITAL.ADDRESS.STATE,
        pincode: HOSPITAL.ADDRESS.PINCODE,
      },
      savedUpiId: DOCTOR.UPI_ID,
      savedCards: [
        {
          id: "card-admin-1",
          cardHolder: HOSPITAL.DOCTOR_NAME,
          cardNumber: "**** **** **** 9911",
          brand: "Visa",
          expiry: "09/29",
          isDefault: true,
        },
      ],
    },
  },
  [DEMO_CREDENTIALS.PATIENT.email]: {
    password: getGuardedPassword(DEMO_CREDENTIALS.PATIENT.password),
    profile: {
      id:       "usr-001",
      name:     "John Doe",
      firstName: "John",
      middleName: "",
      lastName:  "Doe",
      initials: "JD",
      email:    DEMO_CREDENTIALS.PATIENT.email,
      role:     "patient",
      phone:    "+1 555-0155",
      address: {
        street: "42 Park Avenue",
        city: "Metropolis",
        state: "State",
        pincode: "10001",
      },
      savedUpiId: "john.doe@okicici",
      savedCards: [
        {
          id: "card-jd-1",
          cardHolder: "John Doe",
          cardNumber: "**** **** **** 4242",
          brand: "Visa",
          expiry: "12/28",
          isDefault: true,
        },
      ],
    },
  },
  "admin@agastyahomoeo.com": {
    password: getGuardedPassword("admin123"),
    profile: {
      id:       "usr-admin-001",
      name:     HOSPITAL.DOCTOR_NAME,
      initials: "BK",
      email:    HOSPITAL.DOCTOR_EMAIL,
      role:     "admin",
      phone:    HOSPITAL.PHONE_DISPLAY,
      address: {
        street:  HOSPITAL.ADDRESS.STREET,
        city:    HOSPITAL.ADDRESS.CITY,
        state:   HOSPITAL.ADDRESS.STATE,
        pincode: HOSPITAL.ADDRESS.PINCODE,
      },
      savedUpiId: DOCTOR.UPI_ID,
      savedCards: [
        {
          id: "card-admin-1",
          cardHolder: HOSPITAL.DOCTOR_NAME,
          cardNumber: "**** **** **** 9911",
          brand: "Visa",
          expiry: "09/29",
          isDefault: true,
        },
      ],
    },
  },
  "john@agastyahomoeo.com": {
    password: getGuardedPassword("patient123"),
    profile: {
      id:       "usr-001",
      name:     "John Doe",
      firstName: "John",
      middleName: "",
      lastName:  "Doe",
      initials: "JD",
      email:    "john@agastyahomoeo.com",
      role:     "patient",
      phone:    "+91 98123 45678",
      address: {
        street: "42 Park Avenue, Koramangala 4th Block",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560034",
      },
      savedUpiId: "john.doe@okicici",
      savedCards: [
        {
          id: "card-jd-1",
          cardHolder: "John Doe",
          cardNumber: "**** **** **** 4242",
          brand: "Visa",
          expiry: "12/28",
          isDefault: true,
        },
        {
          id: "card-jd-2",
          cardHolder: "John Doe",
          cardNumber: "**** **** **** 8899",
          brand: "Mastercard",
          expiry: "05/27",
        },
      ],
    },
  },
  "priya@agastyahomoeo.com": {
    password: getGuardedPassword("priya2026"),
    profile: {
      id:       "usr-002",
      name:     "Priya Sharma",
      firstName: "Priya",
      middleName: "",
      lastName:  "Sharma",
      initials: "PS",
      email:    "priya@agastyahomoeo.com",
      role:     "patient",
      phone:    "+91 99887 76655",
      address: {
        street: "12 Greenway Heights, Connaught Place",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110001",
      },
      savedUpiId: "priya.sharma@okaxis",
      savedCards: [
        {
          id: "card-ps-1",
          cardHolder: "Priya Sharma",
          cardNumber: "**** **** **** 5544",
          brand: "Mastercard",
          expiry: "10/29",
          isDefault: true,
        },
      ],
    },
  },
};

