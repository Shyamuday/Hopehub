import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { INDIAN_UI_LANGUAGES } from './indian-languages';
import { VITALIS_LANG_STORAGE_KEY } from './app-language.factory';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <label class="lang-switcher">
      <span class="sr-only">{{ 'common.language' | translate }}</span>
      <select
        class="lang-select"
        [ngModel]="currentLang()"
        (ngModelChange)="onSelect($event)"
        [attr.aria-label]="'common.language' | translate">
        @for (opt of languages; track opt.code) {
          <option [value]="opt.code">{{ opt.nativeName }} — {{ opt.englishName }}</option>
        }
      </select>
    </label>
  `,
  styles: [
    `
      .lang-switcher {
        display: inline-flex;
        align-items: center;
        margin: 0;
      }
      .lang-select {
        max-width: min(16rem, 72vw);
        min-height: 40px;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #0f172a;
        padding: 0.25rem 0.45rem;
        font-size: 0.82rem;
        font-weight: 600;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `
  ]
})
export class LanguageSwitcherComponent {
  private readonly translate = inject(TranslateService);

  readonly languages = INDIAN_UI_LANGUAGES;
  readonly currentLang = signal(this.translate.getCurrentLang() || 'en');

  constructor() {
    this.translate.onLangChange.subscribe((e) => this.currentLang.set(e.lang));
  }

  onSelect(code: string) {
    this.currentLang.set(code);
    void firstValueFrom(this.translate.use(code));
    try {
      localStorage.setItem(VITALIS_LANG_STORAGE_KEY, code);
    } catch {
      /* private mode */
    }
  }
}
