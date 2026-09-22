import {IECDMeaning} from '../interfaces/IECDMeaning.interface';

export class ECDMeaningModel implements IECDMeaning {
  creator: string = '';
  lastUpdate: string = '';
  creationDate: string = '';
  confidence: number = -1;
  pos: string[] = [];
  label: string = '';
  senseLabel: string = '';
  note: string = '';
  language: string = '';
  dictionaryEntry: string = '';
  definition: string = '';

  static fromJson(json: any): ECDMeaningModel {
    return Object.assign(new ECDMeaningModel(), json);
  }

  toJson(): IECDMeaning {
    return {
      creator: this.creator,
      lastUpdate: this.lastUpdate,
      creationDate: this.creationDate,
      confidence: this.confidence,
      pos: this.pos,
      label: this.label,
      senseLabel: this.senseLabel,
      note: this.note,
      language: this.language,
      dictionaryEntry: this.dictionaryEntry,
      definition: this.definition
    };
  }
}
