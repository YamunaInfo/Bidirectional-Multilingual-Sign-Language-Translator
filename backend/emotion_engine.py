import mediapipe as mp
import numpy as np
import math
from collections import deque

class EmotionEngine:
    """
    Optimized emotion engine with Automatic Calibration and Skip-Frame Performance.
    Ensures zero-lag in the live feed and high accuracy tailored to the user's face.
    """
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=False, # Faster performance
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Performance: Skip-Frame Logic
        self.frame_count = 0
        self.process_every_n = 3 # Only process every 3rd frame for emotion
        self.last_result = {"emotion": "Neutral", "confidence": 0, "status": "Initializing..."}
        
        # Calibration: Baseline storage
        self.calibrated = False
        self.calib_frames = 0
        self.calib_limit = 10 
        self.baseline = {
            'mw': 0.35,      # Mouth Width
            'eb': 0.14,      # Eyebrow Height
            'furrow': 0.18,  # Eyebrow gap
            'lift': 0.0,     # Corner lift
            'eye': 0.06      # Eye open
        }
        self.calib_buffer = []

        # Temporal smoothing
        self.history = deque(maxlen=6)

    def detect_emotion(self, frame):
        """
        Detect emotion with skip-frame processing, calibration, and downscaling.
        """
        self.frame_count += 1
        
        # Optimization 1: Process every Nth frame
        if self.frame_count % self.process_every_n != 0 and self.calibrated:
            return self.last_result

        if frame is None:
            return {"emotion": "Neutral", "confidence": 0}

        # Optimization 2: Downscale for performance (landmarks don't need HD)
        try:
            h, w = frame.shape[:2]
            target_w = 256
            target_h = int(h * (target_w / w))
            small_frame = cv2.resize(frame, (target_w, target_h))
            rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        except Exception:
            rgb_frame = frame
            
        results = self.face_mesh.process(rgb_frame)

        if not results.multi_face_landmarks:
            self.last_result = {"emotion": "Neutral", "confidence": 0, "status": "Searching for face..."}
            return self.last_result

        landmarks = results.multi_face_landmarks[0].landmark
        
        # Calculate current ratios
        ratios = self._get_ratios(landmarks)
        
        # --- CALIBRATION PHASE ---
        if not self.calibrated:
            self.calib_frames += 1
            self.calib_buffer.append(ratios)
            
            if self.calib_frames >= self.calib_limit:
                # Average the buffer to set the baseline
                for key in self.baseline:
                    self.baseline[key] = sum(r[key] for r in self.calib_buffer) / len(self.calib_buffer)
                self.calibrated = True
                print(f"[FaceEngine] Calibration Complete. Baselines: {self.baseline}")
            
            self.last_result = {
                "emotion": "Neutral", 
                "confidence": 0.5, 
                "status": f"Calibrating... ({self.calib_frames}/{self.calib_limit})"
            }
            return self.last_result

        # --- DETECTION PHASE (Relative to Baseline) ---
        emotion, confidence = self._analyze_relative(ratios)
        
        self.history.append(emotion)
        from collections import Counter
        most_common = Counter(self.history).most_common(1)[0][0]

        self.last_result = {
            "emotion": most_common,
            "confidence": round(confidence, 2),
            "status": "Face Tracking Active"
        }
        return self.last_result

    def _get_ratios(self, lm):
        """Extract all raw point-to-point ratios from landmarks."""
        face_width = self._dist(lm[234], lm[454])
        if face_width == 0: face_width = 1.0
        
        return {
            'mw': self._dist(lm[61], lm[291]) / face_width,
            'eb': (self._dist(lm[107], lm[159]) + self._dist(lm[336], lm[386])) / (2 * face_width),
            'furrow': self._dist(lm[107], lm[336]) / face_width,
            'lift': ((lm[13].y - lm[61].y) + (lm[13].y - lm[291].y)) / (2 * face_width),
            'eye': (self._dist(lm[159], lm[145]) + self._dist(lm[386], lm[374])) / (2 * face_width),
            'inner_drop': ((lm[107].y - lm[70].y) + (lm[336].y - lm[300].y)) / (2 * face_width)
        }

    def _analyze_relative(self, r):
        """Analyze current ratios against the captured baseline."""
        b = self.baseline
        
        # SURPRISE: Eyebrows raise > 15% OR Eyes widen > 20%
        if r['eb'] > b['eb'] * 1.15 or r['eye'] > b['eye'] * 1.3:
            return "Surprised", 0.90
            
        # HAPPY: Mouth stretches > 10% AND corners lift significantly
        # (Using baseline lift as a reference point)
        if r['mw'] > b['mw'] * 1.12 and r['lift'] > b['lift'] + 0.015:
             return "Happy", 0.95
             
        # ANGRY: Eyebrows drop > 10% OR furrow > 10% OR inner drop
        if r['eb'] < b['eb'] * 0.88 or r['furrow'] < b['furrow'] * 0.88 or r['inner_drop'] > 0.015:
            return "Angry", 0.85
            
        # SAD: Mouth corners drop below baseline
        if r['lift'] < b['lift'] - 0.012:
             return "Sad", 0.80

        return "Neutral", 0.60

    def _dist(self, a, b):
        return math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2)

    def cleanup(self):
        self.face_mesh.close()

    def cleanup(self):
        self.face_mesh.close()
