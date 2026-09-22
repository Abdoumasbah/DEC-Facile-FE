export class SharedFunctionModel {

  extractLabelFromURI(uri: string): string {
    if (!uri) return ''; // Handle empty or null values
    return uri.split('#').pop() || ''; // Get the last part after #
  }

  extractLFFromURI(uri: string): string {
    if (!uri) return ''; // Handle empty or null values
    return uri.split('#LF-').pop() || ''; // Get the last part after #
  }

  extractLangFromLabel(label: string): string {
    if (!label) return ''; // Handle empty or null values
    return label.split('@')[0]; // Get the last part after #
  }
}
