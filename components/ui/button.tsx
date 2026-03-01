
import React, {
  forwardRef,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ButtonHTMLAttributes,
} from "react";
import clsx from "clsx";

/**
 * Only allow elements that accept className.
 */

type AsChildElement = ReactElement<React.HTMLAttributes<HTMLElement>>;

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: "primary" | "secondary";
};

/**
 * Discriminated union:
 * - If asChild = true → children must support className
 * - Otherwise → normal button children
 */
type ButtonAsChildProps = BaseProps & {
  asChild: true;
  children: AsChildElement;
};

type ButtonNormalProps = BaseProps & {
  asChild?: false;
  children?: React.ReactNode;
};

type ButtonProps = ButtonAsChildProps | ButtonNormalProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", asChild = false, disabled, ...props },
    ref
  ) => {
    const classes = clsx(
      "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition",
      variant === "primary" && "bg-black text-white",
      variant === "secondary" && "bg-white text-black",
      disabled && "opacity-50 pointer-events-none",
      className
    );


    if (asChild) {
      const child = props.children;

      if (isValidElement(child)) {
        const typedChild = child as AsChildElement;
        return cloneElement(typedChild, {
          className: clsx(typedChild.props.className, classes),
          "aria-disabled": disabled ? true : undefined,
        });
      }

      return null;
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
