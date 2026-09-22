import {Component, inject, Input} from '@angular/core';
import {FormService} from '../../services/form.service';
import {LanguageService} from '../../services/language.service';
import {MorphologyService} from '../../services/Morphology.service';
import {FormBuilder, FormGroup} from '@angular/forms';
import {SensesService} from '../../services/senses.service';
import {DictEntryService} from '../../services/dict-entry.service';

@Component({
  selector: 'app-new-sense',
  standalone: false,
  templateUrl: './new-sense.component.html',
  styleUrl: './new-sense.component.css'
})
export class NewSenseComponent {

  @Input() dictEntryId: string | null = null;

  private senseService = inject(SensesService);
  private dictEntryService = inject(DictEntryService);
  private fb = inject(FormBuilder);

  sense!: FormGroup;
  posOptions: { label: string, value: string }[] = [];

  ngOnInit(): void {
    this.sense = this.fb.group({
      pos: [null]
    });

    this.loadPOSOptions();
  }

  /*saveNewMeanings(): void {

    const { pos } = this.sense.value;
    console.log(pos.value)
    if (!pos ) {
      //  alert("Please fill in all required fields.");
      return;
    }
    if (!this.dictEntryId) {
      console.error('❌ dictEntryId is missing. Make sure [dictEntryId]="selectedEntryId" is bound.');
      return;
    }

    this.senseService.createSense(`http://www.lexinfo.net/ontology/3.0/lexinfo#${pos.value}`, this.dictEntryId).subscribe({
      next: (result) => {
        //console.log('✅ Entry created:', result);
        alert("Sense created successfully!");
        this.sense.reset();
      },
      error: (err) => {
        console.error('❌ Failed to create entry:', err);
        //alert("Failed to create entry.");
      }
    });
  }*/

  saveNewMeanings(pos:string): void {

    if (!pos ) {
      //  alert("Please fill in all required fields.");
      return;
    }
    if (!this.dictEntryId) {
      console.error('❌ dictEntryId is missing. Make sure [dictEntryId]="selectedEntryId" is bound.');
      return;
    }

    this.senseService.createSense(`http://www.lexinfo.net/ontology/3.0/lexinfo#${pos}`, this.dictEntryId).subscribe({
      next: (result) => {
        //console.log('✅ Entry created:', result);
        alert("Sense created successfully!");
        this.sense.reset();
      },
      error: (err) => {
        console.error('❌ Failed to create entry:', err);
        //alert("Failed to create entry.");
      }
    });
  }


  loadPOSOptions(): void {
    if(this.dictEntryId){
      this.dictEntryService.getById(this.dictEntryId).subscribe(all => {
        this.posOptions = all.pos.map(lang => ({
          label: lang.trim(),
          value: lang.trim()
        }))

      });}
  }
}
