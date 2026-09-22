import {Injectable, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {IDict} from '../interfaces/Dict.interface';
import {IECDictionaries} from '../interfaces/ECDictionaries.interface';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DictService {
  private DATA_URL   = 'LexO-backend/service/ecd/data/';
  private DELETE_URL = 'LexO-backend/service/ecd/delete/ECDictionary';
  private CREATE_URL = 'LexO-backend/service/ecd/create/ECDictionary';
  private UPDATE_URL = 'LexO-backend/service/update/genericRelation';
  private http = inject(HttpClient);


  createDicT(label: string, language: string): Observable<IDict> {
    // ✅ 1. Clean label for URI (remove spaces and special characters)
    const safeLabel = label.trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '');

    // ✅ 2. Metadata for URI generation
    const prefixPayload = {
      author: "abdou",
      desiredID: "",
      prefix: "lex",
      baseIRI: "http://mydata.com#"
    };

    // ✅ 3. Construct request URL with query params
    const requestUrl = `${this.CREATE_URL}?lang=${encodeURIComponent(language)}&desiredID=${encodeURIComponent(prefixPayload.desiredID)}&author=${encodeURIComponent(prefixPayload.author)}&prefix=${encodeURIComponent(prefixPayload.prefix)}&baseIRI=${encodeURIComponent(prefixPayload.baseIRI)}`;

    // ✅ 4. Perform GET request (no body allowed)
    return this.http.get<IDict>(requestUrl);
  }



  /** ✅ get the full dictionary list */
  getAll(): Observable<IECDictionaries[]> {
    // API returns a list container or a plain array in some deployments.
    return this.http.get<any>(`${this.DATA_URL}ECDictionaries`).pipe(
      map(res => Array.isArray(res) ? res as IECDictionaries[] : (res?.list as IECDictionaries[]) ?? [])
    );
  }

  getById(id: string): Observable<any> {
    return this.http.get(
      `LexO-backend/service/ecd/data/ECDictionary?id=${encodeURIComponent(id)}`
    );
  }

  updateDictEntry(id :string, relation:string, oldvalue: string, newvalue: string ): Observable<any>
  {
    if (relation == "description" ){
      relation = "http://purl.org/dc/terms/description";
    }
    else if (relation == "label" ){
      relation = "http://www.w3.org/2000/01/rdf-schema#label";
    }

    const updatePayload = {
      type: "metadata",
      relation: relation,
      currentValue: oldvalue,
      value: newvalue,
    };

    const requestUrl =
      `${this.UPDATE_URL}?id=${encodeURIComponent(id)}&author=abdou`;

    return this.http.post(requestUrl, updatePayload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text'   // ✅ LA LIGNE CRITIQUE
    });

  }

  /** ✅ delete by IRI (id) — returns timestamp */
  deleteDict(id: string): Observable<any> {

    return this.http.get(`${this.DELETE_URL}?id=${encodeURIComponent(id)}`, {responseType: 'text'}) // 👈 Handle non-JSON response
      .pipe(
        map(response => {
          //console.log("🔹 Server Response:", response);
          return response; // Return raw response instead of trying to parse it as JSON
        })
      );
  }


}
