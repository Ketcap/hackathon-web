export interface ImageRun {
  id: string;
  modelId: string;
  parameters: Record<string, string>;
  output?: string; // url of the image
}

export interface ImageModel {
  id: string;
  name: string;
  options: Record<string, string>;
}
