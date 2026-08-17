import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1 text-sm text-text-muted ${className}`}>
      <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1" aria-label="Home">
        <Home size={14} />
      </Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={14} className="text-border flex-shrink-0" />
          {item.to && idx < items.length - 1 ? (
            <Link to={item.to} className="hover:text-primary transition-colors truncate max-w-[180px]">
              {item.label}
            </Link>
          ) : (
            <span className="text-text font-medium truncate max-w-[200px]" aria-current="page">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
