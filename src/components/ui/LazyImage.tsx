/**
 * レイジーローディング対応画像コンポーネント
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 */

import React, { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** 画像のソースURL */
  src: string;
  /** 代替テキスト */
  alt: string;
  /** プレースホルダー画像 */
  placeholder?: string;
  /** 遅延読み込みのしきい値 */
  threshold?: number;
  /** ルートマージン */
  rootMargin?: string;
  /** エラー時のコールバック */
  onError?: () => void;
  /** 読み込み完了時のコールバック */
  onLoad?: () => void;
}

/**
 * IntersectionObserver APIを使用した画像レイジーローディング
 * Core Web Vitals LCP最適化に対応
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  threshold = 0.1,
  rootMargin = '50px',
  onError,
  onLoad,
  className = '',
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);

  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce: true, // 一度だけトリガー
  });

  // 画像がビューポートに入ったら読み込み開始
  useEffect(() => {
    if (inView && !imageSrc && !hasError) {
      setImageSrc(src);
    }
  }, [inView, src, imageSrc, hasError]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div 
      ref={ref} 
      className={`relative overflow-hidden ${className}`}
      style={style}
      {...props}
    >
      {/* プレースホルダー */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          {placeholder ? (
            <img 
              src={placeholder} 
              alt=""
              className="opacity-50 max-w-full max-h-full"
              loading="eager"
            />
          ) : (
            <div className="w-8 h-8 text-gray-400">
              <svg 
                fill="currentColor" 
                viewBox="0 0 20 20" 
                className="w-full h-full"
              >
                <path 
                  fillRule="evenodd" 
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* メイン画像 */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          style={{
            ...style,
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      )}

      {/* エラー状態 */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg 
              className="w-8 h-8 mx-auto mb-2" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            <p className="text-sm">画像を読み込めません</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;