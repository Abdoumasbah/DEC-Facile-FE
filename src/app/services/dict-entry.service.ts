import {Injectable, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {DictEntry} from '../models/DictEntry.model';
import {ECDEntriesResponse} from '../interfaces/ECDEntriesResponse.interface';
import {Observable, timestamp} from 'rxjs';
import {map} from 'rxjs/operators';
import {DictEntryE} from '../models/DictEntryE.model';
import {IDictEntry} from '../interfaces/Dict_Entry.interface';
import {exitCodeFromResult} from '@angular/compiler-cli';

@Injectable({
  providedIn: 'root',
})
export class DictEntryService {
  private BASE_URL = 'LexO-backend/service/ecd/data/';
  private CREATE_URL = 'LexO-backend/service/ecd/create/ECDEntry';
  private UPDATE_URL = 'LexO-backend/service/ecd/update/ECDEntry';
  private http = inject(HttpClient);
  private dictEntryE: DictEntryE = new DictEntryE();


  getAll(): Observable<ECDEntriesResponse> {
    return this.http.post<ECDEntriesResponse>(
      this.BASE_URL + 'ECDEntries',
      this.dictEntryE.toJson()
    ).pipe(
      map(response => ({
          ...response,
          list: response.list.map(entry => DictEntry.fromJson(entry))
        })
      )
    );
  }

  getById(id: string): Observable<DictEntry> {
    const encodedId = encodeURIComponent(id);
    return this.http.get<DictEntry>(`${this.BASE_URL}ECDEntry?id=${encodedId}`).pipe(
      map(entryJson => DictEntry.fromJson(entryJson))
    );
  }

  createDicTEntry(
    label: string,
    type: string,
    language: string,
    pos: string[] | string
  ): Observable<IDictEntry> {
    const safeLabel = label
      .trim()
      .replace(/[^\p{L}\p{M}\p{N}_\-]/gu, '');


    const updatePayload: any = {
      label,
      type,                    // use the chosen type
      language,
      pos                      // backend can accept array; if it needs single, send pos[0]
    };

    const requestUrl =
      `${this.CREATE_URL}?author=abdou&desiredID=&prefix=lex&baseIRI=${encodeURIComponent('http://mydata.com#')}`;

    return this.http.post<IDictEntry>(requestUrl, updatePayload, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  updateDictEntry(id :string, relation:string, value: string ): Observable<any>
  {
    if (relation == "note" ){
      relation = "http://www.w3.org/2004/02/skos/core#note";
    }
    else if (relation == "label" ){
      relation = "http://www.w3.org/2000/01/rdf-schema#label";
    }
    else if (relation == "pos" ){
      relation = "http://www.lexinfo.net/ontology/3.0/lexinfo#partOfSpeech";
    }
    else if (relation == "type" ){
      relation = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    }

    const updatePayload = {
      relation: relation,
      value: value,
    };

    const requestUrl =
      `${this.UPDATE_URL}?id=${encodeURIComponent(id)}&author=abdou`;

    return this.http.post(requestUrl, updatePayload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text'   // ✅ LA LIGNE CRITIQUE
    });

  }

  updatePos(id: string, newPos: string, oldPos: string): Observable<any> {
    const requestUrl =
      `${this.UPDATE_URL}?id=${encodeURIComponent(id)}&author=abdou`;

    const payload = {
      relation: 'http://www.lexinfo.net/ontology/3.0/lexinfo#partOfSpeech',
      value: newPos,
      oldPoS: oldPos
    };

    return this.http.post(requestUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text'   // ✅ LA LIGNE CRITIQUE
    });
  }

  setStatus(id: string, status: 'working'|'completed'|'reviewed'): Observable<any> {
    const requestUrl = `${this.UPDATE_URL}?id=${encodeURIComponent(id)}&author=abdou`;
    const updatePayload = {
      relation: "http://www.w3.org/2003/06/sw-vocab-status/ns#term_status",
      value: status
    };
    return this.http.post(requestUrl, updatePayload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text'   // ✅ LA LIGNE CRITIQUE
    });
  }

  deleteDictEntry(id: string): Observable<any> {
    const encodedId = encodeURIComponent(id);
    const url = `LexO-backend/service/ecd/delete/ECDEntry?id=${encodedId}&force=true`;
    return this.http.get(url, {responseType: 'text'}) // 👈 Handle non-JSON response
      .pipe(
        map(response => {
          //console.log("🔹 Server Response:", response);
          return response; // Return raw response instead of trying to parse it as JSON
        })
      );
  }

  deletePosFromEntry(entryId: string, posIRI: string): Observable<any> {
    const url =
      `LexO-backend/service/ecd/delete/ECDEntryPoS` +
      `?id=${encodeURIComponent(entryId)}` +
      `&pos=${encodeURIComponent(posIRI)}`;

    return this.http.get(url, { responseType: 'text' });
  }


}
