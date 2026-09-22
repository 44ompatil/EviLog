from __future__ import annotations

import base64
from types import SimpleNamespace
from unittest.mock import patch

import cv2
import numpy as np

from app.services.face_auth_service import (
    FaceAuthError,
    authenticate_face,
    cosine_similarity,
    match_embedding_to_officer,
)
from app.services.face_inference_service import decode_base64_image


def _valid_data_url() -> str:
    image = np.zeros((80, 80, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".png", image)
    return "data:image/png;base64," + base64.b64encode(encoded.tobytes()).decode("ascii")


def test_valid_image_decoding():
    encoded = _valid_data_url()
    result = decode_base64_image(encoded)
    assert result is not None
    assert result.shape[0] >= 1


def test_invalid_base64():
    result = authenticate_face("data:image/png;base64,not-valid-base64!!!")
    assert result["authenticated"] is False
    assert "base64" in result["message"].lower()


def test_cosine_matching_against_multiple_embeddings():
    candidate = np.array([1.0, 0.0, 0.0], dtype=float)
    matches = [
        {"_id": "first", "officer_id": "OF-1", "embedding": np.array([1.0, 0.0, 0.0], dtype=float), "embedding_model": "sface", "embedding_dimension": 3, "model_version": "1.0.0", "preprocessing_version": "1.0.0", "quality_score": 0.91},
        {"_id": "second", "officer_id": "OF-2", "embedding": np.array([-1.0, 0.0, 0.0], dtype=float), "embedding_model": "sface", "embedding_dimension": 3, "model_version": "1.0.0", "preprocessing_version": "1.0.0", "quality_score": 0.75},
    ]
    best = match_embedding_to_officer(candidate, matches, threshold=0.5)
    assert best["officer_id"] == "OF-1"
    assert best["similarity"] >= 0.99


def test_mismatch_below_threshold():
    candidate = np.array([1.0, 0.0, 0.0], dtype=float)
    matches = [
        {"_id": "first", "officer_id": "OF-3", "embedding": np.array([0.0, 1.0, 0.0], dtype=float), "embedding_model": "sface", "embedding_dimension": 3, "model_version": "1.0.0", "preprocessing_version": "1.0.0", "quality_score": 0.50},
    ]
    result = match_embedding_to_officer(candidate, matches, threshold=0.8)
    assert result is None


def test_inactive_officer_is_rejected():
    fake_db = SimpleNamespace()
    fake_db.collections = {
        "face_embeddings": SimpleNamespace(find=lambda: [{
            "officer_id": "OF-9",
            "embedding": np.ones(128, dtype=float).tolist(),
            "embedding_model": "sface",
            "embedding_dimension": 128,
            "model_version": "1.0.0",
            "preprocessing_version": "1.0.0",
            "quality_score": 0.9,
        }]),
        "officers": SimpleNamespace(find_one=lambda query: {"officer_id": "OF-9", "status": "inactive"} if query.get("officer_id") == "OF-9" else None),
    }
    embedding = np.ones(128, dtype=float)
    result = authenticate_face(_valid_data_url(), threshold=0.78, database=fake_db, infer_embedding=lambda _: embedding)
    assert result["authenticated"] is False
    assert result["message"] in {"Face does not match an active officer.", "Face not recognized."}


def test_embedding_dimension_validation():
    result = authenticate_face(_valid_data_url(), threshold=0.78, database=None, infer_embedding=lambda _: np.ones(127, dtype=float))
    assert result["authenticated"] is False
    assert "dimension" in result["message"].lower()


def test_cosine_similarity_range_and_multiple_faces_mock_boundary():
    left = np.array([1.0, 0.0])
    right = np.array([0.0, 1.0])
    assert 0.0 <= cosine_similarity(left, right) <= 1.0
    assert cosine_similarity(left, left) == 1.0


def test_successful_inference_with_mocked_boundary():
    fake_db = SimpleNamespace()
    fake_db.collections = {
        "face_embeddings": SimpleNamespace(find=lambda: [{
            "officer_id": "OF-703",
            "embedding": np.array([1.0] + [0.0] * 127, dtype=float).tolist(),
            "embedding_model": "sface",
            "embedding_dimension": 128,
            "model_version": "1.0.0",
            "preprocessing_version": "1.0.0",
            "quality_score": 0.9,
        }]),
        "officers": SimpleNamespace(find_one=lambda query: {"officer_id": "OF-703", "status": "active"} if query.get("officer_id") == "OF-703" else None),
    }

    embedding = np.array([1.0] + [0.0] * 127, dtype=float)
    result = authenticate_face(_valid_data_url(), threshold=0.78, database=fake_db, infer_embedding=lambda _: embedding)
    assert result["authenticated"] is True
    assert result["officer_id"] == "OF-703"
    assert result["similarity"] >= 0.99


def test_api_behavior_for_successful_recognition():
    from app.main import app
    from fastapi.testclient import TestClient

    fake_db = SimpleNamespace()
    fake_db.collections = {
        "face_embeddings": SimpleNamespace(find=lambda: [{
            "officer_id": "OF-703",
            "embedding": np.array([1.0] + [0.0] * 127, dtype=float).tolist(),
            "embedding_model": "sface",
            "embedding_dimension": 128,
            "model_version": "1.0.0",
            "preprocessing_version": "1.0.0",
            "quality_score": 0.9,
        }]),
        "officers": SimpleNamespace(find_one=lambda query: {"officer_id": "OF-703", "status": "active"} if query.get("officer_id") == "OF-703" else None),
    }

    with patch("app.main.initialize_database"), patch("app.main.verify_database"), patch("app.services.face_auth_service.get_database", return_value=fake_db), patch("app.services.face_inference_service.FaceInferenceService.infer_embedding_from_image", return_value=np.array([1.0] + [0.0] * 127, dtype=float)):
        with TestClient(app) as client:
            response = client.post("/api/face-auth/recognize", json={"image": _valid_data_url(), "threshold": 0.78})
            assert response.status_code == 200
            payload = response.json()
            assert payload["authenticated"] is True
            assert payload["officer_id"] == "OF-703"
            assert payload["similarity"] >= 0.99
            assert payload["message"] == "Face recognized and matched to an active officer."
