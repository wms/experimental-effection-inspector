import { ChangeEventHandler, useCallback } from "react";
import { SerializedEvent } from "./types";

export const Scrubber = ({ events, value, onChange }: Props) => {
  const onSliderChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      onChange?.(parseInt(event.target.value));
    },
    []
  );
  return (
    <input
      type="range"
      min={0}
      max={events.length}
      onChange={onSliderChange}
      value={value}
    />
  );
};

export type Props = {
  events: SerializedEvent[];
  value: number;
  onChange?: (index: number) => void;
};
