import { Component, OnInit, inject } from '@angular/core';
import { HomeFaqComponent, HOME_FAQS } from '../home/components/home-faq/home-faq.component';
import { SeoService } from '../../core/services';

@Component({
  selector: 'app-faq-page',
  standalone: true,
  imports: [HomeFaqComponent],
  template: '<app-home-faq />',
})
export class FaqPageComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.addFAQStructuredData(HOME_FAQS);
  }
}
