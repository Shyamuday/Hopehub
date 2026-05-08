/**
 * UI locale codes for Indian English + the 22 languages listed in the Eighth Schedule of the Constitution.
 * Files live in `public/assets/i18n/{code}.json`. Non-English files are synced from `en.json` until translated.
 */
export type IndianUiLanguage = {
  code: string;
  /** Name in English for the selector list */
  englishName: string;
  /** Endonym where helpful (may match English for some locales) */
  nativeName: string;
};

export const INDIAN_UI_LANGUAGES: IndianUiLanguage[] = [
  { code: 'en', englishName: 'English', nativeName: 'English' },
  { code: 'as', englishName: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা' },
  { code: 'brx', englishName: 'Bodo', nativeName: 'बड़ो' },
  { code: 'doi', englishName: 'Dogri', nativeName: 'डोगरी' },
  { code: 'gu', englishName: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'kn', englishName: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ks', englishName: 'Kashmiri', nativeName: 'کٲشُر / कॉशुर' },
  { code: 'kok', englishName: 'Konkani', nativeName: 'कोंकणी' },
  { code: 'mai', englishName: 'Maithili', nativeName: 'मैथिली' },
  { code: 'ml', englishName: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mni', englishName: 'Manipuri (Meitei)', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ' },
  { code: 'mr', englishName: 'Marathi', nativeName: 'मराठी' },
  { code: 'ne', englishName: 'Nepali', nativeName: 'नेपाली' },
  { code: 'or', englishName: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'pa', englishName: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'sa', englishName: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { code: 'sat', englishName: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'sd', englishName: 'Sindhi', nativeName: 'सिन्धी / سنڌي' },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ur', englishName: 'Urdu', nativeName: 'اردو' }
];

export const INDIAN_UI_LANGUAGE_CODES = INDIAN_UI_LANGUAGES.map((l) => l.code);
