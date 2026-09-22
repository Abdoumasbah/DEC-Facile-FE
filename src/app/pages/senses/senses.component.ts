import {Component, computed, EventEmitter, inject, Input, model, Output, ViewChild} from '@angular/core';
import {DictEntryService} from '../../services/dict-entry.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {ECDEntryTreeService} from '../../services/ecdentry-tree.service';
import {IECDEntryTree} from '../../interfaces/ECDEntryTree.interface';
import {IForms} from '../../interfaces/forms.interface';
import {DictEntryComponent} from '../../dict-entry/dict-entry.component';
import {ECDForm} from '../../models/ECDForm.model';

@Component({
  selector: 'app-senses',
  standalone: false,
  templateUrl: './senses.component.html',
  styleUrl: './senses.component.css'
})

export class SensesComponent {
  selectedEntryId: string | null = null;
  activeTab: 'Lexical Function' | 'Examples' | 'Pattern government' | null = 'Lexical Function';
  displayPart:  'newD' | 'listD' | 'newDE' | 'viewDE'| 'updateD' | 'updateDE' | 'newLanguage' | 'newForm'| 'updateForm' | 'newSense' | 'Sense' | 'senseOrder' | null = null;
  selectedViewEntryId: string | null = null;
  dictEntryId: string | null = null;
  viewForms: ECDForm[] = [];
  viewSenses: IECDEntryTree[] = [];
  selectedDictId!: string;


  constructor(private ecdEntryTreeService: ECDEntryTreeService) {
  }

  private dictEntryService = inject(DictEntryService);
  ECDS = toSignal(this.dictEntryService.getAll());
  detailedEntry: IECDEntryTree[] | null = null;

  @Input() selectedLanguage: string = "";
  @Output() entryCreated = new EventEmitter<void>();
  @ViewChild(DictEntryComponent)
  dictEntryComponent!: DictEntryComponent;


  search = model("");
  getECDEntries = computed(() => {
    let entries = this.ECDS()?.list || [];

    // 🔹 Filtrer par langue si une langue est sélectionnée
    if (this.selectedLanguage) {
      entries = entries.filter(entry => entry.language === this.selectedLanguage);
    }


    // 🔹 Ensuite, filtrer par label
    if (this.search()) {
      entries = entries.filter(entry => entry.label.includes(this.search()));
    }

    return entries;
  });
  leftPanelWidth = '30%'; // initial width

  startResizing(event: MouseEvent) {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = document.querySelector('.left-side')!.clientWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      this.leftPanelWidth = `${newWidth}px`;
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  onEntryCreated(): void {
    // option 1 : appeler directement la méthode
    this.dictEntryComponent?.loadAllEntries();

    // option 2 (recommandée) : passer par event
    // this.displayPart = null;
  }

  loadDictEntry(id: string) {
    if (this.selectedEntryId === id) {

      // Désélectionner si on clique sur le même élément
      this.selectedEntryId = null;
      this.detailedEntry = null;
      return;
    }

    this.selectedEntryId = id;
    this.ecdEntryTreeService.getByIdSense(id).subscribe((result) => {
      if (result && result.length > 0) {
        this.detailedEntry = this.flattenSenses(result); // On récupère toutes les senses
      } else {
        this.detailedEntry = null;
      }
    });
  }

  /**
   * Fonction pour récupérer toutes les senses y compris celles de haut niveau (II, III)
   */

  private flattenSenses(entries: IECDEntryTree[]): IECDEntryTree[] {
    let senses: IECDEntryTree[] = [];

    for (let entry of entries) {
      if (entry.referredEntity) {
        senses.push(entry);
      }

      if (entry.children && entry.children.length > 0) {
        senses = senses.concat(this.flattenSenses(entry.children));
      }
    }

    return senses;
  }

  viewEntryDetails(id: string): void {
    this.selectedViewEntryId = id;
    this.displayPart = 'viewDE';

    this.ecdEntryTreeService.getByIdForms(id).subscribe(forms => {
      this.viewForms = forms;
    });

    this.ecdEntryTreeService.getByIdSense(id).subscribe(senses => {
      this.viewSenses = this.flattenSenses(senses);
    });
  }
  updateDictDetails(id: string): void {
    this.selectedDictId = id;
    this.displayPart = 'updateD';
  }
  updateEntryDetails(id: string): void {
    this.selectedDictId = id;
    this.displayPart = 'updateDE';
  }

  updateFormDetails(id: string): void {
    this.selectedDictId = id;
    this.displayPart = 'updateForm';
  }

  onEntryUpdated(): void {
    // 🔄 reload left panel
    this.dictEntryComponent?.loadAllEntries();
  }
  onFormUpdateRequested(event: { formId: string; dictEntryId: string }) {
    this.dictEntryId = event.dictEntryId;
    this.selectedDictId = event.formId;
    this.displayPart = 'updateForm';
  }


  onFormCreate(): void {
    // 🔄 reload left panel
    this.dictEntryComponent?.loadForms();
  }

  openNewForm(id: string) {
    this.dictEntryId = id;   // passed down to <app-new-form [dictEntryId]>
    this.displayPart = 'newForm';
  }

  openNewSense(entryId: string) {
    this.dictEntryId = entryId;

    // 🔴 RESET displayPart avant
    this.displayPart = null;

    setTimeout(() => {
      this.activeTab = 'Lexical Function';
      this.displayPart = 'Sense';
    });
  }


}
