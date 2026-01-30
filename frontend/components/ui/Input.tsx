import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  showPasswordToggle,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = props.type === "password";
  const inputType =
    showPasswordToggle && isPasswordField
      ? showPassword
        ? "text"
        : "password"
      : props.type;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-800 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={cn(
            "w-full px-4 py-2.5 bg-white border border-cream-300 rounded-lg",
            "text-gray-900 placeholder-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent",
            "transition-colors shadow-sm",
            showPasswordToggle && isPasswordField && "pr-11",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
          type={inputType}
        />
        {showPasswordToggle && isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <FiEyeOff className="w-5 h-5" />
            ) : (
              <FiEye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
