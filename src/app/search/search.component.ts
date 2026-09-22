import {Component, computed, EventEmitter, inject, model, Output} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {LanguageService} from '../services/language.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  standalone: false,
  styleUrls: ['./search.component.css']
})
export class SearchComponent {

  search = model("aa");
  selectedLanguage = model("");
  languageService = inject(LanguageService);
  languages = toSignal(this.languageService.getAll());

  @Output() languageChanged = new EventEmitter<string>();

  getECDEntriesType = computed(() => {
    return this.languages()?.map(language => language)
  });

  updateLanguage(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newLanguage = target.value;
    this.selectedLanguage.set(newLanguage);
    this.languageChanged.emit(newLanguage);
  }
}
