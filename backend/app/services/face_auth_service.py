from __future__ import annotations

from typing import Any

import numpy as np
from datetime import datetime, timezone
from uuid import uuid4

from app.database import get_database
from app.services.face_inference_service import FaceInferenceError, FaceInferenceService, decode_base64_image

DEFAULT_MATCH_THRESHOLD = 0.78
EXPECTED_EMBEDDING_DIMENSION = 128
FACE_EMBEDDING_MODEL = "sface"
REQUIRED_FACE_SAMPLE_TYPES = ("front_profile", "left_profile", "right_profile")


class FaceAuthError(RuntimeError):
    """Raised when face auth cannot complete gracefully."""


def cosine_similarity(vector_a: np.ndarray | list[float], vector_b: np.ndarray | list[float]) -> float:
    first = np.asarray(vector_a, dtype=np.float64).reshape(-1)
    second = np.asarray(vector_b, dtype=np.float64).reshape(-1)
    if first.size == 0 or second.size == 0 or first.size != second.size:
        return 0.0
    left_norm = np.linalg.norm(first)
    right_norm = np.linalg.norm(second)
    if np.isclose(left_norm, 0.0) or np.isclose(right_norm, 0.0):
        return 0.0
    return float(np.dot(first, second) / (left_norm * right_norm))


def _as_embedding_vector(data: Any) -> np.ndarray:
    values = np.asarray(data, dtype=np.float64).reshape(-1)
    if values.size != EXPECTED_EMBEDDING_DIMENSION:
        raise FaceAuthError("Embedding dimension mismatch.")
    return values.astype(np.float64)


def match_embedding_to_officer(candidate_embedding: np.ndarray | list[float], stored_documents: list[dict[str, Any]], threshold: float) -> dict[str, Any] | None:
    best_match: dict[str, Any] | None = None
    candidate = np.asarray(candidate_embedding, dtype=np.float64).reshape(-1)

    for document in stored_documents:
        if not isinstance(document, dict):
            continue

        embedding_model = document.get("embedding_model")
        if embedding_model != FACE_EMBEDDING_MODEL:
            continue

        embedding_values = document.get("embedding")
        if embedding_values is None:
            continue

        try:
            stored_vector = np.asarray(embedding_values, dtype=np.float64).reshape(-1)
        except TypeError:
            continue
        if stored_vector.size != candidate.size:
            continue

        similarity = cosine_similarity(candidate, stored_vector)
        if similarity < threshold:
            continue
        if best_match is None or similarity > float(best_match["similarity"]):
            best_match = {
                "officer_id": document.get("officer_id"),
                "similarity": float(similarity),
                "quality_score": float(document.get("quality_score", 0.0)),
                "document": document,
            }

    return best_match


def _unauthenticated_result(message: str, *, officer_id: str | None = None, similarity: float = 0.0, quality_score: float = 0.0) -> dict[str, Any]:
    return {
        "authenticated": False,
        "officer_id": officer_id,
        "similarity": float(similarity),
        "confidence": float(similarity),
        "quality_score": float(quality_score),
        "message": message,
    }


def has_valid_face_enrollment(face_embeddings: Any, officer_id: str) -> bool:
    documents = list(face_embeddings.find({"officer_id": officer_id}))
    if len(documents) != len(REQUIRED_FACE_SAMPLE_TYPES):
        return False
    if {document.get("sample_type") for document in documents} != set(REQUIRED_FACE_SAMPLE_TYPES):
        return False

    for document in documents:
        if document.get("embedding_model") != FACE_EMBEDDING_MODEL:
            return False
        try:
            vector = np.asarray(document.get("embedding"), dtype=np.float64).reshape(-1)
        except (TypeError, ValueError):
            return False
        if vector.size != EXPECTED_EMBEDDING_DIMENSION or not np.isfinite(vector).all():
            return False
        if np.isclose(np.linalg.norm(vector), 0.0):
            return False
    return True


def authenticate_face(
    image_value: str | None,
    *,
    threshold: float | None = None,
    database: Any | None = None,
    infer_embedding: Any | None = None,
) -> dict[str, Any]:
    if threshold is None:
        threshold = DEFAULT_MATCH_THRESHOLD

    try:
        image = decode_base64_image(image_value)
    except FaceInferenceError as exc:
        return _unauthenticated_result(str(exc))

    try:
        service = FaceInferenceService()
        embedding = (infer_embedding or service.infer_embedding_from_image)(image)
        vector = np.asarray(embedding, dtype=np.float64).reshape(-1)
        if vector.size != EXPECTED_EMBEDDING_DIMENSION:
            raise FaceAuthError("Embedding dimension mismatch.")
    except (FaceAuthError, FaceInferenceError) as exc:
        return _unauthenticated_result(str(exc))

    if database is None:
        database = get_database()

    face_embeddings = database.get("face_embeddings") if hasattr(database, "get") else getattr(database, "collections", {}).get("face_embeddings")
    officers = database.get("officers") if hasattr(database, "get") else getattr(database, "collections", {}).get("officers")

    if face_embeddings is None or officers is None:
        return _unauthenticated_result("Face not recognized.")

    try:
        stored_embeddings = list(face_embeddings.find()) if hasattr(face_embeddings, "find") else []
    except TypeError:
        stored_embeddings = []

    stored_embeddings = [
        document for document in stored_embeddings
        if document.get("officer_id")
        and officers.find_one({"officer_id": document["officer_id"]}) is not None
    ]

    best_match = match_embedding_to_officer(vector, stored_embeddings, float(threshold))
    if best_match is None:
        return _unauthenticated_result("Face does not match an active officer.")

    officer_id = str(best_match["officer_id"]) if best_match.get("officer_id") is not None else None
    officer_document = officers.find_one({"officer_id": officer_id}) if officer_id else None
    if officer_document is None:
        return _unauthenticated_result("Face not recognized.")

    if officer_document.get("status") != "active":
        return _unauthenticated_result("Face does not match an active officer.")

    similarity = float(best_match["similarity"])
    return {
        "authenticated": True,
        "officer_id": officer_id,
        "similarity": similarity,
        "confidence": similarity,
        "quality_score": float(best_match.get("quality_score", 0.0)),
        "message": "Face recognized and matched to an active officer.",
    }


def build_face_embedding_documents(
    officer_id: str,
    samples: dict[str, str],
    *,
    infer_embedding: Any | None = None,
) -> list[dict[str, Any]]:
    required_samples = REQUIRED_FACE_SAMPLE_TYPES
    if set(samples) != set(required_samples) or any(not samples.get(key) for key in required_samples):
        raise FaceAuthError("Exactly three face samples are required.")

    try:
        service = FaceInferenceService()
    except FaceInferenceError as exc:
        raise FaceAuthError("Face authentication is temporarily unavailable.") from exc
    infer = infer_embedding or service.infer_embedding_from_image
    documents = []
    for sample_name in required_samples:
        try:
            image = decode_base64_image(samples[sample_name])
            vector = np.asarray(infer(image), dtype=np.float64).reshape(-1)
        except Exception as exc:
            raise FaceAuthError(f"Unable to process the {sample_name.replace('_', ' ')} sample.") from exc
        if vector.size != EXPECTED_EMBEDDING_DIMENSION:
            raise FaceAuthError("Embedding dimension mismatch.")
        documents.append({
            "embedding_id": f"face-{uuid4().hex[:12]}",
            "officer_id": officer_id,
            "sample_type": sample_name,
            "embedding_model": FACE_EMBEDDING_MODEL,
            "embedding": vector.tolist(),
            "quality_score": 1.0,
            "created_at": datetime.now(timezone.utc),
        })

    return documents


def enroll_face_samples(
    officer_id: str,
    samples: dict[str, str],
    *,
    database: Any | None = None,
    infer_embedding: Any | None = None,
) -> dict[str, Any]:
    if database is None:
        database = get_database()
    officers = database["officers"]
    officer = officers.find_one({"officer_id": officer_id})
    if officer is None:
        raise FaceAuthError(f"Officer not found: {officer_id}")

    documents = build_face_embedding_documents(
        officer_id,
        samples,
        infer_embedding=infer_embedding,
    )
    embeddings = database["face_embeddings"]
    embeddings.delete_many({"officer_id": officer_id})
    embeddings.insert_many(documents)
    return {"officer_id": officer_id, "enrolled": True}


__all__ = [
    "FaceAuthError",
    "DEFAULT_MATCH_THRESHOLD",
    "EXPECTED_EMBEDDING_DIMENSION",
    "FACE_EMBEDDING_MODEL",
    "REQUIRED_FACE_SAMPLE_TYPES",
    "authenticate_face",
    "enroll_face_samples",
    "build_face_embedding_documents",
    "has_valid_face_enrollment",
    "cosine_similarity",
    "match_embedding_to_officer",
]
