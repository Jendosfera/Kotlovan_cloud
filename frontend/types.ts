export interface CommentCircle {
  id: string;
  x: number; // coordinates relative to raw image pixel dimensions
  y: number;
  radius: number; // drawing units radius
  title: string;
  text: string;
  createdAt: number;
}

export interface CellData {
  row: number;
  col: number;
  title: string;
  imageFileName: string;
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  customPosition: boolean; // "Свое положение"
  commonPoint?: { x: number; y: number }; // "Общая точка"
  viewport?: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  comments: CommentCircle[];
}

export interface BlueprintArray {
  id: string;
  name: string;
  rows: number;
  cols: number;
  createdAt: number;
  updatedAt: number;
  cells: { [key: string]: CellData }; // key format: "r_c"
  lastViewedCell?: { row: number; col: number };
  globalScale?: number;
  globalOffsetX?: number;
  globalOffsetY?: number;
}

export enum EyeDisplayMode {
  STANDARD = 'STANDARD', // Half-closed eye, normal saved circle sizes
  BLINKING = 'BLINKING', // Open eye, contracted pupil, blinking circles
  UNIFORM_SIZE = 'UNIFORM_SIZE', // Open eye, dilated pupil, uniform fixed screen size
}

export interface ViewerUISettings {
  iconScale: number; // x0.1 to x3.0
  iconOpacity: number; // 0.1 to 1.0 (10% to 100%)
}

export type AppScreen =
  | 'MAIN_MENU'
  | 'CREATE_ARRAY'
  | 'ARRAY_BUILDER'
  | 'CELL_EDITOR'
  | 'VIEWER';
