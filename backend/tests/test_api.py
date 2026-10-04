from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

FACE_SAMPLES = {
    "front_profile": "front-sample",
    "left_profile": "left-sample",
    "right_profile": "right-sample",
}
FACE_VECTOR = [1.0] + [0.0] * 127


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

    def find(self, query=None):
        if query is None:
            return list(self.documents)
        return [document for document in self.documents if all(document.get(key) == value for key, value in query.items())]

    def update_one(self, query, update):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                if "$set" in update:
                    document.update(update["$set"])
                return SimpleNamespace(modified_count=1)
        return SimpleNamespace(modified_count=0)

    def delete_one(self, query):
        for index, document in enumerate(self.documents):
            if all(document.get(key) == value for key, value in query.items()):
                del self.documents[index]
                return SimpleNamespace(deleted_count=1)
        return SimpleNamespace(deleted_count=0)

    def delete_many(self, query):
        before = len(self.documents)
        self.documents = [document for document in self.documents if not all(document.get(key) == value for key, value in query.items())]
        return SimpleNamespace(deleted_count=before - len(self.documents))

    def insert_many(self, documents):
        self.documents.extend(document.copy() for document in documents)


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
            "face_embeddings": FakeCollection(),
        }

    def __getitem__(self, name):
        return self.collections[name]


@pytest.fixture
def client():
    fake_db = FakeDatabase()
    with patch("app.main.initialize_database"), patch("app.main.verify_database"), patch(
        "app.services.evilog_service.get_database", return_value=fake_db
    ), patch("app.services.event_processing_service.get_database", return_value=fake_db), patch(
        "app.services.face_auth_service.get_database", return_value=fake_db
    ), patch("app.services.face_auth_service.FaceInferenceService") as inference, patch(
        "app.services.face_auth_service.decode_base64_image", return_value="decoded-image"
    ):
        inference.return_value.infer_embedding_from_image.return_value = FACE_VECTOR
        with TestClient(app) as test_client:
            test_client.app.state.fake_db = fake_db
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


def test_officer_api_requires_face_samples_and_returns_enrolled_officer(client):
    payload = {
        "name": "Riya Singh",
        "badge_number": "BADGE-303",
        "role": "Investigator",
        "status": "active",
        "face_samples": FACE_SAMPLES,
    }
    create_response = client.post("/api/officers", json=payload)
    assert create_response.status_code == 201
    officer_id = create_response.json()["officer_id"]
    assert create_response.json()["face_enrolled"] is True

    get_response = client.get(f"/api/officers/{officer_id}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Riya Singh"
    assert get_response.json()["face_enrolled"] is True

    list_response = client.get("/api/officers")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    missing_samples = client.post("/api/officers", json={key: value for key, value in payload.items() if key != "face_samples"})
    assert missing_samples.status_code == 400


@pytest.mark.parametrize("samples", [{}, {"front_profile": "front"}, {"front_profile": "front", "left_profile": "left"}])
def test_officer_registration_rejects_incomplete_face_profiles(client, samples):
    response = client.post("/api/officers", json={
        "name": "Incomplete Enrollment",
        "badge_number": "INCOMPLETE-1",
        "role": "Inspector",
        "status": "active",
        "face_samples": samples,
    })
    assert response.status_code == 400
    assert client.get("/api/officers").json() == []
    assert client.app.state.fake_db.collections["face_embeddings"].documents == []


def test_officer_registration_failure_does_not_persist_officer(client):
    with patch("app.services.face_auth_service.FaceInferenceService") as inference:
        inference.return_value.infer_embedding_from_image.side_effect = [FACE_VECTOR, RuntimeError("inference failure")]
        response = client.post("/api/officers", json={
            "name": "Failed Enrollment",
            "badge_number": "FAILED-1",
            "role": "Inspector",
            "status": "active",
            "face_samples": FACE_SAMPLES,
        })
    assert response.status_code == 400
    assert client.get("/api/officers").json() == []
    assert client.app.state.fake_db.collections["face_embeddings"].documents == []


def test_officer_is_not_reported_enrolled_for_incomplete_embeddings(client):
    client.app.state.fake_db.collections["officers"].insert_one({
        "officer_id": "OF-PARTIAL-FACE",
        "name": "Partial Enrollment",
        "badge_number": "PARTIAL-1",
        "role": "Inspector",
        "status": "active",
        "registered_at": datetime(2025, 5, 1, 9, 0),
    })
    client.app.state.fake_db.collections["face_embeddings"].insert_one({
        "embedding_id": "one-sample-only",
        "officer_id": "OF-PARTIAL-FACE",
        "sample_type": "front_profile",
        "embedding_model": "sface",
        "embedding": FACE_VECTOR,
    })
    response = client.get("/api/officers")
    assert response.status_code == 200
    assert response.json()[0]["face_enrolled"] is False


def test_officer_list_normalizes_legacy_fields_without_inventing_badges(client):
    collection = client.app.state.fake_db.collections["officers"]
    collection.documents.extend([
        {
            "officer_id": "OF-LEGACY-MISSING-BADGE",
            "name": "Legacy Record",
            "role": "Inspector",
            "status": "active",
            "created_at": "2025-04-01T09:30:00+00:00",
            "rfid_uid": "LEGACY-RFID-FIELD",
        },
        {
            "officer_id": "OF-LEGACY-ALIAS",
            "name": "Legacy Alias Record",
            "badgeNumber": "REAL-BADGE-44",
            "role": "Inspector",
            "status": "active",
            "created_at": "2025-04-02T09:30:00+00:00",
        },
    ])

    response = client.get("/api/officers")
    assert response.status_code == 200
    records = response.json()
    assert len(records) == 1
    record = records[0]
    assert record["officer_id"] == "OF-LEGACY-ALIAS"
    assert record["badge_number"] == "REAL-BADGE-44"
    assert record["registered_at"] == "2025-04-02T09:30:00Z"
    assert record["face_enrolled"] is False

    incomplete = collection.find_one({"officer_id": "OF-LEGACY-MISSING-BADGE"})
    assert "badge_number" not in incomplete
    assert incomplete["registered_at"].isoformat() == "2025-04-01T09:30:00+00:00"


def test_generated_officer_is_immediately_available_from_officer_list(client):
    created = client.post("/api/officers", json={
        "name": "New Officer",
        "badge_number": "REAL-BADGE-NEW",
        "role": "Inspector",
        "status": "active",
        "face_samples": FACE_SAMPLES,
    })
    assert created.status_code == 201
    officer = created.json()
    assert officer["officer_id"]
    assert officer["registered_at"]

    listed = client.get("/api/officers")
    assert listed.status_code == 200
    from_list = next(item for item in listed.json() if item["officer_id"] == officer["officer_id"])
    for field in ("officer_id", "name", "badge_number", "role", "status", "registered_at", "face_enrolled"):
        assert field in from_list
    retrieved = client.get(f"/api/officers/{officer['officer_id']}")
    assert retrieved.status_code == 200
    second = client.post("/api/officers", json={
        "name": "Second Officer",
        "badge_number": "REAL-BADGE-SECOND",
        "role": "Inspector",
        "status": "active",
        "face_samples": FACE_SAMPLES,
    })
    assert second.status_code == 201
    assert second.json()["officer_id"] != officer["officer_id"]


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
    history = client.get("/api/rfid/mappings").json()
    assert len(history) == 1
    assert history[0]["released_at"] is not None

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
    client.app.state.fake_db.collections["officers"].insert_one(officer_payload)

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


def test_generated_ids_updates_and_safe_deletion(client):
    case_response = client.post("/api/cases", json={
        "fir_number": "FIR-GEN-1", "case_title": "Generated ID case", "description": "Case description",
        "case_type": "criminal", "status": "open",
    })
    assert case_response.status_code == 201
    case_id = case_response.json()["case_id"]
    assert case_id

    evidence_response = client.post("/api/evidence", json={
        "case_id": case_id, "evidence_name": "Generated evidence", "evidence_type": "physical",
        "description": "Evidence description", "status": "stored",
    })
    assert evidence_response.status_code == 201
    evidence_id = evidence_response.json()["evidence_id"]
    assert client.post("/api/rfid", json={
        "rfid_id": "RFID-GEN-1", "status": "available", "registered_at": "2025-01-01T11:00:00",
    }).status_code == 201
    assert client.post("/api/rfid/assign", json={"rfid_id": "RFID-GEN-1", "evidence_id": evidence_id}).status_code == 200

    update_case = client.put(f"/api/cases/{case_id}", json={"case_title": "Updated title", "status": "closed"})
    assert update_case.status_code == 200
    assert update_case.json()["case_title"] == "Updated title"

    update_evidence = client.put(f"/api/evidence/{evidence_id}", json={"evidence_name": "Updated evidence"})
    assert update_evidence.status_code == 200
    assert update_evidence.json()["case_id"] == case_id
    assert update_evidence.json()["evidence_name"] == "Updated evidence"

    assert client.delete(f"/api/cases/{case_id}").status_code == 409
    assert client.delete(f"/api/evidence/{evidence_id}").status_code == 204
    assert client.get("/api/rfid/RFID-GEN-1").json()["status"] == "available"
    assert len(client.get("/api/rfid/mappings").json()) == 1
    assert client.delete(f"/api/cases/{case_id}").status_code == 204

    officer_response = client.post("/api/officers", json={
        "name": "Generated Officer", "badge_number": "GEN-1", "role": "Inspector", "status": "active",
        "face_samples": FACE_SAMPLES,
    })
    assert officer_response.status_code == 201
    officer_id = officer_response.json()["officer_id"]
    update_officer = client.put(f"/api/officers/{officer_id}", json={"name": "Updated Officer"})
    assert update_officer.status_code == 200
    assert update_officer.json()["name"] == "Updated Officer"
    assert client.delete(f"/api/officers/{officer_id}").status_code == 204


def test_alert_listing_read_state_and_custody_history(client):
    case_payload = {
        "case_id": "CASE-HISTORY", "fir_number": "FIR-HISTORY", "case_title": "History",
        "description": "History test", "case_type": "criminal", "status": "open",
        "created_at": "2025-01-01T09:00:00",
    }
    assert client.post("/api/cases", json=case_payload).status_code == 201
    assert client.post("/api/evidence", json={
        "evidence_id": "EV-HISTORY", "case_id": "CASE-HISTORY", "evidence_name": "Bag",
        "evidence_type": "physical", "description": "Evidence history", "status": "stored",
        "registered_at": "2025-01-01T10:00:00",
    }).status_code == 201
    client.app.state.fake_db.collections["officers"].insert_one({
        "officer_id": "OF-HISTORY", "name": "History Officer", "badge_number": "H-1",
        "role": "Inspector", "status": "active", "registered_at": datetime(2025, 1, 1, 8, 0),
    })
    assert client.post("/api/rfid", json={
        "rfid_id": "RFID-HISTORY", "status": "available", "registered_at": "2025-01-01T08:00:00",
    }).status_code == 201
    assert client.post("/api/rfid/assign", json={"rfid_id": "RFID-HISTORY", "evidence_id": "EV-HISTORY"}).status_code == 200
    event = client.post("/api/hardware/events", json={
        "officer_id": "OF-HISTORY", "rfid_id": "RFID-HISTORY", "event_type": "check_in",
        "timestamp": "2025-01-01T11:00:00",
    })
    assert event.status_code == 200
    custody = client.get("/api/evidence/EV-HISTORY/custody")
    assert custody.status_code == 200
    assert custody.json()[0]["officer_name"] == "History Officer"
    assert client.delete("/api/evidence/EV-HISTORY").status_code == 409
    assert client.delete("/api/officers/OF-HISTORY").status_code == 409

    invalid = client.post("/api/hardware/events", json={
        "officer_id": "OF-MISSING", "rfid_id": "RFID-HISTORY", "event_type": "access",
    })
    assert invalid.status_code == 400
    alerts = client.get("/api/alerts")
    assert alerts.status_code == 200
    alert_id = alerts.json()[0]["alert_id"]
    assert alerts.json()[0]["read"] is False
    marked = client.patch(f"/api/alerts/{alert_id}/read")
    assert marked.status_code == 200
    assert marked.json()["read"] is True
    assert client.get("/api/alerts").json()[0]["read"] is True
    assert client.get("/api/transactions").json()[0]["officer_id"] == "OF-HISTORY"


def test_face_enrollment_persists_three_samples_without_exposing_vectors(client):
    with patch("app.services.face_auth_service.FaceInferenceService") as inference, patch(
        "app.services.face_auth_service.decode_base64_image", side_effect=lambda value: f"decoded:{value}"
    ) as decode:
        inference.return_value.infer_embedding_from_image.return_value = FACE_VECTOR
        prepared = client.post("/api/face-auth/prepare-enrollment", json={"samples": FACE_SAMPLES})
        assert decode.call_count == 3
        assert inference.return_value.infer_embedding_from_image.call_count == 3
    assert prepared.status_code == 201
    officer_id = prepared.json()["officer_id"]
    assert prepared.json()["enrolled"] is True
    assert client.get("/api/officers").json() == []
    pending_recognition = client.post("/api/face-auth/recognize", json={"image": "recognition-sample"})
    assert pending_recognition.status_code == 200
    assert pending_recognition.json()["authenticated"] is False

    officer = client.post("/api/officers", json={
        "officer_id": officer_id,
        "name": "Face Officer",
        "badge_number": "FACE-1",
        "role": "Inspector",
        "status": "active",
    })
    assert officer.status_code == 201
    assert officer.json()["officer_id"] == officer_id
    stored_embeddings = client.app.state.fake_db.collections["face_embeddings"].documents
    assert len(stored_embeddings) == 3
    assert {item["sample_type"] for item in stored_embeddings} == set(FACE_SAMPLES)
    assert all(item["officer_id"] == officer_id for item in stored_embeddings)
    assert all(item["embedding_model"] == "sface" for item in stored_embeddings)
    assert all(len(item["embedding"]) == len(FACE_VECTOR) for item in stored_embeddings)
    officers = client.get("/api/officers").json()
    assert next(item for item in officers if item["officer_id"] == officer_id)["face_enrolled"] is True
    assert "embedding" not in str(officers)
    recognition = client.post("/api/face-auth/recognize", json={"image": "recognition-sample"})
    assert recognition.status_code == 200
    assert recognition.json()["authenticated"] is True
    assert recognition.json()["officer_id"] == officer_id


def test_canceling_pending_face_enrollment_removes_only_unregistered_profile(client):
    prepared = client.post("/api/face-auth/prepare-enrollment", json={"samples": FACE_SAMPLES})
    assert prepared.status_code == 201
    officer_id = prepared.json()["officer_id"]
    assert len(client.app.state.fake_db.collections["face_embeddings"].documents) == 3
    canceled = client.delete(f"/api/face-auth/enrollment/{officer_id}")
    assert canceled.status_code == 204
    assert client.app.state.fake_db.collections["face_embeddings"].documents == []
    assert client.get("/api/officers").json() == []
