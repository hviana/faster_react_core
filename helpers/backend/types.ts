import { type RouteFn } from "faster";
export interface BackendComponent {
  before?: RouteFn[];
  after?: (props: Record<any, any>) => void | Promise<void>;
}
