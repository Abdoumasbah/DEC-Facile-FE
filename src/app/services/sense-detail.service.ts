import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {SenseDetail} from '../models/SenseDetail.model';
import {Observable} from 'rxjs';
import {ISenseDetail} from '../interfaces/ISenseDetail.interface';
import {map} from 'rxjs/operators';
import {ILexicalFunctionSense} from '../interfaces/lexical_function_Sense.interface';
import {LexicalFunctionModel} from '../models/Lexical_function_Sense.model';
import {ECDMeaningModel} from '../models/ECDMeaningModel.model';
import {IECDMeaning} from '../interfaces/IECDMeaning.interface';

@Injectable({
  providedIn: 'root'
})
export class SenseDetailService {

  private DATA_URL = 'LexO-backend/service/data/lexicalSense';
  private UPDATE_URL = 'LexO-backend/service/update/lexicalSense';
  private LF_URL = 'LexO-backend/service/ecd/data/ECDLexicaFunctions';
  private ADD_GR_URL = 'LexO-backend/service/update/genericRelation';
  private DELETE_GR_URL = 'LexO-backend/service/delete/relation';
  private ECDMeaning_URL = 'LexO-backend/service/ecd/data/ECDMeaning';
  private http = inject(HttpClient);

  constructor() { }

  getSenseDetail(senseId: string): Observable<SenseDetail> {
    const params = new URLSearchParams({
      module: 'core',
      id: senseId
    });

    const url = `${this.DATA_URL}?${params.toString()}`;

    return this.http.get<ISenseDetail>(url).pipe(
      map((response) => SenseDetail.fromJson(response))
    );
  }

  getLFById(senseId: string): Observable<ILexicalFunctionSense[]> {
    const encodedId = encodeURIComponent(senseId);
    return this.http.get<ILexicalFunctionSense[]>(`${this.LF_URL}?id=${encodedId}`).pipe(
      map(entryJson =>
        Array.isArray(entryJson)
          ? entryJson.map(item => LexicalFunctionModel.fromJson(item))
          : [LexicalFunctionModel.fromJson(entryJson)]
      )
    );
  }

  private normalizeHTMLForRDF(html: string): string {
    return html.replace(/="/g, "='").replace(/"/g, "'");
  }

  updateSenseDefinition(
    senseId: string,
    newDefinition: string,
    oldDefinition: string
  ): Observable<any> {

    const safeHTML = this.normalizeHTMLForRDF(newDefinition);

    const updatePayload = {
      relation: "http://www.w3.org/2004/02/skos/core#definition",
      value: safeHTML, // 🔥 HTML PUR
      datatype: "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML",
      currentValue: oldDefinition
    };

    return this.http.post(
      `${this.UPDATE_URL}?id=${encodeURIComponent(senseId)}`,
      updatePayload,
      {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'text'
      }
    );
  }

  updateSenseExample(senseId: string, newExample: string): Observable<any> {
    if (!senseId) throw new Error("Missing senseId");

    const normalized = newExample
      .replace(/\r\n/g, '\n')   // Windows
      .replace(/\r/g, '\n')     // old Mac
      .replace(/\n/g, '\\n');   // 🔑 conversion contrôlée

    const updatePayload = {
      relation: "http://www.lexinfo.net/ontology/3.0/lexinfo#senseExample",
      value: normalized
    };

    return this.http.post(
      `${this.UPDATE_URL}?id=${encodeURIComponent(senseId)}`,
      updatePayload,
      {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'text'
      }
    );
  }

  addGenericRelation(senseId: string, newSense: string): Observable<any> {
    if (!senseId) {
      console.error("Error: senseId is missing!");
      throw new Error("Missing senseId parameter!");
    }

    newSense = newSense.trim().replace(/['"\\]+/g, '');

    // ✅ Construct payload correctly
    const updatePayload = {
      type: "reference",
      relation: "http://www.w3.org/2000/01/rdf-schema#seeAlso",
      value: "http://lexica/mylexicon#" + newSense,  // Use properly escaped definition
      currentValue: ""
    };

     console.log("🚀 Sending payload:", JSON.stringify(updatePayload));  // Debugging

    return this.http.post(`${this.ADD_GR_URL}?id=${encodeURIComponent(senseId)}`, updatePayload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text'  // ✅ Expect plain text response instead of JSON
    }).pipe(
      map(response => {
        //  console.log("✅ Server Response:", response);
        return { success: true, message: response }; // Wrap text response in an object
      })
    );
  }

  deleteGenericRelation(senseId: string, Sense: string): Observable<any> {
    if (!senseId) {
      console.error("Error: senseId is missing!");
      throw new Error("Missing senseId parameter!");
    }
    Sense = Sense.trim().replace(/['"\\]+/g, '');
    // ✅ Construct payload correctly
    const updatePayload = {
      relation: "http://www.w3.org/2000/01/rdf-schema#seeAlso",
      value: "http://lexica/mylexicon#" + Sense
    };

    console.log("🚀 Sending payload:", JSON.stringify(updatePayload));  // Debugging

    return this.http.post(`${this.DELETE_GR_URL}?id=${encodeURIComponent(senseId)}`, updatePayload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'text'  // ✅ Expect plain text response instead of JSON
    }).pipe(
      map(response => {
        //  console.log("✅ Server Response:", response);
        return { success: true, message: response }; // Wrap text response in an object
      })
    );
  }

  getBySenseId(senseId: string): Observable<ECDMeaningModel> {
    const url = `${this.ECDMeaning_URL}?id=${encodeURIComponent(senseId)}`;
    return this.http.get<IECDMeaning>(url).pipe(
      map(data => ECDMeaningModel.fromJson(data))
    );
  }
}
