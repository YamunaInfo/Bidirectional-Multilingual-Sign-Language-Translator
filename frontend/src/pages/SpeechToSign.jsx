import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Volume2, Type, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { signService } from '../services/api';

const SpeechToSign = () => {
  const recognitionRef = useRef(null);
  const [inputText, setInputText] = useState('welcome');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  const [showLetters, setShowLetters] = useState(true);
  const [fixedWidth, setFixedWidth] = useState(false);
  const [signSequence, setSignSequence] = useState([
    { char: 'W', icon: '🤟' },
    { char: 'E', icon: '✊' },
    { char: 'L', icon: '☝️' },
    { char: 'C', icon: '👌' },
    { char: 'O', icon: '👌' },
    { char: 'M', icon: '👊' },
    { char: 'E', icon: '✊' },
  ]);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      await signService.textToSign({ text: inputText });
      
      const chars = inputText.toUpperCase().split('');
      const mockIcons = ['🤟', '✊', '☝️', '👌', '👊', '👋', '✌️', '🤙'];
      const newSequence = chars.map((c, i) => ({
        char: c,
        icon: mockIcons[i % mockIcons.length]
      }));
      setSignSequence(newSequence);
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = () => {
    if ('speechSynthesis' in window && inputText) {
      const utterance = new SpeechSynthesisUtterance(inputText);
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (e) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interimTranscript += e.results[i][0].transcript;
        }
      }

      // Update the input with the combined text
      if (finalTranscript) {
        setInputText(prev => (prev.endsWith(' ') || prev === '') ? prev + finalTranscript : prev + ' ' + finalTranscript);
      } else if (interimTranscript) {
        // Show interim results but don't commit them permanently to the main state yet if you want
        // For simplicity in a sign translator, we just show everything live
        setInputText(prev => prev.split('. ').slice(0, -1).join('. ') + (prev ? '. ' : '') + interimTranscript);
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      if (e.error === 'no-speech') return; // Ignore silence
      setIsListening(false);
      if (e.error === 'not-allowed') {
        alert("Microphone permission denied.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };


  return (
    <div className="h-full bg-[#F9FAFB] pt-4 pb-4 px-6 overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 overflow-hidden">
        <h1 className="text-2xl font-bold text-[#111827] text-center mb-4">Speech/Text to Sign Language</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Left Column: Input */}
          <div className="bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-gray-100 p-5 flex flex-col overflow-hidden">
            <h2 className="text-lg font-bold text-[#111827] mb-3">Input Text or Speech</h2>
            
            <div className={`flex-grow relative ${isListening ? 'ring-2 ring-red-500/20 rounded-2xl animate-pulse' : ''}`}>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? "Listening... Speak clearly into your mic" : "Type your message here..."}
                className={`w-full h-36 border-2 rounded-2xl p-4 outline-none transition-all text-base font-medium resize-none shadow-inner ${isListening ? 'bg-red-50/30 border-red-200' : 'bg-white border-gray-100 focus:border-[#3B82F6]'}`}
              />
              {isListening && (
                <div className="absolute top-4 right-4 flex gap-1">
                  <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-red-400 rounded-full" />
                  <motion.div animate={{ height: [8, 24, 8] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1 bg-red-400 rounded-full" />
                  <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-red-400 rounded-full" />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-3">
              <button 
                onClick={toggleListening}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all border-2 text-sm ${isListening ? 'bg-red-50 border-red-200 text-red-500 animate-pulse' : 'bg-white border-gray-100 text-[#111827] hover:bg-gray-50'}`}
              >
                <Mic className="w-5 h-5 flex-shrink-0" /> Use Microphone
              </button>
              <button 
                onClick={speakText}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-[#111827] font-bold hover:bg-gray-50 transition-all text-sm"
              >
                <Volume2 className="w-4 h-4 flex-shrink-0" /> Speak Text
              </button>
            </div>

            <button 
              onClick={handleTranslate}
              disabled={isProcessing}
              className="w-full bg-[#111827] hover:bg-[#1F2937] text-white font-bold py-3 rounded-xl mt-3 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 text-sm"
            >
              {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <span>Translate to Sign</span>}
            </button>
          </div>

          {/* Right Column: Output */}
          <div className="bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-gray-100 p-5 flex flex-col overflow-hidden">
            <h2 className="text-lg font-bold text-[#111827] mb-3">Sign Language Output</h2>

            <div className="flex items-center gap-6 mb-3">
               <label className="flex items-center gap-2 cursor-pointer group">
                 <input type="checkbox" className="hidden" checked={showLetters} onChange={() => setShowLetters(!showLetters)} />
                 {showLetters ? <CheckSquare className="w-6 h-6 text-[#111827]" /> : <Square className="w-6 h-6 text-gray-300" />}
                 <span className="text-sm font-bold text-[#111827]">Show English Letters</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer group">
                 <input type="checkbox" className="hidden" checked={fixedWidth} onChange={() => setFixedWidth(!fixedWidth)} />
                 {fixedWidth ? <CheckSquare className="w-6 h-6 text-[#111827]" /> : <Square className="w-6 h-6 text-gray-300" />}
                 <span className="text-sm font-bold text-[#111827]">Fixed Width Signs</span>
               </label>
            </div>

            <div className="flex-grow bg-[#EBF5FF] rounded-3xl p-4 flex items-center justify-center overflow-auto min-h-[150px]">
              <div className="flex flex-wrap justify-center gap-8">
                <AnimatePresence>
                  {signSequence.map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex flex-col items-center ${fixedWidth ? 'w-[70px]' : ''}`}
                    >
                      <div className="text-[40px] mb-1 filter drop-shadow-lg">{item.icon}</div>
                      {showLetters && <span className="text-xl font-bold text-[#111827]">{item.char}</span>}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {signSequence.length === 0 && <p className="text-gray-400 font-medium">Signs will appear here...</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeechToSign;
