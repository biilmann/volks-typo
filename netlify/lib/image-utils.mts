import { getStore } from "@netlify/blobs";
import crypto from 'crypto';

/**
 * Downloads a media file (image or video) from a URL and saves it to Netlify Blobs
 * Returns the edge function path for serving the media file
 */
export async function downloadAndSaveImage(mediaUrl: string, title: string): Promise<string> {
  try {
    console.log(`Downloading media file: ${mediaUrl}`);
    
    // Create a nice filename while preventing conflicts
    const originalFilename = extractFilenameFromUrl(mediaUrl);
    const extension = getFileExtension(mediaUrl);
    const hash = crypto.createHash('md5').update(mediaUrl + title).digest('hex').substring(0, 8);
    const filename = `${originalFilename}_${hash}${extension}`;
    
    // Download the media file
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Failed to download media file: ${response.status} ${response.statusText}`);
    }
    
    const mediaBuffer = await response.arrayBuffer();
    
    // Store in Netlify Blobs with minimal metadata to avoid size limits
    const mediaStore = getStore("images");
    await mediaStore.set(filename, mediaBuffer, {
      metadata: {
        contentType: getContentType(extension),
        uploadedAt: new Date().toISOString()
      }
    });
    
    console.log(`Saved media file to blob store: ${filename}`);
    
    // Return the edge function path for serving the media file
    return `/article-images/${filename}`;
  } catch (error) {
    console.error(`Failed to download media file ${mediaUrl}:`, error);
    // Return the original URL as fallback
    return mediaUrl;
  }
}

/**
 * Processes Notion block data to download images and videos and create a URL mapping
 * This should be called BEFORE AI processing to capture authenticated URLs
 */
export async function processNotionImages(notionBlocks: any[], title: string): Promise<{ [key: string]: string }> {
  const mediaMapping: { [key: string]: string } = {};
  
  for (const block of notionBlocks) {
    // Handle image blocks
    if (block.type === 'image' && block.image) {
      const imageData = block.image;
      let imageUrl: string | null = null;
      
      if (imageData.type === 'file' && imageData.file?.url) {
        imageUrl = imageData.file.url;
      } else if (imageData.type === 'external' && imageData.external?.url) {
        imageUrl = imageData.external.url;
      }
      
      if (imageUrl) {
        console.log(`Found image in block: ${imageUrl}`);
        const edgePath = await downloadAndSaveImage(imageUrl, title);
        const baseUrl = imageUrl.split('?')[0];
        mediaMapping[baseUrl] = edgePath;
        console.log(`Mapped: ${baseUrl} -> ${edgePath}`);
      }
    }
    
    // Handle video blocks
    if (block.type === 'video' && block.video) {
      const videoData = block.video;
      let videoUrl: string | null = null;
      
      if (videoData.type === 'file' && videoData.file?.url) {
        videoUrl = videoData.file.url;
      } else if (videoData.type === 'external' && videoData.external?.url) {
        videoUrl = videoData.external.url;
      }
      
      if (videoUrl) {
        console.log(`Found video in block: ${videoUrl}`);
        const edgePath = await downloadAndSaveImage(videoUrl, title);
        const baseUrl = videoUrl.split('?')[0];
        mediaMapping[baseUrl] = edgePath;
        console.log(`Mapped: ${baseUrl} -> ${edgePath}`);
      }
    }
  }
  
  return mediaMapping;
}

/**
 * Extracts a clean filename from URL
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || 'media';
    const nameWithoutExt = filename.split('.').slice(0, -1).join('.');
    return nameWithoutExt
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50) || 'media';
  } catch {
    return 'media';
  }
}

/**
 * Extracts file extension from URL, supports both images and videos
 */
function getFileExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const extension = pathname.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return `.${extension}`;
    }
    if (['mp4', 'mov', 'webm', 'avi', 'mkv', 'wmv', 'flv', 'ogv'].includes(extension || '')) {
      return `.${extension}`;
    }
    return '.png';
  } catch {
    return '.png';
  }
}

/**
 * Gets the appropriate content type for a media file extension
 */
function getContentType(extension: string): string {
  const contentTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.ogv': 'video/ogg'
  };
  return contentTypes[extension.toLowerCase()] || 'image/png';
}

/**
 * Processes content to replace any S3 URLs with local edge function paths
 */
export function processMarkdownImages(markdown: string, mediaMapping: { [key: string]: string }): string {
  let processedMarkdown = markdown;
  for (const [s3Url, localPath] of Object.entries(mediaMapping)) {
    const baseUrl = s3Url.split('?')[0];
    const urlPattern = new RegExp(
      s3Url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\?[^\\s)"\']*)?',
      'g'
    );
    const baseUrlPattern = new RegExp(
      baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\?[^\\s)"\']*)?',
      'g'
    );
    processedMarkdown = processedMarkdown.replace(urlPattern, localPath);
    processedMarkdown = processedMarkdown.replace(baseUrlPattern, localPath);
    console.log(`Replaced S3 URL: ${baseUrl} -> ${localPath}`);
  }
  return processedMarkdown;
}