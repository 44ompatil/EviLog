from __future__ import annotations

from typing import Any

import numpy as np

from app.database import get_database
from app.services.face_inference_service import FaceInferenceError, FaceInferenceService, decode_base64_image

DEFAULT_MATCH_THRESHOLD = 0.78
EXPECTED_EMBEDDING_DIMENSION = 128


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
        if embedding_model != "sface":
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


__all__ = [
    "FaceAuthError",
    "DEFAULT_MATCH_THRESHOLD",
    "authenticate_face",
    "cosine_similarity",
    "match_embedding_to_officer",
]
