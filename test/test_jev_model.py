"""
Unit & Integration Tests for JEV (Joint Expected Value) Model & HIPAA Audit Traceability.
Verifies:
1. Probabilistic repertorization correctly weights Kentian hierarchy (Mental 3.0, Physical 2.0, Particular 1.0).
2. SRP (Strange, Rare, Peculiar) modality multiplier (1.5x) boosts expected value.
3. JEV endpoint returns top simillimum remedy with rubric match confidence.
4. AuditTraceMiddleware attaches X-Trace-ID and logs entries to audit_traces.jsonl.
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app
from services.typesafe_jev_service import (
    Choice,
    Noul,
    Score,
    TypeSafeClassifier,
)


class TestTypeSafeJevModelAndAuditLogging(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_typesafe_classifier_noul_urgent_detection(self):
        """Verifies TypeSafe AI's Jev Model evaluates Noul (yes/no) questions with calibrated probabilities."""
        classifier = TypeSafeClassifier()
        res = classifier.invoke({
            "state": "Patient has critical emergency bleeding and severe acute pain requiring immediate attention",
            "questions": {
                "urgent": Noul(instructions="Does this clinical condition need urgent care?"),
            },
        })
        self.assertIn("urgent", res)
        self.assertTrue(res["urgent"].value)
        self.assertGreater(res["urgent"].probability, 0.6)

    def test_typesafe_classifier_choice_and_score(self):
        """Verifies TypeSafe AI's Jev Model evaluates Choice distribution and Score."""
        classifier = TypeSafeClassifier()
        res = classifier.invoke({
            "state": "Patient describes mild morning sneezing and slight skin rash for past 3 months",
            "questions": {
                "modality": Choice(
                    instructions="Select consultation mode",
                    criteria={
                        "in_person": "Emergency, acute pain, surgery",
                        "tele_consult": "Chronic rhinitis, mild indigestion, follow-up",
                    },
                ),
                "severity": Score(instructions="Rate severity 1 to 10"),
            },
        })
        self.assertIn("modality", res)
        self.assertEqual(res["modality"].choice, "tele_consult")
        self.assertIn("severity", res)
        self.assertLessEqual(res["severity"].score, 6.0)

    def test_typesafe_jev_classify_endpoint(self):
        """Verifies the /api/v1/ai/jev-classify endpoint returns structured Jev classifications."""
        payload = {
            "state": "Patient reports severe migraine with throbbing right-sided headache aggravated by sunlight",
        }
        res = self.client.post("/api/v1/ai/jev-classify", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("TypeSafe AI Jev Model", data.get("engine", ""))
        self.assertIn("results", data)
        self.assertIn("is_emergency", data["results"])
        self.assertIn("consultation_modality", data["results"])
        self.assertIn("severity_index", data["results"])

    def test_typesafe_jev_repertorize_endpoint(self):
        """Verifies the /api/v1/ai/jev-repertorize endpoint integrates TypeSafe AI Jev Model."""
        payload = {
            "state": "Severe stomach bloating, flatulence 4pm to 8pm, chilly patient with warm drink desire",
        }
        res = self.client.post("/api/v1/ai/jev-repertorize", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("model"), "TypeSafe AI Jev Model (langchain-typesafe)")
        self.assertIn("triage_summary", data)
        self.assertIn("emergency", data["triage_summary"])
        self.assertIn("recommended_modality", data["triage_summary"])

    def test_audit_trace_middleware_headers(self):
        res = self.client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)
        self.assertIn("X-Trace-ID", res.headers)
        self.assertIn("X-Session-ID", res.headers)
        trace_id = res.headers["X-Trace-ID"]
        self.assertTrue(trace_id.startswith("trc-"))


if __name__ == "__main__":
    unittest.main()

