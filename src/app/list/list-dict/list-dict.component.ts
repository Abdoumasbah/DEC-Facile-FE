import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DictService } from '../../services/dict.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-list-dict',
  standalone: false,
  templateUrl: './list-dict.component.html',
  styleUrls: ['./list-dict.component.css']
})
export class ListDictComponent implements OnInit {

  private fb = inject(FormBuilder);
  private dictService = inject(DictService);
  private messageService = inject(MessageService);

  form!: FormGroup;

  dictionaries: any[] = [];
  selectedDictId: string | null = null;
  expandedDict: string | null = null;

  originalData = {
    label: '',
    description: ''
  };

  ngOnInit(): void {
    this.initForm();
    this.loadDictionaries();
  }

  // ✅ INIT FORM (clean)
  private initForm() {
    this.form = this.fb.group({
      label: ['', Validators.required],
      language: [{ value: '', disabled: true }], // 🔥 better UX
      description: ['']
    });
  }

  loadDictionaries() {
    this.dictService.getAll().subscribe({
      next: (dicts) => {
        this.dictionaries = dicts || [];
      },
      error: () => {
        this.showError('Failed to load dictionaries');
      }
    });
  }

  toggleDict(dict: any) {
    const dictId = dict.dictionary;

    if (this.expandedDict === dictId) {
      this.expandedDict = null;
      this.selectedDictId = null;
      this.selectedTab = null; // 🔥 reset tab
      this.form.reset();
      return;
    }

    this.expandedDict = dictId;
    this.selectedDictId = dictId;

    // 👉 IMPORTANT : par défaut on ne montre RIEN
    this.selectedTab = null;

    this.form.patchValue({
      label: dict.label,
      language: dict.language,
      description: dict.description || ''
    });

    this.originalData = {
      label: dict.label,
      description: dict.description || ''
    };
  }

  selectTab(tab: 'general' | 'linguistic' | 'advanced') {
    this.selectedTab = tab;
  }


  deleteDict(dictId: string) {
    this.dictService.deleteDict(dictId).subscribe({
      next: () => {
        this.loadDictionaries();

        // 🔥 reset UI si supprimé
        if (this.selectedDictId === dictId) {
          this.selectedDictId = null;
          this.expandedDict = null;
          this.form.reset();
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Dictionary removed successfully',
          life: 3000
        });
      },
      error: () => {
        this.showError('Failed to delete dictionary');
      }
    });
  }

  saveUpdatedDict(): void {
    if (!this.form.valid || !this.selectedDictId) return;

    const { label, description } = this.form.getRawValue();
    let updated = false;

    // 🔥 UPDATE LABEL
    if (label !== this.originalData.label) {
      updated = true;

      this.dictService.updateDictEntry(
        this.selectedDictId,
        'label',
        this.originalData.label,
        label
      ).subscribe(() => {
        this.originalData.label = label;
        this.loadDictionaries();
      });
    }

    // 🔥 UPDATE DESCRIPTION
    if ((description || '') !== (this.originalData.description || '')) {
      updated = true;

      this.dictService.updateDictEntry(
        this.selectedDictId,
        'description',
        this.originalData.description,
        description?.trim()
      ).subscribe(() => {
        this.originalData.description = description?.trim() || '';
      });
    }

    this.messageService.add({
      severity: updated ? 'success' : 'info',
      summary: updated ? 'Updated' : 'No changes',
      detail: updated ? 'Saved successfully' : 'Nothing changed',
      life: 3000
    });
  }

  // ✅ helper propre
  private showError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 3000
    });
  }

  selectedTab: 'general' | 'linguistic' | 'advanced' | null = null;
  resetForm() {
    this.form.reset({
      label: this.originalData.label,
      language: this.form.get('language')?.value,
      description: this.originalData.description
    });
  }
}
