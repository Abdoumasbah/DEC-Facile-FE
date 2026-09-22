import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable, timestamp} from 'rxjs';
import {map} from 'rxjs/operators';
import {ILexicalFunction} from '../interfaces/LexicalFunction.interface';
import {LexicalFunction} from '../models/LexicalFunction.model';

@Injectable({
  providedIn: 'root'
})
export class LexicalFunctionService {
  private selectedLexicalFunctionSubject = new BehaviorSubject<string | null>(null);
  selectedLexicalFunction$ = this.selectedLexicalFunctionSubject.asObservable();

  private selectedSenseTargetSubject = new BehaviorSubject<string | null>(null);
  selectedSenseTarget$ = this.selectedSenseTargetSubject.asObservable();

  private selectedIdSubject = new BehaviorSubject<string | null>(null);
  selectedId$ = this.selectedIdSubject.asObservable();

  // ✅ Track additional pairs separately
  private additionalPairsSubject = new BehaviorSubject<{ lexicalFunction: string | null, sense: string | null }[]>([]);
  additionalPairs$ = this.additionalPairsSubject.asObservable();

  setSelectedLexicalFunction(lf: string) {
    this.selectedLexicalFunctionSubject.next(lf);
  }

  setSelectedSenseTarget(sense: string) {
    this.selectedSenseTargetSubject.next(sense);
  }

  setSelectedId(id: string) {
    this.selectedIdSubject.next(id);
  }

  clearSelection() {
    this.selectedLexicalFunctionSubject.next(null);
    this.selectedSenseTargetSubject.next(null);
    this.selectedIdSubject.next(null);
  }

  private BASE_URL = 'LexO-backend/service/lexfom/data/lexicalFunctions';
  private CREATE_URL = 'LexO-backend/service/ecd/create/lexicalFunction';
  private DELETE_URL = 'LexO-backend/service/ecd/delete/lexicalFunction';

  private http = inject(HttpClient);

  getAll(): Observable<ILexicalFunction[]> {
    return this.http.get<ILexicalFunction[]>(this.BASE_URL).pipe(
      map(response => response.map(item => LexicalFunction.fromJson(item)))
    );
  }

  // ✅ Properly reset additionalPairs
  clearAdditionalPairs() {
    this.additionalPairsSubject.next([]); // Reset additionalPairs
  }

  // ✅ Updated: Handle multiple lexical functions
  addAdditionalPair(lexicalFunction: string, sense: string) {
    const currentPairs = this.additionalPairsSubject.value;
    this.additionalPairsSubject.next([...currentPairs, {lexicalFunction, sense}]);
  }

  createLexicalFunction(senseId: string | null, senseTarget: string, lexicalFunction: string, type: string): Observable<ILexicalFunction[]> {
    // ✅ Construct the payload based on the screenshot
    const updatePayload = {
      source: senseId,  // The source sense ID
      target: senseTarget, // The target sense
      lexicalFunction: lexicalFunction,  // The lexical function URL
      type: type  // The relation type
    };

    // ✅ Generate metadata for the creation request
    const prefixPayload = {
      author: "abdou",
      desiredID: `id${Date.now()}`,  // Use timestamp to ensure unique IDs
      prefix: "lex",
      baseIRI: "http://mydata.com#"
    };

    // ✅ Correctly format the request URL with query parameters
    const requestUrl = `${this.CREATE_URL}?author=${prefixPayload.author}&desiredID=&prefix=${prefixPayload.prefix}&baseIRI=${encodeURIComponent(prefixPayload.baseIRI)}`;

    // ✅ Make the POST request with the correct payload and return a JSON response
    return this.http.post<ILexicalFunction[]>(requestUrl, updatePayload, {headers: {'Content-Type': 'application/json'}});
  }


  deleteLexicalFunction(id: string): Observable<any> {
    const encodedId = encodeURIComponent(id);
    const url = `${this.DELETE_URL}?id=${encodedId}`;

    return this.http.get(url, {responseType: 'text'}) // 👈 Handle non-JSON response
      .pipe(
        map(response => {
          //console.log("🔹 Server Response:", response);
          return response; // Return raw response instead of trying to parse it as JSON
        })
      );
  }
}
