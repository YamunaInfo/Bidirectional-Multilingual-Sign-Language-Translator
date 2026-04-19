try:
    import mediapipe.python.solutions.hands as mp_hands
    print("MediaPipe solutions.hands imported via mediapipe.python.solutions!")
except Exception as e:
    print(f"Error importing via mediapipe.python.solutions: {e}")

import mediapipe as mp
print(dir(mp))
