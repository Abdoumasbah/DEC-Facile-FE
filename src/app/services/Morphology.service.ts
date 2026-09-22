import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';
import {MorphologyModel} from '../models/morphology.model';

@Injectable({
  providedIn: 'root'
})

export class MorphologyService {
  private BASE_URL = 'LexO-backend/service/lexinfo/data/morphology';
  private http = inject(HttpClient);

  getAll(): Observable<MorphologyModel[]> {
    return this.http.get<any[]>(this.BASE_URL).pipe(
      map(entries => entries.map(e => MorphologyModel.fromJson(e)))
    );
  }
}
