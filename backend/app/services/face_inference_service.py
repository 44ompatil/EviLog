from __future__ import annotations

import base64
import binascii
import re
from pathlib import Path
from threading import Lock
from typing import Any

import cv2
import numpy as np
import yaml


class FaceInferenceError(RuntimeError):
    """Raised when face inference cannot complete cleanly."""


class FaceInferenceService:
    _singleton: "FaceInferenceService | None" = None
    _lock = Lock()

    def __new__(cls, *args: Any, **kwargs: Any) -> "FaceInferenceService":
        if cls._singleton is None:
            with cls._lock:
                if cls._singleton is None:
                    cls._singleton = super().__new__(cls)
        return cls._singleton

    def __init__(self, config_path: str | Path | None = None) -> None:
        if getattr(self, "_initialized", False):
            return

        self._initialized = False
        self.config_path = Path(config_path) if config_path is not None else self._default_config_path()
        self.config = self._load_config()
        self._detector = None
        self._recognizer = None
        self._initialize_models()
        self._initialized = True

    @staticmethod
    def _default_config_path() -> Path:
        repo_root = Path(__file__).resolve().parents[3]
        return repo_root / "face auth module" / "config.yaml"

    def _resolve_model_path(self, relative_model_path: str) -> Path:
        repo_root = Path(__file__).resolve().parents[3]
        face_auth_dir = repo_root / "face auth module"
        candidate = (face_auth_dir / relative_model_path).resolve()
        if not candidate.exists():
            raise FaceInferenceError(f"Model not found: {relative_model_path}")
        return candidate

    def _load_config(self) -> dict[str, Any]:
        config_path = self.config_path
        if not config_path.exists():
            raise FaceInferenceError("Face auth configuration missing.")

        with config_path.open("r", encoding="utf-8") as handle:
            loaded = yaml.safe_load(handle) or {}

        if not isinstance(loaded, dict):
            raise FaceInferenceError("Face auth configuration is malformed.")
        return loaded

    def _initialize_models(self) -> None:
        detection_cfg = self.config.get("face_detection", {})
        recognition_cfg = self.config.get("recognition", {})

        detector_model = detection_cfg.get("model_path")
        recognition_model = recognition_cfg.get("model_path")

        if not detector_model:
            raise FaceInferenceError("Missing face detection model configuration.")
        if not recognition_model:
            raise FaceInferenceError("Missing face recognition model configuration.")

        detector_path = self._resolve_model_path(detector_model)
        recognizer_path = self._resolve_model_path(recognition_model)

        try:
            self._detector = cv2.FaceDetectorYN.create(str(detector_path), "", (0, 0))
            self._recognizer = cv2.FaceRecognizerSF.create(str(recognizer_path), "")
        except Exception as exc:  # pragma: no cover - runtime model startup failure handling
            raise FaceInferenceError("Face inference models could not be initialized.") from exc

    @property
    def detector(self):
        if self._detector is None:
            self._initialize_models()
        return self._detector

    @property
    def recognizer(self):
        if self._recognizer is None:
            self._initialize_models()
        return self._recognizer

    def detect_faces(self, image: np.ndarray) -> list[tuple[float, float, float, float, float]]:
        if image is None or not isinstance(image, np.ndarray) or image.size == 0:
            raise FaceInferenceError("Image cannot be decoded.")

        height, width = image.shape[:2]
        detection_cfg = self.config.get("face_detection", {})
        threshold = float(detection_cfg.get("confidence_threshold", 0.60))
        min_size = int(detection_cfg.get("minimum_face_size", 80))
        nms_threshold = float(detection_cfg.get("nms_threshold", 0.30))

        self.detector.setInputSize((width, height))
        self.detector.setScoreThreshold(threshold)
        self.detector.setNmsThreshold(nms_threshold)

        detections = self.detector.detect(image)
        if detections is None:
            return []

        detected, _ = detections
        if detected is None or len(detected) == 0:
            return []

        accepted: list[tuple[float, float, float, float, float]] = []
        for item in detected:
            if len(item) < 5:
                continue
            x, y, w, h, confidence = [float(value) for value in item[:5]]
            if confidence < threshold:
                continue
            if w < min_size or h < min_size:
                continue
            accepted.append((x, y, w, h, confidence))
        return accepted

    @staticmethod
    def _normalize_embedding(embedding: np.ndarray) -> np.ndarray:
        vector = np.asarray(embedding, dtype=np.float32).reshape(-1)
        if vector.size == 0:
            raise FaceInferenceError("Embedding dimension mismatch.")
        norm = float(np.linalg.norm(vector))
        if norm <= 0.0:
            raise FaceInferenceError("Embedding dimension mismatch.")
        return vector / norm

    def infer_embedding_from_image(self, image: np.ndarray) -> np.ndarray:
        if image is None or not isinstance(image, np.ndarray):
            raise FaceInferenceError("Image cannot be decoded.")

        faces = self.detect_faces(image)
        authentication_cfg = self.config.get("authentication", {})
        multiple_faces_allowed = bool(authentication_cfg.get("multiple_faces_allowed", False))

        if not faces:
            raise FaceInferenceError("No face detected.")
        if not multiple_faces_allowed and len(faces) > 1:
            raise FaceInferenceError("Multiple faces detected.")

        x, y, w, h, _ = faces[0]
        x = max(0, int(round(x)))
        y = max(0, int(round(y)))
        w = max(1, int(round(w)))
        h = max(1, int(round(h)))

        face_crop = image[y : y + h, x : x + w]
        if face_crop.size == 0:
            raise FaceInferenceError("Face too small.")

        if face_crop.shape[0] < 80 or face_crop.shape[1] < 80:
            raise FaceInferenceError("Face too small.")

        try:
            aligned = self.recognizer.alignCrop(image, np.array([x, y, w, h], dtype=np.float32))
            embedding = self.recognizer.feature(aligned)
        except Exception as exc:  # pragma: no cover - model runtime path
            raise FaceInferenceError("Model inference failure.") from exc

        flattened = np.asarray(embedding, dtype=np.float32).reshape(-1)
        if flattened.size != 128:
            raise FaceInferenceError("Embedding dimension mismatch.")
        return self._normalize_embedding(flattened)


def decode_base64_image(image_value: str | None) -> np.ndarray:
    if image_value is None or not isinstance(image_value, str):
        raise FaceInferenceError("Image cannot be decoded.")

    candidate = image_value.strip()
    match = re.match(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.*)$", candidate)
    if match is not None:
        candidate = match.group(2)

    try:
        raw_bytes = base64.b64decode(candidate, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise FaceInferenceError("Invalid base64 image data.") from exc

    image_array = np.frombuffer(raw_bytes, dtype=np.uint8)
    decoded = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if decoded is None or decoded.size == 0:
        raise FaceInferenceError("Image cannot be decoded.")
    return decoded


def get_face_inference_service() -> FaceInferenceService:
    return FaceInferenceService()


__all__ = [
    "FaceInferenceError",
    "FaceInferenceService",
    "decode_base64_image",
    "get_face_inference_service",
]
