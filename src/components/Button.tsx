import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

type ButtonVariant =
  | "primary"
  | "danger"
  | "outline"
  | "filled"
  | "ghost";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = "",
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const isDisabled = disabled || loading;

  /*
   * ---------------------------------------------------------
   * SIZE
   * ---------------------------------------------------------
   */
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-10 px-4";

      case "lg":
        return "h-14 px-6";

      case "md":
      default:
        return "h-12 px-5";
    }
  };

  /*
   * ---------------------------------------------------------
   * CONTAINER / BACKGROUND
   * ---------------------------------------------------------
   */
  const getVariantClasses = () => {
    const baseClasses =
      "rounded-lg items-center justify-center flex-row";

    switch (variant) {
      case "primary":
        return `${baseClasses} bg-primary-600`;

      case "danger":
        return `${baseClasses} bg-red-500`;

      case "outline":
        return `${baseClasses} border-2 ${isDark
            ? "border-neutral-600"
            : "border-neutral-300"
          }`;

      case "filled":
        return `${baseClasses} ${isDark
            ? "bg-neutral-800"
            : "bg-neutral-900"
          }`;

      case "ghost":
        return `${baseClasses}`;

      default:
        return `${baseClasses} bg-primary-600`;
    }
  };

  /*
   * ---------------------------------------------------------
   * TEXT SIZE
   * ---------------------------------------------------------
   */
  const getTextClasses = () => {
    const baseClasses = "font-semibold";

    switch (size) {
      case "sm":
        return `${baseClasses} text-sm`;

      case "lg":
        return `${baseClasses} text-lg`;

      case "md":
      default:
        return `${baseClasses} text-base`;
    }
  };

  /*
   * ---------------------------------------------------------
   * TEXT COLOR
   * ---------------------------------------------------------
   *
   * Important:
   *
   * Disabled primary buttons remain WHITE.
   * We don't use text-neutral-400 here because that can
   * become unreadable against primary-600.
   */
  const getTextColor = () => {
    switch (variant) {
      case "outline":
      case "ghost":
        return isDark
          ? "text-neutral-50"
          : "text-neutral-900";

      case "primary":
      case "danger":
      case "filled":
      default:
        return "text-white";
    }
  };

  /*
   * ---------------------------------------------------------
   * ACTIVITY INDICATOR COLOR
   * ---------------------------------------------------------
   */
  const getLoaderColor = () => {
    switch (variant) {
      case "outline":
      case "ghost":
        return isDark ? "#fafafa" : "#171717";

      case "primary":
      case "danger":
      case "filled":
      default:
        return "#ffffff";
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isDisabled}
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${fullWidth ? "w-full" : ""}
        ${isDisabled ? "opacity-60" : ""}
        ${className}
      `}
      style={style}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getLoaderColor()}
        />
      ) : (
        <>
          {leftIcon && leftIcon}

          <Text
            className={`${getTextClasses()} ${getTextColor()}`}
            style={textStyle}
          >
            {children}
          </Text>

          {rightIcon && rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}