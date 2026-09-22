import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';
import {ECDEntryTree} from '../models/ECDEntryTree.model';
import {IECDEntryTree} from '../interfaces/ECDEntryTree.interface';
import {IECDForm} from '../interfaces/ECDForm.interface';
import {ECDForm} from '../models/ECDForm.model';

@Injectable({
  providedIn: 'root'
})
export class ECDEntryTreeService {

  constructor() {
  }

  private BASE_URL = 'LexO-backend/service/ecd/data/';
  private http = inject(HttpClient);

  getByIdSense(id: string): Observable<IECDEntryTree[]> {
    const encodedId = encodeURIComponent(id);
    return this.http.get<IECDEntryTree[]>(`${this.BASE_URL}ECDEntrySemantics?id=${encodedId}`).pipe(
      map(entryJson => entryJson.map(item => ECDEntryTree.fromJson(item)))
    );
  }

  getByIdForms(id: string): Observable<ECDForm[]> {
    const encodedId = encodeURIComponent(id);
    return this.http.get<IECDForm[]>(`${this.BASE_URL}ECDEntryMorphology?id=${encodedId}`).pipe(
      map(entryJson => entryJson.map(item => ECDForm.fromJson(item)))
    );
  }


}
