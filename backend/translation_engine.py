from deep_translator import GoogleTranslator

class TranslationEngine:
    def __init__(self):
        self.supported_languages = {
            'en': 'english',
            'hi': 'hindi',
            'es': 'spanish',
            'fr': 'french',
            'de': 'german',
            'ta': 'tamil',
            'te': 'telugu',
            'kn': 'kannada',
            'ml': 'malayalam'
        }

    def translate(self, text, target_lang='en', source_lang='auto'):
        """
        Translate text to target language.
        """
        if not text or text.strip() == "":
            return text
            
        if target_lang == source_lang:
            return text

        try:
            translated = GoogleTranslator(source=source_lang, target=target_lang).translate(text)
            return translated
        except Exception as e:
            print(f"Translation error: {e}")
            return text

    def get_supported_languages(self):
        return self.supported_languages
