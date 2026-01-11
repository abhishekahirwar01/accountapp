"use client"

import React, { createContext, useContext, forwardRef, useId } from "react"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  FormProvider,
  useFormContext,
} from "react-hook-form"
import { Text, View, TextInput, TouchableOpacity } from "react-native"

// Helper function to merge styles
const cn = (...classes) => {
  return classes.filter(Boolean).join(" ")
}

const Form = FormProvider

const FormFieldContext = createContext({})

const FormField = (props) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

const FormItemContext = createContext({})

const FormItem = forwardRef(({ style, children, ...props }, ref) => {
  const id = useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <View ref={ref} style={[{ marginBottom: 16 }, style]} {...props}>
        {children}
      </View>
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = forwardRef(({ style, children, ...props }, ref) => {
  const { error } = useFormField()

  return (
    <Text
      ref={ref}
      style={[
        {
          fontSize: 14,
          fontWeight: "500",
          color: "#374151",
          marginBottom: 4,
        },
        error && { color: "#dc2626" },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = forwardRef(({ children, ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      accessibilityDescribedBy={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      accessibilityInvalid={!!error}
      {...props}
    >
      {children}
    </Slot>
  )
})
FormControl.displayName = "FormControl"

const FormDescription = forwardRef(({ style, children, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <Text
      ref={ref}
      id={formDescriptionId}
      style={[
        {
          fontSize: 12,
          color: "#6b7280",
          marginTop: 4,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = forwardRef(({ style, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : children

  if (!body) {
    return null
  }

  return (
    <Text
      ref={ref}
      id={formMessageId}
      style={[
        {
          fontSize: 12,
          fontWeight: "500",
          color: "#dc2626",
          marginTop: 4,
        },
        style,
      ]}
      {...props}
    >
      {body}
    </Text>
  )
})
FormMessage.displayName = "FormMessage"

// Additional React Native specific form components

const FormInput = forwardRef(({ style, ...props }, ref) => {
  const { error } = useFormField()

  return (
    <TextInput
      ref={ref}
      style={[
        {
          height: 40,
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 6,
          paddingHorizontal: 12,
          fontSize: 14,
          backgroundColor: "white",
        },
        error && { borderColor: "#dc2626" },
        style,
      ]}
      placeholderTextColor="#9ca3af"
      {...props}
    />
  )
})
FormInput.displayName = "FormInput"

const FormSelect = forwardRef(({ style, children, ...props }, ref) => {
  const { error } = useFormField()

  return (
    <TouchableOpacity
      ref={ref}
      style={[
        {
          height: 40,
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 6,
          paddingHorizontal: 12,
          justifyContent: "center",
          backgroundColor: "white",
        },
        error && { borderColor: "#dc2626" },
        style,
      ]}
      {...props}
    >
      <Text
        style={{
          fontSize: 14,
          color: props.value ? "#374151" : "#9ca3af",
        }}
      >
        {props.value || props.placeholder || "Select an option"}
      </Text>
    </TouchableOpacity>
  )
})
FormSelect.displayName = "FormSelect"

const FormTextArea = forwardRef(({ style, ...props }, ref) => {
  const { error } = useFormField()

  return (
    <TextInput
      ref={ref}
      multiline
      numberOfLines={4}
      style={[
        {
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 14,
          backgroundColor: "white",
          textAlignVertical: "top",
        },
        error && { borderColor: "#dc2626" },
        style,
      ]}
      placeholderTextColor="#9ca3af"
      {...props}
    />
  )
})
FormTextArea.displayName = "FormTextArea"

const FormCheckbox = forwardRef(({ style, children, value, onChange, ...props }, ref) => {
  const { error } = useFormField()

  return (
    <TouchableOpacity
      ref={ref}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        },
        style,
      ]}
      onPress={() => onChange(!value)}
      {...props}
    >
      <View
        style={[
          {
            width: 18,
            height: 18,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: "#d1d5db",
            marginRight: 8,
            alignItems: "center",
            justifyContent: "center",
          },
          error && { borderColor: "#dc2626" },
          value && { backgroundColor: "#2563eb", borderColor: "#2563eb" },
        ]}
      >
        {value && (
          <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
            ✓
          </Text>
        )}
      </View>
      {children && (
        <Text
          style={{
            fontSize: 14,
            color: "#374151",
          }}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  )
})
FormCheckbox.displayName = "FormCheckbox"

const FormRadio = forwardRef(({ style, children, value, checked, onChange, ...props }, ref) => {
  const { error } = useFormField()

  return (
    <TouchableOpacity
      ref={ref}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        },
        style,
      ]}
      onPress={() => onChange(value)}
      {...props}
    >
      <View
        style={[
          {
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: "#d1d5db",
            marginRight: 8,
            alignItems: "center",
            justifyContent: "center",
          },
          error && { borderColor: "#dc2626" },
          checked && { borderColor: "#2563eb" },
        ]}
      >
        {checked && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#2563eb",
            }}
          />
        )}
      </View>
      {children && (
        <Text
          style={{
            fontSize: 14,
            color: "#374151",
          }}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  )
})
FormRadio.displayName = "FormRadio"

const FormFieldWrapper = ({ children, label, description, error, style }) => {
  return (
    <FormItem style={style}>
      {label && <FormLabel>{label}</FormLabel>}
      {children}
      {description && <FormDescription>{description}</FormDescription>}
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  )
}
FormFieldWrapper.displayName = "FormFieldWrapper"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormInput,
  FormSelect,
  FormTextArea,
  FormCheckbox,
  FormRadio,
  FormFieldWrapper,
}