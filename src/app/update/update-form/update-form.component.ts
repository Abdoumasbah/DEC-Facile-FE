import {Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild} from '@angular/core';
import {FormService} from '../../services/form.service';
import {DictEntryService} from '../../services/dict-entry.service';
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {IForms, IMorphologyTV} from '../../interfaces/forms.interface';
import {concatMap, of} from 'rxjs';
import {MessageService} from 'primeng/api';
import {MorphologyModel} from '../../models/morphology.model';
import {MorphologyService} from '../../services/Morphology.service';

@Component({
  selector: 'app-update-form',
  standalone: false,
  templateUrl: './update-form.component.html',
  styleUrl: './update-form.component.css'
})
export class UpdateFormComponent {

  @Input() dictEntryId: string | null = null;
  @Input() formId: string | null = null;
  @Output() formUpdated = new EventEmitter<void>();
  @ViewChild('noteField') noteField!: ElementRef<HTMLDivElement>;

  private formService = inject(FormService);
  private dictEntryService = inject(DictEntryService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  forms: IForms[] = [];
  morphologies: MorphologyModel[] = [];
  originalMorphology: IMorphologyTV[] = [];

  private morphologyService = inject(MorphologyService);


  form!: FormGroup;
  note: string = '';

  posOptions: { label: string; value: string }[] = [];
  posSelectionRequired = false;

  originalPOSIRI = '';
  selectedPOSIRI = '';
  selectedPOSLabel = '';

  private originalData = {
    type: '',
    pos: '',
    note: ''
  };


  updateNote(event: Event) {
    const target = event.target as HTMLElement;
    this.note = target.innerHTML; // stores HTML content
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      label: [{ value: '', disabled: true }],
      pos: [''],
      type: [''],
      language: [''],
      note: [''],
      morphoFeatures: this.fb.array([])
    });

    this.loadMorphologies();
  }

  ngOnChanges(): void {
    if (this.formId && this.dictEntryId) {
      this.loadForm();
    }
  }
  loadForm(): void {
    console.log(this.formId)
    console.log(this.dictEntryId)


    if (!this.formId || !this.dictEntryId) return;

    this.formService.getFormById(this.formId).subscribe(form => {

      const posIRI =
        form.inheritedMorphology?.find(
          (m: any) => m.trait === 'partOfSpeech'
        )?.value ?? '';

      this.originalPOSIRI = posIRI;
      this.selectedPOSIRI = posIRI;
      this.selectedPOSLabel = this.extractPOSLabel(posIRI);

      // 🔹 Load entry POS list
      this.dictEntryService.getById(this.dictEntryId!).subscribe(entry => {
        this.posOptions = (entry.pos ?? []).map(p => {
          const iri = p.startsWith('http')
            ? p
            : `http://www.lexinfo.net/ontology/3.0/lexinfo#${p}`;

          return {
            label: this.extractPOSLabel(iri),
            value: iri
          };
        });

        this.posSelectionRequired = this.posOptions.length > 1;
      });

      const normalizedType = this.mapTypeToIRI(form.type);

      this.form.patchValue({
        label: form.label?.[0]?.propertyValue ?? '',
        pos: posIRI,
        language: form.language,
        type: this.typeOptions.some(o => o.value === normalizedType)
          ? normalizedType
          : ''
      });

      this.note = form.note ?? '';

      this.originalData = {
        type: this.mapTypeToIRI(form.type),
        pos: posIRI,
        note: this.note
      };

      setTimeout(() => {
        this.noteField.nativeElement.innerText = this.note;
      });

    });
  }
  onPOSChange(event: Event) {
    this.selectedPOSIRI = (event.target as HTMLSelectElement).value;
  }

  extractPOSLabel(iri: string): string {
    return iri?.split('#').pop() ?? '';
  }

  private mapTypeToIRI(type: string): string {
    if (!type) return '';

    if (type.startsWith('http')) return type;

    return `http://www.w3.org/ns/lemon/ontolex#${type}`;
  }

  typeOptions = [
    {
      label: 'lemma',
      value: 'http://www.w3.org/ns/lemon/ontolex#canonicalForm'
    },
    {
      label: 'form',
      value: 'http://www.w3.org/ns/lemon/ontolex#otherForm'
    }
  ];

  saveUpdatedForm(): void {
    if (!this.formId) return;

    const { type } = this.form.value;
    const updates = [];
    const newPOS = this.form.value.pos;

    // ✅ TYPE
    updates.push(
      this.formService.updateForm(
        this.formId,
        'type',
        type
      )
    );

    // ✅ NOTE
    if (this.note?.trim()) {
      updates.push(
        this.formService.updateForm(
          this.formId,
          'note',
          this.note.trim()
        )
      );
    }

    this.saveUpdatedMorphology(this.formId);
    // ✅ POS (ONLY if changed & multi-POS)
    if (
      this.posSelectionRequired &&
      newPOS &&
      newPOS !== this.originalPOSIRI
    ) {
      updates.push(
        this.formService.updateFormPOS(
          this.formId,
          newPOS,
          this.originalPOSIRI
        )
      );
    }

    updates
      .reduce((acc, req) => acc.pipe(concatMap(() => req)), of(null))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Form updated',
            detail: 'The form was updated successfully.',
            life: 3500
          });

          this.formUpdated.emit();
        },
        error: err => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Update failed',
            detail: 'An error occurred while updating the form.',
            life: 4500
          });
        }
      });
  }


  cancel(): void {
    const { type, pos } = this.form.value;

    const hasFormChanges =
      type !== this.originalData.type ||
      pos !== this.originalData.pos;

    const hasNoteChanges =
      (this.note ?? '').trim() !== (this.originalData.note ?? '').trim();

    if (!hasFormChanges && !hasNoteChanges) {
      this.messageService.add({
        severity: 'info',
        summary: 'No changes',
        detail: 'Nothing to cancel.',
        life: 2000
      });
      return;
    }

    // Restore FORM values
    this.form.patchValue({
      type: this.originalData.type,
      pos: this.originalData.pos
    });

    // Restore POS selection state
    this.selectedPOSIRI = this.originalData.pos;
    this.selectedPOSLabel = this.extractPOSLabel(this.originalData.pos);

    // Restore NOTE (contenteditable)
    this.note = this.originalData.note;
    if (this.noteField) {
      this.noteField.nativeElement.innerText = this.note;
    }

    // Reset state
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private loadMorphologies(): void {
    this.morphologyService.getAll().subscribe(all => {
      this.morphologies = all.filter(
        m => m.propertyLabel?.toLowerCase() !== 'part of speech'
      );

      // 🔑 NOW that morphologies exist, load form morphology
      if (this.formId) {
        this.formService.getFormById(this.formId).subscribe(form => {
          this.loadFormMorphology(form);
        });
      }
    });
  }


  private loadFormMorphology(form: IForms): void {
    this.originalMorphology = form.morphology ?? [];

    this.originalMorphology.forEach(m => {
      const property = this.morphologies.find(
        mm => mm.propertyId === m.trait
      );

      if (!property) return;

      const value = property.propertyValues.find(
        v => v.valueId === m.value
      );

      if (!value) return;

      this.morphoFeatures.push(
        this.fb.group({
          property: [property, Validators.required],
          value: [value, Validators.required]
        })
      );
    });
  }

  private saveUpdatedMorphology(formId: string): void {
    this.morphoFeatures.controls.forEach(ctrl => {
      const group = ctrl as FormGroup;

      const property = group.get('property')?.value as MorphologyModel;
      const value = group.get('value')?.value;

      if (!property || !value) return;

      const old = this.originalMorphology.find(
        m => m.trait === property.propertyId
      );

      const payload: any = {
        type: 'morphology',
        relation: property.propertyId,
        value: value.valueId
      };

      if (old && old.value !== value.valueId) {
        payload.currentValue = old.value;
      }

      this.formService.updateFormMorphology(
        formId,
        payload.relation,
        payload.value
      ).subscribe();
    });
  }


  get morphoFeatures(): FormArray {
    return this.form.get('morphoFeatures') as FormArray;
  }

  getMorphoGroup(index: number): FormGroup {
    return this.morphoFeatures.at(index) as FormGroup;
  }

  addMorphoFeature(): void {
    this.morphoFeatures.push(
      this.fb.group({
        property: [null, Validators.required],
        value: [{ value: null, disabled: true }, Validators.required]
      })
    );
  }

  removeMorphoFeature(index: number): void {
    this.morphoFeatures.removeAt(index);
  }

  onMorphoPropertyChange(index: number): void {
    const featureGroup = this.morphoFeatures.at(index) as FormGroup;
    const property = featureGroup.get('property')?.value;

    if (!property) return;

    featureGroup.get('value')?.enable();
    featureGroup.get('value')?.reset();
  }

  getMorphoValues(index: number) {
    const group = this.getMorphoGroup(index);
    const property = group.get('property')?.value as MorphologyModel | null;

    return property?.propertyValues ?? [];
  }
}
