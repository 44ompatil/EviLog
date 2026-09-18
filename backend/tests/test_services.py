from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from app.schemas import (
    CaseCreate,
    EvidenceCreate,
    OfficerCreate,
    RFIDTagCreate,
)
from app.services import (
    ServiceError,
    assign_rfid_to_evidence,
    create_case,
    create_evidence,
    create_officer,
    get_case,
    get_evidence,
    get_officer,
    get_rfid_tag,
    list_cases,
    list_evidence,
    list_officers,
    list_rfid_tags,
    register_rfid_tag,
    release_rfid_from_evidence,
)


class FakeCollection:
    def __init__(self):
        self.documents = []

    def insert_one(self, document):
        self.documents.append(document.copy())
        return SimpleNamespace(inserted_id=len(self.documents))

    def find_one(self, query):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return document
        return None

    def find(self):
        return list(self.documents)

    def update_one(self, query, update):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                if "$set" in update:
                    document.update(update["$set"])
                return SimpleNamespace(modified_count=1)
        return SimpleNamespace(modified_count=0)


class FakeDatabase:
    def __init__(self):
        self.collections = {
            "cases": FakeCollection(),
            "evidence": FakeCollection(),
            "officers": FakeCollection(),
            "rfid_tags": FakeCollection(),
            "rfid_mappings": FakeCollection(),
        }

    def __getitem__(self, name):
        return self.collections[name]


class TestEviLogServices(TestCase):
    def setUp(self):
        self.fake_db = FakeDatabase()

    def test_case_creation_and_listing(self):
        with patch("app.services.evilog_service.get_database", return_value=self.fake_db):
            case = create_case(
                CaseCreate(
                    case_id="CASE-101",
                    fir_number="FIR-101",
                    case_title="Theft investigation",
                    description="A stolen bag was reported",
                    case_type="criminal",
                    status="open",
                    created_at=datetime(2025, 1, 10, 9, 0),
                )
            )
            self.assertEqual(case.case_id, "CASE-101")
            self.assertEqual(get_case("CASE-101").case_id, "CASE-101")
            self.assertEqual(len(list_cases()), 1)

    def test_evidence_creation_and_listing(self):
        with patch("app.services.evilog_service.get_database", return_value=self.fake_db):
            create_case(
                CaseCreate(
                    case_id="CASE-202",
                    fir_number="FIR-202",
                    case_title="Evidence seizure",
                    description="Recorded evidence",
                    case_type="civil",
                    status="open",
                    created_at=datetime(2025, 1, 11, 9, 0),
                )
            )
            evidence = create_evidence(
                EvidenceCreate(
                    evidence_id="EV-202",
                    case_id="CASE-202",
                    evidence_name="Laptop",
                    evidence_type="digital",
                    description="Seized laptop",
                    status="stored",
                    registered_at=datetime(2025, 1, 12, 10, 0),
                )
            )
            self.assertEqual(evidence.evidence_id, "EV-202")
            self.assertEqual(get_evidence("EV-202").evidence_id, "EV-202")
            self.assertEqual(len(list_evidence()), 1)

    def test_officer_creation_and_listing(self):
        with patch("app.services.evilog_service.get_database", return_value=self.fake_db):
            officer = create_officer(
                OfficerCreate(
                    officer_id="OF-303",
                    name="Riya Singh",
                    badge_number="BADGE-303",
                    role="Investigator",
                    status="active",
                    registered_at=datetime(2025, 1, 13, 8, 30),
                )
            )
            self.assertEqual(officer.officer_id, "OF-303")
            self.assertEqual(get_officer("OF-303").officer_id, "OF-303")
            self.assertEqual(len(list_officers()), 1)

    def test_rfid_registration_assignment_and_release(self):
        with patch("app.services.evilog_service.get_database", return_value=self.fake_db):
            create_case(
                CaseCreate(
                    case_id="CASE-404",
                    fir_number="FIR-404",
                    case_title="RFID test",
                    description="Testing RFID lifecycle",
                    case_type="criminal",
                    status="open",
                    created_at=datetime(2025, 1, 15, 9, 0),
                )
            )
            create_evidence(
                EvidenceCreate(
                    evidence_id="EV-404",
                    case_id="CASE-404",
                    evidence_name="Box",
                    evidence_type="physical",
                    description="Testing box",
                    status="stored",
                    registered_at=datetime(2025, 1, 15, 10, 0),
                )
            )
            tag = register_rfid_tag(
                RFIDTagCreate(
                    rfid_id="RFID-404",
                    status="available",
                    registered_at=datetime(2025, 1, 15, 11, 0),
                )
            )
            self.assertEqual(tag.status, "available")

            mapping = assign_rfid_to_evidence("RFID-404", "EV-404")
            self.assertEqual(mapping.rfid_id, "RFID-404")
            self.assertEqual(mapping.evidence_id, "EV-404")
            self.assertEqual(get_rfid_tag("RFID-404").status, "assigned")

            self.assertEqual(len(self.fake_db.collections["rfid_mappings"].documents), 1)

            released_tag = release_rfid_from_evidence("RFID-404", "EV-404")
            self.assertEqual(released_tag.status, "available")
            self.assertEqual(len(self.fake_db.collections["rfid_mappings"].documents), 1)
            self.assertEqual(
                self.fake_db.collections["rfid_mappings"].documents[0]["rfid_id"],
                "RFID-404",
            )

    def test_missing_referenced_records_and_duplicate_identifiers(self):
        with patch("app.services.evilog_service.get_database", return_value=self.fake_db):
            with self.assertRaises(ServiceError):
                create_evidence(
                    EvidenceCreate(
                        evidence_id="EV-500",
                        case_id="MISSING-CASE",
                        evidence_name="Missing case evidence",
                        evidence_type="digital",
                        description="orphan evidence",
                        status="stored",
                        registered_at=datetime(2025, 1, 15, 8, 0),
                    )
                )

            with self.assertRaises(ServiceError):
                assign_rfid_to_evidence("RFID-500", "EV-500")

            create_case(
                CaseCreate(
                    case_id="CASE-500",
                    fir_number="FIR-500",
                    case_title="Duplicate case",
                    description="case to duplicate",
                    case_type="criminal",
                    status="open",
                    created_at=datetime(2025, 1, 15, 9, 0),
                )
            )
            with self.assertRaises(ServiceError):
                create_case(
                    CaseCreate(
                        case_id="CASE-500",
                        fir_number="FIR-500-B",
                        case_title="Duplicate case again",
                        description="second case same id",
                        case_type="criminal",
                        status="open",
                        created_at=datetime(2025, 1, 15, 9, 5),
                    )
                )


if __name__ == "__main__":
    import unittest

    unittest.main()
