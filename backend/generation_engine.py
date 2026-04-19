class GenerationEngine:
    def __init__(self):
        # Mapping of words/phrases to video assets (URLs or local paths)
        # Using placeholder public sign language videos where possible or generic videos
        self.asset_map = {
            "hello": "https://www.signingsavvy.com/media/mp4-video/21741.mp4",
            "thank you": "https://www.signingsavvy.com/media/mp4-video/23014.mp4",
            "yes": "https://www.signingsavvy.com/media/mp4-video/23114.mp4",
            "no": "https://www.signingsavvy.com/media/mp4-video/22212.mp4",
            "please": "https://www.signingsavvy.com/media/mp4-video/22315.mp4",
            "sorry": "https://www.signingsavvy.com/media/mp4-video/22718.mp4",
            "goodbye": "https://www.signingsavvy.com/media/mp4-video/21612.mp4",
        }
        self.default_video = "https://www.w3schools.com/html/mov_bbb.mp4"

    def text_to_sign(self, text):
        """
        Convert text to a sign language video URL.
        """
        clean_text = text.lower().strip()
        
        # Check for direct phrase match
        if clean_text in self.asset_map:
            return {
                "video_url": self.asset_map[clean_text],
                "emotion_tone": self._detect_basic_emotion(clean_text)
            }
        
        # Fallback: look for keywords
        for key in self.asset_map:
            if key in clean_text:
                return {
                    "video_url": self.asset_map[key],
                    "emotion_tone": self._detect_basic_emotion(clean_text),
                    "note": f"Partial match found for: {key}"
                }
        
        return {
            "video_url": self.default_video,
            "emotion_tone": "Neutral",
            "note": f"Showing generic sign for: {text}"
        }

    def _detect_basic_emotion(self, text):
        positive = ['hello', 'yes', 'please', 'goodbye']
        negative = ['no', 'sorry']
        
        if any(w in text for w in positive):
            return "Positive"
        if any(w in text for w in negative):
            return "Negative"
        return "Neutral"
