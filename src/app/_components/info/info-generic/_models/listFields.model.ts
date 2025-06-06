import { Observable } from "rxjs";

export interface ListField {
    key: string;
    label: string;
    format?: (text: any) => string;
    list: any[];
    type_show?: string;
    type_list: string;
    allowCreate?: boolean;
    allowRefresh?:boolean;
    create?: (...args: any[]) => Observable<any>;
  }