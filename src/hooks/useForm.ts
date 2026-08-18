import { useState, useCallback, type FormEvent } from 'react';

export interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => void | Promise<void>;
}

/**
 * Custom hook for managing form field states, validation timing, and submission.
 */
export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback(
    (name: keyof T, value: unknown, currentValues: T) => {
      if (!validate) return;
      const validationErrors = validate({ ...currentValues, [name]: value });
      setErrors((prev) => {
        if (validationErrors[name]) {
          return { ...prev, [name]: validationErrors[name] };
        } else {
          const rest = { ...prev };
          delete rest[name];
          return rest;
        }
      });
    },
    [validate],
  );

  const setFieldValue = useCallback(
    (name: keyof T, value: unknown) => {
      setValues((prev) => {
        const nextValues = { ...prev, [name]: value };
        if (touched[name]) {
          validateField(name, value, nextValues);
        }
        return nextValues;
      });
    },
    [touched, validateField],
  );

  const handleBlur = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      validateField(name, values[name], values);
    },
    [values, validateField],
  );

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();

      const touchedAll: Partial<Record<keyof T, boolean>> = {};
      Object.keys(values).forEach((key) => {
        (touchedAll as Record<string, boolean>)[key] = true;
      });
      setTouched(touchedAll);

      const validationErrors = validate ? validate(values) : {};
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length === 0) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // Accessibility: focus first invalid element
        const firstInvalidName = Object.keys(validationErrors)[0];
        const element = document.getElementsByName(firstInvalidName)[0];
        if (element) {
          element.focus();
        }
      }
    },
    [values, validate, onSubmit],
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setFieldValue,
    handleBlur,
    handleSubmit,
    resetForm,
    setErrors,
  };
}
