export declare const toString: (value: string | string[]) => string;
export declare const ensureDirExists: (dir: string) => void;
export declare const hasPrototypeProperty: (obj: any, name: string) => boolean;
export declare const hasProperty: (obj: any, prop: PropertyKey) => boolean;
export declare const serialize: (obj: any, callback?: ((this: any, key: string, value: any) => any) | undefined, space?: number) => string;
export declare const deserialize: (obj: string, callback?: ((this: any, key: string, value: any) => any) | undefined) => any;
export declare const isBlankString: (value: string) => boolean;
export declare const getDataByKeys: <T>(obj: T, keys: PropertyKey[]) => any;
export declare const setDataByKeys: <T>(obj: T, value: any, keys: PropertyKey[]) => void;
//# sourceMappingURL=utils.d.ts.map