export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPasscode(passcode: string): boolean {
  return /^\d{4,8}$/.test(passcode.trim());
}
