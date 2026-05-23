import logoImage from '@assets/Color_logo_-_no_background_1767370534671.png';

type LogoProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16'
  };

  return (
    <div className={`logo-container ${className}`}>
      <img 
        src={logoImage} 
        alt="Apollo DroneWorks" 
        className={`${sizeClasses[size]} object-contain transition-all duration-300`}
      />
    </div>
  );
}

export default Logo;