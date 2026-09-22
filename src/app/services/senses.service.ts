import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';
import {FiltredSensesEModel} from '../models/FiltredSensesE.model';
import {FiltredSensesModel} from '../models/FiltredSenses.model';
import {IFiltredSenses} from '../interfaces/FiltredSenses.interface';
import {IForms} from '../interfaces/forms.interface';
import {IDict} from '../interfaces/Dict.interface';
import {ISense} from '../interfaces/Sense.interface';
import {IECDSense} from '../interfaces/IECDSense.interface';

@Injectable({
  providedIn: 'root'
})
export class SensesService {

  constructor() { }
  private BASE_URL = 'LexO-backend/service/data/';
  private CREATE_URL = 'LexO-backend/service/ecd/create/ECDMeaning';
  private http = inject(HttpClient);
  private filtredSensesE: FiltredSensesEModel = new FiltredSensesEModel();

  getAll(): Observable<IFiltredSenses> {
    return this.http.post<IFiltredSenses>(
      this.BASE_URL + 'filteredSenses',
      this.filtredSensesE.toJson()
    ).pipe(
      map(response => ({
          ...response,
          list: response.list.map(entry => FiltredSensesModel.fromJson(entry))
        })
      )
    );
  }

  setLanguageFilter(language: string): void {
    this.filtredSensesE.lang = language;
  }

  createSense(pos: string, dictEntryId: string): Observable<IECDSense> {

    const prefixPayload = {
      author: "abdou",
      desiredID: "",
      prefix: "lex",
      baseIRI: "http://mydata.com#",
      pos: pos,
      ecdEntry: dictEntryId
    };

    const requestUrl = `${this.CREATE_URL}?author=${encodeURIComponent(prefixPayload.author)}&prefix=${prefixPayload.prefix}&baseIRI=${encodeURIComponent(prefixPayload.baseIRI)}&pos=${encodeURIComponent(prefixPayload.pos)}&DictEntryID=${encodeURIComponent(prefixPayload.ecdEntry)}`;

    return this.http.get<IECDSense>(requestUrl);
  }

  updateSensePOS(
    senseIRI: string,
    newPOS: string,
    oldPOS: string,
    author = 'abdou'
  ) {
    const payload = {
      relation: 'http://www.lexinfo.net/ontology/3.0/lexinfo#partOfSpeech',
      value: newPOS,
      oldPoS: oldPOS
    };

    const url =
      `LexO-backend/service/ecd/update/ECDMeaning` +
      `?id=${encodeURIComponent(senseIRI)}` +
      `&author=${encodeURIComponent(author)}`;

    return this.http.post(url, payload, { responseType: 'text' });
  }

  deleteSense(id: string): Observable<any> {
    const encodedId = encodeURIComponent(id);
    const url = `LexO-backend/service/ecd/delete/ECDMeaning?idECDMeaning=${encodedId}`;
    return this.http.get(url, {responseType: 'text'}) // 👈 Handle non-JSON response
      .pipe(
        map(response => {
          //console.log("🔹 Server Response:", response);
          return response; // Return raw response instead of trying to parse it as JSON
        })
      );
  }

}
