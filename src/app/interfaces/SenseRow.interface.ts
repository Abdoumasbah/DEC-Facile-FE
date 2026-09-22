export interface ISenseRow {
  index?: number;

  definition?: string;

  levelI?: string;   // I, II, III
  level1?: number;   // 1, 2, 3
  levelA?: string;   // a, b, c

  isContainer?: boolean;
  levelType?: 'I' | '1';
  children?: ISenseRow[];
}
