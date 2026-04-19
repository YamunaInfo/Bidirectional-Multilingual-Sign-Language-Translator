import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, Zap, ZapOff, Play, Square } from 'lucide-react';

const WebcamFeed = ({ onFrameCaptured, isActive, autoDetect, overlayImage }) => {
  const webcamRef = useRef(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState(null);

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    setError(null);
  };

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc && onFrameCaptured) {
        onFrameCaptured(imageSrc);
      }
    }
  }, [webcamRef, onFrameCaptured]);

  useEffect(() => {
    let interval;
    if (isCameraOn && autoDetect) {
      interval = setInterval(capture, 1000); // Capture frame every second
    }
    return () => clearInterval(interval);
  }, [isCameraOn, autoDetect, capture]);

  const handleUserMediaError = (err) => {
    setError("Camera permission denied or camera not found.");
    setIsCameraOn(false);
  };

  return (
    <div className="relative group">
      <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl relative">
        {isCameraOn ? (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              onUserMediaError={handleUserMediaError}
              className="w-full h-full object-cover"
              videoConstraints={{
                width: 1280,
                height: 720,
                facingMode: "user"
              }}
            />
            {overlayImage && (
              <img 
                src={overlayImage} 
                alt="Contour Overlay" 
                className="absolute inset-0 w-full h-full object-cover z-10"
              />
            )}
            {autoDetect && (
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-premium-accent/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest animate-pulse z-20">
                <Zap className="w-3 h-3" />
                Live Sensing
              </div>
            )}
          </>

        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-4">
            <Camera className="w-16 h-16 opacity-20" />
            <p className="text-sm font-medium">Camera is currently inactive</p>
            {error && <p className="text-xs text-emotion-negative border border-emotion-negative/20 px-4 py-2 rounded-lg bg-emotion-negative/10">{error}</p>}
          </div>
        )}
      </div>
      
      <div className="flex justify-center mt-6">
        <button
          onClick={toggleCamera}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl transition-all font-bold text-base shadow-lg ${
            isCameraOn 
              ? 'bg-emotion-negative text-white hover:bg-emotion-negative/90' 
              : 'bg-premium-accent text-white hover:bg-premium-accent/90'
          }`}
        >
          {isCameraOn ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          {isCameraOn ? 'Stop Feed' : 'Start Feed'}
        </button>
      </div>
    </div>
  );
};

export default WebcamFeed;

