'use client';

export default function PageContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`max-w-[640px] mx-auto w-full px-4 ${className}`}>
      {children}
    </div>
  );
}
