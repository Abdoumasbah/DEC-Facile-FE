import {Component, ElementRef, EventEmitter, inject, Input, Output, SimpleChanges, ViewChild} from '@angular/core';
import {DictEntryService} from '../../services/dict-entry.service';
import {LanguageService} from '../../services/language.service';
import {MorphologyService} from '../../services/Morphology.service';
import {FormBuilder, FormGroup} from '@angular/forms';
import {concatMap, of} from 'rxjs';
import {MessageService} from 'primeng/api';

@Component({
  selector: 'app-update-dict-entry',
  standalone: false,
  templateUrl: './update-dict-entry.component.html',
  styleUrl: './update-dict-entry.component.css'
})
export class UpdateDictEntryComponent {
  private dictEntryService = inject(DictEntryService);
  private morphologyService = inject(MorphologyService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  type!: string;
  form!: FormGroup;
  posOptions: { label: string, value: string }[] = [];
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
  note: string = '';

  @Input() dictEntryId!: string;
  @Output() entryUpdated = new EventEmitter<void>();
  @ViewChild('noteField') noteField!: ElementRef<HTMLDivElement>;


  statuses = [
    {label: 'Working', value: 'working'},
    {label: 'Completed', value: 'completed'},
    {label: 'Reviewed', value: 'reviewed'}
  ];
  private originalData = {
    label: '',
    pos: [] as string[],
    note: '',
    type: ''
  };



  updateNote(event: Event) {
    const target = event.target as HTMLElement;
    this.note = target.innerText.trim();
  }


  ngOnInit(): void {

    this.form = this.fb.group({
      label: [''],
      language: [''],
      pos: [[]],
      type: ['']   // 👈 tableau
    });

    this.loadPOSOptions();

    if (this.dictEntryId) {
      this.loadEntry(this.dictEntryId);
    }
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dictEntryId'] && !changes['dictEntryId'].firstChange) {
      this.loadEntry(this.dictEntryId);
    }
  }

  private mapBackendTypeToIRI(type: string | string[]): string {
    const types = Array.isArray(type) ? type : [type];

    // 🔥 ignorer "Entry"
    const meaningfulType = types.find(t => t !== 'Entry');

    if (!meaningfulType) return '';

    return `http://www.w3.org/ns/lemon/ontolex#${meaningfulType}`;
  }

  private loadEntry(id: string): void {
    this.dictEntryService.getById(id).subscribe(entry => {

      const posIRIs = entry.pos ?? [];

      this.form.patchValue({
        label: entry.label,
        language: entry.language,
        pos: posIRIs.map(p => p.split('#').pop()),
        type: this.mapBackendTypeToIRI(entry.type)
      });

      this.note = entry.note ?? '';
      if (this.noteField) {
        this.noteField.nativeElement.innerText = this.note;
      }

      this.originalData = {
        label: entry.label,
        pos: posIRIs.map(p => this.toLexinfoIRI(p)),
        note: entry.note ?? '',
        type: this.mapBackendTypeToIRI(entry.type)
      };
    });
  }

  saveUpdateDictEntry(): void {
    if (!this.dictEntryId) return;

    const updates: any[] = [];
    const { label, pos, type } = this.form.value;

    /* =======================
       LABEL
    ======================= */
    if (label && label !== this.originalData.label) {
      updates.push(
        this.dictEntryService.updateDictEntry(
          this.dictEntryId,
          'label',
          label
        )
      );
    }

    if (type && type !== this.originalData.type) {
      updates.push(
        this.dictEntryService.updateDictEntry(
          this.dictEntryId,
          'type',
          type
        )
      );
    }

    /* =======================
       NOTE
    ======================= */
    if (this.note !== this.originalData.note) {
      updates.push(
        this.dictEntryService.updateDictEntry(
          this.dictEntryId,
          'note',
          this.note
        )
      );
    }

    /* =======================
       POS (MULTI)
    ======================= */
    const newPosIRIs: string[] = (pos || []).map((p: string) =>
      this.toLexinfoIRI(p)
    );

    const oldPosIRIs = this.originalData.pos;

    const posToAdd = newPosIRIs.filter(p => !oldPosIRIs.includes(p));
    const posToRemove = oldPosIRIs.filter(p => !newPosIRIs.includes(p));

    posToAdd.forEach(newPos => {
      updates.push(
        this.dictEntryService.updateDictEntry(
          this.dictEntryId,
          'pos',
          newPos
        )
      );
    });

    posToRemove.forEach(oldPos => {
      updates.push(
        this.dictEntryService.deletePosFromEntry(
          this.dictEntryId,
          oldPos
        )
      );
    });

    if (!updates.length) {
      this.messageService.add({
        severity: 'info',
        summary: 'No changes',
        detail: 'Nothing was modified.',
        life: 3000
      });
      return;
    }

    /* =======================
       SEQUENTIAL EXECUTION
    ======================= */
    updates
      .reduce((acc, req) => acc.pipe(concatMap(() => req)), of(null))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Entry updated',
            detail: 'Dictionary entry updated successfully.',
            life: 3500
          });

          this.loadEntry(this.dictEntryId);
          this.entryUpdated.emit();
        },
        error: (err: unknown) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Update failed',
            detail: 'An error occurred while updating the entry.',
            life: 4500
          });
        }
      });
  }



  private toLexinfoIRI(pos: string): string {
    return pos.startsWith('http')
      ? pos
      : `http://www.lexinfo.net/ontology/3.0/lexinfo#${pos}`;
  }


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

  cancel(): void {
    if (!this.form.dirty && this.note === this.originalData.note) {
      this.messageService.add({
        severity: 'info',
        summary: 'No changes',
        detail: 'Nothing to cancel.',
        life: 2000
      });
      return;
    }

    // Restore FORM values
    this.form.reset({
      label: this.originalData.label,
      language: this.form.get('language')?.value,
      pos: this.originalData.pos.map(p => p.split('#').pop())
    });

    // Restore NOTE (contenteditable)
    this.note = this.originalData.note;
    if (this.noteField) {
      this.noteField.nativeElement.innerText = this.note;
    }

    // Reset form state
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
