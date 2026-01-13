import { Buffer } from 'buffer';
import * as process from 'process';

declare global {
  interface Window {
    global: Window;
    Buffer: typeof Buffer;
    process: typeof process;
  }

  var global: Window;
  var Buffer: typeof Buffer;
  var process: typeof process;
}

export {};

