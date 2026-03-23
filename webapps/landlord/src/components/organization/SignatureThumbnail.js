import { useEffect, useState } from 'react';
import { apiFetcher } from '../../utils/fetch';
import { Button } from '../../components/ui/button';
import { cn } from '../../utils';
import { LuTrash } from 'react-icons/lu';
import useTranslation from 'next-translate/useTranslation';

export default function SignatureThumbnail({
  signature,
  onRemove,
  disabled,
  className
}) {
  const { t } = useTranslation('common');
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let fetchedImageSrc;
    const fetchSignatureImage = async () => {
      const url = `/documents/signature/${encodeURIComponent(signature)}`;
      console.log('[DEBUG SignatureThumbnail] fetching signature image:', url);
      console.log('[DEBUG SignatureThumbnail] apiFetcher headers:', JSON.stringify(apiFetcher().defaults.headers?.common));
      setIsLoading(true);
      try {
        const response = await apiFetcher().get(url, {
          responseType: 'blob'
        });

        console.log('[DEBUG SignatureThumbnail] fetch success, blob size:', response.data?.size, 'type:', response.data?.type);
        // Create a blob URL for the image
        fetchedImageSrc = URL.createObjectURL(response.data);
        setImageSrc(fetchedImageSrc);
        setHasError(false);
      } catch (error) {
        console.error('[DEBUG SignatureThumbnail] fetch FAILED:', {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          message: error?.message,
          url,
          responseData: error?.response?.data
        });
        setImageSrc(null);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    console.log('[DEBUG SignatureThumbnail] useEffect, signature prop:', signature, 'typeof:', typeof signature);
    if (signature) {
      fetchSignatureImage();
    } else {
      console.log('[DEBUG SignatureThumbnail] no signature, resetting state');
      setImageSrc(null);
      setHasError(false);
      setIsLoading(false);
    }

    // Cleanup blob URL when component unmounts
    return () => {
      if (fetchedImageSrc) {
        URL.revokeObjectURL(fetchedImageSrc);
      }
    };
  }, [signature]);

  return signature ? (
    <div className={cn('space-y-2', className)}>
      <div className="text-muted-foreground text-xs">{t('Signature')}</div>
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="flex items-center justify-center w-full max-w-xs h-40 mb-2 border-dashed border-2 border-muted text-muted-foreground">
            ...
          </div>
        ) : null}
        {!isLoading && !hasError && imageSrc ? (
          <div className="w-full max-w-xs h-40 mb-2">
            <img
              src={imageSrc}
              alt={t('Current signature')}
              onError={() => setHasError(true)}
              className="object-contain w-full h-full"
            />
          </div>
        ) : null}
        {!isLoading && hasError ? (
          <div className="flex items-center justify-center w-80 h-40 mb-2 border-dashed border-2 border-muted text-destructive">
            {t('Failed to load signature image')}
          </div>
        ) : null}
        <Button
          variant="secondary"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          data-cy="removeSignatureButton"
        >
          <LuTrash className="size-4" />
        </Button>
      </div>
    </div>
  ) : null;
}
