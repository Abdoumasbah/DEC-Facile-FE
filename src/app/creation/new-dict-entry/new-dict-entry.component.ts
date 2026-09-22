import {Component, OnInit, inject, EventEmitter, Output, ViewChild, ElementRef} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import { DictEntryService } from '../../services/dict-entry.service';
import {MorphologyService} from '../../services/Morphology.service';
import {LanguageService} from '../../services/language.service';
import {MessageService} from 'primeng/api';

@Component({
  selector: 'app-new-dict-entry',
  standalone: false,
  templateUrl: './new-dict-entry.component.html',
  styleUrl: './new-dict-entry.component.css'
})
export class NewDictEntryComponent implements OnInit {

  @Output() entryCreated = new EventEmitter<void>();
  @ViewChild('noteField') noteField!: ElementRef<HTMLDivElement>;
  private dictEntryService = inject(DictEntryService);
  private languageService = inject(LanguageService)
  private morphologyService = inject(MorphologyService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  type!: string;
  form!: FormGroup;
  languages: { label: string, value: string }[] = [];
  posOptions: { label: string, value: string }[] = [];
  note: string = '';

  updateNote(event: Event) {
    const target = event.target as HTMLElement;
    this.note = target.innerHTML; // stores HTML content
  }
  ngOnInit(): void {
    this.form = this.fb.group({
      label: ['', Validators.required],
      language: [null, Validators.required],
      type: [this.typeOptions[0].value, Validators.required],
      pos: [[], Validators.required],
    });



    this.loadLanguages();
    this.loadPOSOptions();
  }
  loadLanguages(): void {
    this.languageService.getAll().subscribe(result => {
      this.languages = result.map(lang => ({
        label: `${lang.label.toUpperCase()}`,
        value: lang.label
      }));
    });
  }


  saveNewDictEntry(): void {
    const { label, language, type, pos } = this.form.value as {
      label: string;
      language: string | null;
      type: string;
      pos: string[];
    };

    if (!label || !language || !pos?.length) {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing information',
        detail: 'Please fill in label, language, and part of speech.',
        life: 4000
      });
      return;
    }

    const posIris = pos.map(v =>
      `http://www.lexinfo.net/ontology/3.0/lexinfo#${v}`
    );
    const note = this.note?.replace(/\s+/g, ' ').trim();

    this.dictEntryService.createDicTEntry(
      label,
      type,
      this.normalizeLanguage(language),
      posIris
    )
      .subscribe({
        next: (created) => {
          // ✅ 1. Récupérer l’ID
          const entryId =
            (created as any)?.dictionaryEntry ||
            (created as any)?.entry ||
            (created as any)?.id;

         // console.log(entryId)
          if (!entryId) {
            console.error('❌ Entry ID not returned');
            return;
          }

          // ✅ 2. Ajouter NOTE si existe
          if (note) {
            this.dictEntryService
              .updateDictEntry(entryId, 'note', note)
              .subscribe({
                next: () => this.afterCreateSuccess(),
                error: err => {
                  console.error('❌ Note update failed', err);
                  this.afterCreateSuccess(); // quand même refresh
                }
              });
          } else {
            this.afterCreateSuccess();
          }
        },
        error: err => {
          console.error('❌ Failed to create entry', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Creation failed',
            detail: 'Failed to create dictionary entry. Please try again.',
            life: 4000
          });
        }
      });
  }
  private afterCreateSuccess(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Dictionary entry created',
      detail: 'The entry has been added successfully.',
      life: 3000
    });

    this.form.reset({
      type: this.typeOptions[0].value,
      pos: []
    });

    this.note = '';

    if (this.noteField) {
      this.noteField.nativeElement.innerText = ''; // ✅ VIDE VISUELLEMENT
    }

    // 🔥 notifier le parent
    this.entryCreated.emit();
  }

  private normalizeLanguage(lang: string | null | undefined): string {
    if (!lang) return '';

    const cleaned = lang.trim();

    if (!cleaned) return '';

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }


  typeOptions = [
    {
      label: 'Lexeme',
      value: 'http://www.w3.org/ns/lemon/ontolex#Word'
    },
    {
      label: 'Phraseme',
      value: 'http://www.w3.org/ns/lemon/ontolex#MultiwordExpression'
    }
  ];

  loadPOSOptions(): void {
    this.morphologyService.getAll().subscribe(all => {
      const pos = all.find(prop => prop.propertyLabel.toLowerCase() === 'part of speech');
      if (pos) {
        this.posOptions = pos.propertyValues.map(val => ({
          label: val.valueLabel,
          value: val.valueLabel
        }));
      }
    });
  }

}
