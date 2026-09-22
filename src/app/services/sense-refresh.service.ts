import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SenseRefreshService {
  private refresh$ = new Subject<void>();

  trigger() {
    this.refresh$.next();
  }

  onRefresh() {
    return this.refresh$.asObservable();
  }
}
