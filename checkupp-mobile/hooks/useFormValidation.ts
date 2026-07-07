import { useState, useCallback } from "react";

export interface ValidationRule<T> {
  field: keyof T;
  validator: (value: any, formData: T) => string | null;
}

export interface ValidationStatus {
  isNormal: boolean;
  issues: string[];
}

export function useFormValidation<T>(
  initialData: T,
  validationRules: ValidationRule<T>[]
) {
  const [formData, setFormData] = useState<T>(initialData);

  const updateFormData = useCallback((field: keyof T, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialData);
  }, [initialData]);

  const getValidationStatus = useCallback((): ValidationStatus => {
    const issues: string[] = [];

    validationRules.forEach((rule) => {
      const error = rule.validator(formData[rule.field], formData);
      if (error) {
        issues.push(error);
      }
    });

    return {
      isNormal: issues.length === 0,
      issues,
    };
  }, [formData, validationRules]);

  const isFormValid = useCallback(
    (requiredFields: (keyof T)[]): boolean => {
      return requiredFields.every((field) => {
        const value = formData[field];
        return value !== "" && value !== null && value !== undefined;
      });
    },
    [formData]
  );

  return {
    formData,
    updateFormData,
    resetForm,
    getValidationStatus,
    isFormValid,
  };
}
