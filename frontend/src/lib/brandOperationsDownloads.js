import { apiDownload } from './apiClient';

export async function downloadOperationsFile(path, filename) {
  const blob = await apiDownload(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function printOperationsDocument(id) {
  // Open during the click, before fetching, to avoid asynchronous popup blocking.
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Allow popups to open the printable document.');
  preview.opener = null;
  try {
    const blob = await apiDownload(`/brand/documents/${id}?format=html`);
    const url = URL.createObjectURL(new Blob([blob], { type: 'text/html' }));
    preview.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    preview.close();
    throw error;
  }
}
