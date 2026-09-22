import { ILinkElement } from './ILinkElement.interface';

export interface ISenseDetail {
  creator: string;
  lastUpdate: string;
  creationDate: string;
  confidence: number;
  sense: string;
  lexicalEntry: string;
  lexicalEntryLabel: string;
  definition: Array<{
    propertyID: string;
    propertyValue: string;
  }>;
  usage: string;
  topic: string;
  links: Array<{
    type: string;
    elements: ILinkElement[];
  }>;
  note: string;
  concept: string;
  language: string;
  description: string | null;
  explanation: string | null;
  gloss: string | null;
  senseExample: string | null;
  senseTranslation: string | null;
}
