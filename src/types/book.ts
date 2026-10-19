export interface Book {
  id: number;
  title: string;
  author: string;
  subjects: string[];
  downloads: number;
  cover: string;
  textUrl: string;
  htmlUrl: string;
  epubUrl: string | null;
}

export type ReaderMode = 'chapter' | 'page';

export interface ReaderSection {
  title: string;
  paras: string[];
}

export interface ReaderModel {
  mode: ReaderMode;
  sections: ReaderSection[];
}

export interface ShelfItem {
  id: number;
  title: string;
  author: string;
  addedAt: number;
}

export type ReaderTheme = 'paper' | 'white' | 'night';
export type ReaderFamily = 'serif' | 'sans';
export type ReaderMargin = 0 | 1 | 2;

export interface ReaderSettings {
  theme: ReaderTheme;
  family: ReaderFamily;
  size: number;
  margin: ReaderMargin;
}

export interface ReaderPosition {
  index: number;
  frac: number;
  at: number;
}
