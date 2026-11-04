import type { UserProfile } from "../../types";
import { CLINIC, DEMO_CREDENTIALS, DOCTOR } from "../../config";

export const MOCK_ACCOUNTS: Record<string, { password: string; profile: UserProfile }> = {
  [DEMO_CREDENTIALS.ADMIN.email]: {
    password: DEMO_CREDENTIALS.ADMIN.password,
    profile: {
      id:       "usr-admin-001",
      name:     CLINIC.DOCTOR_NAME,
      initials: "BK",
      email:    CLINIC.DOCTOR_EMAIL,
      role:     "admin",
      phone:    CLINIC.PHONE_DISPLAY,
      address: {
        street:  CLINIC.ADDRESS.STREET,
        city:    CLINIC.ADDRESS.CITY,
        state:   CLINIC.ADDRESS.STATE,
        pincode: CLINIC.ADDRESS.PINCODE,
      },
      savedUpiId: DOCTOR.UPI_ID,
      savedCards: [
        {
          id: "card-admin-1",
          cardHolder: CLINIC.DOCTOR_NAME,
          cardNumber: "**** **** **** 9911",
          brand: "Visa",
          expiry: "09/29",
          isDefault: true,
        },
      ],
    },
  },
  "admin@agastyahomoeo.com": {
    password: "admin123",
    profile: {
      id:       "usr-admin-001",
      name:     CLINIC.DOCTOR_NAME,
      initials: "BK",
      email:    CLINIC.DOCTOR_EMAIL,
      role:     "admin",
      phone:    CLINIC.PHONE_DISPLAY,
      address: {
        street:  CLINIC.ADDRESS.STREET,
        city:    CLINIC.ADDRESS.CITY,
        state:   CLINIC.ADDRESS.STATE,
        pincode: CLINIC.ADDRESS.PINCODE,
      },
      savedUpiId: DOCTOR.UPI_ID,
      savedCards: [
        {
          id: "card-admin-1",
          cardHolder: CLINIC.DOCTOR_NAME,
          cardNumber: "**** **** **** 9911",
          brand: "Visa",
          expiry: "09/29",
          isDefault: true,
        },
      ],
    },
  },
  "john@agastyahomoeo.com": {
    password: "patient123",
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
    password: "priya2026",
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

