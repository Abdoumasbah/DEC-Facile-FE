export interface IPropertyValues {
  valueId: string;
  valueLabel: string;
  valueDescription: string;
}

export interface IMorphology {
  propertyId: string;
  propertyLabel: string ;
  propertyDescription: string ;
  morphology: IPropertyValues[];

}
