import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from recognition_engine import SignRecognitionEngine
from file_service import FileService

def test():
    engine = SignRecognitionEngine()
    file_service = FileService()
    
    # Use one of the uploaded videos
    video_path = "backend/uploads/41039aa1-ca39-4a09-a2e7-0f4810ec057f_THANK_YOU____AMERICAN_SIGN_LANGUAGE____SIGN_TRIBE_ACADEMY_-_Sign_Tribe_Academy_720p_h264.mp4"
    
    if not os.path.exists(video_path):
        print(f"File not found: {video_path}")
        return

    frames = file_service.extract_frames(video_path, max_frames=60)
    print(f"Extracted {len(frames)} frames")
    
    for i, frame in enumerate(frames):
        res = engine.process_frame(frame)
        text = res.get('text', '')
        status = res.get('status', '')
        print(f"Frame {i}: text='{text}', status='{status}'")

if __name__ == "__main__":
    test()
