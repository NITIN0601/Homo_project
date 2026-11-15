"""
Unit tests for HIPAA-compliant Zero-PHI Telemetry and Crash Reporting.
"""

import json
import unittest
from pathlib import Path
from fastapi.testclient import TestClient
from main import app
from schemas.telemetry import scrub_phi_pii

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CRASH_LOG_FILE = DATA_DIR / "crash_reports.jsonl"


class TestTelemetrySanitization(unittest.TestCase):
    def test_scrub_phi_pii(self):
        sample = "Error with user john.doe@example.com and phone +1-555-123-4567, token Bearer abc123def, card 4111-2222-3333-4444 and ssn 123-45-6789"
        sanitized = scrub_phi_pii(sample)
        self.assertNotIn("john.doe@example.com", sanitized)
        self.assertIn("[REDACTED_EMAIL]", sanitized)
        self.assertNotIn("+1-555-123-4567", sanitized)
        self.assertIn("[REDACTED_PHONE]", sanitized)
        self.assertNotIn("Bearer abc123def", sanitized)
        self.assertIn("[REDACTED_TOKEN]", sanitized)
        self.assertNotIn("4111-2222-3333-4444", sanitized)
        self.assertIn("[REDACTED_CARD]", sanitized)
        self.assertNotIn("123-45-6789", sanitized)
        self.assertIn("[REDACTED_SSN]", sanitized)


class TestTelemetryEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app, raise_server_exceptions=False)

    def test_post_crash_report(self):
        payload = {
            "incident_id": "inc-test-999",
            "timestamp": "2026-11-15T00:00:00Z",
            "error_name": "TypeError",
            "error_message": "Cannot read property of patient jane@clinic.com with phone 555-0199",
            "stack_trace": "at PatientRecord.render (http://localhost:5173/src/Record.tsx?token=secret123:10:5)",
            "component_stack": "at PatientRecord at RootErrorBoundary",
            "url": "/patients/view?patient=jane@clinic.com",
            "route": "/patients/view",
            "device": {
                "screen_width": 1920,
                "screen_height": 1080,
                "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                "language": "en-US",
                "platform": "MacIntel",
                "online": True
            },
            "location": {
                "timezone": "America/New_York",
                "locale": "en-US"
            },
            "source": "RootErrorBoundary",
            "user_action": "report_and_reload"
        }

        resp = self.client.post("/api/telemetry/report", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "recorded")
        self.assertEqual(data.get("incident_id"), "inc-test-999")

        # Verify crash log exists and contains the sanitized entry
        self.assertTrue(CRASH_LOG_FILE.exists())
        with open(CRASH_LOG_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        found = False
        for line in reversed(lines):
            try:
                rec = json.loads(line)
                if rec.get("incident_id") == "inc-test-999":
                    found = True
                    # Verify no PHI/PII was written
                    self.assertNotIn("jane@clinic.com", rec["error_message"])
                    self.assertIn("[REDACTED_EMAIL]", rec["error_message"])
                    self.assertNotIn("555-0199", rec["error_message"])
                    self.assertIn("[REDACTED_PHONE]", rec["error_message"])
                    self.assertNotIn("secret123", rec["stack_trace"])
                    break
            except Exception:
                continue

        self.assertTrue(found, "Reported incident not found in crash_reports.jsonl")

    def test_global_unhandled_exception_telemetry(self):
        # Register a temporary fault route to verify unhandled 500 handling
        @app.get("/api/test-fault-unhandled")
        async def fault_route():
            raise ZeroDivisionError("division by zero while processing patient alice@test.com")

        resp = self.client.get("/api/test-fault-unhandled")
        self.assertEqual(resp.status_code, 500)
        data = resp.json()
        self.assertIn("incident_id", data)
        self.assertTrue(data["incident_id"].startswith("inc-be-"))

        # Verify crash log captured the unhandled backend exception with sanitized error message
        with open(CRASH_LOG_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()

        found = False
        for line in reversed(lines):
            try:
                rec = json.loads(line)
                if rec.get("incident_id") == data["incident_id"]:
                    found = True
                    self.assertEqual(rec["error_name"], "ZeroDivisionError")
                    self.assertNotIn("alice@test.com", rec["error_message"])
                    self.assertIn("[REDACTED_EMAIL]", rec["error_message"])
                    break
            except Exception:
                continue

        self.assertTrue(found, "Backend unhandled exception not found in crash_reports.jsonl")


if __name__ == "__main__":
    unittest.main()
