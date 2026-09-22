export interface IMorphologyTV {
  trait: string;
  value: string;
}
export interface Ilabel{
  propertyID : string;
  propertyValue : string;
}

export interface IForms {
  creator: string | null;
  lastUpdate: string | null;
  creationDate: string | null;
  confidence: number;
  morphology: IMorphologyTV[];
  inheritedMorphology: IMorphologyTV[];
  type: string;
  lexicalEntryLabel : string;
  language : string;
  label: Ilabel[];
  note: string;
  phoneticRep: string;
  form: string;
  pos: string;
}
