import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {

        // Manual variant handling since we don't have cva
        let variantClass = ""
        switch (variant) {
            case "default": variantClass = "bg-primary text-primary-foreground shadow hover:bg-primary/90"; break;
            case "destructive": variantClass = "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"; break;
            case "outline": variantClass = "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"; break;
            case "secondary": variantClass = "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80"; break;
            case "ghost": variantClass = "hover:bg-accent hover:text-accent-foreground"; break;
            case "link": variantClass = "text-primary underline-offset-4 hover:underline"; break;
        }

        let sizeClass = ""
        switch (size) {
            case "default": sizeClass = "h-9 px-4 py-2"; break;
            case "sm": sizeClass = "h-8 rounded-md px-3 text-xs"; break;
            case "lg": sizeClass = "h-10 rounded-md px-8"; break;
            case "icon": sizeClass = "h-9 w-9"; break;
        }

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    variantClass,
                    sizeClass,
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
