"""
Unit Tests for Location-to-Currency Resolution and Dynamic Country Billing.
"""

import asyncio
import unittest
import uuid
from core.currency_utils import infer_currency_from_country, format_currency, SUPPORTED_CURRENCIES
from services.onboarding_service import onboard


class TestCurrencyLocationResolution(unittest.TestCase):
    def test_infer_currency_for_major_countries(self):
        # India -> INR
        curr = infer_currency_from_country("India")
        self.assertEqual(curr["code"], "INR")
        self.assertEqual(curr["symbol"], "₹")

        # USA -> USD
        curr_usa = infer_currency_from_country("USA")
        self.assertEqual(curr_usa["code"], "USD")
        self.assertEqual(curr_usa["symbol"], "$")

        curr_us = infer_currency_from_country("United States")
        self.assertEqual(curr_us["code"], "USD")

        # UK -> GBP
        curr_uk = infer_currency_from_country("United Kingdom")
        self.assertEqual(curr_uk["code"], "GBP")
        self.assertEqual(curr_uk["symbol"], "£")

        # UAE -> AED
        curr_uae = infer_currency_from_country("United Arab Emirates")
        self.assertEqual(curr_uae["code"], "AED")
        self.assertEqual(curr_uae["symbol"], "AED")

        # Eurozone
        curr_de = infer_currency_from_country("Germany")
        self.assertEqual(curr_de["code"], "EUR")
        self.assertEqual(curr_de["symbol"], "€")

        curr_fr = infer_currency_from_country("France")
        self.assertEqual(curr_fr["code"], "EUR")

        # Australia, Canada, Singapore
        self.assertEqual(infer_currency_from_country("Canada")["code"], "CAD")
        self.assertEqual(infer_currency_from_country("Australia")["code"], "AUD")
        self.assertEqual(infer_currency_from_country("Singapore")["code"], "SGD")

    def test_fallback_currency(self):
        # Fallback to INR
        curr_empty = infer_currency_from_country("")
        self.assertEqual(curr_empty["code"], "INR")

        curr_none = infer_currency_from_country(None)
        self.assertEqual(curr_none["code"], "INR")

        curr_unknown = infer_currency_from_country("Atlantis")
        self.assertEqual(curr_unknown["code"], "INR")

    def test_format_currency(self):
        self.assertEqual(format_currency(750, "INR", "₹"), "₹750")
        self.assertEqual(format_currency(120, "USD", "$"), "$120")
        self.assertEqual(format_currency(1500, "GBP", "£"), "£1,500")
        self.assertEqual(format_currency(350, "AED", "AED"), "AED 350")
        self.assertEqual(format_currency(100.5, "USD", "$"), "$100.50")

    def test_onboarding_assigns_local_currency(self):
        # US facility onboarding
        unique_id = f"manhattan-care-{uuid.uuid4().hex[:6]}"
        payload = {
            "id": unique_id,
            "name": "Manhattan Integrative Care",
            "country": "United States",
            "state": "New York",
            "city": "New York",
            "doctor_name": "Dr. Sarah Jenkins",
            "doctor_email": "sarah.jenkins@manhattancare.com",
            "consultation_fee": 150,
        }
        res = asyncio.run(onboard("hospital", payload, actor_email="superadmin@health.org"))
        tenant = res.get("hospital", {})
        try:
            self.assertEqual(tenant.get("currency"), "USD")
            self.assertEqual(tenant.get("currencySymbol"), "$")
        finally:
            from services.hospital_service import get_all_hospitals, save_json, HOSPITALS_FILE
            hospitals = [h for h in get_all_hospitals() if h.get("id") != unique_id]
            save_json(HOSPITALS_FILE, hospitals)

            from services.doctor_service import get_all_doctors, DOCTORS_FILE
            doctors = [d for d in get_all_doctors() if d.get("hospitalId") != unique_id]
            save_json(DOCTORS_FILE, doctors)


if __name__ == "__main__":
    unittest.main()
