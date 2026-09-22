import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DictService } from '../../services/dict.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-new-dict',
  standalone: false,
  templateUrl: './new-dict.component.html',
  styleUrl: './new-dict.component.css'
})
export class NewDictComponent implements OnInit {

  private fb = inject(FormBuilder);
  private dictService = inject(DictService);
  private messageService = inject(MessageService);

  form!: FormGroup;

  languages = [
    { label: 'English', value: 'English' },
    { label: 'Français', value: 'Français' },
    { label: 'Italiano', value: 'Italiano' }
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      label: ['', Validators.required],
      language: ['', Validators.required],
      description: ['']
    });
  }

  saveNewDict(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { label, language, description } = this.form.value;

    // 1️⃣ CREATE DICTIONARY
    this.dictService
      .createDicT(label, this.normalizeLanguage(language))
      .subscribe({
        next: (createdDict) => {

          const dictId =
            (createdDict as any)?.dictionary ||
            (createdDict as any)?.id;

          if (!dictId) {
            this.showError('Dictionary ID not returned');
            return;
          }

          // 2️⃣ UPDATE LABEL
          this.dictService.updateDictEntry(
            dictId,
            'label',
            '',
            label
          ).subscribe();

          // 3️⃣ UPDATE DESCRIPTION (OPTIONAL)
          if (description?.trim()) {
            this.dictService.updateDictEntry(
              dictId,
              'description',
              '',
              description.trim()
            ).subscribe();
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Dictionary created',
            detail: 'The dictionary has been created successfully.',
            life: 3000
          });

          this.form.reset();
        },

        error: () => {
          this.showError('Failed to create dictionary. Please try again.');
        }
      });
  }

  cancel(): void {
    this.form.reset();
  }

  private normalizeLanguage(lang: string): string {
    const cleaned = lang.trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }

  private showError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 4000
    });
  }
}
