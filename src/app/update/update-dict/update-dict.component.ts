import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DictService } from '../../services/dict.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-update-dict',
  standalone: false,
  templateUrl: './update-dict.component.html',
  styleUrl: './update-dict.component.css'
})
export class UpdateDictComponent implements OnChanges {

  @Input() dictId!: string;

  private fb = inject(FormBuilder);
  private dictService = inject(DictService);
  private messageService = inject(MessageService);

  form!: FormGroup;

  private originalData = {
    label: '',
    description: ''
  };

  ngOnInit(): void {
    this.form = this.fb.group({
      label: ['', Validators.required],
      language: [{ value: '', disabled: true }],
      description: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dictId'] && this.dictId) {
      this.loadDictionary(this.dictId);
    }
  }

  private loadDictionary(id: string): void {
    this.dictService.getById(id).subscribe(dict => {
      this.form.patchValue({
        label: dict.label,
        language: dict.language,
        description: dict.description || ''
      });

      this.originalData = {
        label: dict.label,
        description: dict.description || ''
      };
    });
  }

  saveUpdatedDict(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { label, description } = this.form.getRawValue();
    let updated = false;

    if (label !== this.originalData.label) {
      updated = true;

      this.dictService.updateDictEntry(
        this.dictId,
        'label',
        this.originalData.label,
        label
      ).subscribe({
        next: () => {
          // 🔑 SYNCHRONISATION
          this.originalData.label = label;
        }
      });
    }

    if ((description || '') !== (this.originalData.description || '')) {
      updated = true;

      this.dictService.updateDictEntry(
        this.dictId,
        'description',
        this.originalData.description,
        description?.trim()
      ).subscribe({
        next: () => {
          // 🔑 SYNCHRONISATION
          this.originalData.description = description?.trim() || '';
        }
      });
    }

    this.messageService.add({
      severity: updated ? 'success' : 'info',
      summary: updated ? 'Dictionary updated' : 'No changes',
      detail: updated
        ? 'Your changes have been saved successfully.'
        : 'Nothing was modified.',
      life: 3000
    });
  }


  cancel(): void {
    if (!this.form.dirty) {
      this.messageService.add({
        severity: 'info',
        summary: 'No changes',
        detail: 'Nothing to cancel.',
        life: 2000
      });
      return;
    }

    this.form.reset({
      label: this.originalData.label,
      language: this.form.get('language')?.value,
      description: this.originalData.description
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

}
