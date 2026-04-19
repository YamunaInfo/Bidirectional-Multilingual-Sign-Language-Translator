import React, { useState, useEffect } from 'react';
import WebcamFeed from '../components/WebcamFeed';
import FileUpload from '../components/FileUpload';
import EmotionDisplay from '../components/EmotionDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, FileText, RefreshCw, Upload, Camera, Download } from 'lucide-react';
import { signService } from '../services/api';

const SignToSpeech = () => {
  const [inputMode, setInputMode] = useState('file'); // 'webcam' or 'file'
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoDetect, setAutoDetect] = useState(false);
  const [result, setResult] = useState({ 
    text: '', 
    emotion: null, 
    confidence: 0, 
    status: 'Ready' 
  });
  const [originalText, setOriginalText] = useState(''); // Store English source
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [lastFrame, setLastFrame] = useState(null);
  const [targetLang, setTargetLang] = useState('en');
  const [languageMode, setLanguageMode] = useState('ASL');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'kn', name: 'Kannada' },
  ];

  // Professional Dynamic Translation: Translate existing results when target language changes
  useEffect(() => {
    const reTranslate = async () => {
      if (!originalText || targetLang === 'en') {
        if (targetLang === 'en' && result.text !== originalText) {
          setResult(prev => ({ ...prev, text: originalText }));
        }
        return;
      }
      
      try {
        const response = await signService.translateText({
          text: originalText,
          target_lang: targetLang,
          source_lang: 'en'
        });
        if (response.data.translated_text) {
          setResult(prev => ({ ...prev, text: response.data.translated_text }));
        }
      } catch (err) {
        console.error("Dynamic translation error:", err);
      }
    };
    
    reTranslate();
  }, [targetLang]);

  const handleFrameCaptured = async (imageSrc) => {
    if (!imageSrc) return;
    setLastFrame(imageSrc); // always store latest frame
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    try {
      const response = await signService.signToText({ 
        image: imageSrc, 
        target_lang: targetLang,
        language_mode: languageMode,
        user_id: user?.id 
      });
      const data = response.data;
      
      if (data.annotated_image) {
        setAnnotatedImage(data.annotated_image);
      }

      if (data.text) {
        setOriginalText(data.text);
        setResult({
          text: data.text,
          status: data.status || "Sign Detected",
          emotion: data.emotion,
          confidence: data.confidence || 0
        });
      } else if (data.status) {
        setResult(prev => ({ ...prev, status: data.status }));
      }
    } catch (err) {
      console.error("Frame processing error:", err);
    }
  };


  const handleFileSelected = (file) => {
    setSelectedFile(file || null);
    setResult({ text: '', emotion: null, confidence: 0 });
    setError(null);
  };

  const handleTranslate = async () => {
    if (inputMode === 'file' && !selectedFile) return;
    setIsProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('target_lang', targetLang);
      formData.append('language_mode', languageMode);
      const response = await signService.uploadFile(formData);
      if (response.data.status === 'success') {
        const englishText = response.data.result;
        const displayText = targetLang !== 'en' 
          ? (response.data.translated || englishText) 
          : englishText;
          
        setOriginalText(englishText);
        setResult({
          text: displayText,
          status: "Video Processed",
          emotion: response.data.emotion,
          confidence: response.data.confidence || 0.8
        });
      } else if (response.data.error) {
        setError(response.data.error);
      }
    } catch (err) {
      setError('Failed to process video. Is the backend running?');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureAndTranslate = async () => {
    if (!lastFrame) return;
    setIsProcessing(true);
    setError(null);
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    try {
      const response = await signService.signToText({
        image: lastFrame,
        target_lang: targetLang,
        language_mode: languageMode,
        user_id: user?.id
      });
      const data = response.data;
      if (data.annotated_image) setAnnotatedImage(data.annotated_image);
      if (data.text) {
        setOriginalText(data.text);
        setResult({ text: data.text, status: data.status || "Detected", emotion: data.emotion || null, confidence: data.confidence || 0 });
      } else {
        setResult(prev => ({ ...prev, status: data.status || "Point at camera" }));
      }
    } catch (err) {
      setError('Failed to capture frame.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResult = () => {
    if ('speechSynthesis' in window && result.text && result.text !== "Scanning...") {
      // Professional: Format speech with emotional context
      let speechText = result.text;
      if (result.emotion && result.emotion !== 'Neutral') {
        speechText = `${result.text}. The signer appears ${result.emotion.toLowerCase()}.`;
      }
      
      const utterance = new SpeechSynthesisUtterance(speechText);
      window.speechSynthesis.speak(utterance);
    }
  };


  return (
    <div className="h-full bg-[#F9FAFB] pt-4 pb-4 px-6 overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 overflow-hidden">
        <h1 className="text-2xl font-bold text-[#111827] text-center mb-4">Sign Language to Speech/Text</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Left Column: Input Video */}
          <div className="bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-gray-100 p-5 flex flex-col overflow-hidden">
            <h2 className="text-lg font-bold text-[#111827] mb-3">Input Video</h2>
            
            <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-gray-100 mb-3">
              <button 
                onClick={() => setInputMode('file')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all text-sm ${inputMode === 'file' ? 'bg-white text-[#111827] shadow' : 'text-gray-400'}`}
              >
                <Upload className="w-4 h-4" /> Upload Video
              </button>
              <button 
                onClick={() => setInputMode('webcam')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all text-sm ${inputMode === 'webcam' ? 'bg-white text-[#111827] shadow' : 'text-gray-400'}`}
              >
                <Camera className="w-4 h-4" /> Live Camera
              </button>
            </div>

            <div className="flex-grow flex flex-col justify-center">
              {inputMode === 'webcam' ? (
                <div className="rounded-3xl overflow-hidden border-4 border-[#F8FAFC] relative bg-[#000]">
                   <WebcamFeed 
                    isActive={true} 
                    autoDetect={true} 
                    onFrameCaptured={handleFrameCaptured} 
                    overlayImage={annotatedImage}
                   />
                </div>
              ) : (

                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 bg-[#FBFDFF] flex flex-col items-center justify-center">
                  <FileUpload onFileSelected={handleFileSelected} />
                  {isProcessing && <p className="mt-3 text-[#3B82F6] font-bold animate-pulse text-sm">⏳ Processing video frames...</p>}
                  {error && <p className="mt-3 text-red-500 font-bold text-sm">{error}</p>}
                </div>
              )}
            </div>

            {inputMode === 'file' ? (
              <button 
                onClick={handleTranslate}
                disabled={isProcessing || !selectedFile}
                className={`w-full font-bold py-3 rounded-xl mt-3 transition-all shadow-lg active:scale-95 text-sm flex items-center justify-center gap-2 ${
                  isProcessing || !selectedFile
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#111827] hover:bg-[#1F2937] text-white'
                }`}
              >
                {isProcessing ? <><span>⏳</span> Translating...</> : '▶ Translate Video'}
              </button>
            ) : (
              <button 
                onClick={handleCaptureAndTranslate}
                disabled={isProcessing}
                className={`w-full font-bold py-3 rounded-xl mt-3 transition-all shadow-lg active:scale-95 text-sm flex items-center justify-center gap-2 ${
                  isProcessing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#6366f1] hover:bg-[#4f46e5] text-white'
                }`}
              >
                {isProcessing ? '⏳ Detecting...' : '📸 Capture & Translate'}
              </button>
            )}
          </div>

          {/* Right Column: Output */}
          <div className="bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-gray-100 p-5 flex flex-col overflow-hidden">
            <h2 className="text-lg font-bold text-[#111827] mb-3">Translation Output</h2>

            <div className="space-y-3 flex-grow overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Sign Language:</label>
                  <select 
                    value={languageMode}
                    onChange={(e) => setLanguageMode(e.target.value)}
                    className="w-full bg-[#F8FAFC] border-2 border-gray-100 rounded-xl px-3 py-2 outline-none focus:border-[#3B82F6] text-[#111827] font-bold text-sm appearance-none cursor-pointer"
                  >
                    <option value="ASL">ASL (American)</option>
                    <option value="ISL">ISL (Indian)</option>
                    <option value="BSL">BSL (British)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Output Text:</label>
                  <select 
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-[#F8FAFC] border-2 border-gray-100 rounded-xl px-3 py-2 outline-none focus:border-[#3B82F6] text-[#111827] font-bold text-sm appearance-none cursor-pointer"
                  >
                    {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                   <p className="text-gray-500 font-bold text-xs uppercase">Translated Text:</p>
                   {result.status && (
                     <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${result.status.includes('Analyzing') ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
                       {result.status}
                     </p>
                   )}
                </div>
                <div className="min-h-[100px] bg-[#F8FAFC] rounded-2xl p-4 text-xl font-bold text-[#111827] leading-tight border border-gray-100 shadow-inner flex flex-col items-center justify-center text-center">
                  <span className="text-3xl">{result.text || (isProcessing ? "Processing..." : "Ready")}</span>
                </div>
              </div>

              <div className="bg-[#EBF5FF] rounded-2xl">
                 <EmotionDisplay 
                    emotion={result.emotion} 
                    confidence={result.confidence}
                 />
              </div>

              <button 
                onClick={speakResult}
                className="w-full bg-[#111827] hover:bg-[#1F2937] text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 text-sm"
              >
                <Volume2 className="w-6 h-6" /> Generate Speech
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-all text-sm">
                  <FileText className="w-4 h-4 text-gray-500" /> Export PDF
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-all text-sm">
                  <Download className="w-4 h-4 text-gray-500" /> Export Word
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignToSpeech;
