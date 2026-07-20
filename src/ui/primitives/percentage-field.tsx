"use client";

import { useEffect, useId, useRef, useState } from "react";

function formatPercentage(rate: number) {
  return String(Number((rate * 100).toFixed(2)));
}

export function PercentageField({
  value,
  onValueChange,
  label,
  ariaLabel,
  help,
  disabled = false,
  compact = false,
}: {
  value: number;
  onValueChange: (rate: number) => void;
  label: string;
  ariaLabel?: string;
  help?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const focused = useRef(false);
  const helpId = useId();
  const [draft, setDraft] = useState(() => formatPercentage(value));

  useEffect(() => {
    if (!focused.current) setDraft(formatPercentage(value));
  }, [value]);

  const commit = (raw: string) => {
    const percentage = Number(raw);
    if (!Number.isFinite(percentage)) {
      setDraft(formatPercentage(value));
      return;
    }
    const normalized = Math.min(100, Math.max(0, percentage));
    setDraft(String(normalized));
    onValueChange(normalized / 100);
  };

  return (
    <label className={`field percentage-field${compact ? " percentage-field-compact" : ""}`}>
      <span className="field-label">{label}</span>
      <span className="percentage-control">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          step="0.5"
          value={draft}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          aria-describedby={help ? helpId : undefined}
          onFocus={() => { focused.current = true; }}
          onChange={(event) => {
            const raw = event.target.value;
            setDraft(raw);
            if (raw !== "" && !raw.endsWith(".")) {
              const percentage = Number(raw);
              if (Number.isFinite(percentage) && percentage >= 0 && percentage <= 100) {
                onValueChange(percentage / 100);
              }
            }
          }}
          onBlur={(event) => {
            focused.current = false;
            commit(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <span aria-hidden="true">%</span>
      </span>
      {help && <small id={helpId} className="field-help">{help}</small>}
    </label>
  );
}
