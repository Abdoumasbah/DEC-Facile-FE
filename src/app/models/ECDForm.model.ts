import {IMorphologyTV} from '../interfaces/forms.interface';

export class ECDForm {
  creator: string = "";
  lastUpdate: string = "";
  creationDate: string = "";
  confidence: number = 0;
  morphology: IMorphologyTV[] = [];
  inheritedMorphology: IMorphologyTV[] = [];
  type: string = "";
  label: string = "";
  note: string = "";
  phoneticRep: string = "";
  form: string = "";
  pos: string = "";

  // Convertit un objet JSON en une instance de Sense
  static fromJson(json: any): ECDForm {
    const sense = Object.assign(new ECDForm(), json);
    sense.children = (json.children || []).map((child: any) => ECDForm.fromJson(child));
    return sense;
  }

  // Sérialise une instance de Sense en JSON
  toJson(): any {
    return {
      creator: this.creator,
      lastUpdate: this.lastUpdate,
      creationDate: this.creationDate,
      confidence: this.confidence,
      morphology: this.morphology,
      inheritedMorphology: this.inheritedMorphology,
      type: this.type,
      label: this.label,
      note: this.note,
      phoneticRep: this.phoneticRep,
      form: this.form,
      pos: this.pos
    };
  }
}
