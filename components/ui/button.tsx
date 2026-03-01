import { forwardRef, isValidElement, cloneElement } from "react";
import type {
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  ReactElement,
} from "react";

type Variant = "primary" | "secondary";

/**
 * ButtonProps supports two modes:
 * 1) Normal: renders a <button>
 * 2) asChild: clones its only child (e.g. <Link /> or <a />) and injects button styles
 *
 * This avoids invalid nesting like <a><button/></a> or <button><a/></button>
 * and keeps navigation accessible and reliable.
 */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  asChild?: boolean;
};

function getButtonClassName(variant: Variant, className?: string) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  const variantStyles =
    variant === "primary"
      ? "bg-black text-white hover:bg-black/90"
      : "bg-gray-100 text-gray-900 hover:bg-gray-200";

  return `${baseStyles} ${variantStyles}${className ? ` ${className}` : ""}`;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", asChild = false, ...props }, ref) => {
    const computed = getButtonClassName(variant, className);

    if (asChild) {
      const child = props.children as ReactElement | undefined;

      if (!child || !isValidElement(child)) {
        throw new Error("Button with asChild expects a single valid React element child.");
      }

      // Remove button-only props that shouldn't go onto <a> / <Link>
      // (Next's <Link> ultimately renders an <a>)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, onClick, children, ...rest } = props;

      const childProps: AnchorHTMLAttributes<HTMLAnchorElement> = {
        ...rest,
        className: computed,
        "aria-disabled": props.disabled ? true : undefined,
      };

      return cloneElement(child, childProps);
    }

    return <button ref={ref} className={computed} {...props} />;
  }
);

Button.displayName = "Button";
