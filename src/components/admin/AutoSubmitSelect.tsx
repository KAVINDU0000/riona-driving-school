"use client";

import { SELECT_FIELD } from "@/components/admin/admin-ui";

/**
 * A filter dropdown that applies its choice straight away: choosing an option submits the surrounding GET form.
 * Without JavaScript, the form's own submit button still applies it.
 */
export default function AutoSubmitSelect({
  id,
  name,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className={`${SELECT_FIELD} h-11`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
