export interface IDict {

  creator: string;
  lastUpdate: string;
  creationDate: string;
  confidence: number;
  status: string;
  revisor: string;
  pos: string[];
  label: string;
  language: string;
  author: string;
  dictionaryEntry: string;
  completionDate: string;
  revisionDate: string;
  type: string[];
  seeAlso: Record<string, any>;
  hasChildren: boolean;
}
