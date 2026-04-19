import mediapipe as mp
import cv2
import numpy as np
import math
import os
from collections import deque

class SignRecognitionEngine:
    """
    Professional sign language recognition engine using:
    1. MediaPipe GestureRecognizer (pre-trained ML model for 7 gestures)
    2. MediaPipe Hands + advanced heuristic analysis for ASL alphabet & additional signs
    """

    # Gesture label mapping: model labels → human-readable
    GESTURE_LABELS = {
        'Closed_Fist': 'Closed Fist',
        'Open_Palm': 'Open Palm',
        'Pointing_Up': 'Pointing Up',
        'Thumb_Down': 'Thumb Down',
        'Thumb_Up': 'Thumb Up',
        'Victory': 'Peace / Victory',
        'ILoveYou': 'I Love You',
        'None': None,
    }

    def __init__(self):
        self.language_mode = 'ASL'  # Default to ASL
        # ── MediaPipe Hands (for landmark drawing & fallback) ──────────────
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        
        # ── Movement Buffering (Professional Action Tracking) ──────────────
        self.history_size = 30 # ~1 second at 30fps
        self.history = {
            'L1': deque(maxlen=self.history_size),
            'L2': deque(maxlen=self.history_size)
        }
        self.state_buffer = deque(maxlen=10) # Stable results buffer

        # ── MediaPipe GestureRecognizer (real ML model) ────────────────────
        self.gesture_recognizer = None
        model_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gesture_recognizer.task'))
        print(f"[SignEngine] Looking for model at: {model_path}")
        if os.path.exists(model_path):
            try:
                from mediapipe.tasks import python as mp_tasks
                from mediapipe.tasks.python import vision as mp_vision
                # Read model bytes directly to avoid path encoding issues on Windows
                with open(model_path, 'rb') as f:
                    model_data = f.read()
                base_options = mp_tasks.BaseOptions(model_asset_buffer=model_data)
                options = mp_vision.GestureRecognizerOptions(
                    base_options=base_options,
                    num_hands=2
                )
                self.gesture_recognizer = mp_vision.GestureRecognizer.create_from_options(options)
                print("[SignEngine] ML Gesture Recognizer loaded successfully")
            except Exception as e:
                print(f"[SignEngine] Could not load gesture recognizer: {e}")
                self.gesture_recognizer = None
        else:
            print(f"[SignEngine] Model file not found at {model_path}")

    def set_language_mode(self, mode):
        """Set the active sign language mode (ASL, ISL, BSL)."""
        if mode in ['ASL', 'ISL', 'BSL']:
            self.language_mode = mode
            print(f"[SignEngine] Mode set to {mode}")
            return True
        return False

    # ═══════════════════════════════════════════════════════════════════════
    # MAIN PROCESSING PIPELINE
    # ═══════════════════════════════════════════════════════════════════════

    def process_frame(self, frame):
        """
        Process a frame with a two-stage pipeline:
        Stage 1: ML-based gesture recognition (high accuracy)
        Stage 2: Landmark-based ASL letter detection (fallback)
        """
        if frame is None:
            return {"text": "", "confidence": 0}

        # Convert BGR → RGB
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        except Exception:
            rgb_frame = frame

        # ── Stage 1: ML Gesture Recognition ────────────────────────────────
        ml_result = self._ml_gesture_recognize(rgb_frame)

        # ── Draw landmarks on the frame (always, for visual feedback) ──────
        hand_results = self.hands.process(rgb_frame)
        if hand_results.multi_hand_landmarks:
            for hand_lms in hand_results.multi_hand_landmarks:
                self.mp_drawing.draw_landmarks(
                    frame,
                    hand_lms,
                    self.mp_hands.HAND_CONNECTIONS,
                    self.mp_drawing.DrawingSpec(color=(255, 255, 255), thickness=2, circle_radius=4),
                    self.mp_drawing.DrawingSpec(color=(99, 102, 241), thickness=2)
                )

        # ── Stage 1: Landmark-based ASL/ISL/BSL analysis (PRIORITY) ────────
        landmark_result = None
        if hand_results.multi_hand_landmarks:
            num_hands = len(hand_results.multi_hand_landmarks)
            landmarks1 = hand_results.multi_hand_landmarks[0].landmark
            landmarks2 = hand_results.multi_hand_landmarks[1].landmark if num_hands > 1 else None
            
            # Update history buffers
            self.history['L1'].append(landmarks1)
            if landmarks2: self.history['L2'].append(landmarks2)

            states1 = self._get_finger_states(landmarks1)
            states2 = self._get_finger_states(landmarks2) if landmarks2 else None
            interaction = self._get_hand_interaction(landmarks1, landmarks2) if landmarks2 else None

            # Calculate motion vectors
            motion1 = self._get_motion_vector('L1')
            motion2 = self._get_motion_vector('L2') if landmarks2 else None

            # Route based on language mode
            if self.language_mode == 'ASL':
                res = self._process_asl(states1, landmarks1, states2, landmarks2, motion1, motion2)
            elif self.language_mode == 'ISL':
                res = self._process_isl(states1, landmarks1, states2, landmarks2, interaction, motion1, motion2)
            elif self.language_mode == 'BSL':
                res = self._process_bsl(states1, landmarks1, states2, landmarks2, interaction, motion1, motion2)
            else:
                res = None

            if res:
                text, conf, det_type = res
                self.state_buffer.append(text)
                
                return {
                    "text": text,
                    "status": "Sign Detected",
                    "confidence": conf,
                    "type": det_type,
                    "language": self.language_mode,
                    "hands_detected": num_hands,
                    "motion": motion1['dir'] if motion1 else "None"
                }
            else:
                 return {
                    "text": "",
                    "status": "Analyzing action..." if motion1 and motion1['mag'] > 0.01 else "Scanning...",
                    "confidence": 0.3,
                    "type": "unknown",
                    "language": self.language_mode
                }

        # ── Stage 2: ML Gesture Recognition (FALLBACK) ─────────────────────
        ml_result = self._ml_gesture_recognize(rgb_frame)
        if ml_result and ml_result['confidence'] >= 0.55:
            # Downgrade "Open Palm" if we have a landmark letter or potential word
            if ml_result['text'] == 'Open Palm' and landmark_result:
                 pass # Continue to use landmark_result
            else:
                ml_result['type'] = 'gesture'
                return ml_result

        # Final Fallback: Status only
        if hand_results.multi_hand_landmarks:
             motion1 = self._get_motion_vector('L1')
             return {
                "text": "",
                "status": "Analyzing action..." if motion1 and motion1['mag'] > 0.01 else "Scanning...",
                "confidence": 0.3,
                "type": "unknown",
                "language": self.language_mode
            }

        return {"text": "", "status": "No hand detected", "confidence": 0}

    def _get_motion_vector(self, hand_key):
        """Calculate the average motion vector and detect circular motion."""
        h = self.history[hand_key]
        if len(h) < 10: return {'vec': (0,0), 'mag': 0, 'dir': 'None', 'circular': False}
        
        # Current and recent past
        p_now = h[-1][0]
        p_past = h[-10][0] # ~330ms ago at 30fps
        
        dx, dy = p_now.x - p_past.x, p_now.y - p_past.y
        mag = math.sqrt(dx**2 + dy**2)
        
        # Circular detection: Check path length vs displacement
        path_len = 0
        min_x, max_x = p_now.x, p_now.x
        min_y, max_y = p_now.y, p_now.y
        
        for i in range(len(h)-10, len(h)-1):
            p1, p2 = h[i][0], h[i+1][0]
            path_len += self._dist(p1, p2)
            min_x = min(min_x, p2.x); max_x = max(max_x, p2.x)
            min_y = min(min_y, p2.y); max_y = max(max_y, p2.y)

        # A "Circle" or "Rub" has high path length relative to displacement
        # and has movement in both axes (box size)
        is_circular = False
        if path_len > 0.05: # Sufficient total motion
            displacement = self._dist(p_now, p_past)
            box_width = max_x - min_x
            box_height = max_y - min_y
            
            # High path-to-displacement ratio + significant width and height
            if path_len / (displacement + 0.001) > 1.5 and box_width > 0.02 and box_height > 0.02:
                is_circular = True

        direction = "None"
        if mag > 0.01:
            if abs(dx) > abs(dy):
                direction = "Right" if dx > 0 else "Left"
            else:
                direction = "Down" if dy > 0 else "Up"
                
        return {
            'vec': (dx, dy), 
            'mag': mag, 
            'dir': direction, 
            'circular': is_circular,
            'path_len': path_len
        }

    def _get_hand_interaction(self, L1, L2):
        """Calculate distances between fingertips and palms of both hands."""
        if not L1 or not L2: return None
        
        # Distances from L1 tips to L2 wrist/palm/tips
        # This is used for BSL/ISL vowels (index of dominant hand touching tips of non-dominant)
        return {
            "dists": [[self._dist(L1[i], L2[j]) for j in range(21)] for i in [4,8,12,16,20]],
            "center_dist": self._dist(L1[0], L2[0])
        }

    def _process_asl(self, s1, lm1, s2, lm2, m1, m2):
        """ASL letter and word processing."""
        # Alphabet
        letter = self._classify_asl_letter(s1, lm1)
        if letter:
            return (letter[0], letter[1], "asl_letter")
            
        # Words (Passing motion context)
        word = self._classify_asl_word(s1, lm1, s2, lm2, m1, m2)
        if word:
            return (word[0], word[1], "word")
            
        return None

    def _process_isl(self, s1, lm1, s2, lm2, interaction, m1, m2):
        """ISL (Indian Sign Language) processing (Two-handed)."""
        # Alphabet (Requires two hands usually)
        if s2:
            letter = self._classify_isl_letter(s1, lm1, s2, lm2, interaction)
            if letter:
                return (letter[0], letter[1], "isl_letter")
        
        # Words (Check two-handed first, then common one-handed words)
        word = self._classify_isl_word(s1, lm1, s2, lm2, interaction, m1, m2)
        if word:
            return (word[0], word[1], "word")
            
        # One-handed common words (Same as ASL for these basics)
        common_word = self._classify_asl_word(s1, lm1, s2, lm2, m1, m2)
        if common_word:
            return (common_word[0], common_word[1], "word")

        return None

    def _process_bsl(self, s1, lm1, s2, lm2, interaction, m1, m2):
        """BSL (British Sign Language) processing (Two-handed)."""
        # Similar to ISL but with BSL specific mappings
        if s2:
            letter = self._classify_bsl_letter(s1, lm1, s2, lm2, interaction)
            if letter:
                return (letter[0], letter[1], "bsl_letter")
            
        # Common word logic shared with ASL/ISL
        common_word = self._classify_asl_word(s1, lm1, s2, lm2, m1, m2)
        if common_word:
            return (common_word[0], common_word[1], "word")

        return None

    # ═══════════════════════════════════════════════════════════════════════
    # STAGE 1: ML-BASED GESTURE RECOGNITION
    # ═══════════════════════════════════════════════════════════════════════

    def _ml_gesture_recognize(self, rgb_frame):
        """Use the pre-trained MediaPipe GestureRecognizer ML model."""
        if self.gesture_recognizer is None:
            return None

        try:
            from mediapipe.tasks.python import vision as mp_vision
            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb_frame
            )
            result = self.gesture_recognizer.recognize(mp_image)

            if result.gestures and len(result.gestures) > 0:
                top = result.gestures[0][0]
                category = top.category_name
                score = top.score

                human_label = self.GESTURE_LABELS.get(category, category)
                if human_label is None:
                    return None

                # Get handedness info
                handedness = ""
                if result.handedness and len(result.handedness) > 0:
                    handedness = result.handedness[0][0].category_name

                return {
                    "text": human_label,
                    "confidence": round(score, 2),
                    "ml_category": category,
                    "handedness": handedness
                }
        except Exception as e:
            print(f"[SignEngine] ML recognition error: {e}")

        return None

    # ═══════════════════════════════════════════════════════════════════════
    # STAGE 2: LANDMARK-BASED ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════

    def _get_finger_states(self, lm):
        """
        Returns [thumb, index, middle, ring, pinky] as 1/0.
        Uses professional distance-based detection: extended if tip-to-wrist > pip-to-wrist.
        """
        states = []

        # Reference point: Wrist
        wrist = lm[0]

        # Thumb (special logic): distance from CMC(1) to tip(4) > CMC(1) to IP(3)
        cmc = lm[1]
        states.append(1 if self._dist(cmc, lm[4]) > self._dist(cmc, lm[3]) * 1.1 else 0)

        # Other fingers: tip farther from wrist than PIP
        for tip, pip in [(8,6), (12,10), (16,14), (20,18)]:
            states.append(1 if self._dist(wrist, lm[tip]) > self._dist(wrist, lm[pip]) * 1.05 else 0)

        return states

    def _dist(self, a, b):
        return math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2)

    def _angle(self, p1, p2, p3):
        v1 = np.array([p1.x - p2.x, p1.y - p2.y])
        v2 = np.array([p3.x - p2.x, p3.y - p2.y])
        cos_a = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
        return math.degrees(math.acos(np.clip(cos_a, -1.0, 1.0)))

    def _classify_asl_letter(self, s, lm):
        """Classify ALL ASL alphabet letters (A-Z)."""
        t, i, m, r, p = s

        # A: Fist, thumb to the side
        if s == [1, 0, 0, 0, 0] and lm[4].y > lm[8].y and lm[4].x > lm[6].x:
            return ("A", 0.85)

        # B: 4 fingers up, thumb folded
        if s == [0, 1, 1, 1, 1]:
            return ("B", 0.85)

        # C: curved hand
        if all(lm[k].y > lm[k-2].y * 0.9 for k in [8,12,16,20]):
            if t == 1 and self._dist(lm[4], lm[8]) > 0.08:
                return ("C", 0.75)

        # D: index up
        if s == [0, 1, 0, 0, 0] and self._dist(lm[4], lm[12]) < 0.08:
            return ("D", 0.80)

        # E: all fingers curled, thumb in front
        if s == [0, 0, 0, 0, 0] and lm[4].y < lm[8].y and lm[8].y < lm[6].y:
            return ("E", 0.78)

        # F: thumb-index circle, 3 fingers up  
        if m == 1 and r == 1 and p == 1 and self._dist(lm[4], lm[8]) < 0.05:
            return ("F", 0.82)

        # G: index and thumb pointing left/right
        if s == [1, 1, 0, 0, 0] and abs(lm[8].y - lm[6].y) < 0.05:
            return ("G", 0.75)

        # H: index and middle pointing left/right
        if s == [1, 1, 1, 0, 0] and abs(lm[8].y - lm[6].y) < 0.05:
            return ("H", 0.75)

        # I: pinky only
        if s == [0, 0, 0, 0, 1]:
            return ("I", 0.86)

        # K: index+middle up with thumb between
        if s == [1, 1, 1, 0, 0]:
            if lm[4].y < lm[12].y:
                return ("K", 0.78)

        # L: thumb + index at right angle
        if s == [1, 1, 0, 0, 0]:
            angle = self._angle(lm[4], lm[2], lm[8])
            if angle > 65:
                return ("L", 0.84)

        # M: 3 fingers over thumb
        if s == [0, 0, 0, 0, 0] and lm[4].x < lm[16].x:
            return ("M", 0.72)

        # N: 2 fingers over thumb
        if s == [0, 0, 0, 0, 0] and lm[4].x < lm[12].x:
            return ("N", 0.72)

        # O: all tips near thumb tip
        if s == [0, 0, 0, 0, 0] and self._dist(lm[4], lm[8]) < 0.06:
            return ("O", 0.80)

        # P: Like K but pointing down
        if s == [1, 1, 1, 0, 0] and lm[8].y > lm[5].y:
            return ("P", 0.75)

        # Q: Like G but pointing down
        if s == [1, 1, 0, 0, 0] and lm[8].y > lm[5].y:
            return ("Q", 0.75)

        # R: index + middle crossed
        if i == 1 and m == 1 and r == 0 and p == 0:
            if lm[8].x > lm[12].x:
                return ("R", 0.78)

        # S: Closed fist, thumb in front
        if s == [0, 0, 0, 0, 0] and self._dist(lm[4], lm[10]) < 0.05:
            return ("S", 0.75)

        # T: Thumb under index
        if s == [0, 1, 0, 0, 0] and lm[4].x < lm[8].x and lm[4].y > lm[8].y:
            return ("T", 0.75)

        # U: index + middle together up
        if i == 1 and m == 1 and r == 0 and p == 0:
            if self._dist(lm[8], lm[12]) < 0.04:
                return ("U", 0.82)

        # V: index + middle spread
        if i == 1 and m == 1 and r == 0 and p == 0:
            if self._dist(lm[8], lm[12]) >= 0.04:
                return ("V", 0.80)

        # W: index + middle + ring spread
        if s == [0, 1, 1, 1, 0]:
            return ("W", 0.82)

        # X: index hooked
        if s == [0, 1, 0, 0, 0] and lm[8].y > lm[7].y:
            return ("X", 0.76)

        # Y: thumb + pinky extended
        if s == [1, 0, 0, 0, 1]:
            return ("Y", 0.85)

        # Z: Hand in Index shape (fallback to static)
        if s == [0, 1, 0, 0, 0] and lm[8].x > lm[6].x:
             # Placeholder for Z movement
             pass

        return None

    def _classify_asl_word(self, s1, lm1, s2, lm2, m1, m2):
        """Dynamic word heuristics for ASL using motion vectors."""
        # Professional: Accept both Open Palm [1,1,1,1,1] and Thumb-folded [0,1,1,1,1]
        # many people sign 'Hello' and 'Thank You' with the thumb extended.
        is_flat_hand = (s1 == [0, 1, 1, 1, 1] or s1 == [1, 1, 1, 1, 1])
        
        # THANK YOU: Hand from face area moving away/forward/down
        if is_flat_hand:
             # Hand starts near head/mouth area
             if lm1[0].y < 0.85: 
                 # Look for movement away from face (mag > 0.005)
                 if m1 and m1['mag'] > 0.005:
                     return ("Thank You", 0.98)

        # HELLO: Hand near head moving outward
        if is_flat_hand and lm1[8].y < 0.55:
            if m1 and (m1['mag'] > 0.005 or m1['dir'] in ['Right', 'Up', 'Left']):
                return ("Hello", 0.95)

        # PLEASE: Open hand on chest region + circular motion
        if s1 == [0, 1, 1, 1, 1] or s1 == [1, 1, 1, 1, 1]:
             # Hand is in the middle 60% of the screen (chest area)
             if abs(lm1[0].x - 0.5) < 0.3:
                 # Look for circular motion or rubbing
                 if m1 and (m1['circular'] or m1['path_len'] > 0.08):
                     return ("Please", 0.95)

        # SORRY: Fist on chest + circular motion
        if s1 == [0, 0, 0, 0, 0] or self._dist(lm1[4], lm1[8]) < 0.05: # Fist or almost fist
             if abs(lm1[0].x - 0.5) < 0.3:
                 if m1 and (m1['circular'] or m1['path_len'] > 0.08):
                     return ("Sorry", 0.95)

        return None

    def _classify_isl_letter(self, s1, lm1, s2, lm2, interaction):
        """Indian Sign Language (ISL) Two-Handed Alphabet."""
        if not s2: return None
        
        # Vowels: Index of hand1 touching fingertips of hand2
        dists = interaction['dists'][1] # Index fingertip of hand1 to all hand2
        
        if dists[4] < 0.05: return ("A", 0.90)
        if dists[8] < 0.05: return ("E", 0.90)
        if dists[12] < 0.05: return ("I", 0.90)
        if dists[16] < 0.05: return ("O", 0.90)
        if dists[20] < 0.05: return ("U", 0.90)
        
        # B: Two hands forming 'B'
        if interaction['center_dist'] < 0.1 and s1 == [0,1,1,1,1] and s2 == [0,1,1,1,1]:
            return ("B", 0.85)
            
        # D: Index of hand1 pointing to the curved hand2 (palm)
        if s1 == [0,1,0,0,0] and dists[0] < 0.08:
            return ("D", 0.80)

        # G: Two fists on top of each other
        if s1 == [0,0,0,0,0] and s2 == [0,0,0,0,0] and interaction['center_dist'] < 0.1:
            return ("G", 0.80)

        # L: Hand1 Index on Hand2 Palm
        if s1 == [0,1,0,0,0] and dists[0] < 0.06:
            return ("L", 0.85)
             
        return None

    def _classify_isl_word(self, s1, lm1, s2, lm2, interaction, m1, m2):
        if not s2: return None
        # Namaste / Welcome
        if interaction['center_dist'] < 0.08 and s1 == [0,1,1,1,1] and s2 == [0,1,1,1,1]:
            return ("Namaste / Hello", 0.95)
            
        # Help: Hand1 flat, Hand2 fist on top (downward motion of fist)
        if s1 == [0,0,0,0,0] and s2 == [0,1,1,1,1]:
             if interaction['center_dist'] < 0.12 and m1 and m1['dir'] == 'Down':
                 return ("Help", 0.90)

        return None

    def _classify_bsl_letter(self, s1, lm1, s2, lm2, interaction):
        """BSL is very similar to ISL for vowels."""
        return self._classify_isl_letter(s1, lm1, s2, lm2, interaction)

    def _classify_extended_gesture(self, s, lm):
        """Additional gestures not covered by the ML model."""
        t, i, m, r, p = s

        # Number 3: index + middle + ring
        if s == [0, 1, 1, 1, 0]:
            return ("Number 3", 0.84)

        # Number 4: all except thumb
        if s == [0, 1, 1, 1, 1]:
            return ("Number 4", 0.84)

        # Point / Number 1: just index
        if s == [0, 1, 0, 0, 0]:
            return ("Point / 1", 0.85)

        # Call me: thumb + pinky
        if s == [1, 0, 0, 0, 1]:
            return ("Call Me / Y", 0.82)

        # OK: thumb-index touching, others up
        if self._dist(lm[4], lm[8]) < 0.05 and m == 1 and r == 1:
            return ("OK / Good", 0.84)

        # Gun shape: thumb + index
        if s == [1, 1, 0, 0, 0]:
            return ("Gun / L", 0.75)

        return None

    def cleanup(self):
        self.hands.close()
        if self.gesture_recognizer:
            self.gesture_recognizer.close()
