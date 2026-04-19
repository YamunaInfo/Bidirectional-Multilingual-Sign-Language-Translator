import React from 'react';
import { Smile, Meh, Frown, HelpCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EmotionDisplay = ({ emotion, confidence }) => {
  const getEmotionDetails = (type) => {
    switch (type?.toLowerCase()) {
      case 'happy':
      case 'joy':
        return {
          icon: Smile,
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-50',
          label: 'Happy',
          emoji: '😊'
        };
      case 'sad':
      case 'unhappy':
        return {
          icon: Frown,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          label: 'Sad',
          emoji: '😢'
        };
      case 'angry':
      case 'furious':
        return {
          icon: Frown,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          label: 'Angry',
          emoji: '😡'
        };
      case 'neutral':
        return {
          icon: Meh,
          color: 'text-slate-500',
          bgColor: 'bg-slate-50',
          label: 'Neutral',
          emoji: '😐'
        };
      case 'surprised':
      case 'surprise':
        return {
          icon: HelpCircle,
          color: 'text-amber-500',
          bgColor: 'bg-amber-50',
          label: 'Surprised',
          emoji: '😲'
        };
      default:
        return {
          icon: User,
          color: 'text-slate-400',
          bgColor: 'bg-slate-50',
          label: 'Scanning',
          emoji: '🔍'
        };
    }
  };

  const details = getEmotionDetails(emotion);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={emotion}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`w-full flex items-center gap-6 p-5 rounded-2xl border border-slate-100 ${details.bgColor} transition-all duration-500 shadow-sm`}
      >
        <div className="text-4xl filter drop-shadow-sm">{details.emoji}</div>
        
        <div className="flex-grow">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Emotion Detected</p>
          <h3 className={`text-xl font-bold ${details.color}`}>
            {details.label}
          </h3>
        </div>

        {confidence > 0 && (
          <div className="text-[10px] font-bold text-slate-300 bg-white px-2 py-1 rounded-lg">
            {Math.round(confidence * 100)}% Match
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default EmotionDisplay;
