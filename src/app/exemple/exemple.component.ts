import { Component, ElementRef, ViewChild } from '@angular/core';
import { SelectedSenseService } from '../services/selected-sense.service';
import { SenseDetailService } from '../services/sense-detail.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-exemple',
  standalone: false,
  templateUrl: './exemple.component.html',
  styleUrl: './exemple.component.css'
})
export class ExempleComponent {

  @ViewChild('exampleField') exampleField!: ElementRef<HTMLDivElement>;

  selectedSenseId = '';
  originalExample = '';
  saving = false;

  private exampleInput$ = new Subject<string>();

  constructor(
    private selectedSenseService: SelectedSenseService,
    private senseDetailService: SenseDetailService
  ) {}

  ngOnInit(): void {

    /* 🔁 Sense changed */
    this.selectedSenseService.selectedSenseID$.subscribe(senseId => {
      if (senseId) {
        this.selectedSenseId = senseId;
        this.loadExampleForSense(senseId);
      }
    });

    /* ⏱ Autosave */
    this.exampleInput$
      .pipe(
        debounceTime(700),
        distinctUntilChanged()
      )
      .subscribe(value => this.saveExample(value));
  }

  loadExampleForSense(senseId: string): void {
    this.senseDetailService.getSenseDetail(senseId).subscribe({
      next: detail => {
        const exampleDef = detail.definition.find(
          d => d.propertyID === 'senseExample'
        );

        const raw = exampleDef?.propertyValue || '';

        // 🔑 conversion BACKEND → TEXTE
        const text = raw.replace(/\\n/g, '\n');

        this.originalExample = text;

        // 🔑 conversion TEXTE → HTML (contrôlée)
        const html = text
          .split('\n')
          .map(line => line === '' ? '<br>' : line)
          .join('<br>');

        setTimeout(() => {
          this.exampleField.nativeElement.innerHTML = html;
        });
      }
    });
  }

  onExampleInput(): void {
    const el = this.exampleField.nativeElement;
    const text = el.innerHTML
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<div>/gi, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n') // nettoyage
      .trimEnd();

    this.exampleInput$.next(text);
  }

  private saveExample(value: string): void {
    if (!this.selectedSenseId) return;

    const trimmed = value.trim();
    const original = this.originalExample.trim();

    /* ❌ no change */
    if (trimmed === original) return;

    this.saving = true;

    this.senseDetailService
      .updateSenseExample(this.selectedSenseId, trimmed)
      .subscribe({
        next: () => {
          this.originalExample = trimmed;
          this.saving = false;
        },
        error: err => {
          console.error(err);
          this.saving = false;
        }
      });
  }
}
