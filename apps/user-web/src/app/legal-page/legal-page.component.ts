import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  legalPageByKey,
  type LegalPageContent,
  type LegalPageKey
} from '../core/constants/legal-pages-content.constants';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { WHATSAPP_CONTACT_URL } from '../core/constants/branding.constants';

@Component({
  selector: 'app-legal-page',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.scss'
})
export class LegalPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  content!: LegalPageContent;

  ngOnInit() {
    this.route.data.subscribe((data) => {
      const key = data['legalKey'] as LegalPageKey;
      this.content = legalPageByKey(key);
    });
  }
}
