export interface CommentCircle {
  id: string;
  x: number; // координаты относительно пикселей исходного чертежа
  y: number;
  radius: number; // радиус в единицах чертежа
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
  cells: { [key: string]: CellData }; // ключ в формате "r_c"
  lastViewedCell?: { row: number; col: number };
  globalScale?: number;
  globalOffsetX?: number;
  globalOffsetY?: number;
}

export enum EyeDisplayMode {
  STANDARD = 'STANDARD', // Полуприкрытый глаз, исходный сохраненный размер
  BLINKING = 'BLINKING', // Открытый глаз, суженный зрачок, мерцание
  UNIFORM_SIZE = 'UNIFORM_SIZE', // Открытый глаз, расширенный зрачок, одинаковый размер
}

export interface ViewerUISettings {
  iconScale: number; // x0.1 до x3.0
  iconOpacity: number; // 0.1 до 1.0 (10% до 100%)
}

export type AppScreen =
  | 'MAIN_MENU'
  | 'ARRAY_BUILDER'
  | 'CELL_EDITOR'
  | 'VIEWER';
