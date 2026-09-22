export class DictEntry {
  creator: string = '';
  lastUpdate: string = '';
  creationDate: string = '';
  confidence: number = -1;
  status: string = '';
  revisor: string = '';
  pos: string[] = [];
  label: string = '';
  language: string = '';
  author: string = '';
  dictionaryEntry: string = '';
  completionDate: string = '';
  revisionDate: string = '';
  type: string[] = [];
  seeAlso: Record<string, any> = {};
  note: string ='';
  hasChildren: boolean = false;

  static fromJson(json: any): DictEntry {
    return Object.assign(new DictEntry(), json);
  }

  toJson(): any {
    return {
      creator: this.creator,
      lastUpdate: this.lastUpdate,
      creationDate: this.creationDate,
      confidence: this.confidence,
      status: this.status,
      revisor: this.revisor,
      pos: [...this.pos],
      label: this.label,
      language: this.language,
      author: this.author,
      dictionaryEntry: this.dictionaryEntry,
      completionDate: this.completionDate,
      revisionDate: this.revisionDate,
      type: [...this.type],
      seeAlso: this.seeAlso,
      note: this.note,
      hasChildren: this.hasChildren,
    };
  }
}
