import React from 'react';

export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children && <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">{children}</div>}
    </div>
  );
}
