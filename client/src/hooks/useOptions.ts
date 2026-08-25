import { createContext, useContext } from "react";
import type { Options } from "../types";

export const OptionsContext = createContext<Options | null>(null);

export function useOptions(): Options {
  const ctx = useContext(OptionsContext);
  if (!ctx) throw new Error("useOptions doit être utilisé sous <OptionsProvider>");
  return ctx;
}
