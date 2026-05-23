interface ServiceClassificationBannerProps {
  classification: 'revenue' | 'overhead' | 'none';
  className?: string;
}

export function ServiceClassificationBanner({ classification, className = "" }: ServiceClassificationBannerProps) {
  if (classification === 'none') {
    return null;
  }

  const bannerConfig = {
    revenue: {
      color: 'bg-green-600',
      text: 'REVENUE',
      textColor: 'text-white'
    },
    overhead: {
      color: 'bg-red-600', 
      text: 'OVERHEAD',
      textColor: 'text-white'
    }
  };

  const config = bannerConfig[classification];

  return (
    <div className={`absolute top-0 left-0 z-10 overflow-hidden ${className}`}>
      <div 
        className={`${config.color} ${config.textColor} px-6 py-2 text-xs font-bold tracking-wider transform -rotate-45 shadow-lg`}
        style={{
          transformOrigin: '0 0',
          minWidth: '140px',
          textAlign: 'center',
          position: 'absolute',
          top: '20px',
          left: '-35px'
        }}
      >
        {config.text}
      </div>
    </div>
  );
}