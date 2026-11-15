"""
Unified Multi-Tenant Location Currency Utility.
Infers local billing currency and symbol based on hospital/clinic/doctor location country.
"""

from typing import Any

SUPPORTED_CURRENCIES: list[dict[str, str]] = [
    {"code": "INR", "symbol": "₹", "name": "Indian Rupee (INR)", "locale": "en_IN"},
    {"code": "USD", "symbol": "$", "name": "US Dollar (USD)", "locale": "en_US"},
    {"code": "GBP", "symbol": "£", "name": "British Pound (GBP)", "locale": "en_GB"},
    {"code": "AED", "symbol": "AED", "name": "UAE Dirham (AED)", "locale": "en_AE"},
    {"code": "EUR", "symbol": "€", "name": "Euro (EUR)", "locale": "de_DE"},
    {"code": "SGD", "symbol": "S$", "name": "Singapore Dollar (SGD)", "locale": "en_SG"},
    {"code": "AUD", "symbol": "A$", "name": "Australian Dollar (AUD)", "locale": "en_AU"},
    {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar (CAD)", "locale": "en_CA"},
    {"code": "JPY", "symbol": "¥", "name": "Japanese Yen (JPY)", "locale": "ja_JP"},
]


def infer_currency_from_country(country: str | None = None) -> dict[str, str]:
    """
    Infers the billing currency code and symbol based on facility / doctor country.
    """
    c = (country or "").strip().lower()

    if not c or c in ["india", "bharat", "in"]:
        return {"code": "INR", "symbol": "₹", "name": "Indian Rupee (INR)", "locale": "en_IN"}

    if c in ["united states", "usa", "us", "u.s.", "u.s.a.", "united states of america"]:
        return {"code": "USD", "symbol": "$", "name": "US Dollar (USD)", "locale": "en_US"}

    if c in ["united kingdom", "uk", "great britain", "gb", "england", "scotland", "wales"]:
        return {"code": "GBP", "symbol": "£", "name": "British Pound (GBP)", "locale": "en_GB"}

    if c in ["united arab emirates", "uae", "ae", "dubai", "abu dhabi", "qatar", "saudi arabia"]:
        return {"code": "AED", "symbol": "AED", "name": "UAE Dirham (AED)", "locale": "en_AE"}

    if c in ["singapore", "sg"]:
        return {"code": "SGD", "symbol": "S$", "name": "Singapore Dollar (SGD)", "locale": "en_SG"}

    if c in ["australia", "au"]:
        return {"code": "AUD", "symbol": "A$", "name": "Australian Dollar (AUD)", "locale": "en_AU"}

    if c in ["canada", "ca"]:
        return {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar (CAD)", "locale": "en_CA"}

    if c in ["germany", "france", "spain", "italy", "netherlands", "ireland", "belgium", "austria", "portugal", "greece", "finland", "europe", "eu", "de", "fr", "es", "it", "nl", "ie", "be", "at", "pt"]:
        return {"code": "EUR", "symbol": "€", "name": "Euro (EUR)", "locale": "de_DE"}

    if c in ["japan", "jp"]:
        return {"code": "JPY", "symbol": "¥", "name": "Japanese Yen (JPY)", "locale": "ja_JP"}

    return {"code": "INR", "symbol": "₹", "name": "Indian Rupee (INR)", "locale": "en_IN"}


def format_currency(amount: float, currency_code: str = "INR", currency_symbol: str = "₹") -> str:
    """Formats an amount with the currency symbol."""
    sep = " " if len(currency_symbol) > 1 and currency_symbol.isalpha() else ""
    val = f"{amount:,.2f}" if amount % 1 != 0 else f"{int(amount):,}"
    return f"{currency_symbol}{sep}{val}"
