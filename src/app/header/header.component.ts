import {Component, HostListener} from '@angular/core';
import {LanguageService} from '../services/language.service';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    standalone: false,
    styleUrl: './header.component.css'
})
export class HeaderComponent {
  currentLang: 'en' | 'fr';

  constructor(private langService: LanguageService) {
    this.currentLang = this.langService.getLanguage();
  }

  switchLanguage(lang: 'en' | 'fr') {
    this.langService.setLanguage(lang);
    this.currentLang = lang;
    // You can trigger content reload if necessary
    // location.reload(); // optional if you use i18n tags
  }

  logout() {
    console.log('Logout clicked');
    // Add logout logic here
  }

  menuOpen = false;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click')
  closeMenu() {
    this.menuOpen = false;
  }
}
