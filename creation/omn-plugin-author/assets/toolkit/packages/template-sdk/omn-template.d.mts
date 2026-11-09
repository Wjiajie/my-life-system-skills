export interface TemplateBridge {
  postMessage(message: string): void;
  onmessage: ((event: { data: string }) => void) | null;
}
export interface TemplateCallbacks {
  onRender(data: unknown): void;
  onError(code: string): void;
}
export interface TemplateClient {
  submitInitialization(value: unknown): Promise<void>;
  activate(): Promise<void>;
  close(): Promise<void>;
}
export function createTemplateClient(input: TemplateCallbacks & { origin: string; bridge: TemplateBridge }): TemplateClient;
export function connectTemplate(input: TemplateCallbacks): TemplateClient;
