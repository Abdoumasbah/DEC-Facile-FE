import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild} from '@angular/core';
import {FormService} from '../../services/form.service';
import {DictEntryService} from '../../services/dict-entry.service';
import {IForms} from '../../interfaces/forms.interface';
import {MessageService} from 'primeng/api';
import {MorphologyService} from '../../services/Morphology.service';
import {MorphologyModel} from '../../models/morphology.model';

@Component({
  selector: 'app-new-form',
  standalone: false,
  templateUrl: './new-form.component.html',
  styleUrl: './new-form.component.css'
})
export class NewFormComponent {

  @Input() dictEntryId: string | null = null;
  @Output() formCreated = new EventEmitter<void>();
  @ViewChild('noteField') noteField!: ElementRef<HTMLDivElement>;

  private formService = inject(FormService);
  private dictEntryService = inject(DictEntryService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  forms: IForms[] = [];
  morphologies: MorphologyModel[] = [];

  private morphologyService = inject(MorphologyService);

  form!: FormGroup;
  languages!: string;
  posOptions:  { label: string, value: string }[] = [];
  note: string = '';

  updateNote(event: Event) {
    const target = event.target as HTMLElement;
    this.note = target.innerHTML; // stores HTML content
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      label: [''],
      type: ['http://www.w3.org/ns/lemon/ontolex#otherForm'], // ✅ default = form
      pos: [null],
      note: [''],
      morphoFeatures: this.fb.array([])
    });


    this.loadLanguages();
    this.loadPOSOptions();
    this.loadMorphologies();
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

  saveNewForm(): void {
    const { label, type, pos } = this.form.value;

    if (!label || !pos || !type || !this.dictEntryId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing information',
        detail: 'Please fill in all required fields.',
        life: 4000
      });
      return;
    }

    const posIRI =
      pos.value?.startsWith('http')
        ? pos.value
        : `http://www.lexinfo.net/ontology/3.0/lexinfo#${pos.value}`;

    this.formService.createForm(
      label,
      type,
      this.normalizeLanguage(this.languages),
      posIRI,
      this.dictEntryId
    ).subscribe({
      next: (createdForm) => {

        const formId =
          Array.isArray(createdForm)
            ? createdForm[0]?.form
            : (createdForm as any)?.form;

        if (!formId) {
          console.warn('⚠️ Form created but ID not found');
          this.afterSuccessReset();
          return;
        }

        // ✅ SAVE MORPHOLOGICAL FEATURES
        this.saveMorphologicalFeatures(formId);

        // ✅ NOTE (si présente)
        if (this.note?.trim()) {
          this.formService
            .updateForm(formId, 'note', this.note.trim())
            .subscribe({
              next: () => {
                this.afterSuccessReset();
              },
              error: err => {
                console.error(err);
                this.messageService.add({
                  severity: 'warn',
                  summary: 'Partial success',
                  detail: 'Form created, but note could not be saved.',
                  life: 4500
                });
                this.afterSuccessReset();
              }
            });
        } else {
          this.afterSuccessReset();
        }

      },
      error: err => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Creation failed',
          detail: 'Failed to create form. Please try again.',
          life: 4000
        });
      }
    });
  }

  private normalizeLanguage(lang: string | null | undefined): string {
    if (!lang) return '';

    const cleaned = lang.trim();

    if (!cleaned) return '';

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }

  private afterSuccessReset(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Form created',
      detail: 'The form has been added successfully.',
      life: 3000
    });

    this.form.reset({
      type: 'http://www.w3.org/ns/lemon/ontolex#otherForm'
    });

    if (this.noteField) {
      this.noteField.nativeElement.innerText = ''; // ✅ VIDE VISUELLEMENT
    }

    this.autoSelectSinglePOS();

    this.formCreated.emit();
  }


  private autoSelectSinglePOS(): void {
    if (this.posOptions.length === 1) {
      this.form.patchValue({
        pos: this.posOptions[0]
      });
    }
  }

  loadLanguages(): void {
    if(this.dictEntryId){
      this.dictEntryService.getById(this.dictEntryId).subscribe(all => {
        this.languages = all.language;
      });}

  }



  loadPOSOptions(): void {
    if (!this.dictEntryId) return;

    this.dictEntryService.getById(this.dictEntryId).subscribe(entry => {
      this.posOptions = (entry.pos ?? []).map(p => ({
        label: p.split('#').pop() ?? p,
        value: p
      }));

     this.autoSelectSinglePOS();

    });
  }

  get morphoFeatures(): FormArray {
    return this.form.get('morphoFeatures') as FormArray;
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

  private loadMorphologies(): void {
    this.morphologyService.getAll().subscribe(all => {

      this.morphologies = all.filter(
        prop => prop.propertyLabel?.toLowerCase() !== 'part of speech'
      );

    });
  }

  onMorphoPropertyChange(index: number): void {
    const featureGroup = this.morphoFeatures.at(index) as FormGroup;
    const property = featureGroup.get('property')?.value;

    if (!property) return;

    featureGroup.get('value')?.enable();
    featureGroup.get('value')?.reset();
  }

  getMorphoGroup(index: number): FormGroup {
    return this.morphoFeatures.at(index) as FormGroup;
  }

  getMorphoValues(index: number) {
    const group = this.getMorphoGroup(index);
    const property = group.get('property')?.value as MorphologyModel | null;

    return property?.propertyValues ?? [];
  }

  private saveMorphologicalFeatures(formId: string): void {
    const features = this.morphoFeatures.controls;

    if (!features.length) return;

    features.forEach(ctrl => {
      const group = ctrl as FormGroup;

      const property = group.get('property')?.value as MorphologyModel | null;
      const value = group.get('value')?.value as any | null;

      if (!property || !value) return;

      this.formService
        .updateFormMorphology(
          formId,
          property.propertyId,  // IRI_RELATION
          value.valueId         // IRI_VALUE
        )
        .subscribe({
          error: err => console.error('Morphology update failed', err)
        });
    });
  }



}
