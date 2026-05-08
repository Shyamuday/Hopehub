import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { INDIAN_UI_LANGUAGE_CODES } from './indian-languages';

export const VITALIS_LANG_STORAGE_KEY = 'vitalis_ui_lang';

export function appLanguageInitializer(translate: TranslateService) {
  return () => {
    translate.addLangs([...INDIAN_UI_LANGUAGE_CODES]);
    translate.setFallbackLang('en');
    const allowed = new Set(INDIAN_UI_LANGUAGE_CODES);
    let lang = 'en';
    try {
      const stored = localStorage.getItem(VITALIS_LANG_STORAGE_KEY);
      if (stored && allowed.has(stored)) {
        lang = stored;
      } else {
        const raw = translate.getBrowserLang() || translate.getBrowserCultureLang() || '';
        const short = raw.split(/[-_]/)[0]?.toLowerCase() || '';
        if (short && allowed.has(short)) {
          lang = short;
        }
      }
    } catch {
      /* private mode */
    }
    return firstValueFrom(translate.use(lang));
  };
}
