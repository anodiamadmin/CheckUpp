import React, { useState } from "react";
import DatePickerInput from "./DatePickerInput";
import DatePickerModal from "./DatePickerModal";

interface DatePickerProps {
  label: string;
  value: Date;
  onDateChange: (date: Date) => void;
  placeholder?: string;
  required?: boolean;
  editable?: boolean;
  title?: string;
  subtitle?: string;
  maxDate?: Date;
  minDate?: Date;
  dateFormat?: (date: Date) => string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onDateChange,
  placeholder = "Select date",
  required = false,
  editable = true,
  title = "Select Date",
  subtitle = "Choose",
  maxDate = new Date(),
  minDate,
  dateFormat = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleDateConfirm = (date: Date) => {
    onDateChange(date);
    setShowModal(false);
  };

  return (
    <>
      <DatePickerInput
        label={label}
        value={dateFormat(value)}
        onPress={() => setShowModal(true)}
        placeholder={placeholder}
        required={required}
        editable={editable}
      />

      <DatePickerModal
        visible={showModal}
        currentDate={value}
        onClose={() => setShowModal(false)}
        onConfirm={handleDateConfirm}
        title={title}
        subtitle={subtitle}
        maxDate={maxDate}
        minDate={minDate}
      />
    </>
  );
};

export default DatePicker;
