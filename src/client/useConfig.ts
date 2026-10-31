import { useEffect, useState } from "react";
import { DEFAULT_CONFIG, EventConfig } from "../shared/types";
import { api } from "./api";

export function useConfig() {
  const [config, setConfig] = useState<EventConfig | null>(null);
  useEffect(() => {
    api.config().then(setConfig).catch(() => setConfig(DEFAULT_CONFIG));
  }, []);
  useEffect(() => {
    if (config) document.body.style.background = config.pageColor;
  }, [config]);
  return [config, setConfig] as const;
}
