"""
Unit Tests for Location-to-Timezone Resolution & Onboarding Integration.
"""

import unittest
from core.timezone_utils import infer_timezone_from_location, get_timezone_details


class TestTimezoneLocationResolution(unittest.TestCase):
    def test_infer_indian_cities_and_states(self):
        blr = infer_timezone_from_location("India", "Karnataka", "Bengaluru")
        self.assertEqual(blr["timeZone"], "Asia/Kolkata")
        self.assertEqual(blr["label"], "IST")
        self.assertEqual(blr["offset"], "UTC+05:30")
        self.assertEqual(blr["matchedBy"], "city")

        mum = infer_timezone_from_location("India", "Maharashtra", "Mumbai")
        self.assertEqual(mum["timeZone"], "Asia/Kolkata")

        delhi = infer_timezone_from_location("India", "Delhi", None)
        self.assertEqual(delhi["timeZone"], "Asia/Kolkata")
        self.assertEqual(delhi["matchedBy"], "state")

        india = infer_timezone_from_location("India", None, None)
        self.assertEqual(india["timeZone"], "Asia/Kolkata")
        self.assertEqual(india["matchedBy"], "country")

    def test_infer_us_timezones(self):
        # Eastern
        nyc = infer_timezone_from_location("USA", "New York", "New York")
        self.assertEqual(nyc["timeZone"], "America/New_York")
        self.assertEqual(nyc["matchedBy"], "city")

        # Pacific
        sf = infer_timezone_from_location("United States", "California", "San Francisco")
        self.assertEqual(sf["timeZone"], "America/Los_Angeles")

        # Central
        chi = infer_timezone_from_location("USA", "Illinois", "Chicago")
        self.assertEqual(chi["timeZone"], "America/Chicago")

        # Mountain
        den = infer_timezone_from_location("USA", "Colorado", "Denver")
        self.assertEqual(den["timeZone"], "America/Denver")

        # Arizona
        phx = infer_timezone_from_location("USA", "Arizona", "Phoenix")
        self.assertEqual(phx["timeZone"], "America/Phoenix")

    def test_infer_international_destinations(self):
        london = infer_timezone_from_location("United Kingdom", "England", "London")
        self.assertEqual(london["timeZone"], "Europe/London")

        dubai = infer_timezone_from_location("United Arab Emirates", "Dubai", "Dubai")
        self.assertEqual(dubai["timeZone"], "Asia/Dubai")

        sgp = infer_timezone_from_location("Singapore", None, "Singapore")
        self.assertEqual(sgp["timeZone"], "Asia/Singapore")

        syd = infer_timezone_from_location("Australia", "New South Wales", "Sydney")
        self.assertEqual(syd["timeZone"], "Australia/Sydney")

        perth = infer_timezone_from_location("Australia", "Western Australia", "Perth")
        self.assertEqual(perth["timeZone"], "Australia/Perth")

        tor = infer_timezone_from_location("Canada", "Ontario", "Toronto")
        self.assertEqual(tor["timeZone"], "America/Toronto")

    def test_timezone_details_calculation(self):
        kolkata = get_timezone_details("Asia/Kolkata")
        self.assertEqual(kolkata["timeZone"], "Asia/Kolkata")
        self.assertEqual(kolkata["label"], "IST")
        self.assertEqual(kolkata["offset"], "UTC+05:30")


if __name__ == "__main__":
    unittest.main()

