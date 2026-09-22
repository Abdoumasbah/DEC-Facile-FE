import {IPropertyValues} from '../interfaces/morphology.interface';

export class MorphologyModel {
  propertyId: string = "";
  propertyLabel: string = "";
  propertyDescription: string = "";
  propertyValues: IPropertyValues[] = [];


  static fromJson(json: any): MorphologyModel {
    const morpho = new MorphologyModel();
    morpho.propertyId = json.propertyId;
    morpho.propertyLabel = json.propertyLabel;
    morpho.propertyDescription = json.propertyDescription;
    morpho.propertyValues = json.propertyValues || [];
    return morpho;
  }

  // Sérialise une instance de Morphology en JSON
  toJson(): any {
    return {
      propertyId: this.propertyId,
      propertyLabel: this.propertyLabel,
      propertyDescription: this.propertyDescription,
      propertyValues: this.propertyValues
    };
  }
}
