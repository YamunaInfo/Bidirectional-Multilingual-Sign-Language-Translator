import cv2
import os
import uuid
import numpy as np
from werkzeug.utils import secure_filename

# Supported video/image extensions
VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp'}
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff'}

class FileService:
    def __init__(self, upload_folder='uploads'):
        self.upload_folder = upload_folder
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

    def save_file(self, file):
        """Save an uploaded file and return its path."""
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(self.upload_folder, unique_filename)
        file.save(filepath)
        return filepath

    def extract_frames(self, file_path, max_frames=20):
        """
        Extract frames from a video or image file.
        - For images: returns the single frame in a list.
        - For videos: samples frames at regular intervals.
        Handles multiple codecs/containers robustly.
        """
        ext = os.path.splitext(file_path)[1].lower()

        # ── Image file ─────────────────────────────────────────────────────────
        if ext in IMAGE_EXTENSIONS:
            frame = cv2.imread(file_path)
            if frame is not None:
                return [frame]
            # Try reading with imdecode if imread fails (handles some edge cases)
            raw = np.fromfile(file_path, dtype=np.uint8)
            frame = cv2.imdecode(raw, cv2.IMREAD_COLOR)
            return [frame] if frame is not None else []

        # ── Video file ─────────────────────────────────────────────────────────
        if ext not in VIDEO_EXTENSIONS:
            # Attempt anyway — OpenCV may still handle it
            pass

        frames = self._extract_video_frames(file_path, max_frames)

        # If default backend fails, try re-encoding via raw bytes approach
        if not frames:
            frames = self._extract_video_frames_fallback(file_path, max_frames)

        return frames

    def _extract_video_frames(self, video_path, max_frames):
        """Primary extraction using OpenCV VideoCapture."""
        frames = []
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            print(f"[FileService] Could not open: {video_path}")
            return []

        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps   = cap.get(cv2.CAP_PROP_FPS) or 25

        print(f"[FileService] Video: {total} frames @ {fps:.1f} fps")

        if total <= 0:
            # Unknown length — read sequentially until max_frames
            count = 0
            while count < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                frames.append(frame)
                count += 1
            cap.release()
            return frames

        # Sample evenly across the video duration
        interval = max(1, total // max_frames)
        frame_idx = 0

        while cap.isOpened() and len(frames) < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % interval == 0:
                if frame is not None and frame.size > 0:
                    frames.append(frame)
            frame_idx += 1

        cap.release()
        return frames

    def _extract_video_frames_fallback(self, video_path, max_frames):
        """
        Fallback: seek by timestamps instead of frame count,
        which works better for variable-frame-rate / HEVC videos.
        """
        frames = []
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            return []

        # Try seeking to 10 evenly-spaced millisecond positions
        duration_ms = cap.get(cv2.CAP_PROP_POS_AVI_RATIO)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25

        # Estimate duration in ms
        if total_frames > 0 and fps > 0:
            duration_ms = (total_frames / fps) * 1000
        else:
            duration_ms = 10000  # Default: try 10 seconds

        step = duration_ms / max_frames
        for i in range(max_frames):
            pos = int(i * step)
            cap.set(cv2.CAP_PROP_POS_MSEC, pos)
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                frames.append(frame)

        cap.release()
        return frames

    def cleanup(self, filepath):
        """Remove a file from disk."""
        if os.path.exists(filepath):
            os.remove(filepath)
