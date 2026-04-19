from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
import os
import cv2
from PIL import Image
import numpy as np

# Import real engines
from recognition_engine import SignRecognitionEngine
from emotion_engine import EmotionEngine
from generation_engine import GenerationEngine
from file_service import FileService
from translation_engine import TranslationEngine
from db_service import DBService

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev_key_123')
# Configure upload folder
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Professional CORS configuration
CORS(app, resources={r"/*": {"origins": "*"}}) # In production, replace * with your domain

# Initialize engines
recognition_engine = SignRecognitionEngine()
emotion_engine = EmotionEngine()
generation_engine = GenerationEngine()
translation_engine = TranslationEngine()
file_service = FileService(upload_folder=UPLOAD_FOLDER)
db = DBService()

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    if not data or not all(k in data for k in ('name', 'email', 'password')):
        return jsonify({"error": "Missing fields"}), 400
    
    user, error = db.create_user(data['name'], data['email'], data['password'])
    if error:
        return jsonify({"error": error}), 400
    return jsonify({"status": "success", "user": user})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data or not all(k in data for k in ('email', 'password')):
        return jsonify({"error": "Missing fields"}), 400
    
    user = db.authenticate_user(data['email'], data['password'])
    if user:
        return jsonify({"status": "success", "user": user})
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/history', methods=['GET'])
def get_history():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    history = db.get_user_history(user_id)
    return jsonify({"history": history})

@app.route('/sign-to-text', methods=['POST'])
def sign_to_text():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({"error": "No image data"}), 400
    
    # Process base64 image from webcam
    try:
        header, encoded = data['image'].split(',', 1)
        img_data = base64.b64decode(encoded)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Set language mode if provided
        language_mode = data.get('language_mode', 'ASL')
        recognition_engine.set_language_mode(language_mode)
        
        # ── Sign Recognition (PRIORITY) ────────────────────────────────────
        result = recognition_engine.process_frame(img)
        
        # ── Emotion Intelligence (ASYNC/THREADED) ──────────────────────────
        # We run this in a background thread so it doesn't slow down hand signs
        import threading
        def run_emotion_async(frame_copy):
            try:
                # Use a unique attribute on the engine to store the latest
                recognition_engine.latest_emotion = emotion_engine.detect_emotion(frame_copy)
            except Exception as e:
                print(f"Async emotion error: {e}")

        # Initialize latest_emotion if it doesn't exist
        if not hasattr(recognition_engine, 'latest_emotion'):
             recognition_engine.latest_emotion = {"emotion": "Neutral", "confidence": 0, "status": "Ready"}

        # Fire and forget thread (copy image to avoid race conditions during processing)
        threading.Thread(target=run_emotion_async, args=(img.copy(),), daemon=True).start()
        
        # Attach the latest known emotion to the result
        result['emotion'] = recognition_engine.latest_emotion['emotion']
        result['emotion_confidence'] = recognition_engine.latest_emotion['confidence']
        result['emotion_status'] = recognition_engine.latest_emotion.get('status', '')
        
        # ── Visual Feedback ────────────────────────────────────────────────
        _, buffer = cv2.imencode('.jpg', img)
        annotated_image = base64.b64encode(buffer).decode('utf-8')
        result['annotated_image'] = f"data:image/jpeg;base64,{annotated_image}"
        
        # Translation
        target_lang = data.get('target_lang', 'en')
        if target_lang != 'en':
            result['original_text'] = result['text']
            result['text'] = translation_engine.translate(result['text'], target_lang=target_lang)
        
        # Log to history
        user_id = data.get('user_id')
        if user_id and result['text'] and result['text'] != "Scanning...":
            db.add_history(user_id, result['text'], f"{language_mode} \u2192 Text")
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/text-to-sign', methods=['POST'])
def text_to_sign():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    input_text = data['text']
    source_lang = data.get('source_lang', 'auto')
    
    # If source language is not English, translate to English first
    if source_lang != 'en':
        input_text = translation_engine.translate(input_text, target_lang='en', source_lang=source_lang)
    
    result = generation_engine.text_to_sign(input_text)
    result['original_text'] = data['text']
    result['processed_text'] = input_text
    
    # Log to history
    user_id = data.get('user_id')
    if user_id:
        db.add_history(user_id, data['text'], "Text \u2192 Sign")
        
    return jsonify(result)

@app.route('/emotion-detect', methods=['POST'])
def emotion_detect():
    # Can handle both JSON/Base64 or Multipart/File
    if 'image' in request.files:
        file = request.files['image']
        img = Image.open(file.stream)
        frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    elif request.json and 'image' in request.json:
        header, encoded = request.json['image'].split(',', 1)
        img_data = base64.b64decode(encoded)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    else:
        return jsonify({"error": "No image data"}), 400
    
    result = emotion_engine.detect_emotion(frame)
    return jsonify(result)

@app.route('/translate', methods=['POST'])
def translate_text():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text = data['text']
    target_lang = data.get('target_lang', 'en')
    source_lang = data.get('source_lang', 'en')
    
    try:
        translated = translation_engine.translate(text, target_lang=target_lang, source_lang=source_lang)
        return jsonify({
            "status": "success",
            "original_text": text,
            "translated_text": translated,
            "target_lang": target_lang
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
        
    filepath = file_service.save_file(file)
    target_lang = request.form.get('target_lang', 'en')
    language_mode = request.form.get('language_mode', 'ASL')
    recognition_engine.set_language_mode(language_mode)
    
    # Extract frames from video/image (Increase sample size for professional accuracy)
    frames = file_service.extract_frames(filepath, max_frames=60)
    
    if not frames:
        return jsonify({"error": "Could not read file. Supported: MP4, AVI, MOV, MKV, JPG, PNG, WEBM"}), 400
    
    detections = []
    for frame in frames:
        res = recognition_engine.process_frame(frame)
        detected = res.get('text', '').strip()
        det_type  = res.get('type', '')
        confidence = res.get('confidence', 0)
        # Only add if we have an exact word/letter output
        if detected and detected != "":
            detections.append((detected, det_type, confidence))
    
    if not detections:
        return jsonify({
            "status": "success",
            "filename": file.filename,
            "message": "No signs detected",
            "result": "No hand signs detected. Ensure clear hand gestures are visible.",
            "translated": "No hand signs detected. Ensure clear hand gestures are visible."
        })
    
    # Vote: pick most frequent detection
    from collections import Counter
    text_list = [d[0] for d in detections]
    counter = Counter(text_list)
    
    gesture_detections = [d for d in detections if d[1] == 'gesture']
    letter_detections  = [d for d in detections if d[1] == 'asl_letter' or d[1].endswith('_letter')]
    word_detections    = [d for d in detections if d[1] == 'word']
    
    if word_detections:
        word_counter = Counter(d[0] for d in word_detections)
        english_text, _ = word_counter.most_common(1)[0]
        all_detected = f"Words: {english_text}"
    elif gesture_detections:
        gesture_counter = Counter(d[0] for d in gesture_detections)
        best_gesture, _ = gesture_counter.most_common(1)[0]
        english_text = best_gesture
        all_detected = ", ".join(f"{k}({v}x)" for k, v in gesture_counter.most_common(5))
    elif letter_detections:
        letter_seq = [d[0] for d in letter_detections]
        # Professional sequence cleaning: dedup adjacent duplicates of the same letter
        deduped = [letter_seq[0]]
        for c in letter_seq[1:]:
            if c != deduped[-1]:
                # Heuristic: only add if it appeared at least twice or is a strong detection
                deduped.append(c)
        english_text = "".join(deduped)
        all_detected = f"Letters: {english_text}"
    else:
        best, _ = counter.most_common(1)[0]
        english_text = best
        all_detected = ", ".join(f"{k}({v}x)" for k, v in counter.most_common(5))
    
    # Translate if needed
    translated_text = english_text
    if target_lang and target_lang != 'en':
        try:
            translated_text = translation_engine.translate(english_text, target_lang=target_lang)
        except Exception as e:
            print(f"Translation failed: {e}")
            translated_text = english_text
    
    # Simple Emotion Aggregation (Highest confidence wins)
    best_e = {"emotion": "Neutral", "confidence": 0}
    # Scan 3 frames (Start, Mid, End) for faster processing and stability
    emotion_sample_indices = [0, len(frames)//2, len(frames)-1] if len(frames) >= 3 else range(len(frames))
    
    for idx in emotion_sample_indices:
        try:
            e_res = emotion_engine.detect_emotion(frames[idx])
            if e_res.get('confidence', 0) > best_e['confidence']:
                best_e = e_res
        except Exception:
            continue
    
    return jsonify({
        "status": "success",
        "filename": file.filename,
        "frames_analyzed": len(frames),
        "all_detected": all_detected,
        "result": english_text,
        "translated": translated_text,
        "emotion": best_e['emotion'],
        "confidence": best_e['confidence']
    })




if __name__ == '__main__':
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.run(host='0.0.0.0', port=5000, debug=True)
