import React from 'react';
import { Select } from 'antd';

export interface Option {
  value: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasWarning?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "-- Chọn --",
  className = "",
  hasWarning = false
}) => {
  const groupedOptions: Record<string, Option[]> = {};
  const ungroupedOptions: Option[] = [];
  
  options.forEach(o => {
    if (o.group) {
      if (!groupedOptions[o.group]) groupedOptions[o.group] = [];
      groupedOptions[o.group].push(o);
    } else {
      ungroupedOptions.push(o);
    }
  });

  const antdOptions = [
    ...ungroupedOptions,
    ...Object.entries(groupedOptions).map(([group, groupOpts]) => ({
      label: group,
      options: groupOpts
    }))
  ];

  return (
    <Select
      showSearch
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      status={hasWarning ? "warning" : undefined}
      options={antdOptions}
      filterOption={(input, option) =>
        (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
    />
  );
};
