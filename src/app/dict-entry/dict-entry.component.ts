import {ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {ConfirmationService, MessageService, TreeNode} from 'primeng/api';
import {IECDEntryTree} from '../interfaces/ECDEntryTree.interface';
import {DictEntry} from '../models/DictEntry.model';
import {SharedFunctionModel} from '../models/SharedFunction.model';
import {LexicalFunctionService} from '../services/lexical-function.service';
import {SelectedSenseService} from '../services/selected-sense.service';
import {ECDEntryTreeService} from '../services/ecdentry-tree.service';
import {SenseDetailService} from '../services/sense-detail.service';
import {DictEntryService} from '../services/dict-entry.service';
import {FormService} from '../services/form.service';
import {IECDictionaries} from '../interfaces/ECDictionaries.interface';
import {DictService} from '../services/dict.service';
import {SensesService} from '../services/senses.service';
import {concatMap, exhaustMap, take} from 'rxjs/operators';
import {ECDForm} from '../models/ECDForm.model';
import {SenseRefreshService} from '../services/sense-refresh.service';
import {EMPTY} from 'rxjs';

@Component({
  selector: 'app-dict-entry',
  templateUrl: './dict-entry.component.html',
  styleUrl: './dict-entry.component.css',
  standalone: false
})
export class DictEntryComponent implements OnInit {

  @Input() dictEntry: DictEntry = new DictEntry();
  @Input() isSelected: boolean = false;
  @Input() detailedEntry: IECDEntryTree[] | null = null;
  @Output() entrySelected = new EventEmitter<string>();
  @Input() selectedLanguage: string = '';
  @Output() resetActiveTab = new EventEmitter<void>();
  @Input() displayPart : string | null = null;
  @Output() displayPartChange = new EventEmitter<string | null>();
  @Output() entryViewRequested = new EventEmitter<string>();
  @Output() entryUpdateRequested = new EventEmitter<string>();
  @Output() dictUpdateRequested = new EventEmitter<string>();
  @Output() addFormRequested = new EventEmitter<string>();
  @Output() formUpdateRequested =
    new EventEmitter<{ formId: string; dictEntryId: string }>();
  @Output() addSenseRequested = new EventEmitter<string>();


  protected sharedFunctionModel: SharedFunctionModel = new SharedFunctionModel();
  forms: ECDForm[] = [];
  senses: IECDEntryTree[] = [];
  entryNodes: TreeNode<DictEntry>[] = [];
  selectedEntryId: string | null = null;
  languages: { label: string, value: string }[] = [];
  showDictDeleteDialog = false;
  selectedEntryLabel: string = '';
  selectedPOS: { label: string, value: string }[] = [];
  dicts: IECDictionaries[] = [];
  loadingDicts = false;
  isAddingSense = false;
  searchTextForm = new FormGroup({
    search: new FormControl<string>('')
  });
  counter = 0;
  loading = false;

  filtersForm = new FormGroup({
    match: new FormControl<string>('contains'),
    language: new FormControl<{ label: string, value: string } | null>(null),
    editor: new FormControl<string | null>(null),
    status: new FormControl<string | null>(null)
  });

  matchRadioGroup = [
    {name: 'Equals', key: 'equals'},
    {name: 'StartsWith', key: 'startsWith'},
    {name: 'Contains', key: 'contains'},
    {name: 'End', key: 'end'}
  ];

  statuses = [
    {label: 'Working', value: 'working'},
    {label: 'Completed', value: 'completed'},
    {label: 'Reviewed', value: 'reviewed'}
  ];

  expandedSections: { [key: string]: { forms: boolean; senses: boolean } } = {};

  private senseDetailService = inject(SenseDetailService);
  private lexicalFunctionService = inject(LexicalFunctionService);
  private selectedSenseService = inject(SelectedSenseService);
  private dictEntryService = inject(DictEntryService);
  private formService = inject(FormService)
  private dictService = inject(DictService)
  private senseService = inject(SensesService)
  private senseRefreshService = inject(SenseRefreshService);
  private messageService = inject(MessageService);


  constructor(private ecdEntryTreeService: ECDEntryTreeService, private cdr: ChangeDetectorRef, private confirmationService: ConfirmationService ) {
  }

  ngOnInit(): void {
    this.loadAllEntries(); // initial load

    this.senseRefreshService.onRefresh().subscribe(() => {
      if (!this.selectedEntryId) return;

      this.ecdEntryTreeService
        .getByIdSense(this.selectedEntryId)
        .subscribe(result => {
          this.detailedEntry = result?.length
            ? this.flattenSenses(result)
            : [];

          this.cdr.detectChanges();
        });
    });

    this.searchTextForm.get('search')?.valueChanges.subscribe(value => {
      this.loadAllEntries(value || '');
    });

    this.filtersForm.valueChanges.subscribe(filters => {
      this.selectedLanguage = filters.language?.value || '';
      this.loadAllEntries(this.searchTextForm.get('search')?.value || '');
    });



  }

  get entries(): IECDEntryTree[] | null {
    return this.detailedEntry;
  }

  loadDetails() {
    this.entrySelected.emit(this.dictEntry.dictionaryEntry);
    this.selectedEntryId = this.dictEntry.dictionaryEntry;
    this.selectedEntryLabel = this.dictEntry.label;
    this.selectedSenseService.setSelectedSense('');
    this.selectedSenseService.setSelectedSensePOS('');
    this.lexicalFunctionService.clearAdditionalPairs();
    this.loadForms();
    this.loadSenses();
  }

  setSelectedSense(sense: IECDEntryTree) {
    this.selectedSenseService.setSelectedSenseID(sense.referredEntity);
    this.selectedSenseService.setSelectedSensePOS(sense.pos.toString());
    this.selectedSenseService.setSelectedSense('');
    this.lexicalFunctionService.clearAdditionalPairs();

    this.dictEntryService.getById(this.selectedEntryId!).subscribe(entry => {
      this.selectedSenseService.setEntryPOS(entry.pos ?? []);
    });

    this.selectedSenseService.setEntryId(this.selectedEntryId);
    this.selectedSenseService.setEntryLabel(this.selectedEntryLabel);

    this.senseDetailService.getSenseDetail(sense.referredEntity).subscribe((senseDetail) => {
      const definitionObj = senseDetail.definition.find(def => def.propertyID === 'definition');
      if (definitionObj) {
        this.selectedSenseService.setSelectedSense(definitionObj.propertyValue);
      }
      this.cdr.detectChanges();
    });

    this.senseDetailService.getLFById(sense.referredEntity).subscribe((lfDataArray) => {
      lfDataArray.forEach(lfData => {
        this.lexicalFunctionService.addAdditionalPair(lfData.lexicalFunction, lfData.senseTarget);
      });
    });
  }

  loadForms() {
    if (this.selectedEntryId) {
      this.ecdEntryTreeService.getByIdForms(this.selectedEntryId).subscribe((result) => {
        this.forms = result;
      });
    }

  }

  loadSenses() {
    if (this.selectedEntryId) {
      this.ecdEntryTreeService.getByIdSense(this.selectedEntryId).subscribe((result) => {
        this.senses = result;
      });
    }

  }

  loadAllEntries(search: string = ''): void {
    this.loading = true;
    this.dictEntryService.getAll().subscribe(result => {
      let entries = result.list;

      const filters = this.filtersForm.value;

      if (filters.language?.value) {
        entries = entries.filter(entry => entry.language === filters.language?.value);
      }

      if (filters.editor) {
        entries = entries.filter(entry => entry.author === filters.editor);
      }

      if (filters.status) {
        entries = entries.filter(entry => entry.status === filters.status);
      }

      /*if (search) {
        entries = entries.filter(entry => entry.label.toLowerCase().includes(search.toLowerCase()));
      }*/

      if (search) {
        const matchType = this.filtersForm.get('match')?.value || 'contains';
        const searchValue = search.toLowerCase();

        entries = entries.filter(entry => {
          const label = entry.label.toLowerCase();
          switch (matchType) {
            case 'equals':
              return label === searchValue;
            case 'startsWith':
              return label.startsWith(searchValue);
            case 'end':
              return label.endsWith(searchValue);
            case 'contains':
            default:
              return label.includes(searchValue);
          }
        });
      }


      this.entryNodes = entries.map(entry => ({
        data: entry,
        leaf: false,
        type: 'ENTRY',
        children: []
      }));

      const uniqueLangs = Array.from(new Set(result.list.map(e => e.language)));
      this.languages = uniqueLangs.map(lang => ({label: lang.toUpperCase(), value: lang}));

      this.counter = entries.length;
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  fetchSenses(event: { originalEvent: Event, node: TreeNode<DictEntry> }): void {
    const node = event.node;
    if (!node?.data?.dictionaryEntry) return;

    this.ecdEntryTreeService.getByIdSense(node.data.dictionaryEntry).subscribe(result => {
      const senses = this.flattenSenses(result);
      node.children = senses.map(sense => ({
        data: sense as any,
        leaf: true,
        type: 'SENSE'
      }));
      this.entryNodes = [...this.entryNodes];
    });
  }

  resetFilters(): void {
    this.searchTextForm.get('search')?.setValue('');
    this.filtersForm.reset({
      match: 'contains',
      language: null,
      editor: null,
      status: null
    });
  }

  private flattenSenses(entries: IECDEntryTree[]): IECDEntryTree[] {
    let senses: IECDEntryTree[] = [];
    for (let entry of entries) {
      if (entry.referredEntity) senses.push(entry);
      if (entry.children?.length) senses = senses.concat(this.flattenSenses(entry.children));
    }
    return senses;
  }

  onEntryClick(node: TreeNode<DictEntry>) {
    const id = node.data?.dictionaryEntry;
    if (!id) return;

    if (this.selectedEntryId === id) {
      this.selectedEntryId = null;
      this.detailedEntry = null;
      this.forms = [];
      this.selectedSenseService.setSelectedSense('');
      this.selectedSenseService.setSelectedSensePOS('');
      this.lexicalFunctionService.clearAdditionalPairs();
      this.resetActiveTab.emit();
      this.displayPartChange.emit(null);



      return;
    }

    this.selectedEntryId = id;
    this.entrySelected.emit(id);
    this.selectedSenseService.setSelectedSense('');
    this.selectedSenseService.setSelectedSensePOS('');
    this.lexicalFunctionService.clearAdditionalPairs();
    this.resetActiveTab.emit();
    this.displayPartChange.emit(null);
    this.loadForms();

    this.ecdEntryTreeService.getByIdSense(id).subscribe((result) => {
      this.detailedEntry = result?.length ? this.flattenSenses(result) : null;
      this.cdr.detectChanges();
    });
  }

  toggleForms(entryId: string): void {
    // Initialize section if not present
    if (!this.expandedSections[entryId]) {
      this.expandedSections[entryId] = { forms: false, senses: false };
    }

    const isCurrentlyExpanded = this.expandedSections[entryId].forms;

    if (!isCurrentlyExpanded) {
      this.loadForms();
    }

    this.expandedSections[entryId].forms = !isCurrentlyExpanded;
  }

  toggleSenses(entryId: string): void {
    if (!this.expandedSections[entryId]) {
      this.expandedSections[entryId] = { forms: false, senses: false };
    }

    const isCurrentlyExpanded = this.expandedSections[entryId].senses;

    if (!isCurrentlyExpanded) {
      this.ecdEntryTreeService.getByIdSense(entryId).subscribe(result => {
        this.detailedEntry = result?.length ? this.flattenSenses(result) : null;
        this.cdr.detectChanges();
      });
    }

    this.expandedSections[entryId].senses = !isCurrentlyExpanded;
  }
  updateStatus(id: string | undefined, value: string | undefined): void {
    if (!id || !value) return;

    // forward cycle (working → completed → reviewed)
    if (value === 'working') {
      this.dictEntryService.setStatus(id, 'completed').subscribe({
        next: () => this.loadAllEntries(),
        error: () => this.loadAllEntries()
      });
      return;
    }
    if (value === 'completed') {
      this.dictEntryService.setStatus(id, 'reviewed').subscribe({
        next: () => this.loadAllEntries(),
        error: () => this.loadAllEntries()
      });
      return;
    }

    // backward jump (reviewed → working) by chaining reviewed→completed→working
    // and refreshing only once at the end
    if (value === 'reviewed') {
      this.dictEntryService.setStatus(id, 'completed')
        .pipe(concatMap(() => this.dictEntryService.setStatus(id, 'working')))
        .subscribe({
          next: () => this.loadAllEntries(),
          error: () => this.loadAllEntries()
        });
    }
  }

  deleteEntry(id: string | null): void {
    if (!id) return;

    this.confirmationService.confirm({
      key: 'deleteDialog',
      message: 'Are you sure you want to delete this dictionary entry?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptIcon: 'pi pi-check',
      rejectIcon: 'pi pi-times',
      accept: () => {
        this.dictEntryService.deleteDictEntry(id).subscribe({
          next: () => {
            this.loadAllEntries();
            this.messageService.add({
              severity: 'success',
              summary: 'Entry deleted',
              detail: 'Dictionary entry deleted successfully.',
              life: 3500
            });
          },
          error: (err) => {
            console.error('❌ Failed to delete entry:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Deletion failed',
              detail: 'Could not delete dictionary entry.',
              life: 4500
            });
            this.loadAllEntries();
          }
        });
      },
      reject: () => {
        console.log('❎ Deletion cancelled.');
      }
    });
  }
  deleteForm(id: string | null): void {
    if (!id) return;

    this.confirmationService.confirm({
      key: 'deleteDialog',
      message: 'Are you sure you want to delete this form?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptIcon: 'pi pi-check',
      rejectIcon: 'pi pi-times',
      accept: () => {
        this.formService.deleteForm(id).subscribe({
          next: () => {
            this.loadForms();
            this.messageService.add({
              severity: 'success',
              summary: 'Form deleted',
              detail: 'Form deleted successfully.',
              life: 3000
            });
          },
          error: (err) => {
            console.error('❌ Failed to delete form:', err);
            this.loadForms();
            this.messageService.add({
              severity: 'error',
              summary: 'Deletion failed',
              detail: 'Could not delete form.',
              life: 4500
            });
          }

        });
      },
      reject: () => {
        console.log('❎ Deletion cancelled.');
      }
    });
  }

  deleteSense(id: string | null): void {
    if (!id || !this.selectedEntryId) return;

    this.confirmationService.confirm({
      key: 'deleteDialog',
      message: 'Are you sure you want to delete this meaning?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptIcon: 'pi pi-check',
      rejectIcon: 'pi pi-times',
      accept: () => {
        this.senseService.deleteSense(id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Sense deleted',
              detail: 'Meaning deleted successfully.',
              life: 3000
            });

            this.ecdEntryTreeService
              .getByIdSense(this.selectedEntryId!)
              .subscribe(result => {
                this.detailedEntry = result?.length
                  ? this.flattenSenses(result)
                  : [];

                this.selectedSenseService.setSelectedSense('');
                this.selectedSenseService.setSelectedSenseID('');
                this.selectedSenseService.setSelectedSensePOS('');

                this.cdr.detectChanges();
              });
          },
          error: err => {
            console.error('❌ Failed to delete sense:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Deletion failed',
              detail: 'Could not delete meaning.',
              life: 4500
            });
          }

        });
      }
    });
  }

  get selectedSenseId(): string | null {
    let id: string | null = null;
    this.selectedSenseService.selectedSenseID$.subscribe(v => id = v).unsubscribe();
    return id;
  }

  onAddFormClick(event: Event) {
    event.stopPropagation();
    if (this.selectedEntryId) {
      this.addFormRequested.emit(this.selectedEntryId);   // 👉 send ID to parent

      this.displayPartChange.emit(null);

      // 🔁 recrée proprement
      setTimeout(() => {
        this.displayPartChange.emit('newForm');
      });
    }
  }

  private loadPOSForEntry(entryId: string) {
    return this.dictEntryService.getById(entryId);
  }

  private toLexinfoIRI(pos: string): string {
    return pos.startsWith('http')
      ? pos
      : `http://www.lexinfo.net/ontology/3.0/lexinfo#${pos}`;
  }


  onAddSenseClick(event: Event) {
    event.stopPropagation();

    if (!this.selectedEntryId || this.isAddingSense) return;

    this.isAddingSense = true;

    this.dictEntryService.getById(this.selectedEntryId).pipe(
      exhaustMap(entry => {
        const posList = entry.pos ?? [];

        if (!posList.length) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Missing POS',
            detail: 'This entry has no part of speech.',
            life: 4000
          });

          this.isAddingSense = false;
          return EMPTY; // ✅ IMPORTANT
        }

        const posIRI = posList[0].startsWith('http')
          ? posList[0]
          : `http://www.lexinfo.net/ontology/3.0/lexinfo#${posList[0]}`;

        return this.senseService.createSense(posIRI, this.selectedEntryId!);
      }),
      take(1)
    ).subscribe({
      next: created => {
        if (!created?.sense) return;

        // ✅ CONTEXTE D’ENTRÉE (CRUCIAL)
        this.selectedSenseService.setEntryId(this.selectedEntryId);

        // ⚠️ IMPORTANT : redonner les POS de l’entrée
        this.dictEntryService.getById(this.selectedEntryId!).subscribe(entry => {
          this.selectedSenseService.setEntryPOS(entry.pos ?? []);
        });

        // ✅ NOUVEAU SENSE ACTIF
        this.selectedSenseService.setSelectedSenseID(created.sense);
        this.selectedSenseService.setSelectedSensePOS(created.pos);

        // 🔄 Rafraîchir la liste
        this.senseRefreshService.trigger();

        // 🧭 Recharger la vue Sense
        this.displayPartChange.emit(null);
        setTimeout(() => {
          this.displayPartChange.emit('Sense');
        });
      },
      error: err => {
        console.error('❌ Sense creation failed', err);
        this.isAddingSense = false;
      },
      complete: () => {
        this.isAddingSense = false;
      }
    });
  }

  // --- helper: map language exceptions once ---
  private withLangExceptions(d: IECDictionaries): IECDictionaries {
    let lang = d.language;
    if (d.dictionary === 'http://lexica/mylexicon#dict') {
      lang = 'LIT';
    } else if (d.dictionary === 'http://lexica/mylexicon#dict_lav') {
      lang = 'LAV';
    }
    return { ...d, language: lang };
  }

  // --- centralize dictionary loading so we can reuse it ---
  private loadDictionaries(): void {
    this.loadingDicts = true;
    this.dictService.getAll().subscribe({
      next: list => {
        this.dicts = (list ?? []).map(d => this.withLangExceptions(d));
        this.loadingDicts = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to load dictionaries', err);
        this.loadingDicts = false;
      }
    });
  }

  // open dialog + load dictionaries
  openDeleteDictionaries(): void {
    this.showDictDeleteDialog = true;
    this.loadDictionaries();
  }

  // trackBy unchanged
  trackByDict = (_: number, d: IECDictionaries) => d.dictionary;

  // confirm + delete unchanged
  confirmDeleteDictionary(d: IECDictionaries): void {
    this.confirmationService.confirm({
      key: 'deleteDialog',
      header: 'Confirm Deletion',
      message: `Are you sure you want to delete the dictionary <b>${d.label}</b>?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteDictionary(d),
    });
  }

  // ✅ refresh both the dialog list and the main entries after deletion
  private deleteDictionary(d: IECDictionaries): void {
    this.dictService.deleteDict(d.dictionary).subscribe({
      next: () => {
        // Refresh the dialog list from the backend to stay in sync
        this.loadDictionaries();

        // Also refresh the left entries panel (if it depends on current dicts)
        this.loadAllEntries();

        this.displayPartChange.emit(null);

        // Optionally close the dialog if there are no dicts left (after refresh)
        // (keep it after a tick so loadDictionaries() can repaint)
        setTimeout(() => {
          if (!this.dicts?.length) this.showDictDeleteDialog = false;
          this.cdr.detectChanges();
        }, 0);
      },
      error: err => console.error('Failed to delete dictionary', err)
    });
  }

  editDictionary(dictId: string) {
    this.dictUpdateRequested.emit(dictId); // 🔑 émettre l’ID
    this.displayPartChange.emit('updateD'); // 🔄 changer la vue
    this.showDictDeleteDialog = false;
  }

  editEntry(dictId: string | undefined) {
    this.entryUpdateRequested.emit(dictId); // 🔑 émettre l’ID
    this.displayPartChange.emit(null);
    this.displayPartChange.emit('updateDE'); // 🔄 changer la vue
  }

  editForm(formId: string | undefined) {
    if (!formId || !this.selectedEntryId) return;

    this.formUpdateRequested.emit({
      formId,
      dictEntryId: this.selectedEntryId
    });

    this.displayPartChange.emit(null);
    setTimeout(() => {
      this.displayPartChange.emit('updateForm');
    });
  }


  get formsCount(): number {
    return (this.forms ?? []).filter(f => !!f.label).length;
  }

  get sensesCount(): number {
    return this.entries?.length ?? 0;
  }

  openSenseOrder() {
    this.displayPartChange.emit('senseOrder');
  }

}
