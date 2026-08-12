const API_URL = '/api/consignment';
const IMAGE_API_URL = '/api/consignment-image';
const EXPIRY_API_URL = '/api/consignment-expiry';

async function parseResponse(response) {
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Server returned an invalid response (${response.status}). ${text.slice(0, 180)}`);
    }
  }
  if (!response.ok) throw new Error(payload.error || `Shopify request failed (${response.status})`);
  return payload;
}

async function request(method = 'GET', body) {
  const response = await fetch(API_URL, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return parseResponse(response);
}

async function expiryRequest(body) {
  const response = await fetch(EXPIRY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Expiry metadata returned an invalid response (${response.status}). ${text.slice(0, 180)}`);
    }
  }
  if (!response.ok) throw new Error(payload.error || `Expiry metadata update failed (${response.status})`);
  return payload;
}

export async function getConsignmentData() {
  const [data, expiryResponse] = await Promise.all([request(), fetch(EXPIRY_API_URL)]);
  const expiryText = await expiryResponse.text();
  let expiry = {};
  if (expiryText) {
    try {
      expiry = JSON.parse(expiryText);
    } catch {
      expiry = {};
    }
  }
  const values = expiryResponse.ok ? (expiry.values || {}) : {};
  return {
    ...data,
    items: (data.items || []).map((item) => ({ ...item, ...(values[item.id] || {}) })),
  };
}

export async function searchShopifyCategories(search) {
  const response = await fetch(`${API_URL}?taxonomy=${encodeURIComponent(search.trim())}`);
  const payload = await parseResponse(response);
  return payload.categories || [];
}

export function createConsignor(consignor) {
  return request('POST', { operation: 'createConsignor', consignor });
}

export function updateConsignor(consignorId, consignor) {
  return request('PATCH', { operation: 'updateConsignor', consignorId, consignor });
}

export function deleteConsignor(consignorId) {
  return request('DELETE', { operation: 'deleteConsignor', consignorId });
}

function dataUrlToImageBlob(dataUrl) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) throw new Error('The selected photo could not be prepared. Please take the photo again.');
  const mimeType = match[1].toLowerCase();
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

async function uploadImage(dataUrl, alt) {
  if (!dataUrl?.startsWith('data:image/')) return null;
  const imageBlob = dataUrlToImageBlob(dataUrl);
  const formData = new FormData();
  const extension = imageBlob.type === 'image/png' ? 'png' : 'jpg';
  formData.append('image', imageBlob, `consignment-${Date.now()}.${extension}`);
  formData.append('alt', alt || 'Consignment item');
  const response = await fetch(IMAGE_API_URL, { method: 'POST', body: formData });
  const payload = await parseResponse(response);
  return payload;
}

async function prepareItemPhoto(item) {
  const uploaded = await uploadImage(item.photo, item.description);
  if (!uploaded) return item;
  return { ...item, photoId: uploaded.id, photo: uploaded.url || item.photo };
}

export async function createConsignmentItems(consignorId, items) {
  const manualItems = items.map((item) => ({
    category: item.category,
    type: '',
    description: item.description,
    size: item.size,
    condition: item.condition,
    price: item.price,
    brand: item.brand,
    notes: item.notes,
    receivedDate: item.receivedDate,
    consignmentTerm: item.consignmentTerm,
    expiryDate: item.expiryDate,
  }));
  const saved = await request('POST', { operation: 'createItems', consignorId, items: manualItems });
  return saved;
}

export async function updateConsignmentItem(itemId, item) {
  return request('PATCH', {
    operation: 'updateItem',
    itemId,
    item: {
      category: item.category,
      type: '',
      description: item.description,
      size: item.size,
      condition: item.condition,
      price: item.price,
      brand: item.brand,
      notes: item.notes,
      receivedDate: item.receivedDate,
      consignmentTerm: item.consignmentTerm,
      expiryDate: item.expiryDate,
    },
  });
}

export function deleteConsignmentItem(itemId) {
  return request('DELETE', { operation: 'deleteItem', itemId });
}

export async function syncShopifyProduct(itemId, product) {
  const preparedProduct = await prepareItemPhoto(product);
  return request('POST', { operation: 'syncProduct', itemId, product: preparedProduct });
}

export function updateConsignmentItemStatus(itemId, status, details = {}) {
  return request('POST', { operation: 'updateItemStatus', itemId, status, ...details });
}

export function recordConsignorPayout(payout) {
  return request('POST', { operation: 'recordPayout', ...payout });
}

export function importConsignmentData(kind, rows) {
  return request('POST', { operation: 'importData', kind, rows });
}
