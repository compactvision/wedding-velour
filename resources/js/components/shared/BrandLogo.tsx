import { cn } from '@/lib/utils';

type BrandLogoProps = {
    variant?: 'full' | 'mark';
    className?: string;
    alt?: string;
};

export default function BrandLogo({
    variant = 'mark',
    className,
    alt = 'Wedding Velour',
}: BrandLogoProps) {
    return (
        <img
            src={
                variant === 'full'
                    ? '/assets/images/logo.png'
                    : '/assets/images/logo-without-brand.png'
            }
            alt={alt}
            className={cn('object-contain', className)}
        />
    );
}
