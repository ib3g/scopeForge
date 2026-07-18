"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function SelectField({ value, onValueChange, options, label, ariaLabel, placeholder, disabled, size = "default", tone = "default", className = "" }: {
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: "compact" | "default";
  tone?: "default" | "included" | "optional" | "excluded" | "deferred";
  className?: string;
}) {
  return <div className={`select-field ${className}`}>
    {label && <span className="field-label">{label}</span>}
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger className={`select-trigger select-${size} select-tone-${tone}`} aria-label={ariaLabel ?? label}>
        <SelectPrimitive.Value placeholder={placeholder}/>
        <SelectPrimitive.Icon className="select-chevron"><ChevronDown size={15}/></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={6} collisionPadding={12} className="select-content">
          <SelectPrimitive.ScrollUpButton className="select-scroll"><ChevronUp size={14}/></SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="select-viewport">
            {options.map((option) => <SelectPrimitive.Item className="select-item" value={option.value} disabled={option.disabled} key={option.value}>
              <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              <SelectPrimitive.ItemIndicator className="select-check"><Check size={14}/></SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>)}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="select-scroll"><ChevronDown size={14}/></SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  </div>;
}
