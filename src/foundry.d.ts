// Minimal ambient declarations. Swap for foundry-vtt-types once the API surface grows.
declare const game: any;
declare const Hooks: any;
declare const foundry: any;
declare const ui: any;
declare const canvas: any;
declare const CONFIG: any;
declare const TokenDocument: any;
declare function fromUuidSync(uuid: string, options?: { strict?: boolean }): any;
declare function getDocumentClass(name: string): any;
declare function fromUuid(uuid: string): Promise<any>;
