import {ChangeDetectorRef, Component, computed, ElementRef, inject, ViewChild} from '@angular/core';
import {SelectedSenseService} from '../services/selected-sense.service';
import {SenseDetailService} from '../services/sense-detail.service';
import {SensesService} from '../services/senses.service';
import {SharedFunctionModel} from '../models/SharedFunction.model';
import {toSignal} from '@angular/core/rxjs-interop';
import {SenseDetail} from '../models/SenseDetail.model';
import {ECDMeaningModel} from '../models/ECDMeaningModel.model';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {SenseRefreshService} from '../services/sense-refresh.service';
import {FormBuilder, FormGroup} from '@angular/forms';
import {DictEntryService} from '../services/dict-entry.service';


@Component({
  selector: 'app-definition',
  templateUrl: './definition.component.html',
  standalone: false,
  styleUrl: './definition.component.css'
})
export class DefinitionComponent {
  selectedDefinition: string = '';
  selectedDefinitionModal: string = '';
  selectedPOS: string = '';
  selectedExample: string = '';
  isModalOpen: boolean = false;
  isDefinitionModalOpen: boolean = false;
  isEditing: boolean = false;
  updatedDefinition: string = '';
  oldDefinition: string = '';
  selectedEntryId: string | null = null;
  selectedEntryLabel: string | null = null;
  selectedDescription: string = '';
  selectedSenseTag: string = '';
  cursorPosition: number = 0;
  selectedSenseId: string = '';
  oldSenses: string[] = []; // Store old senses before editing

  private definitionInput$ = new Subject<string>();
  private AUTO_SAVE_DELAY = 700; // ms

  // UI state
  posOptions: string[] = [];
  posSelectionRequired = false;
  posSelected = false;
  definitionEnabled = false;

// helper text
  posHelperMessage = '';
  definitionPlaceholder = '';


  selectedPOSIRI: string = '';
  selectedPOSLabel: string = '';

  insertedSenses: { tag: string, definition: string }[] = [];
  posForm!: FormGroup;
  private fb = inject(FormBuilder);
  oldPOSIRI: string | null = null;
  senseOptions: { label: string; value: string }[] = [];
  private savedRange: Range | null = null;

  @ViewChild('descriptionField', {static: false}) descriptionField!: ElementRef;

  constructor(private selectedSenseService: SelectedSenseService, private cdr: ChangeDetectorRef) {
  }

  private senseDetailService = inject(SenseDetailService);
  private sensesService = inject(SensesService);
  private senseRefreshService = inject(SenseRefreshService);
  private dictEntryService = inject(DictEntryService);

  protected sharedFunctionModel: SharedFunctionModel = new SharedFunctionModel();

  selectedLanguage: string | null = null;
  allSensesByLang: string[] = [];
  ecdMeanings: { [senseId: string]: ECDMeaningModel } = {};


  SS = toSignal(this.sensesService.getAll());

  getSenses = computed(() => {
    return (this.SS()?.list.map(entry => entry));
  });

  ngOnInit() {

    // NB: inizializzare qui i form, PRIMA delle subscribe: i subject in
    // SelectedSenseService sono BehaviorSubject e rigiocano il valore corrente
    // in modo sincrono, quindi gli handler possono girare prima della fine di ngOnInit.
    this.posForm = this.fb.group({
      pos: ['']
    });

    this.selectedSenseService.entryId$
      .subscribe(id => {

        this.selectedEntryId = id;

        if (!id) {
          this.selectedEntryLabel = null;
          return;
        }

        this.dictEntryService.getById(id).subscribe(entry => {
          this.selectedEntryLabel = entry.label;
          this.cdr.detectChanges();
        });

      });
    this.selectedSenseService.selectedSense$.subscribe((definition) => {
      if (definition !== null) {
        this.selectedDefinition = definition;
        this.oldDefinition = this.selectedDefinition;
        this.renderDefinitionAsDOM(this.selectedDefinition);
        this.addLinkEventListeners();
      }
    });
    this.selectedSenseService.selectedSenseID$.subscribe((id) => {
      if (!id) {
        this.resetForNewSense();
        return;
      }

      this.selectedSenseId = id;

      // 🔥 force editable activation
      setTimeout(() => {
        this.descriptionField?.nativeElement.focus();
      }, 0);

      this.loadSensesFromLanguage(id);
    });


    this.selectedSenseService.setSelectedSensePOS$.subscribe(posIRI => {
      if (posIRI) {
        this.selectedPOSIRI = posIRI;
        this.selectedPOSLabel = this.sharedFunctionModel.extractLabelFromURI(posIRI);

        this.oldPOSIRI = posIRI;
      }
    });


    this.definitionInput$
      .pipe(debounceTime(this.AUTO_SAVE_DELAY))
      .subscribe(def => this.autoSaveDefinition(def));

    this.selectedSenseService.entryPOS$.subscribe(posList => {
      this.posOptions = posList ?? [];

      if (this.posOptions.length === 1) {
        const iri = this.toLexinfoIRI(this.posOptions[0]);

        this.posSelectionRequired = false;
        this.posSelected = true;

        this.selectedPOSIRI = iri;
        this.selectedPOSLabel = this.sharedFunctionModel.extractLabelFromURI(iri);

        this.posForm.patchValue({ pos: iri });

        return;
      }

      if (this.posOptions.length > 1) {
        this.posSelectionRequired = true;

        // 👇 IMPORTANT: preselect if already known
        if (this.selectedPOSIRI) {
          this.posForm.patchValue({ pos: this.selectedPOSIRI });
          this.posSelected = true;
        }
      }
    });

  }

  enableEditing() {
    this.isEditing = true;
    this.updatedDefinition = this.selectedDefinition;
    this.oldDefinition = this.selectedDefinition;

    this.oldSenses = this.extractSensesFromDefinition(this.selectedDefinition);

    // ❌ NO cursor restore
  }

  private renderDefinitionAsDOM(definition: string) {
    if (!this.descriptionField) {
      // ViewChild non ancora risolto (static: false): selectedSense$ è una
      // BehaviorSubject e può emettere durante ngOnInit, prima di ngAfterViewInit.
      // Riprovo al tick successivo, quando il riferimento è disponibile.
      setTimeout(() => this.renderDefinitionAsDOM(definition), 0);
      return;
    }
    const container = this.descriptionField.nativeElement;
    container.innerHTML = ''; // reset

    const parser = new DOMParser();
    const doc = parser.parseFromString(definition, 'text/html');

    doc.body.childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'A') {
        const a = node as HTMLAnchorElement;

        const senseIRI = a.getAttribute('href')!;
        const label = a.textContent ?? '';

        const anchor = document.createElement('a');
        anchor.href = senseIRI;
        anchor.textContent = label;
        anchor.classList.add('clickable-link');

        anchor.addEventListener('click', e => {
          e.preventDefault();
          this.fetchSenseDetail(senseIRI);
        });

        container.appendChild(anchor);
      } else {
        container.appendChild(document.createTextNode(node.textContent ?? ''));
      }
    });
  }


  private isNewSense(): boolean {
    return !this.selectedSenseId;
  }

  private toLexinfoIRI(pos: string): string {
    return pos.startsWith('http')
      ? pos
      : `http://www.lexinfo.net/ontology/3.0/lexinfo#${pos}`;
  }

  private resetForNewSense() {
    this.selectedSenseId = '';
    this.selectedDefinition = '';
    this.oldDefinition = '';
    this.insertedSenses = [];
    this.selectedSenseTag = '';

    // reset editor content
    if (this.descriptionField) {
      this.descriptionField.nativeElement.innerHTML = '';
    }

    // reset POS UI (will be re-driven by entryPOS$)
    this.posSelected = false;
    this.definitionEnabled = false;
  }


  trackBySense(index: number, senseId: string): string {
    return senseId;
  }

  loadSensesFromLanguage(senseId: string) {
    if (!this.selectedEntryId || !this.selectedSenseId) {
      this.allSensesByLang = [];
      return;
    }

    const currentEntryId = this.normalizeEntryId(this.selectedEntryId);
    const currentSenseId = this.normalizeEntryId(this.selectedSenseId);


    this.senseDetailService.getSenseDetail(senseId).subscribe(senseDetail => {
      this.selectedLanguage = senseDetail.language;
      this.sensesService.setLanguageFilter(this.selectedLanguage);

      this.sensesService.getAll().subscribe(filtered => {

        this.allSensesByLang = filtered.list
          .filter(entry => {
            const entryLexId = this.normalizeEntryId(entry.lexicalEntry);
            const senseId = this.normalizeEntryId(entry.sense);

            return (
              entryLexId !== currentEntryId &&   // ✅ exclude SAME dict entry
              senseId !== currentSenseId         // ❌ exclude current sense
            );
          })
          .map(entry => entry.sense);

        this.loadECDMeaningForSenses(this.allSensesByLang);
      });

    });
  }

  private normalizeEntryId(entryId: string): string {
    return entryId.includes('#')
      ? entryId.split('#').pop()!
      : entryId;
  }


  loadECDMeaningForSenses(senses: string[]) {
    senses.forEach(senseId => {
      if (!this.ecdMeanings[senseId]) {
        this.senseDetailService.getBySenseId(senseId).subscribe({
          next: (meaning) => {
            this.ecdMeanings[senseId] = meaning;

            // 🔥 IMPORTANT : rebuild dropdown options
            this.buildSenseOptions();
          },
          error: () => {
            console.warn(`⚠️ Could not load ECDMeaning for ${senseId}`);
          }
        });
      }
    });
  }

  private buildSenseOptions() {
    this.senseOptions = this.allSensesByLang
      .map(senseId => {
        const meaning = this.ecdMeanings[senseId];
        if (!meaning) return null;

        const lang =
          this.sharedFunctionModel.extractLangFromLabel(meaning.label);

        return {
          value: senseId,
          label: `${lang} · ${meaning.senseLabel}`
        };
      })
      .filter(Boolean) as { label: string; value: string }[];

    // utile si le modal est déjà ouvert
    this.cdr.detectChanges();
  }


  onDefinitionInput(event: Event) {
    const target = event.target as HTMLElement;
    if (!target) return;

    this.handleSenseDeletion(target, event as InputEvent);

    // ✅ store value only (NO rendering)
    this.selectedDefinition = target.innerHTML;

    this.definitionInput$.next(this.selectedDefinition);
  }

  private autoSaveDefinition(_: string) {
    if (!this.selectedSenseId) return;

    const html = this.descriptionField.nativeElement.innerHTML.trim();
    if (!html || html === this.oldDefinition) return;

    this.senseDetailService
      .updateSenseDefinition(this.selectedSenseId, html, this.oldDefinition)
      .subscribe({
        next: () => {
          this.oldDefinition = html;
          this.selectedDefinition = html;

          // refresh other components
          this.senseRefreshService.trigger();
        },
        error: err => console.error('❌ Auto-save failed', err)
      });
  }



  private renderDefinitionForUI(text: string): string {
    const senseRx = /([\p{L}\p{N}_-]+_sense\d+)/gu;

    return text.replace(
      senseRx,
      `<a href="http://lexica/mylexicon#$1"
        data-url="http://lexica/mylexicon#$1"
        class="clickable-link">$1</a>`
    );
  }



  onKeyDown(event: KeyboardEvent) {
    // Ctrl + Space  OR  Cmd + Space
    if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
      event.preventDefault();
      this.openModal();
    }
  }

  handleSenseDeletion(target: HTMLElement, event: InputEvent) {
    if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const node = range.startContainer;

        // 🔹 Find the closest <a> element
        const link = node.parentElement?.closest("a");

        if (link) {
          const senseTag = link.getAttribute("data-url");

          const nextSibling = link.nextSibling; // ✅ Store where to place the cursor after deletion

          link.remove(); // ✅ Remove the whole <a> tag

          if (senseTag) {
            this.removeSenseFromInsertedList(senseTag);
          }

          // ✅ Restore cursor to correct position
          setTimeout(() => {
            const newRange = document.createRange();
            const newSelection = window.getSelection();

            if (nextSibling) {
              newRange.setStart(nextSibling, 0);
            } else {
              newRange.setStart(this.descriptionField.nativeElement, this.descriptionField.nativeElement.childNodes.length);
            }

            newRange.collapse(true);
            newSelection?.removeAllRanges();
            newSelection?.addRange(newRange);
          }, 0);
        }
      }
    }
  }

  removeSenseFromInsertedList(senseTag: string) {
    this.insertedSenses = this.insertedSenses.filter((sense) => sense.tag !== senseTag);
  }

  addLinkEventListeners() {
    setTimeout(() => {
      const links = this.descriptionField.nativeElement.querySelectorAll('a[href^="http://lexica/mylexicon#"]');

      links.forEach((link: HTMLElement) => {
        // Replacing old listeners by cloning node (safer)
        const newLink = link.cloneNode(true) as HTMLElement;
        link.replaceWith(newLink);

        newLink.classList.add('clickable-link'); // ensure class

        newLink.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation(); // important for Angular event bubbling
          const senseId = newLink.getAttribute('href');
          if (senseId) {
            this.fetchSenseDetail(senseId);
          }
        });
      });
    }, 0);
  }


  fetchSenseDetail(senseId: string) {
    // console.log(senseId)
    this.senseDetailService.getSenseDetail(senseId).subscribe({
      next: (senseDetail: SenseDetail) => {
        const definitionObj = senseDetail.definition.find(def => def.propertyID === 'definition');
        const exampleObj = senseDetail.definition.find(def => def.propertyID === 'senseExample');

        this.selectedDefinitionModal = definitionObj ? definitionObj.propertyValue : 'No definition available.';
        this.selectedExample = exampleObj ? exampleObj.propertyValue : 'No example available.';
        // console.log(this.selectedDefinition);

        this.openDefinitionModal(); // ✅ Open the modal
      },
      error: (err) => {
        console.error('Error fetching sense detail:', err);
        this.selectedDefinitionModal = 'Error fetching sense detail.';
        this.selectedExample = '';
        this.openDefinitionModal();
      }
    });
  }

  extractSensesFromDefinition(definition: string): string[] {
    //console.log("📌 Extracting senses from definition:", definition);
    const parser = new DOMParser();
    const doc = parser.parseFromString(definition, "text/html");
    const links = doc.querySelectorAll("a");

    console.log(`🔍 Found ${links.length} <a> elements`);

    // Extract href instead of data-url
    const senses = Array.from(links)
      .map(link => link.getAttribute("href")) // ✅ Get `href`
      .filter((href): href is string => href !== null) // ✅ Ensure it's not null
      .map(href => href.replace("http://lexica/mylexicon#", "")); // ✅ Extract only the sense ID


    //console.log("✅ Extracted senses:", senses);
    return senses;
  }

  private getSenseDisplayLabel(senseId: string): string {
    const meaning = this.ecdMeanings[senseId];
    if (!meaning) return senseId;

    const lang = this.sharedFunctionModel.extractLangFromLabel(meaning.label);
    const label = meaning.senseLabel;

    return `${lang} ${label}`;
  }


  saveEditedDefinition() {
    const newDefinition = this.descriptionField.nativeElement.innerHTML.trim();

    if (!newDefinition) {
      alert("Definition cannot be empty!");
      return;
    }
    if (!this.selectedSenseId) {
      console.error("Error: selectedSenseId is missing!");
      return;
    }

    this.senseDetailService
      .updateSenseDefinition(this.selectedSenseId, newDefinition, this.oldDefinition)
      .subscribe({
        next: () => {
          this.selectedDefinition = newDefinition;
          this.oldDefinition = newDefinition;

          this.cdr.detectChanges();

          setTimeout(() => {
            this.descriptionField.nativeElement.innerHTML = this.selectedDefinition;
            this.addLinkEventListeners();
          }, 0);

          // ✅ Relations still extracted from <a href>
          this.updateGenericRelations(newDefinition);
        },
        error: err => console.error('❌ Error updating definition:', err)
      });
  }


  updateGenericRelations(newDefinition: string) {
    const newSenses = this.extractSensesFromDefinition(newDefinition);
    console.log("✅ Extracted New Senses:", newSenses);

    // ✅ Compare old vs new senses
    const sensesToRemove = this.oldSenses.filter(sense => !newSenses.includes(sense));
    const sensesToAdd = newSenses.filter(sense => !this.oldSenses.includes(sense));

    console.log("❌ Senses to Remove:", sensesToRemove);
    console.log("✅ Senses to Add:", sensesToAdd);

    // ✅ Remove old relations (DELETE requests)
    sensesToRemove.forEach(sense => {
      this.senseDetailService.deleteGenericRelation(this.selectedSenseId, sense)
        .subscribe({
          next: () => console.log(`❌ Deleted relation for: ${sense}`),
          error: (err) => console.error('❌ Error deleting relation:', err)
        });
    });

    // ✅ Add new relations (ADD requests)
    sensesToAdd.forEach(sense => {
      this.senseDetailService.addGenericRelation(this.selectedSenseId, sense)
        .subscribe({
          next: () => console.log(`✅ Added relation for: ${sense}`),
          error: (err) => console.error('❌ Error adding relation:', err)
        });
    });

    // ✅ Update `oldSenses` to match the new state
    this.oldSenses = [...newSenses];
  }
   convertSensesToLinks(text: string): string {
    //  p{L} : toutes les lettres Unicode
    //  p{N} : tous les chiffres Unicode
    //  g    : remplacement global
    //  u    : interprétation Unicode complète

    const senseRx = /([\p{L}\p{N}_-]+_sense\d+)/gu;

    return text.replace(senseRx, match =>
      `<a href=\\"http://lexica/mylexicon#${encodeURIComponent(match)}\\">${match}</a>`
    );
  }

  /*
    convertSensesToLinks(text: string): string {
      return text.replace(/(\b[a-zA-Z0-9_-]+_sense\d+\b)/g, (match) => {
        // Ensure proper escaping and correct href format
        return `<a href=\\"http://lexica/mylexicon#${encodeURIComponent(match)}\\">${match}</a>`;
      });
    }*/


  openModal() {
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      this.savedRange = selection.getRangeAt(0).cloneRange();
    } else {
      this.savedRange = null;
    }

    // reset modal state
    this.selectedSenseTag = '';
    this.selectedDescription = '';

    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;

    this.selectedSenseTag = '';
    this.selectedDescription = '';
  }

  onSenseSelectPrime(event: any) {
    const senseId = event.value;

    if (!senseId || !this.ecdMeanings[senseId]) {
      this.selectedSenseTag = '';
      this.selectedDescription = '';
      return;
    }

    this.selectedSenseTag = senseId;
    this.selectedDescription = this.ecdMeanings[senseId].definition;
  }

/*

  onSenseSelect(event: Event) {
    const selectedSense = (event.target as HTMLSelectElement).value;
    const foundSense = this.getSenses()?.find(sense => sense.sense === selectedSense);

    if (foundSense) {
      this.selectedDescription = foundSense.definition;
      this.selectedSenseTag = `${this.sharedFunctionModel.extractLabelFromURI(foundSense.sense)}`;
    } else {
      this.selectedDescription = 'No description available';
      this.selectedSenseTag = '';
    }
  }
*/

  addSenseToDescription() {
    if (this.selectedSenseTag && this.descriptionField) {
      const descriptionElement = this.descriptionField.nativeElement;

      // ✅ Prevent duplicate links
      const isAlreadyInserted = this.insertedSenses.some(sense => sense.tag === this.selectedSenseTag);
      if (!isAlreadyInserted) {
        this.insertedSenses.push({tag: this.selectedSenseTag, definition: this.selectedDescription});
      }

      // 🔹 Create the clickable link
      const anchor = document.createElement("a");
      // anchor.href = `http://lexica/mylexicon#${this.selectedSenseTag}`;  // ✅ Correct URL
      //anchor.textContent = this.sharedFunctionModel.extractLabelFromURI(this.selectedSenseTag); // ✅ Use textContent (not innerHTML)
      const displayLabel = this.getSenseDisplayLabel(this.selectedSenseTag);
      console.log(displayLabel)

      anchor.textContent = displayLabel;

      const senseIRI = this.selectedSenseTag.startsWith('http')
        ? this.selectedSenseTag
        : `http://mydata.com#${this.selectedSenseTag}`;

      anchor.href = senseIRI;              // PURE IRI
      anchor.setAttribute('data-sense', senseIRI);

      anchor.classList.add("clickable-link"); // Add class explicitly

      // ✅ Event Listener: Clicking the link should fetch details
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        this.fetchSenseDetail(this.selectedSenseTag);
      });

      // 🔹 Insert the link at the cursor position
      const selection = window.getSelection();

      if (this.savedRange && selection) {
        selection.removeAllRanges();
        selection.addRange(this.savedRange);

        const range = this.savedRange;

        range.deleteContents();
        range.insertNode(anchor);

        // Move cursor after inserted link
        range.setStartAfter(anchor);
        range.setEndAfter(anchor);
        selection.removeAllRanges();
        selection.addRange(range);

        // 🔥 important: clear saved range
        this.savedRange = null;
      }

      // ✅ Update definition with new link
      this.selectedDefinition = descriptionElement.innerHTML;
      this.definitionInput$.next(this.selectedDefinition);

      this.addLinkEventListeners();

      this.closeModal();
    }
  }

  openDefinitionModal() {
    this.isDefinitionModalOpen = true;
  }

  closeDefinitionModal() {
    this.isDefinitionModalOpen = false;
  }

  updateCursorPosition() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(this.descriptionField.nativeElement);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);

    this.cursorPosition = preSelectionRange.toString().length;
  }

  restoreCursorPosition() {
    const node = this.descriptionField.nativeElement;
    const selection = window.getSelection();
    const range = document.createRange();

    let charIndex = 0;
    let nodeStack = [node];
    let startNode: Node | null = null;
    let startOffset = 0;

    while (nodeStack.length > 0) {
      let currentNode = nodeStack.pop()!;

      if (currentNode.nodeType === Node.TEXT_NODE) {
        let nextCharIndex = charIndex + currentNode.nodeValue!.length;
        if (this.cursorPosition >= charIndex && this.cursorPosition <= nextCharIndex) {
          startNode = currentNode;
          startOffset = this.cursorPosition - charIndex;
          break;
        }
        charIndex = nextCharIndex;
      } else {
        for (let i = currentNode.childNodes.length - 1; i >= 0; i--) {
          nodeStack.push(currentNode.childNodes[i]);
        }
      }
    }

    if (startNode) {
      range.setStart(startNode, startOffset);
      range.collapse(true);
      selection!.removeAllRanges();
      selection!.addRange(range);
    }
  }
  ngAfterViewInit() {
    setTimeout(() => {
      if (this.descriptionField) {
        this.descriptionField.nativeElement.focus();
      }
    }, 0);
  }

  onPOSSelect(event: any) {
    const value = event.value;
    if (!value || !this.selectedSenseId) return;

    const newPOS = value.startsWith('http')
      ? value
      : `http://www.lexinfo.net/ontology/3.0/lexinfo#${value}`;

    // 🔁 Same POS → do nothing
    if (this.oldPOSIRI === newPOS) {
      return;
    }

    const previousPOS = this.oldPOSIRI;

    // 🔹 Update UI immediately (optimistic UI)
    this.selectedPOSIRI = newPOS;
    this.selectedPOSLabel =
      this.sharedFunctionModel.extractLabelFromURI(newPOS);

    this.posSelected = true;
    this.definitionEnabled = true;

    // 🔹 If sense already exists → update backend
    if (previousPOS) {
      this.sensesService
        .updateSensePOS(
          this.selectedSenseId,
          newPOS,
          previousPOS
        )
        .subscribe({
          next: () => {
            // ✅ commit new POS as old
            this.oldPOSIRI = newPOS;

            // optional: refresh other panels
            this.senseRefreshService.trigger();
          },
          error: err => {
            console.error('❌ POS update failed', err);

            // 🔙 rollback UI if backend fails
            this.selectedPOSIRI = previousPOS;
            this.selectedPOSLabel =
              this.sharedFunctionModel.extractLabelFromURI(previousPOS);
          }
        });
    }


    // 🔹 Focus editor
    setTimeout(() => {
      this.descriptionField?.nativeElement.focus();
    }, 100);
  }



}
