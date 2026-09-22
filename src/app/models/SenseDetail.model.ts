import { ISenseDetail } from '../interfaces/ISenseDetail.interface';
import { ILinkElement } from '../interfaces/ILinkElement.interface';

export class SenseDetail implements ISenseDetail {
  creator: string = '';
  lastUpdate: string = '';
  creationDate: string = '';
  confidence: number = 0;
  sense: string = '';
  lexicalEntry: string = '';
  lexicalEntryLabel: string = '';
  definition: Array<{ propertyID: string; propertyValue: string }> = [];
  usage: string = '';
  topic: string = '';
  links: Array<{ type: string; elements: ILinkElement[] }> = [];
  note: string = '';
  concept: string = '';
  language: string= '';
  description: string | null = null;
  explanation: string | null = null;
  gloss: string | null = null;
  senseExample: string | null = null;
  senseTranslation: string | null = null;

  // Convert JSON to SenseDetail instance
  static fromJson(json: any): SenseDetail {
    return Object.assign(new SenseDetail(), json);
  }

  // Convert instance back to JSON
  toJson(): any {
    return {
      creator: this.creator,
      lastUpdate: this.lastUpdate,
      creationDate: this.creationDate,
      confidence: this.confidence,
      sense: this.sense,
      lexicalEntry: this.lexicalEntry,
      lexicalEntryLabel: this.lexicalEntryLabel,
      definition: this.definition.map((def) => ({ ...def })),
      usage: this.usage,
      topic: this.topic,
      links: this.links.map((link) => ({
        type: link.type,
        elements: link.elements.map((el) => ({ ...el })),
      })),
      note: this.note,
      concept: this.concept,
      language: this.language,
      description: this.description,
      explanation: this.explanation,
      gloss: this.gloss,
      senseExample: this.senseExample,
      senseTranslation: this.senseTranslation,
    };
  }
}
