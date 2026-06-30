import React, { useState } from "react";

type SpinnerSize = "sm" | "md" | "lg";

type ImageWithLoaderProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  /**
   * Classes applied to the wrapping element. Use this to control layout
   * (e.g. `block w-full h-full`) so the loading overlay matches the space
   * the image will occupy once loaded.
   */
  wrapperClassName?: string;
  spinnerSize?: SpinnerSize;
  /** Disable the overlay (still fades the image in). */
  showSpinner?: boolean;
};

const SPINNER_CLASSES: Record<SpinnerSize, string> = {
  sm: "w-3.5 h-3.5 border",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-2",
};

const ImageWithLoader: React.FC<ImageWithLoaderProps> = ({
  className = "",
  wrapperClassName = "inline-block",
  spinnerSize = "md",
  showSpinner = true,
  onLoad,
  onError,
  ...imgProps
}) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const visible = loaded && !errored;

  return (
    <span className={`relative overflow-hidden ${wrapperClassName}`}>
      <img
        {...imgProps}
        className={`${className} transition-opacity duration-500 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setErrored(true);
          setLoaded(true);
          onError?.(e);
        }}
      />
      {!loaded && showSpinner && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse"
        >
          <span
            className={`${SPINNER_CLASSES[spinnerSize]} border-gray-300 border-t-gray-800 rounded-full animate-spin`}
          />
        </span>
      )}
    </span>
  );
};

export default ImageWithLoader;
