import { cn } from '@/lib/utils';

type BrandLogoProps = {
    variant?: 'full' | 'mark';
    className?: string;
    alt?: string;
};

export default function BrandLogo({
    variant = 'mark',
    className,
    alt = 'Planivo',
}: BrandLogoProps) {
    return (
        <img
            src={
                variant === 'full'
                    ? '/assets/images/planivo-logo.png'
                    : '/assets/images/planivo-mark.png'
            }
            alt={alt}
            className={cn('object-contain', className)}
        />
    );
}
