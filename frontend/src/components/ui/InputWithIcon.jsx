import React from 'react';
import { cn } from "../../lib/utils";

const InputWithIcon = React.forwardRef(({ className, icon, ...props }, ref) => {
  return (
    <div
      className={cn(
        "flex items-center h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
    >
      {icon && <i className={`fas ${icon} text-gray-400`}></i>}
      <input
        className="w-full p-2 bg-transparent border-0 h-full focus:outline-none placeholder:text-muted-foreground"
        ref={ref}
        {...props}
      />
    </div>
  );
});
InputWithIcon.displayName = "InputWithIcon";

export { InputWithIcon };
