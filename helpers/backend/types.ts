import type { RouteFn } from "faster";
import type { JSONObject, JSONValue } from "@helpers/types.ts";

export interface BackendComponent {
  before?: RouteFn[];
  after?: (props: JSONObject) => void | Promise<void>;
}
