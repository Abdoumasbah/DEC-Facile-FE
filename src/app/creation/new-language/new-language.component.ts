import { Component } from '@angular/core';
import {FormGroup} from '@angular/forms';

@Component({
  selector: 'app-new-language',
  standalone: false,
  templateUrl: './new-language.component.html',
  styleUrl: './new-language.component.css'
})
export class NewLanguageComponent {
  form!: FormGroup;

  saveNewLanguage(): void {}
}
