export interface OutputImage {
  id: number;
  src: string;
  name: string;
}

export interface RecordState {
  rrn: string;
  exercise_number: string;
  date: string;
  title: string;
  aim: string;
  algorithm: string;
  source_code: string;
  output: string;
  output_images: OutputImage[];
  review_questions: string;
  review_questions_enabled: boolean;
  result: string;
}

export interface WatermarkOptions {
  font: string;
  size: number;
  rotation: number;
  opacity: number;
  color: string;
}

export interface PageObject {
  main: string;
  result: string;
}

export const DEFAULT_RECORD: RecordState = {
  rrn: "",
  exercise_number: "",
  date: "",
  title: "",
  aim: "",
  algorithm: "",
  source_code: "",
  output: "",
  output_images: [],
  review_questions: "",
  review_questions_enabled: true,
  result: "",
};

export const DEFAULT_WATERMARK: WatermarkOptions = {
  font: "Arial, sans-serif",
  size: 72,
  rotation: -45,
  opacity: 10,
  color: "#6b7280",
};
