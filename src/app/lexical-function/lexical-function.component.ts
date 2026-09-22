import {ChangeDetectorRef, Component, computed, inject, OnInit} from '@angular/core';
import {LexicalFunctionService} from '../services/lexical-function.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {SensesService} from '../services/senses.service';
import {SelectedSenseService} from '../services/selected-sense.service';
import {SenseDetailService} from '../services/sense-detail.service';
import {SharedFunctionModel} from '../models/SharedFunction.model';
import {ECDMeaningModel} from '../models/ECDMeaningModel.model';
import {MessageService} from 'primeng/api';
import { OverlayPanel } from 'primeng/overlaypanel';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-lexical-function',
  templateUrl: './lexical-function.component.html',
  standalone: false,
  styleUrl: './lexical-function.component.css'
})
export class LexicalFunctionComponent implements OnInit {

  constructor(private cdr: ChangeDetectorRef) {
  }
  @ViewChild('lfOverlay') lfOverlay!: OverlayPanel;

  protected sharedFunctionModel: SharedFunctionModel = new SharedFunctionModel();
  private lexicalFunctionService = inject(LexicalFunctionService);
  private sensesService = inject(SensesService);
  private senseDetailService = inject(SenseDetailService);
  private messageService = inject(MessageService);
  private creating = false;

  selectedLanguage: string | null = null;
  selectedLexicalFunction: string | null = null;
  selectedSenseTarget: string | null = null;
  selectedId: string | null = null;
  allSenses: { sense: string, entry: string }[] = [];
  // ✅ Updated: Track multiple lexical function pairs
  additionalPairs: {
    lexicalFunction: string | null,
    sense: string | null,
    type: string | null
  }[] = [];
  currentEntryId: string | null = null;
  private creationLocks = new Set<string>();
  isLoading = true;
  private pendingRequests = 0;

  showLFDialog = false;
  lfSearch = '';
  selectedLFInDialog: any = null;
  selectedPairForSense: any = null;
  @ViewChild('senseOverlay') senseOverlay!: OverlayPanel;
  @ViewChild('mainOverlay') mainOverlay!: OverlayPanel;

  overlayMode: 'lf' | 'sense' = 'lf';
  activeLFForSense: string | null = null;

  LF_ALL = toSignal(this.lexicalFunctionService.getAll());  // 🔹 Charger toutes les LF disponibles
  LF_SELECTED = toSignal(this.lexicalFunctionService.selectedLexicalFunction$);
  SS_SELECTED = toSignal(this.lexicalFunctionService.selectedSenseTarget$);

  private selectedSenseService = inject(SelectedSenseService);

  getLexFunct = computed(() => {
    const selectedLF = this.LF_SELECTED();
    const allLF = this.LF_ALL()?.map(entry => entry.lexicalFunction) || [];

    // Supprime le doublon sélectionné s’il existe déjà dans la liste
    const filtered = selectedLF ? allLF.filter(lf => lf !== selectedLF) : allLF;

    // Trie par ordre alphabétique (label visible)
    const sorted = filtered.sort((a, b) =>
      this.sharedFunctionModel.extractLFFromURI(a).localeCompare(
        this.sharedFunctionModel.extractLFFromURI(b)
      )
    );

    return selectedLF ? [selectedLF, ...sorted] : sorted;
  });

  getSenses = computed(() => {
    const selectedSense = this.SS_SELECTED();
    const filteredSenses = this.allSenses;

    return selectedSense ? [selectedSense, ...filteredSenses.filter(s => s.sense !== selectedSense)] : filteredSenses;
  });



  ngOnInit() {
    this.lexicalFunctionService.selectedLexicalFunction$.subscribe((lf) => {
      this.selectedLexicalFunction = lf;
    });


    this.lexicalFunctionService.selectedSenseTarget$.subscribe((sense) => {
      this.selectedSenseTarget = sense;
    });

    this.selectedSenseService.selectedSenseID$.subscribe((id) => {
      this.selectedId = id;

      if (id) {
        this.isLoading = true;
        this.pendingRequests = 2;
        this.loadSensesFromLanguage(id);
        this.loadExistingLFs();
      }
    });


  }

  private pairKey(lf: string, sense: string): string {
    return `${lf}::${sense}`;
  }

  getFilteredSenses(): string[] {
    if (!this.allSenses) return [];

    const selectedSense = this.selectedSenseTarget;

    const senses = this.allSenses.map(s => s.sense);

    return selectedSense
      ? [selectedSense, ...senses.filter(s => s !== selectedSense)]
      : senses;
  }

  getSenseL(senseId: string): string {
    return (this.sharedFunctionModel.extractLangFromLabel(this.ecdMeanings[senseId].label) +  " " +  this.ecdMeanings[senseId]?.senseLabel)
  }


  loadSensesFromLanguage(senseId: string) {
    this.senseDetailService.getSenseDetail(senseId).subscribe(senseDetail => {

      const language = senseDetail.language;
      this.selectedLanguage = language;

      // ✅ store current entry ID
      this.currentEntryId = senseDetail.lexicalEntry;

      this.sensesService.setLanguageFilter(language);

      this.sensesService.getAll().subscribe(filtered => {

        // ✅ FILTER LOGIC (important)
        this.allSenses = filtered.list
          .filter(entry =>
            entry.sense !== senseId &&
            entry.lexicalEntry !== this.currentEntryId
          )
          .map(entry => ({
            sense: entry.sense,
            entry: entry.lexicalEntry
          }));

        this.loadECDMeaningForSenses(
          this.allSenses.map(s => s.sense)
        );
        this.cdr.markForCheck();
        this.pendingRequests--;
        this.checkLoadingFinished();
      });
    });
  }

  get hasAvailableSenses(): boolean {
    return this.allSenses && this.allSenses.length > 0;
  }


  ecdMeanings: { [senseId: string]: ECDMeaningModel } = {};

  loadECDMeaningForSenses(senses: string[]) {
    senses.forEach(senseId => {
      if (!this.ecdMeanings[senseId]) {
       // console.log(senseId)
        this.senseDetailService.getBySenseId(senseId).subscribe(data => {
          this.ecdMeanings[senseId] = data;
          this.cdr.markForCheck(); // Refresh view if using OnPush
        });
      }
    });
  }



  onLFChange(event: Event) {
    const newLF = (event.target as HTMLSelectElement).value;
    this.selectedLexicalFunction = newLF;
    this.tryAutoCreate();
  }

  onSenseChange(event: Event) {
    const newSense = (event.target as HTMLSelectElement).value;
    this.selectedSenseTarget = newSense;
    this.tryAutoCreate();
  }

  onLFChangeForPair(event: Event, pair: any) {
    pair.lexicalFunction = (event.target as HTMLSelectElement).value;
    this.tryAutoCreatePair(pair);
  }

  onSenseChangeForPair(event: Event, pair: any) {
    pair.sense = (event.target as HTMLSelectElement).value;
    this.tryAutoCreatePair(pair);
  }

  private tryAutoCreate() {
    if (
      this.creating ||
      !this.hasAvailableSenses ||
      !this.selectedLexicalFunction ||
      !this.selectedSenseTarget ||
      !this.selectedId
    ) {
      return;
    }

    this.creating = true;
    this.createLFAndSense();
  }



  private tryAutoCreatePair(pair: any) {
    if (
      pair.lexicalFunction &&
      pair.sense &&
      this.selectedId &&
      !pair._created   // 🔑 FLAG
    ) {
      pair._created = true;
      this.createLFAndSense(pair);
    }
  }


  addNewPair() {
    this.additionalPairs.push({lexicalFunction: null, sense: null, type: null});
    this.rebuildGroups();
  }

  removePair(index: number) {
    const pairToRemove = this.additionalPairs[index];

    if (pairToRemove.lexicalFunction && pairToRemove.sense) {
      // ✅ Ensure selectedId is used correctly for this pair
      this.senseDetailService.getLFById(this.selectedId!).subscribe(existingPairs => {
        const existingPair = existingPairs.find(p =>
          p.lexicalFunction === pairToRemove.lexicalFunction &&
          p.senseTarget === pairToRemove.sense
        );

        if (existingPair && existingPair.id) {  // ✅ Ensure the ID exists
          const deleteId = existingPair.id;  // ✅ Use the actual ID

          this.lexicalFunctionService.deleteLexicalFunction(deleteId).subscribe({
            next: () => {
              // ✅ Remove from UI only after successful deletion
              this.additionalPairs.splice(index, 1);
              this.rebuildGroups();

              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error("❌ Error deleting lexical function:", err);
            }
          });
        } else {
          console.warn("⚠️ Pair not found in backend. Removing from UI only.");
          this.additionalPairs.splice(index, 1);
          this.rebuildGroups();

          this.cdr.detectChanges();
          this.lexicalFunctionService.clearSelection();
        }
      });
    } else {
      // ✅ If the pair is an empty row, just remove from UI
      this.additionalPairs.splice(index, 1);
      this.rebuildGroups();

      this.cdr.detectChanges();
      this.lexicalFunctionService.clearSelection();
    }
  }

  private createLFAndSense(pair?: {
    lexicalFunction: string | null;
    sense: string | null;
    type: string | null;
  }) {
    const lexicalFunction = pair ? pair.lexicalFunction : this.selectedLexicalFunction;
    const senseTarget     = pair ? pair.sense : this.selectedSenseTarget;

    console.log("heeeeeere")
    if (!this.selectedId || !lexicalFunction || !senseTarget) return;

    const key = this.pairKey(lexicalFunction, senseTarget);

    // 🔒 HARD LOCK
    if (this.creationLocks.has(key)) {
      return;
    }
    this.creationLocks.add(key);

    const selectedLFObject = this.LF_ALL()?.find(
      lf => lf.lexicalFunction === lexicalFunction
    );
    const selectedType = selectedLFObject?.type ?? 'defaultType';

    this.senseDetailService.getLFById(this.selectedId).subscribe(existing => {

      const alreadyExists = existing.some(e =>
        e.lexicalFunction === lexicalFunction &&
        e.senseTarget === senseTarget
      );

      if (alreadyExists) {
        this.creationLocks.delete(key);

        this.messageService.add({
          severity: 'warn',
          summary: 'Lexical function already exists',
          detail: 'This lexical function is already linked to the selected sense.',
          life: 4000
        });

        this.resetPairUI(pair);
        return;
      }

      this.lexicalFunctionService.createLexicalFunction(
        this.selectedId,
        senseTarget,
        lexicalFunction,
        selectedType
      ).subscribe({
        next: () => {
          this.creationLocks.delete(key);

          this.messageService.add({
            severity: 'success',
            summary: 'Lexical function added',
            detail: 'The lexical function was added successfully.',
            life: 3000
          });

          this.resetPairUI(pair);
          this.additionalPairs.push({
            lexicalFunction,
            sense: senseTarget,
            type: selectedType
          });

          this.rebuildGroups();
          this.cdr.detectChanges();
        },
        error: () => {
          this.creationLocks.delete(key);

          this.messageService.add({
            severity: 'error',
            summary: 'Creation failed',
            detail: 'Could not create the lexical function.',
            life: 4500
          });
        }
      });
    });
  }


  private resetPairUI(pair?: any) {
    if (pair) {
      pair.lexicalFunction = null;
      pair.sense = null;
      pair.type = null;
      pair._created = false;
    } else {
      this.selectedLexicalFunction = null;
      this.selectedSenseTarget = null;
    }
  }

  private loadExistingLFs() {
    if (!this.selectedId) return;

    this.senseDetailService.getLFById(this.selectedId).subscribe(pairs => {
      this.additionalPairs = pairs.map(p => ({
        lexicalFunction: p.lexicalFunction,
        sense: p.senseTarget,
        type: p.type ?? null
      }));
      this.rebuildGroups();
      this.cdr.detectChanges();
      this.pendingRequests--;
      this.checkLoadingFinished();
    });
  }



  deleteLFAndSense() {
    if (!this.selectedId) {
      this.selectedLexicalFunction = null;
      this.selectedSenseTarget = null;
      return;
    }

    this.lexicalFunctionService.deleteLexicalFunction(this.selectedId).subscribe({
      next: () => {
        this.selectedLexicalFunction = null;
        this.selectedSenseTarget = null;
        this.selectedId = null;
        this.lexicalFunctionService.clearSelection(); // 🔹 Refresh the UI
      },
      error: (err) => {
        console.error("❌ Error deleting lexical function:", err);
      }
    });
  }

  get lexicalFunctionOptions() {
    return (this.getLexFunct() ?? []).map(lf => ({
      label: this.sharedFunctionModel.extractLFFromURI(lf),
      value: lf
    }));
  }

  get senseOptions() {
    return (this.allSenses ?? []).map(item => {

      const meaning = this.ecdMeanings[item.sense];

      return {
        label:
          this.sharedFunctionModel.extractLangFromLabel(
            meaning?.label ?? ''
          ) +
          ' ' +
          (meaning?.senseLabel ?? ''),

        value: item.sense
      };
    });
  }

  onLFDropdownChange(event: any, pair: any) {
    pair.lexicalFunction = event.value;
    this.tryAutoCreatePair(pair);
  }

  onSenseDropdownChange(event: any, pair: any) {
    pair.sense = event.value;
    this.tryAutoCreatePair(pair);
  }

 /* get groupedLFs() {
    const grouped: { [key: string]: any[] } = {};

    this.additionalPairs.forEach(pair => {
      if (!pair.lexicalFunction) return;

      if (!grouped[pair.lexicalFunction]) {
        grouped[pair.lexicalFunction] = [];
      }

      grouped[pair.lexicalFunction].push(pair);
    });

    return grouped;
  }*/

  groupedLFs: { [key: string]: any[] } = {};

  private checkLoadingFinished() {
    if (this.pendingRequests <= 0) {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  openLFDialog() {
    this.showLFDialog = true;
  }

  selectLFInDialog(lf: any) {
    this.selectedLFInDialog = lf;
  }

  confirmLFSelection() {
    if (!this.selectedLFInDialog) return;

    this.additionalPairs.push({
      lexicalFunction: this.selectedLFInDialog.lexicalFunction,
      sense: null,
      type: this.selectedLFInDialog.type
    });
    this.rebuildGroups();

    this.showLFDialog = false;
    this.selectedLFInDialog = null;
  }


  selectedLFInOverlay: any = null;

  selectLFInOverlay(lf: any) {
    this.selectedLFInOverlay = lf;
  }

  confirmOverlaySelection(overlay: OverlayPanel, event: Event) {

    if (!this.selectedLFInOverlay) return;

    this.selectedPairForSense = {
      lexicalFunction: this.selectedLFInOverlay.lexicalFunction,
      sense: null,
      type: this.selectedLFInOverlay.type
    };

    this.selectedLFInOverlay = null;

    // 🔴 Hard close
    overlay.hide();

    // 🟢 Wait until it is fully destroyed
    setTimeout(() => {
      this.senseOverlay.show(event);
    }, 250); // increase from 150 → 250
  }

  get filteredLFList() {
    const all = this.LF_ALL() ?? [];

    if (!this.lfSearch) return all;

    return all.filter(lf =>
      this.sharedFunctionModel
        .extractLFFromURI(lf.lexicalFunction)
        .toLowerCase()
        .includes(this.lfSearch.toLowerCase())
    );
  }

/*
  openOverlay(event: Event) {
    this.lfOverlay.toggle(event);
  }
*/

  senseSearch = '';

  selectedSenseInOverlay: any = null;

  confirmSenseSelection(overlay: OverlayPanel) {

    if (!this.selectedPairForSense || !this.selectedSenseInOverlay) return;

    this.selectedPairForSense.sense = this.selectedSenseInOverlay.value;

    this.createLFAndSense(this.selectedPairForSense);

    overlay.hide();

    this.selectedPairForSense = null;
    this.selectedSenseInOverlay = null;
  }

  get filteredSenseList() {
    if (!this.senseSearch) return this.senseOptions;

    return this.senseOptions.filter(s =>
      s.label.toLowerCase().includes(this.senseSearch.toLowerCase())
    );
  }


  openSenseOverlayForLF(lexicalFunction: string, event: Event) {

    this.selectedPairForSense = {
      lexicalFunction: lexicalFunction,
      sense: null,
      type: null
    };

    this.selectedSenseInOverlay = null;

    // 🔥 Use currentTarget instead of event
    const target = event.currentTarget as HTMLElement;

    this.senseOverlay.show(null, target);
  }


  openOverlay(event: Event) {
    this.overlayMode = 'lf';
    this.mainOverlay.show(event);
  }
  selectLFOverlay(lf: any) {

    this.selectedPairForSense = {
      lexicalFunction: lf.lexicalFunction,
      sense: null,
      type: lf.type
    };

    this.overlayMode = 'sense';
  }

  selectSenseOverlay(sense: any) {

    console.log(sense)
    if (!this.selectedPairForSense) return;

    this.selectedPairForSense.sense = sense.value;

    this.createLFAndSense(this.selectedPairForSense);

    this.mainOverlay.hide();

    this.selectedPairForSense = null;
  }

  addValueToLF(lexicalFunction: string) {

    this.additionalPairs.push({
      lexicalFunction: lexicalFunction,
      sense: null,
      type: null
    });
    this.rebuildGroups();
  }
  onInlineSenseSelect(event: any, lexicalFunction: string) {

    const senseId = event.value;

    if (!senseId || !this.selectedId) return;

    const pair = {
      lexicalFunction: lexicalFunction,
      sense: senseId,
      type: null
    };

    this.createLFAndSense(pair);

    this.activeLFForSense = null;
  }


  addingLF: string | null = null;
  newSenseSelection: string | null = null;

  startAddValue(lexicalFunction: string) {
    this.addingLF = lexicalFunction;

    this.selectedLF = lexicalFunction; // 👈 show right panel
    this.mode = 'add';                 // 👈 switch mode

    this.selectedSenseInput = null;
  }

  cancelAdd() {
    this.addingLF = null;
    this.newSenseSelection = null;
  }

  confirmAddValue(lexicalFunction: string) {

    if (!this.newSenseSelection || !this.selectedId) return;

    const pair = {
      lexicalFunction: lexicalFunction,
      sense: this.newSenseSelection,
      type: null
    };

    this.createLFAndSense(pair);

    // reset UI
    this.addingLF = null;
    this.newSenseSelection = null;
  }

  private rebuildGroups() {

    const grouped: { [key: string]: any[] } = {};

    this.additionalPairs.forEach(pair => {
      if (!pair.lexicalFunction) return;

      if (!grouped[pair.lexicalFunction]) {
        grouped[pair.lexicalFunction] = [];
      }

      grouped[pair.lexicalFunction].push(pair);
    });

    this.groupedLFs = grouped;
  }

  onAddSenseChange(event: any, lexicalFunction: string) {

    const senseId = event.value;
    if (!senseId || !this.selectedId) return;

    const pair = {
      lexicalFunction,
      sense: senseId,
      type: null
    };

    this.createLFAndSense(pair);

    this.addingLF = null;
    this.newSenseSelection = null;
  }

  showLFDrawer: boolean = false;

  openLFDrawer() {
    this.showLFDrawer = true;
  }


  lfDrawerSearch: string = '';

  get filteredDrawerLFList() {

    const all = this.LF_ALL() ?? [];
    const existingLFs = Object.keys(this.groupedLFs ?? {});
    const search = this.lfDrawerSearch?.toLowerCase().trim();

    return all
      .map(lf => ({
        ...lf,
        alreadyExists: existingLFs.includes(lf.lexicalFunction)
      }))
      .filter(lf =>
        search
          ? this.sharedFunctionModel
            .extractLFFromURI(lf.lexicalFunction)
            .toLowerCase()
            .startsWith(search)
          : true
      )
      .sort((a, b) =>
        this.sharedFunctionModel
          .extractLFFromURI(a.lexicalFunction)
          .localeCompare(
            this.sharedFunctionModel.extractLFFromURI(b.lexicalFunction),
            undefined,
            { sensitivity: 'base' }
          )
      );
  }

  selectLFfromDrawer(lf: any) {
    const lfUri = lf.lexicalFunction;

    if (this.groupedLFs[lfUri]) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Already exists',
        detail: 'This lexical function already exists.',
        life: 3000
      });
      return;
    }

    this.showLFDrawer = false;
    this.lfDrawerSearch = '';

    // ✅ IMPORTANT
    this.addingLF = lfUri;
    this.selectedLF = lfUri;   // 🔥 afficher panel droit
    this.mode = 'add';         // 🔥 passer en mode add
    this.selectedSenseInput = null;

    this.cdr.detectChanges();
  }


  get allLFKeys(): string[] {

    const existing = Object.keys(this.groupedLFs);

    if (this.addingLF && !existing.includes(this.addingLF)) {
      existing.push(this.addingLF);
    }

    return existing.sort((a, b) =>
      this.sharedFunctionModel
        .extractLFFromURI(a)
        .localeCompare(
          this.sharedFunctionModel.extractLFFromURI(b),
          undefined,
          { sensitivity: 'base' }
        )
    );
  }

  selectedLF: string | null = null;
  selectedSenseView: any = null;
  expandedLF: string | null = null;
  selectedSenseInput: string | null = null;
  mode: 'view' | 'add' = 'view';

  selectSense(pair: any, lf: string) {
    this.selectedLF = lf;
    this.selectedSenseView = pair;

    // 🔥 ensure we are in view mode
    this.mode = 'view';
  }

  toggleLF(lf: string) {

    if (this.expandedLF === lf) {
      this.expandedLF = null;
      this.selectedLF = null;
    } else {
      this.expandedLF = lf;
      this.selectedLF = lf;

      // ✅ IMPORTANT
      this.mode = 'view';
      this.selectedSenseInput = null;
    }
  }

  onSenseInputChange(event: any) {

    const senseId = event.value;

    if (!senseId || !this.selectedLF) return;

    const pair = {
      lexicalFunction: this.selectedLF,
      sense: senseId,
      type: null
    };

    this.createLFAndSense(pair);

  }

  onDrawerClick(lf: any, event: MouseEvent) {
    event.stopPropagation();
    console.log("CLICK OK", lf);
    this.selectLFfromDrawer(lf);
  }

}


