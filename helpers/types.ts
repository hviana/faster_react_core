export type JSONObject = { [key: string]: JSONValue };

export type JSONValue =
  | null
  | string
  | number
  | boolean
  | JSONObject
  | JSONValue[];
