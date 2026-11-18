import type { RouteDefinition } from "./routeTypes";

export const APP_ROUTES: RouteDefinition[] = [
  { path: "/", page: "home", title: "Home" },
  { path: "/about", page: "about", title: "About Clinic" },
  { path: "/appointments", page: "appointments", title: "Book Appointment" },
  { path: "/order-medicine", page: "order-medicine", title: "Pharmacy" },
  { path: "/cart", page: "cart-page", title: "Cart & Checkout" },
  { path: "/medical-records", page: "visit-summary", title: "Medical Records", isProtected: true },
  { path: "/admin", page: "admin-dashboard", title: "Clinical Console", isProtected: true, requiredRole: "admin" },
  { path: "/superadmin", page: "super-admin-dashboard", title: "Platform SuperAdmin", isProtected: true, requiredRole: "super_admin" },
  { path: "/join", page: "join", title: "Find Clinic" },
  { path: "/mobile-worker", page: "mobile-worker", title: "Ward Mobile Portal" },
  { path: "/terms", page: "terms", title: "Terms of Service" },
  { path: "/privacy", page: "privacy-policy", title: "Privacy Policy" },
];
