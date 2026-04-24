import { marked } from 'marked';
import turndownService from '../lib/turndownSetup.js';
import { prepareHTMLForMarkdown, fixHTMLForQuill } from '../lib/htmlUtils.js';

export function useConversion() {
  function syncRTtoMD(quill) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = quill.root.innerHTML;
    prepareHTMLForMarkdown(tempDiv);
    return turndownService.turndown(tempDiv.innerHTML);
  }

  function syncMDtoRT(md) {
    const html = marked.parse(md);
    return fixHTMLForQuill(html);
  }

  return { syncRTtoMD, syncMDtoRT };
}
