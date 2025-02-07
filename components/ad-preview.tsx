import { useEffect, useRef, useState } from "react"

interface AdPreviewProps {
  adFile: string
  adSize: string
  className?: string
}

export function AdPreview({ adFile, adSize = "300x250", className = '' }: AdPreviewProps) {
  const adContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Add validation for adSize
  const [width, height] = (adSize || "300x250").split('x').map(dim => {
    const num = parseInt(dim, 10)
    return isNaN(num) ? 300 : num // Default to 300 if parsing fails
  })

  // Helper: get the base URL (directory) for the given file
  const getBaseHref = (file: string) => {
    try {
      const url = new URL(file, window.location.href)
      url.pathname = url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1)
      return url.toString()
    } catch (e) {
      return window.location.origin
    }
  }

  useEffect(() => {
    const loadAd = async () => {
      if (!adContainerRef.current) return

      // Create iframe if it doesn't exist
      if (!iframeRef.current) {
        const iframe = document.createElement('iframe')
        iframe.style.width = `${width}px`
        iframe.style.height = `${height}px`
        iframe.style.border = 'none'
        iframe.style.overflow = 'hidden'
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation')
        
        // Add loading transition
        iframe.style.opacity = '0'
        iframe.style.transition = 'opacity 0.2s ease-in'
        
        iframeRef.current = iframe
        adContainerRef.current.appendChild(iframe)
      }

      setIsLoading(true)

      try {
        const baseTag = `<base href="${getBaseHref(adFile)}">`
        
        if (adFile.endsWith('.html')) {
          const response = await fetch(adFile)
          const html = await response.text()
          
          let modifiedHtml = html.includes('<head>') && !html.match(/<base\s/i)
            ? html.replace(/<head>/i, `<head>${baseTag}`)
            : `${baseTag}${html}`

          if (iframeRef.current) {
            iframeRef.current.srcdoc = modifiedHtml
          }
        } else {
          // Preload image in memory
          const img = new Image()
          img.src = adFile
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
          })

          if (iframeRef.current) {
            iframeRef.current.srcdoc = `
              <!DOCTYPE html>
              <html>
                <head>
                  ${baseTag}
                  <style>
                    body {
                      margin: 0;
                      padding: 0;
                      overflow: hidden;
                      width: ${width}px;
                      height: ${height}px;
                      background: white;
                    }
                    .ad-container {
                      width: 100%;
                      height: 100%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    }
                    img {
                      max-width: 100%;
                      max-height: 100%;
                      object-fit: contain;
                      opacity: 1;
                      transition: opacity 0.2s ease-in;
                    }
                  </style>
                </head>
                <body>
                  <div class="ad-container">
                    <img src="${adFile}" alt="Ad Preview" />
                  </div>
                </body>
              </html>
            `
          }
        }

        // Show iframe once content is loaded
        if (iframeRef.current) {
          iframeRef.current.onload = () => {
            if (iframeRef.current) {
              iframeRef.current.style.opacity = '1'
              setIsLoading(false)
            }
          }
        }
      } catch (error) {
        console.error('Error loading ad:', error)
        setIsLoading(false)
      }
    }

    loadAd()
  }, [adFile, width, height])

  return (
    <div className="relative">
      <div 
        ref={adContainerRef}
        className={`bg-white  ${className}`}
        style={{ 
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-50"
          style={{ 
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          <div className="w-6 h-6 border-2  rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

export default AdPreview