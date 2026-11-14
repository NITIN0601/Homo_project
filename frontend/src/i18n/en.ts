export const en = {
  common: {
    loading: "Loading…",
    save: "Save Changes",
    cancel: "Cancel",
    close: "Close",
    retry: "Retry",
    delete: "Delete",
    edit: "Edit",
    confirm: "Confirm",
    back: "Back",
  },
  auth: {
    signIn: "Sign In",
    signOut: "Sign Out",
    createAccount: "Create Account",
    email: "Email Address",
    password: "Password",
    doctorPortal: "Doctor Portal",
    patientPortal: "Patient Portal",
    superAdminPortal: "Super Administrator Console",
  },
  cart: {
    title: "Your Cart & Checkout",
    empty: "Your cart is empty",
    subtotal: "Subtotal",
    shipping: "Shipping",
    tax: "GST (5%)",
    total: "Total",
    proceedToCheckout: "Proceed to Payment & Checkout",
    clearCart: "Clear Cart",
    orderConfirmed: "Order Confirmed & Dispatched",
    trackPackage: "Track Package Live",
  },
  calendar: {
    title: "Doctor Schedule, Out-of-Office & Availability Manager",
    blockDates: "Block Clinic Dates & Time Slots",
    allDay: "All Day (Full Day)",
    timeBased: "Specific Time / Hours",
    morningSession: "Morning Session",
    eveningSession: "Evening Session",
    unblock: "Unblock",
    inspect: "Inspect",
  },
  superadmin: {
    title: "Super Administrator Console",
    onboardHospital: "Onboard New Hospital",
    totalFacilities: "Total Facilities",
    physiciansOnboarded: "Physicians Onboarded",
    manageFeatures: "Manage Features",
  },
} as const;

export type TranslationKey =
  | `common.${keyof typeof en.common}`
  | `auth.${keyof typeof en.auth}`
  | `cart.${keyof typeof en.cart}`
  | `calendar.${keyof typeof en.calendar}`
  | `superadmin.${keyof typeof en.superadmin}`;

