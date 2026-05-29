import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden",
    "rounded-2xl border border-transparent bg-clip-padding",
    "text-[0.9375rem] font-semibold tracking-tight whitespace-nowrap",
    "transition-[transform,box-shadow,background,border-color,filter] duration-300 ease-out",
    "outline-none select-none",
    "focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none disabled:translate-y-0 disabled:saturate-50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/25",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "[&>*]:relative [&>*]:z-[1]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "btn-primary z-0 text-primary-foreground",
          "hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.98]",
        ].join(" "),
        outline: [
          "btn-outline z-0 text-foreground",
          "hover:-translate-y-0.5 hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]",
        ].join(" "),
        secondary: [
          "btn-secondary z-0 text-secondary-foreground",
          "hover:-translate-y-0.5 active:translate-y-0",
        ].join(" "),
        ghost: [
          "font-medium text-muted-foreground shadow-none",
          "hover:bg-primary/10 hover:text-foreground hover:shadow-sm",
          "active:bg-primary/15",
        ].join(" "),
        destructive: [
          "btn-destructive z-0",
          "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
        ].join(" "),
        link: [
          "h-auto overflow-visible rounded-none border-0 p-0 font-medium text-primary shadow-none",
          "underline-offset-4 hover:underline focus-visible:ring-0",
        ].join(" "),
      },
      size: {
        default:
          "h-11 min-w-11 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-8 gap-1.5 rounded-xl px-3 text-xs font-semibold has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 rounded-xl px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 rounded-2xl px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-11 rounded-2xl",
        "icon-xs": "size-8 rounded-xl [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 rounded-xl",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    compoundVariants: [
      {
        variant: ["link", "ghost"],
        className: "hover:scale-100 active:scale-100",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
