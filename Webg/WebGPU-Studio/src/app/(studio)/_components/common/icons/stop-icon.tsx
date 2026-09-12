interface StopIconProps {
  className?: string;
  size?: number;
}

export function StopIcon({ className, size = 16 }: StopIconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      <rect x="6" y="6" width="12" height="12" />
    </svg>
  );
}
