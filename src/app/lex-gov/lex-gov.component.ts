import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-lex-gov',
  templateUrl: './lex-gov.component.html',
  standalone: false,
  styleUrl: './lex-gov.component.css'
})
export class LexGovComponent {

  @Input() activeTab: string | null = null;
  @Output() activeTabChange = new EventEmitter<string | null>();

  selectTab(tabName: string): void {
    // 🔁 Toggle logic
    const newValue = this.activeTab === tabName ? null : tabName;

    // Emit to parent
    this.activeTabChange.emit(newValue);
  }

}
