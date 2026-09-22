import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SelectedSenseService {
  private selectedSenseSubject = new BehaviorSubject<string | null>(null);
  private selectedSenseSubjectID = new BehaviorSubject<string | null>(null);
  private selectedSenseSubjectPOS = new BehaviorSubject<string | null>(null);
  private entryPOSSource = new BehaviorSubject<string[]>([]);
  selectedSense$ = this.selectedSenseSubject.asObservable();
  selectedSenseID$ = this.selectedSenseSubjectID.asObservable();

  setSelectedSensePOS$ = this.selectedSenseSubjectPOS.asObservable();
  entryPOS$ = this.entryPOSSource.asObservable();


  setSelectedSense(sense: string) {
    this.selectedSenseSubject.next(sense);
  }

  setSelectedSenseID(sense: string) {
    this.selectedSenseSubjectID.next(sense);
  }

  setSelectedSensePOS(sense: string) {
    this.selectedSenseSubjectPOS.next(sense);
  }

  setEntryPOS(pos: string[]) {
    this.entryPOSSource.next(pos);
  }

  private entryIdSource = new BehaviorSubject<string | null>(null);
  entryId$ = this.entryIdSource.asObservable();

  setEntryId(id: string | null) {
    this.entryIdSource.next(id);
  }

  private entryLabelSource = new BehaviorSubject<string | null>(null);
  entryLabel$ = this.entryLabelSource.asObservable();

  setEntryLabel(id: string | null) {
    this.entryLabelSource.next(id);
  }

  clear() {
    this.setSelectedSense('');
    this.setSelectedSenseID('');
    this.setSelectedSensePOS('');
    this.setEntryId(null);
    this.setEntryLabel(null);
    this.setEntryPOS([]);
  }

}
