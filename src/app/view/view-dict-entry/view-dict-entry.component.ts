import {Component, inject, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {SharedFunctionModel} from '../../models/SharedFunction.model';
import {IForms} from '../../interfaces/forms.interface';
import {IECDEntryTree} from '../../interfaces/ECDEntryTree.interface';
import {SenseDetailService} from '../../services/sense-detail.service';
import {ILexicalFunctionSense} from '../../interfaces/lexical_function_Sense.interface';
import {DictEntryService} from '../../services/dict-entry.service';
import {DictEntry} from '../../models/DictEntry.model';
import {ECDEntryTreeService} from '../../services/ecdentry-tree.service';
import {ECDMeaningModel} from '../../models/ECDMeaningModel.model';
import {ECDForm} from '../../models/ECDForm.model';

@Component({
  selector: 'app-view-dict-entry',
  templateUrl: './view-dict-entry.component.html',
  standalone: false,
  styleUrls: ['./view-dict-entry.component.css']
})
export class ViewDictEntryComponent implements OnInit, OnChanges {
  @Input() forms: ECDForm[] = [];
  @Input() senses: IECDEntryTree[] = [];
  @Input() dictEntryId: string | null = null;

  dictEntry: DictEntry = new DictEntry();

  examples: { [senseId: string]: string } = {};
  lexicalFunctions: { [senseId: string]: ILexicalFunctionSense[] } = {};

  pos: string[] = []

  private dictEntryService = inject(DictEntryService);
  private ecdEntryTreeService = inject(ECDEntryTreeService);

  protected sharedFunctionModel: SharedFunctionModel = new SharedFunctionModel();

  constructor(private senseDetailService: SenseDetailService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['senses'] && this.senses?.length > 0) {
      this.loadExamplesAndLFsForSenses();
      this.getEntries();
    }
  }

  get hasLabeledForms(): boolean {
    return this.forms.some(f => !!f.label);
  }

  get countPosSense(): number {
    const posLabels = this.senses
      .map(s => this.sharedFunctionModel.extractLabelFromURI(s.pos[0])).filter(Boolean); // Remove null/undefined

    const uniquePOS = new Set(posLabels);


    this.pos = Array.from(uniquePOS)

    return uniquePOS.size
  }
  updateDefinition(definition: string): string {
    if (!definition) return '';

    return definition.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/g, (match, href) => {
      // Extraire senseId à partir du href
      const senseId = decodeURIComponent(href.trim());

      const ecd = this.ecdMeanings[senseId];
      //console.log(ecd)
      const label = ecd?.label || senseId;
      const senseLabel = ecd?.senseLabel ? ` ${ecd.senseLabel}` : '';

      return `<i>${this.sharedFunctionModel.extractLangFromLabel(label)} ${senseLabel}</i>`;
    });
  }

 /* updateDefinition(senseDefinition: string): string {
    // Replace any <a ...>...</a> with <i>...</i>
    return senseDefinition.replace(/<a[^>]*>/g, '<i>').replace(/<\/a>/g, '</i>');
  }
*/


  getEntries(): void {
    this.dictEntryService.getAll().subscribe(result => {
      let entries = result.list;
      if (this.dictEntryId) {
        entries = entries.filter(entry => entry.dictionaryEntry === this.dictEntryId);
      }
      this.dictEntry = entries[0];
    });
  }

  lexicalEntryLabels: { [senseId: string]: string } = {};


  getLexicalEntryLabel(senseId: string): void {
    if (this.lexicalEntryLabels[senseId]) return;

    this.senseDetailService.getSenseDetail(senseId).subscribe({
      next: (detail) => {
        const label = detail.lexicalEntryLabel || 'Unknown';
        const dictEntryUrl = detail.lexicalEntry?.replace("_lexical_", "_dictionary_") || '';

        this.lexicalEntryLabels[senseId] = label;

        // ⬅️ Now we have the dictEntryId, we can call getLabelSense
        if (dictEntryUrl) {
          this.getLabelSense(senseId, dictEntryUrl);
        }

      },
      error: () => {
        this.lexicalEntryLabels[senseId] = 'Error';
      }
    });
  }

  groupLexicalFunctions(lfList: ILexicalFunctionSense[]): { [lfType: string]: ILexicalFunctionSense[] } {
    const grouped: { [lfType: string]: ILexicalFunctionSense[] } = {};

    for (const lf of lfList) {
      const label = this.sharedFunctionModel.extractLFFromURI(lf.lexicalFunction);
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(lf);
    }

    return grouped;
  }




  senseLabels: { [senseId: string]: string } = {};

  getLabelSense(senseId: string, dictEntryId: string): void {
    if (this.senseLabels[senseId]) return;  // ✅ Avoid redundant calls

    //console.log(dictEntryId)
    this.ecdEntryTreeService.getByIdSense(dictEntryId).subscribe({
      next: (senses) => {
        const match = senses.find(s => s.referredEntity === senseId);
        this.senseLabels[senseId] = match?.label || 'Unknown';
      },
      error: () => {
        this.senseLabels[senseId] = 'Error';
      }
    });
  }


  ecdMeanings: { [senseId: string]: ECDMeaningModel } = {};
  private loadExamplesAndLFsForSenses(): void {
    for (const sense of this.senses) {
      const senseId = sense.referredEntity;

      // 🔹 Charger les exemples + charger ECDMeaning depuis les href de définition


      this.senseDetailService.getSenseDetail(senseId).subscribe({
        next: (detail) => {
          const exampleDef = detail.definition.find(d => d.propertyID === 'senseExample');
          this.examples[senseId] = exampleDef?.propertyValue || '';

          // 🔎 Scanner toutes les définitions pour extraire les <a href="...">
          detail.definition.forEach(def => {
            const hrefMatches = def.propertyValue.match(/href=["']([^"']+)["']/g) || [];
            hrefMatches.forEach(match => {
              const href = match.match(/href=["']([^"']+)["']/)?.[1];
              const senseRef = decodeURIComponent(href ?? '').trim();

              if (senseRef && !this.ecdMeanings[senseRef]) {
                this.senseDetailService.getBySenseId(senseRef).subscribe({
                  next: (meaning) => {
                    this.ecdMeanings[senseRef] = meaning;
                  },
                  error: () => {
                    this.ecdMeanings[senseRef] = new ECDMeaningModel(); // fallback vide
                  }
                });
              }
            });
          });
        },
        error: () => {
          this.examples[senseId] = '';
        }
      });

      // 🔹 Charger les lexical functions + leur cible
      this.senseDetailService.getLFById(senseId).subscribe({
        next: (lfArray) => {
          this.lexicalFunctions[senseId] = lfArray || [];

          lfArray?.forEach(lf => {
            const targetSenseId = lf.senseTarget;

            // Charger lexicalEntryLabel
            this.getLexicalEntryLabel(targetSenseId);

            // Charger ECDMeaning du senseTarget si pas déjà chargé
            if (targetSenseId && !this.ecdMeanings[targetSenseId]) {
              this.senseDetailService.getBySenseId(targetSenseId).subscribe({
                next: (meaning) => {
                  this.ecdMeanings[targetSenseId] = meaning;
                },
                error: () => {
                  this.ecdMeanings[targetSenseId] = new ECDMeaningModel();
                }
              });
            }
          });
        },
        error: () => {
          this.lexicalFunctions[senseId] = [];
        }
      });
    }
  }


  protected readonly Object = Object;
}

