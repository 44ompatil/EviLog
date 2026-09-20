from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


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
            "transactions": FakeCollection(),
            "chain_of_custody": FakeCollection(),
            "security_alerts": FakeCollection(),
        }

    def __getitem__(self, name):
        return self.collections[name]


@pytest.fixture
def client():
    fake_db = FakeDatabase()
    with patch("app.main.initialize_database"), patch("app.main.verify_database"), patch(
        "app.services.evilog_service.get_database", return_value=fake_db
    ), patch("app.services.event_processing_service.get_database", return_value=fake_db):
        with TestClient(app) as test_client:
            yield test_client


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_case_crud_and_validation(client):
    payload = {
        "case_id": "CASE-101",
        "fir_number": "FIR-101",
        "case_title": "Theft investigation",
        "description": "A stolen bag was reported",
        "case_type": "criminal",
        "status": "open",
        "created_at": "2025-01-10T09:00:00",
    }
    create_response = client.post("/api/cases", json=payload)
    assert create_response.status_code == 201
    assert create_response.json()["case_id"] == "CASE-101"

    get_response = client.get("/api/cases/CASE-101")
    assert get_response.status_code == 200
    assert get_response.json()["case_id"] == "CASE-101"

    list_response = client.get("/api/cases")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    invalid_response = client.post("/api/cases", json={"case_id": "", "fir_number": "FIR-102"})
    assert invalid_response.status_code == 422

    missing_response = client.get("/api/cases/CASE-999")
    assert missing_response.status_code == 404


def test_evidence_api_for_valid_case_and_missing_case_reference(client):
    case_payload = {
        "case_id": "CASE-202",
        "fir_number": "FIR-202",
        "case_title": "Evidence seizure",
        "description": "Recorded evidence",
        "case_type": "civil",
        "status": "open",
        "created_at": "2025-01-11T09:00:00",
    }
    assert client.post("/api/cases", json=case_payload).status_code == 201

    evidence_payload = {
        "evidence_id": "EV-202",
        "case_id": "CASE-202",
        "evidence_name": "Laptop",
        "evidence_type": "digital",
        "description": "Seized laptop",
        "status": "stored",
        "registered_at": "2025-01-12T10:00:00",
    }
    create_response = client.post("/api/evidence", json=evidence_payload)
    assert create_response.status_code == 201
    assert create_response.json()["evidence_id"] == "EV-202"

    get_response = client.get("/api/evidence/EV-202")
    assert get_response.status_code == 200
    assert get_response.json()["case_id"] == "CASE-202"

    list_response = client.get("/api/evidence")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    invalid_missing_case = client.post(
        "/api/evidence",
        json={
            "evidence_id": "EV-999",
            "case_id": "CASE-404",
            "evidence_name": "Missing case evidence",
            "evidence_type": "digital",
            "description": "Invalid reference",
            "status": "stored",
            "registered_at": "2025-01-15T08:00:00",
        },
    )
    assert invalid_missing_case.status_code == 404


def test_officer_api_and_duplicate_identifier(client):
    payload = {
        "officer_id": "OF-303",
        "name": "Riya Singh",
        "badge_number": "BADGE-303",
        "role": "Investigator",
        "status": "active",
        "registered_at": "2025-01-13T08:30:00",
    }
    create_response = client.post("/api/officers", json=payload)
    assert create_response.status_code == 201
    assert create_response.json()["officer_id"] == "OF-303"

    get_response = client.get("/api/officers/OF-303")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Riya Singh"

    list_response = client.get("/api/officers")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    duplicate_response = client.post("/api/officers", json=payload)
    assert duplicate_response.status_code == 409


def test_rfid_api_lifecycle_and_validation(client):
    case_payload = {
        "case_id": "CASE-404",
        "fir_number": "FIR-404",
        "case_title": "RFID test",
        "description": "Testing RFID lifecycle",
        "case_type": "criminal",
        "status": "open",
        "created_at": "2025-01-15T09:00:00",
    }
    assert client.post("/api/cases", json=case_payload).status_code == 201

    evidence_payload = {
        "evidence_id": "EV-404",
        "case_id": "CASE-404",
        "evidence_name": "Box",
        "evidence_type": "physical",
        "description": "Testing box",
        "status": "stored",
        "registered_at": "2025-01-15T10:00:00",
    }
    assert client.post("/api/evidence", json=evidence_payload).status_code == 201

    rfid_payload = {
        "rfid_id": "RFID-404",
        "status": "available",
        "registered_at": "2025-01-15T11:00:00",
    }
    register_response = client.post("/api/rfid", json=rfid_payload)
    assert register_response.status_code == 201
    assert register_response.json()["rfid_id"] == "RFID-404"

    get_response = client.get("/api/rfid/RFID-404")
    assert get_response.status_code == 200
    assert get_response.json()["status"] == "available"

    list_response = client.get("/api/rfid")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    assign_response = client.post("/api/rfid/assign", json={"rfid_id": "RFID-404", "evidence_id": "EV-404", "assigned_to": "EV-404"})
    assert assign_response.status_code == 200
    assert assign_response.json()["rfid_id"] == "RFID-404"
    assert assign_response.json()["evidence_id"] == "EV-404"

    assigned_tag = client.get("/api/rfid/RFID-404")
    assert assigned_tag.status_code == 200
    assert assigned_tag.json()["status"] == "assigned"

    duplicate_assign = client.post("/api/rfid/assign", json={"rfid_id": "RFID-404", "evidence_id": "EV-404", "assigned_to": "EV-404"})
    assert duplicate_assign.status_code == 409

    invalid_rfid = client.get("/api/rfid/RFID-999")
    assert invalid_rfid.status_code == 404

    invalid_evidence = client.post("/api/rfid/assign", json={"rfid_id": "RFID-404", "evidence_id": "EV-999", "assigned_to": "EV-999"})
    assert invalid_evidence.status_code == 404

    release_response = client.post("/api/rfid/release", json={"rfid_id": "RFID-404", "evidence_id": "EV-404"})
    assert release_response.status_code == 200
    assert release_response.json()["status"] == "available"

    bad_release = client.post("/api/rfid/release", json={"rfid_id": "RFID-404", "evidence_id": "EV-999"})
    assert bad_release.status_code == 404


def test_hardware_event_processing_valid_and_invalid(client):
    case_payload = {
        "case_id": "CASE-500",
        "fir_number": "FIR-500",
        "case_title": "Hardware event validation",
        "description": "Testing event pipeline",
        "case_type": "criminal",
        "status": "open",
        "created_at": "2025-02-01T09:00:00",
    }
    assert client.post("/api/cases", json=case_payload).status_code == 201

    evidence_payload = {
        "evidence_id": "EV-500",
        "case_id": "CASE-500",
        "evidence_name": "Laptop",
        "evidence_type": "digital",
        "description": "For hardware event validation",
        "status": "stored",
        "registered_at": "2025-02-01T10:00:00",
    }
    assert client.post("/api/evidence", json=evidence_payload).status_code == 201

    officer_payload = {
        "officer_id": "OF-500",
        "name": "Aisha Ali",
        "badge_number": "BADGE-500",
        "role": "Investigator",
        "status": "active",
        "registered_at": "2025-02-01T08:30:00",
    }
    assert client.post("/api/officers", json=officer_payload).status_code == 201

    rfid_payload = {
        "rfid_id": "RFID-500",
        "status": "available",
        "registered_at": "2025-02-01T11:00:00",
    }
    assert client.post("/api/rfid", json=rfid_payload).status_code == 201
    assert client.post("/api/rfid/assign", json={"rfid_id": "RFID-500", "evidence_id": "EV-500", "assigned_to": "EV-500"}).status_code == 200

    valid_event = client.post(
        "/api/hardware/events",
        json={
            "officer_id": "OF-500",
            "rfid_id": "RFID-500",
            "event_type": "access",
            "timestamp": "2025-02-01T12:00:00",
        },
    )
    assert valid_event.status_code == 200
    body = valid_event.json()
    assert body["status"] == "processed"
    assert body["transaction"]["evidence_id"] == "EV-500"
    assert body["chain_of_custody"]["evidence_id"] == "EV-500"
    assert body["transaction"]["officer_id"] == "OF-500"
    assert body["chain_of_custody"]["officer_id"] == "OF-500"

    invalid_officer = client.post(
        "/api/hardware/events",
        json={
            "officer_id": "OF-999",
            "rfid_id": "RFID-500",
            "event_type": "access",
            "timestamp": "2025-02-01T12:05:00",
        },
    )
    assert invalid_officer.status_code == 400
    assert invalid_officer.json()["status"] == "alert_created"

    invalid_event = client.post(
        "/api/hardware/events",
        json={
            "officer_id": "OF-500",
            "rfid_id": "RFID-500",
            "event_type": "unsupported_action",
            "timestamp": "2025-02-01T12:10:00",
        },
    )
    assert invalid_event.status_code == 400
    assert invalid_event.json()["status"] == "alert_created"

    missing_rfid = client.post(
        "/api/hardware/events",
        json={
            "officer_id": "OF-500",
            "rfid_id": "RFID-EMPTY",
            "event_type": "access",
            "timestamp": "2025-02-01T12:15:00",
        },
    )
    assert missing_rfid.status_code == 400
    assert missing_rfid.json()["status"] == "alert_created"
