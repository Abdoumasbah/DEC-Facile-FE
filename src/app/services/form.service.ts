import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {HttpClient} from '@angular/common/http';
import {IForms} from '../interfaces/forms.interface';
import {IECDForm} from '../interfaces/ECDForm.interface';
import {Form} from '../models/Form.model';

@Injectable({
  providedIn: 'root'
})
export class FormService {

  constructor() { }

  private CREATE_URL = 'LexO-backend/service/ecd/create/ECDForm';
  private UPDATE_URL = 'LexO-backend/service/update/form';
  private http = inject(HttpClient);

  getFormById(id: string): Observable<IForms> {

    return this.http.get<IForms>( `LexO-backend/service/data/form?module=core&id=${encodeURIComponent(id)}`).pipe(
      map(entryJson => Form.fromJson(entryJson))
    );
  }

  createForm(label: string, type: string, language: string, pos: string, dictEntryId: string): Observable<IECDForm> {
    // ✅ 1. Clean label for URI (no spaces or special chars)
    const safeLabel = label
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\p{L}\p{M}\p{N}_\-]/gu, '');


    // ✅ 2. Construct JSON payload
    const updatePayload = {
      label: safeLabel,
      type: type, // generic
      language: language,
      pos: [pos]
    };

    // ✅ 3. Metadata for URI generation
    const prefixPayload = {
      author: "abdou",
      desiredID: "",
      prefix: "lex",
      baseIRI: "http://mydata.com#",
      ecdEntry: dictEntryId
    };
   //  console.log(pos);
    // ✅ 4. Construct request URL
    const requestUrl = `${this.CREATE_URL}?ECDEntry=${encodeURIComponent(prefixPayload.ecdEntry)}&author=${encodeURIComponent(prefixPayload.author)}&prefix=${prefixPayload.prefix}&baseIRI=${encodeURIComponent(prefixPayload.baseIRI)}`;

    // ✅ 5. POST request
    return this.http.post<IECDForm>(
      requestUrl,
      updatePayload,
      { headers: { 'Content-Type': 'application/json' } }
    );
  }


  updateForm(id :string, relation:string, newvalue: string ): Observable<any>
  {
    if (relation == "note" ){
      relation = "http://www.w3.org/2004/02/skos/core#note";
    }
    else if (relation == "type" ){
      relation = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    }

    const updatePayload = {
      relation: relation,
      value: newvalue,
    };

    const requestUrl =
      `${this.UPDATE_URL}?id=${encodeURIComponent(id)}`;

    return this.http.post(requestUrl, updatePayload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text'   // ✅ LA LIGNE CRITIQUE
    });

  }

  updateFormPOS(
    id: string,
    newPOS: string,
    oldPOS: string
  ): Observable<any> {

    const payload = {
      relation: 'http://www.lexinfo.net/ontology/3.0/lexinfo#partOfSpeech',
      value: newPOS,
      oldPoS: oldPOS
    };

    const requestUrl =
      `LexO-backend/service/ecd/update/ECDForm?id=${encodeURIComponent(id)}`;

    return this.http.post(requestUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text'
    });
  }

  updateFormMorphology(
    formId: string,
    relationIRI: string,
    valueIRI: string
  ): Observable<any> {

    const payload = {
      type: 'morphology',
      relation: relationIRI,
      value: valueIRI
    };

    const requestUrl =
      `LexO-backend/service/update/linguisticRelation?id=${encodeURIComponent(formId)}`;

    return this.http.post(requestUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text'
    });
  }


  deleteForm(id: string): Observable<any> {
    const encodedId = encodeURIComponent(id);
    const url = `LexO-backend/service/ecd/delete/ECDForm?id=${encodedId}`;
    return this.http.get(url, {responseType: 'text'}) // 👈 Handle non-JSON response
      .pipe(
        map(response => {
          //console.log("🔹 Server Response:", response);
          return response; // Return raw response instead of trying to parse it as JSON
        })
      );
  }

}
