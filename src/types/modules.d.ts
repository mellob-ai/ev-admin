declare module 'qrcode' {
  export function toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
  export function toCanvas(canvas: HTMLCanvasElement, text: string, options?: Record<string, unknown>): Promise<void>;
  export function toString(text: string, options?: Record<string, unknown>): Promise<string>;
}

declare module 'open-location-code' {
  export function encode(latitude: number, longitude: number, codeLength?: number): string;
  export function decode(code: string): { latitudeCenter: number; longitudeCenter: number; latitudeLo: number; longitudeLo: number; latitudeHi: number; longitudeHi: number; codeLength: number };
  export function isFull(code: string): boolean;
  export function isShort(code: string): boolean;
  export function isValid(code: string): boolean;
}

declare module 'dompurify' {
  const DOMPurify: {
    sanitize(html: string, config?: Record<string, unknown>): string;
  };
  export default DOMPurify;
}
