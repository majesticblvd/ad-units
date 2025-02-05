"use client"

import { useEffect, useRef } from "react"

interface AdPreviewProps {
  adFile: string
  adSize: string
  className?: string
}

export function AdPreview({ adFile, adSize, className = '' }: AdPreviewProps) {
  const adContainerRef = useRef<HTMLDivElement>(null)
  const [width, height] = adSize.split('x').map(Number)

  useEffect(() => {
    if (adContainerRef.current) {
      const iframe = document.createElement('iframe')
      iframe.style.width = `${width}px`
      iframe.style.height = `${height}px`
      iframe.style.border = 'none'
      iframe.style.overflow = 'hidden'

      // Allow scripts and same-origin access inside the iframe.
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')

      // Helper: get the base URL (directory) for the given file.
      const getBaseHref = (file: string) => {
        try {
          const url = new URL(file, window.location.href)
          // Remove the filename from the path so that the base URL points to the directory.
          url.pathname = url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1)
          return url.toString()
        } catch (e) {
          return window.location.origin
        }
      }

      if (adFile.endsWith('.html')) {
        // If the ad is an HTML file, fetch it and inject a <base> tag.
        fetch(adFile)
          .then(response => response.text())
          .then(html => {
            const baseTag = `<base href="${getBaseHref(adFile)}">`
            let modifiedHtml = html
            // If there is a <head> tag but no <base> tag yet, inject our base tag.
            if (html.includes('<head>')) {
              if (!html.match(/<base\s/i)) {
                modifiedHtml = html.replace(/<head>/i, `<head>${baseTag}`)
              }
            } else {
              // If there is no <head>, prepend the base tag.
              modifiedHtml = `${baseTag}${html}`
            }
            iframe.srcdoc = modifiedHtml
          })
          .catch(error => {
            console.error('Error loading ad:', error)
          })
      } else {
        // For image files, build an HTML document that displays the image.
        const baseTag = `<base href="${getBaseHref(adFile)}">`
        iframe.srcdoc = `
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

      // Clear any existing content and append the iframe.
      adContainerRef.current.innerHTML = ''
      adContainerRef.current.appendChild(iframe)
    }
  }, [adFile, width, height])

  return (
    <div 
      ref={adContainerRef}
      className={`bg-white shadow-sm ${className}`}
      style={{ 
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  )
}
