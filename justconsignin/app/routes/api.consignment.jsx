import { authenticate } from '../shopify.server';

const DATA_QUERY = `#graphql
  query ConsignmentData {
    shop { name currencyCode }
    consignors: metaobjects(type: "consignor", first: 250) { nodes { id handle fields { key jsonValue } } }
    items: metaobjects(type: "consignment_item", first: 250) {
      nodes {
        id handle
        fields {
          key jsonValue
          reference {
            ... on MediaImage { id image { url } }
            ... on GenericFile { id url }
            ... on Product {
              id title status handle descriptionHtml vendor productType tags
              featuredMedia { ... on MediaImage { id image { url } } }
              seo { title description }
              category { id fullName }
              variants(first: 1) { nodes { price sku } }
            }
          }
        }
      }
    }
  }
`;

const UPSERT_MUTATION = `#graphql
  mutation UpsertMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle fields { key jsonValue } }
      userErrors { field message code }
    }
  }
`;
const DELETE_MUTATION = `#graphql mutation DeleteMetaobject($id: ID!) { metaobjectDelete(id: $id) { deletedId userErrors { field message code } } }`;
const PRODUCT_LOCATION_QUERY = `#graphql query ProductLocation { locations(first: 50) { nodes { id name isActive fulfillsOnlineOrders shipsInventory } } publications(first: 50) { nodes { id name } } }`;
const TAXONOMY_SEARCH_QUERY = `#graphql query SearchProductTaxonomy($search: String!) { taxonomy { categories(first: 30, search: $search) { nodes { id fullName isLeaf isArchived } } } }`;
const CONSIGNMENT_COLLECTION_QUERY = `#graphql query ConsignmentCollection($identifier: CollectionIdentifierInput!) { collectionByIdentifier(identifier: $identifier) { id title handle ruleSet { appliedDisjunctively rules { column relation condition } } } }`;
const CONSIGNMENT_COLLECTION_CREATE_MUTATION = `#graphql mutation CreateConsignmentCollection($input: CollectionInput!) { collectionCreate(input: $input) { collection { id title handle ruleSet { appliedDisjunctively rules { column relation condition } } } userErrors { field message } } }`;
const CONSIGNMENT_COLLECTION_UPDATE_MUTATION = `#graphql mutation UpdateConsignmentCollection($input: CollectionInput!) { collectionUpdate(input: $input) { collection { id title handle } userErrors { field message } } }`;
const CONSIGNMENT_COLLECTION_ADD_PRODUCT_MUTATION = `#graphql mutation AddConsignmentProductToCollection($id: ID!, $productIds: [ID!]!) { collectionAddProducts(id: $id, productIds: $productIds) { collection { id } userErrors { field message } } }`;
const PRODUCT_SET_MUTATION = `#graphql mutation CreateConsignmentProduct($input: ProductSetInput!) { productSet(synchronous: true, input: $input) { product { id title status } userErrors { field message } } }`;
const PRODUCT_UPDATE_MUTATION = `#graphql mutation ActivateConsignmentProduct($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id status } userErrors { field message } } }`;
const PRODUCT_DELETE_MUTATION = `#graphql mutation DeleteConsignmentProduct($input: ProductDeleteInput!) { productDelete(input: $input) { deletedProductId userErrors { field message } } }`;
const PRODUCT_PUBLISH_MUTATION = `#graphql mutation PublishConsignmentResource($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { publishable { ... on Product { id status } ... on Collection { id handle } } userErrors { field message } } }`;
const METAFIELDS_SET_MUTATION = `#graphql mutation SetConsignmentPayoutMetafields($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { metafields { id namespace key jsonValue } userErrors { field message code } } }`;

function values(node) { return Object.fromEntries(node.fields.map((field) => [field.key, field.jsonValue])); }
function references(node) { return Object.fromEntries(node.fields.filter((field) => field.reference).map((field) => [field.key, field.reference])); }

function parseConsignorDetails(rawValue) {
  const fallback = { notes: rawValue || '', address: '', city: '', province: '', postalCode: '', unsoldPreference: 'Please return', importKey: '' };
  if (!rawValue) return fallback;
  try { const parsed = JSON.parse(rawValue); if (parsed?.schema !== 'consignor-details-v1') return fallback; return { ...fallback, ...parsed, notes: parsed.notes || '' }; } catch { return fallback; }
}
function consignorDetails(value) { return JSON.stringify({ schema: 'consignor-details-v1', notes: value.notes || '', address: value.address || '', city: value.city || '', province: value.province || '', postalCode: value.postalCode || '', unsoldPreference: value.unsoldPreference || 'Please return', importKey: value.importKey || '' }); }
function mapConsignor(node) {
  const field = values(node); const details = parseConsignorDetails(field.notes);
  return { id: node.id, handle: node.handle, number: Number(field.number), firstName: field.first_name || '', lastName: field.last_name || '', phone: field.phone || '', email: field.email || '', dateJoined: field.date_joined || '', commissionPct: Number(field.commission_pct ?? 50), notes: details.notes, address: details.address, city: details.city, province: details.province, postalCode: details.postalCode, unsoldPreference: details.unsoldPreference || 'Please return', importKey: details.importKey || '' };
}
function parseItemDetails(rawValue) {
  const fallback = { notes: rawValue || '', tags: [], vendor: '', brand: '', productDescription: '', shopifyTitle: '', shopifyPrice: null, shopifyCategoryId: '', shopifyCategoryName: '', seoTitle: '', seoDescription: '', publishOnline: false, payoutId: '', payoutDate: '', payoutMethod: '', payoutReference: '', payoutNote: '', payoutAmount: 0, payoutTotal: 0, payoutAdjustment: 0, importKey: '' };
  if (!rawValue) return fallback;
  try { const parsed = JSON.parse(rawValue); if (parsed?.schema !== 'consignment-product-details-v1') return fallback; return { ...fallback, ...parsed, tags: Array.isArray(parsed.tags) ? parsed.tags : [], notes: parsed.notes || '' }; } catch { return fallback; }
}
function mapItem(node) {
  const field = values(node); const reference = references(node); const photoReference = reference.photo; const productReference = reference.shopify_product; const storedStatus = field.status || 'Draft'; const status = productReference?.status === 'ACTIVE' && storedStatus === 'Draft' ? 'Available' : storedStatus; const savedDetails = parseItemDetails(field.notes);
  return {
    id: node.id, handle: node.handle, itemNumber: field.item_number || node.handle, consignorId: field.consignor || '', dateReceived: field.date_received || '', category: field.category || '', type: field.item_type || '', description: field.description || '', size: field.size || '', condition: field.condition || '', price: Number(field.price || 0), commissionPct: Number(field.commission_pct ?? 50), status,
    photoId: photoReference?.id || field.photo || null, photo: photoReference?.image?.url || photoReference?.url || null, shopifyProductId: productReference?.id || field.shopify_product || null, shopifyProductTitle: productReference?.title || null, shopifyProductStatus: productReference?.status || null, shopifyProductHandle: productReference?.handle || null, shopifyTitle: productReference?.title || field.shopify_title || savedDetails.shopifyTitle || '', shopifyPrice: Number(productReference?.variants?.nodes?.[0]?.price ?? field.shopify_price ?? savedDetails.shopifyPrice ?? field.price ?? 0), shopifyPhoto: productReference?.featuredMedia?.image?.url || null,
    notes: savedDetails.notes, tags: productReference?.tags || (field.shopify_tags ? String(field.shopify_tags).split(',').map((tag) => tag.trim()).filter(Boolean) : savedDetails.tags), vendor: productReference?.vendor || field.shopify_vendor || savedDetails.vendor, brand: field.brand || savedDetails.brand, productDescription: productReference?.descriptionHtml || field.shopify_description || savedDetails.productDescription, shopifyCategoryId: productReference?.category?.id || field.shopify_category_id || savedDetails.shopifyCategoryId, shopifyCategoryName: productReference?.category?.fullName || field.shopify_category_name || savedDetails.shopifyCategoryName, seoTitle: productReference?.seo?.title || field.seo_title || savedDetails.seoTitle, seoDescription: productReference?.seo?.description || field.seo_description || savedDetails.seoDescription, publishToPos: field.publish_to_pos !== false && field.publish_to_pos !== 'false', publishOnline: field.publish_online === true || field.publish_online === 'true' || savedDetails.publishOnline === true,
    payoutId: savedDetails.payoutId || '', payoutDate: savedDetails.payoutDate || '', payoutMethod: savedDetails.payoutMethod || '', payoutReference: savedDetails.payoutReference || '', payoutNote: savedDetails.payoutNote || '', payoutAmount: Number(savedDetails.payoutAmount || 0), payoutTotal: Number(savedDetails.payoutTotal || 0), payoutAdjustment: Number(savedDetails.payoutAdjustment || 0), salePrice: field.sale_price == null ? null : Number(field.sale_price), dateSold: field.date_sold || null, orderName: field.order_name || null, orderId: field.order_id || null, paidOut: field.paid_out === true || field.paid_out === 'true', importKey: savedDetails.importKey || '',
  };
}
function itemDetails(value) { return JSON.stringify({ schema: 'consignment-product-details-v1', notes: value.notes || '', tags: Array.isArray(value.tags) ? value.tags : String(value.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean), vendor: value.vendor || '', brand: value.brand || '', productDescription: value.productDescription || '', shopifyTitle: value.shopifyTitle || '', shopifyPrice: value.shopifyPrice === '' || value.shopifyPrice == null ? null : Number(value.shopifyPrice), shopifyCategoryId: value.shopifyCategoryId || '', shopifyCategoryName: value.shopifyCategoryName || '', seoTitle: value.seoTitle || '', seoDescription: value.seoDescription || '', publishOnline: value.publishOnline === true, payoutId: value.payoutId || '', payoutDate: value.payoutDate || '', payoutMethod: value.payoutMethod || '', payoutReference: value.payoutReference || '', payoutNote: value.payoutNote || '', payoutAmount: Number(value.payoutAmount || 0), payoutTotal: Number(value.payoutTotal || 0), payoutAdjustment: Number(value.payoutAdjustment || 0), importKey: value.importKey || '' }); }
function field(key, value) { if (value === undefined || value === null || value === '') return null; return { key, value: String(value) }; }
function cleanFields(fields) { return fields.filter(Boolean); }
function today() { return new Date().toISOString().slice(0, 10); }
function safeHandle(value) { return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function assertNoErrors(payload, operation) { const errors = payload?.userErrors || []; if (errors.length) throw new Error(`${operation}: ${errors.map((error) => error.message).join(', ')}`); }
async function adminGraphql(admin, query, variables = {}) { const response = await admin.graphql(query, { variables }); const payload = await response.json(); if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join(', ')); return payload.data; }

async function recordProductPayoutAudit(admin, { item, consignor, amount, payoutId, payoutDate, method, reference, note, currencyCode }) {
  if (!item.shopifyProductId) return;
  const safeCurrency = currencyCode || 'CAD'; const paidAmount = Number(amount || 0).toFixed(2); const consignorName = `${consignor.firstName} ${consignor.lastName}`.trim(); const paymentReference = reference || payoutId;
  const details = [`Status: Paid`, `Paid to: ${consignorName} (#${consignor.number})`, `Amount: ${paidAmount} ${safeCurrency}`, `Method: ${method}`, `Payout date: ${payoutDate}`, `Payout reference: ${paymentReference}`, `Item: ${item.description || item.itemNumber} (${item.itemNumber})`, `Sale price: ${Number(item.salePrice ?? item.price ?? 0).toFixed(2)} ${safeCurrency}`, `Commission: ${Number(item.commissionPct ?? consignor.commissionPct ?? 0)}%`, item.orderName ? `Shopify order: ${item.orderName}` : '', note ? `Note: ${note}` : ''].filter(Boolean).join('\n');
  const moneyValue = JSON.stringify({ amount: paidAmount, currency_code: safeCurrency }); const storeCreditValue = JSON.stringify({ amount: method === 'Store credit' ? paidAmount : '0.00', currency_code: safeCurrency });
  const data = await adminGraphql(admin, METAFIELDS_SET_MUTATION, { metafields: [
    { ownerId: item.shopifyProductId, key: 'consignment_payout_status', value: 'Paid' }, { ownerId: item.shopifyProductId, key: 'consignment_payout_amount', value: moneyValue }, { ownerId: item.shopifyProductId, key: 'consignment_payout_method', value: method }, { ownerId: item.shopifyProductId, key: 'consignment_payout_date', value: payoutDate }, { ownerId: item.shopifyProductId, key: 'consignment_payout_reference', value: paymentReference }, { ownerId: item.shopifyProductId, key: 'consignment_payout_consignor', value: `${consignorName} (#${consignor.number})` }, { ownerId: item.shopifyProductId, key: 'consignment_store_credit_amount', value: storeCreditValue }, { ownerId: item.shopifyProductId, key: 'consignment_payout_details', value: details },
  ] });
  assertNoErrors(data.metafieldsSet, 'Could not record payout details on the Shopify product');
}
function escapeHtml(value) { return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function itemFields(item, overrides = {}) {
  const value = { ...item, ...overrides };
  return [field('item_number', value.itemNumber), field('consignor', value.consignorId), field('date_received', value.dateReceived), field('category', value.category), field('item_type', value.type), field('description', value.description), field('size', value.size), field('condition', value.condition), field('price', Number(value.price || 0).toFixed(2)), field('commission_pct', value.commissionPct), field('status', value.status), field('brand', value.brand), field('photo', value.photoId), field('shopify_product', value.shopifyProductId), field('shopify_title', value.shopifyTitle), field('shopify_price', value.shopifyPrice === '' || value.shopifyPrice == null ? null : Number(value.shopifyPrice).toFixed(2)), field('shopify_description', value.productDescription), field('shopify_vendor', value.vendor), field('shopify_tags', Array.isArray(value.tags) ? value.tags.join(', ') : value.tags), field('shopify_category_id', value.shopifyCategoryId), field('shopify_category_name', value.shopifyCategoryName), field('seo_title', value.seoTitle), field('seo_description', value.seoDescription), field('publish_to_pos', value.publishToPos !== false), field('publish_online', value.publishOnline === true), field('notes', itemDetails(value)), field('sale_price', value.salePrice), field('date_sold', value.dateSold), field('order_name', value.orderName), field('order_id', value.orderId), field('paid_out', value.paidOut)];
}

async function getProductSetup(admin) {
  const data = await adminGraphql(admin, PRODUCT_LOCATION_QUERY);
  const location = data.locations.nodes.find((entry) => entry.isActive && entry.fulfillsOnlineOrders && entry.shipsInventory) || data.locations.nodes.find((entry) => entry.isActive);
  const posPublication = data.publications.nodes.find((entry) => { const name = String(entry.name || '').toLowerCase(); return name.includes('point of sale') || name === 'pos'; });
  const onlineStorePublication = data.publications.nodes.find((entry) => String(entry.name || '').toLowerCase().includes('online store'));
  return { location, posPublication, onlineStorePublication };
}
async function publishResource(admin, resourceId, publications, resourceName) { const publicationIds = publications.map((publication) => publication?.id).filter(Boolean); if (!publicationIds.length) throw new Error(`No Shopify sales channels were found for this ${resourceName}.`); const data = await adminGraphql(admin, PRODUCT_PUBLISH_MUTATION, { id: resourceId, input: publicationIds.map((publicationId) => ({ publicationId })) }); assertNoErrors(data.publishablePublish, `Could not publish the Shopify ${resourceName}`); }
async function ensureConsignmentCollection(admin, publications) {
  const existingData = await adminGraphql(admin, CONSIGNMENT_COLLECTION_QUERY, { identifier: { handle: 'consignment' } }); let collection = existingData.collectionByIdentifier;
  if (!collection) {
    const createData = await adminGraphql(admin, CONSIGNMENT_COLLECTION_CREATE_MUTATION, { input: { title: 'Consignment', handle: 'consignment', descriptionHtml: '<p>Consignment products managed through Consignment Manager.</p>', ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'Consignment' }] } } }); assertNoErrors(createData.collectionCreate, 'Could not create the Consignment collection'); collection = createData.collectionCreate.collection;
  } else if (collection.ruleSet) {
    const rules = collection.ruleSet.rules || []; const hasConsignmentTagRule = collection.ruleSet.appliedDisjunctively === false && rules.length === 1 && rules[0].column === 'TAG' && rules[0].relation === 'EQUALS' && String(rules[0].condition).toLowerCase() === 'consignment';
    if (!hasConsignmentTagRule) { const updateData = await adminGraphql(admin, CONSIGNMENT_COLLECTION_UPDATE_MUTATION, { input: { id: collection.id, ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'Consignment' }] } } }); assertNoErrors(updateData.collectionUpdate, 'Could not configure the Consignment collection'); }
  }
  if (!collection?.id) throw new Error('Shopify did not return the Consignment collection.');
  await publishResource(admin, collection.id, publications, 'collection'); return { ...collection, isManual: !collection.ruleSet };
}
async function addProductToManualCollection(admin, collectionId, productId) { const data = await adminGraphql(admin, CONSIGNMENT_COLLECTION_ADD_PRODUCT_MUTATION, { id: collectionId, productIds: [productId] }); assertNoErrors(data.collectionAddProducts, 'Could not add the product to the Consignment collection'); }
async function syncPosProduct(admin, item, consignor, merchantName) {
  const { location, posPublication, onlineStorePublication } = await getProductSetup(admin);
  if (!location) throw new Error('No active Shopify location was found. Check Settings → Locations.');
  if (!posPublication?.id) throw new Error('The Point of Sale sales channel is not available. Add Shopify POS, then try again.');
  if (item.publishOnline && !onlineStorePublication?.id) throw new Error('The Online Store sales channel is not available. Add Online Store or turn off online publishing.');
  const publications = [posPublication, ...(item.publishOnline ? [onlineStorePublication] : [])]; const collection = await ensureConsignmentCollection(admin, publications); const files = item.photoId ? [{ id: item.photoId }] : undefined; const customTags = Array.isArray(item.tags) ? item.tags : String(item.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
  const input = { ...(item.shopifyProductId ? { id: item.shopifyProductId } : {}), title: String(item.shopifyTitle || '').trim(), descriptionHtml: item.productDescription ? `<p>${escapeHtml(item.productDescription).replaceAll('\n', '<br>')}</p>` : [`<p>${escapeHtml(item.description)}</p>`, item.condition ? `<p><strong>Condition:</strong> ${escapeHtml(item.condition)}</p>` : '', item.size ? `<p><strong>Size:</strong> ${escapeHtml(item.size)}</p>` : ''].join(''), productType: item.type || item.category, vendor: item.vendor || merchantName || 'Consignment', status: 'ACTIVE', tags: ['Consignment', item.category, item.type, item.condition, item.brand, `Consignor ${consignor.number}`, ...customTags].filter(Boolean), category: item.shopifyCategoryId || undefined, seo: (item.seoTitle || item.seoDescription) ? { title: item.seoTitle || item.shopifyTitle || undefined, description: item.seoDescription || undefined } : undefined, files, productOptions: [{ name: 'Title', position: 1, values: [{ name: 'Default Title' }] }], variants: [{ optionValues: [{ optionName: 'Title', name: 'Default Title' }], price: Number(item.shopifyPrice ?? item.price ?? 0).toFixed(2), sku: item.itemNumber, inventoryPolicy: 'DENY', taxable: true, inventoryItem: { sku: item.itemNumber, tracked: true, requiresShipping: true }, inventoryQuantities: [{ locationId: location.id, name: 'available', quantity: 1 }] }] };
  const data = await adminGraphql(admin, PRODUCT_SET_MUTATION, { input }); assertNoErrors(data.productSet, item.shopifyProductId ? 'Could not update the Shopify product' : 'Could not create the Shopify product'); if (!data.productSet.product?.id) throw new Error('Shopify did not return the new product.'); if (!item.shopifyProductId && collection?.isManual) await addProductToManualCollection(admin, collection.id, data.productSet.product.id); await publishResource(admin, data.productSet.product.id, publications, 'product'); return data.productSet.product;
}
async function loadData(admin) { const response = await admin.graphql(DATA_QUERY); const payload = await response.json(); if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join(', ')); return { shop: payload.data.shop, consignors: payload.data.consignors.nodes.map(mapConsignor), items: payload.data.items.nodes.map(mapItem) }; }
async function upsert(admin, type, handle, fields) { const response = await admin.graphql(UPSERT_MUTATION, { variables: { handle: { type, handle }, metaobject: { fields: cleanFields(fields) } } }); const payload = await response.json(); if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join(', ')); assertNoErrors(payload.data.metaobjectUpsert, 'Could not save Shopify data'); return payload.data.metaobjectUpsert.metaobject; }
async function remove(admin, id) { const response = await admin.graphql(DELETE_MUTATION, { variables: { id } }); const payload = await response.json(); if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join(', ')); assertNoErrors(payload.data.metaobjectDelete, 'Could not delete Shopify data'); return payload.data.metaobjectDelete.deletedId; }

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  try { const taxonomySearch = new URL(request.url).searchParams.get('taxonomy')?.trim(); if (taxonomySearch) { const taxonomyData = await adminGraphql(admin, TAXONOMY_SEARCH_QUERY, { search: taxonomySearch }); return Response.json({ categories: (taxonomyData.taxonomy?.categories?.nodes || []).filter((category) => !category.isArchived).map((category) => ({ id: category.id, name: category.fullName, isLeaf: category.isLeaf })) }); } return Response.json(await loadData(admin)); } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  try {
    const body = await request.json(); const current = await loadData(admin);
    if (request.method === 'POST' && body.operation === 'createConsignor') {
      const suggestedNumber = Math.max(0, ...current.consignors.map((entry) => entry.number)) + 1; const input = body.consignor; const requestedNumber = Number(input.number); const nextNumber = Number.isInteger(requestedNumber) && requestedNumber > 0 ? requestedNumber : suggestedNumber; if (current.consignors.some((entry) => entry.number === nextNumber)) return Response.json({ error: `Consignor #${nextNumber} is already in use.` }, { status: 400 }); const handle = `consignor-${nextNumber}-${safeHandle(`${input.firstName}-${input.lastName}`)}`; const saved = await upsert(admin, 'consignor', handle, [field('number', nextNumber), field('first_name', input.firstName?.trim()), field('last_name', input.lastName?.trim()), field('phone', input.phone?.trim()), field('email', input.email?.trim()), field('date_joined', today()), field('commission_pct', Number(input.commissionPct) || 50), field('notes', consignorDetails(input))]); return Response.json(mapConsignor(saved));
    }
    if (request.method === 'PATCH' && body.operation === 'updateConsignor') {
      const existing = current.consignors.find((entry) => entry.id === body.consignorId); if (!existing) return Response.json({ error: 'Consignor not found' }, { status: 404 }); const input = body.consignor; const requestedNumber = Number(input.number); const nextNumber = Number.isInteger(requestedNumber) && requestedNumber > 0 ? requestedNumber : existing.number; if (nextNumber !== existing.number && current.consignors.some((entry) => entry.number === nextNumber)) return Response.json({ error: `Consignor #${nextNumber} is already in use.` }, { status: 400 }); const saved = await upsert(admin, 'consignor', existing.handle, [field('number', nextNumber), field('first_name', input.firstName?.trim()), field('last_name', input.lastName?.trim()), field('phone', input.phone?.trim()), field('email', input.email?.trim()), field('date_joined', existing.dateJoined), field('commission_pct', Number(input.commissionPct) || 50), field('notes', consignorDetails(input))]); return Response.json(mapConsignor(saved));
    }
    if (request.method === 'DELETE' && body.operation === 'deleteConsignor') {
      const consignor = current.consignors.find((entry) => entry.id === body.consignorId); if (!consignor) return Response.json({ error: 'Consignor not found' }, { status: 404 }); const linkedItems = current.items.filter((item) => item.consignorId === consignor.id); if (linkedItems.length) return Response.json({ error: `Delete this consignor’s ${linkedItems.length} item${linkedItems.length === 1 ? '' : 's'} first.` }, { status: 400 }); await remove(admin, consignor.id); return Response.json({ deletedId: consignor.id });
    }
    if (request.method === 'POST' && body.operation === 'createItems') {
      const consignor = current.consignors.find((entry) => entry.id === body.consignorId); if (!consignor) return Response.json({ error: 'Consignor not found' }, { status: 404 }); let sequence = current.items.filter((entry) => entry.itemNumber.startsWith(`${consignor.number}-`)).reduce((max, entry) => Math.max(max, Number(entry.itemNumber.split('-').pop()) || 0), 0); const savedItems = [];
      for (const input of body.items) { sequence += 1; const itemNumber = `${consignor.number}-${String(sequence).padStart(3, '0')}`; const saved = await upsert(admin, 'consignment_item', itemNumber, [field('item_number', itemNumber), field('consignor', consignor.id), field('date_received', today()), field('category', input.category), field('item_type', ''), field('description', input.description?.trim()), field('size', input.size?.trim()), field('condition', input.condition), field('price', Number(input.price || 0).toFixed(2)), field('commission_pct', consignor.commissionPct), field('status', 'Draft'), field('brand', input.brand), field('notes', itemDetails({ ...input, type: '' }))]); savedItems.push(mapItem(saved)); }
      return Response.json(savedItems);
    }
    if (request.method === 'PATCH' && body.operation === 'updateItem') {
      const existing = current.items.find((entry) => entry.id === body.itemId); if (!existing) return Response.json({ error: 'Item not found' }, { status: 404 }); const input = body.item; const saved = await upsert(admin, 'consignment_item', existing.handle, itemFields(existing, { category: input.category, description: input.description?.trim(), size: input.size?.trim(), condition: input.condition, price: Number(input.price || 0).toFixed(2), notes: input.notes, brand: input.brand, type: '' })); return Response.json(mapItem(saved));
    }
    if (request.method === 'POST' && body.operation === 'updateItemStatus') {
      const existing = current.items.find((entry) => entry.id === body.itemId); if (!existing) return Response.json({ error: 'Item not found' }, { status: 404 }); const requestedStatus = body.status; if (!['Available', 'Sold', 'Paid'].includes(requestedStatus)) return Response.json({ error: 'Invalid item status' }, { status: 400 }); const sold = requestedStatus === 'Sold' || requestedStatus === 'Paid'; const paid = requestedStatus === 'Paid'; const salePrice = sold ? Number(body.salePrice ?? existing.salePrice ?? existing.price ?? 0) : null; const dateSold = sold ? (body.dateSold || existing.dateSold || today()) : null; const payoutDate = paid ? (body.payoutDate || today()) : ''; const payoutMethod = paid ? (body.payoutMethod || 'Manual payment') : ''; const payoutAmount = paid ? (salePrice * Number(existing.commissionPct || 0)) / 100 : 0; const saved = await upsert(admin, 'consignment_item', existing.handle, itemFields(existing, { status: sold ? 'Sold' : 'Available', salePrice, dateSold, orderName: sold ? existing.orderName : null, orderId: sold ? existing.orderId : null, paidOut: paid, payoutId: paid ? (existing.payoutId || `manual-${Date.now()}`) : '', payoutDate, payoutMethod, payoutReference: paid ? (body.payoutReference || '') : '', payoutNote: paid ? (body.payoutNote || 'Marked paid from item screen') : '', payoutAmount, payoutTotal: payoutAmount, payoutAdjustment: 0 })); return Response.json(mapItem(saved));
    }
    if (request.method === 'POST' && body.operation === 'syncProduct') {
      const existing = current.items.find((entry) => entry.id === body.itemId); if (!existing) return Response.json({ error: 'Consignment item not found' }, { status: 404 }); const consignor = current.consignors.find((entry) => entry.id === existing.consignorId); if (!consignor) return Response.json({ error: 'Consignor not found' }, { status: 404 }); const productInput = body.product || {}; const productSource = { ...existing, photoId: productInput.photoId || existing.photoId, photo: productInput.photo || existing.photo, tags: productInput.tags || '', vendor: productInput.vendor || '', productDescription: productInput.productDescription || '', shopifyTitle: String(productInput.shopifyTitle || existing.shopifyTitle || '').trim(), shopifyPrice: productInput.shopifyPrice === '' || productInput.shopifyPrice == null ? (existing.shopifyPrice ?? existing.price) : Number(productInput.shopifyPrice), shopifyCategoryId: productInput.shopifyCategoryId || '', shopifyCategoryName: productInput.shopifyCategoryName || '', seoTitle: productInput.seoTitle || '', seoDescription: productInput.seoDescription || '', publishOnline: productInput.publishOnline === true, publishToPos: productInput.publishToPos !== false }; if (!productSource.shopifyTitle) return Response.json({ error: 'Enter a Shopify product title before creating or updating the Shopify product.' }, { status: 400 }); const product = await syncPosProduct(admin, productSource, consignor, current.shop?.name); const saved = await upsert(admin, 'consignment_item', existing.handle, itemFields(existing, { photoId: productSource.photoId, shopifyProductId: product.id, status: 'Available', tags: productSource.tags, vendor: productSource.vendor, productDescription: productSource.productDescription, shopifyTitle: productSource.shopifyTitle, shopifyPrice: productSource.shopifyPrice, shopifyCategoryId: productSource.shopifyCategoryId, shopifyCategoryName: productSource.shopifyCategoryName, seoTitle: productSource.seoTitle, seoDescription: productSource.seoDescription, publishOnline: productSource.publishOnline })); return Response.json(mapItem(saved));
    }
    if (request.method === 'POST' && body.operation === 'recordPayout') {
      const consignor = current.consignors.find((entry) => entry.id === body.consignorId); if (!consignor) return Response.json({ error: 'Consignor not found' }, { status: 404 }); const selectedIds = Array.isArray(body.itemIds) ? body.itemIds : []; const selected = current.items.filter((item) => selectedIds.includes(item.id)); const ineligible = selected.filter((item) => item.consignorId !== consignor.id || (!(item.status === 'Sold' || item.dateSold)) || item.paidOut); if (!selected.length || selected.length !== selectedIds.length || ineligible.length) return Response.json({ error: 'Select one or more unpaid sold items for this consignor.' }, { status: 400 }); const payoutDate = body.payoutDate || today(); const payoutId = `payout-${consignor.number}-${Date.now()}`; const adjustment = Number(body.adjustment || 0); const method = body.method || 'Other'; const reference = body.reference?.trim() || ''; const note = body.note?.trim() || ''; const earnings = selected.map((item) => (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? consignor.commissionPct ?? 0)) / 100); const payoutTotal = earnings.reduce((sum, amount) => sum + amount, 0) + adjustment;
      for (let index = 0; index < selected.length; index += 1) await recordProductPayoutAudit(admin, { item: selected[index], consignor, amount: earnings[index], payoutId, payoutDate, method, reference, note, currencyCode: current.shop?.currencyCode });
      const savedItems = []; for (let index = 0; index < selected.length; index += 1) { const item = selected[index]; const saved = await upsert(admin, 'consignment_item', item.handle, itemFields(item, { paidOut: true, payoutId, payoutDate, payoutMethod: method, payoutReference: reference, payoutNote: note, payoutAmount: earnings[index], payoutTotal, payoutAdjustment: adjustment })); savedItems.push(mapItem(saved)); }
      return Response.json({ payout: { id: payoutId, consignorId: consignor.id, date: payoutDate, method, reference, note, adjustment, total: payoutTotal, itemIds: selectedIds }, items: savedItems });
    }
    if (request.method === 'DELETE' && body.operation === 'deleteItem') {
      const existing = current.items.find((entry) => entry.id === body.itemId); if (!existing) return Response.json({ error: 'Item not found' }, { status: 404 }); if (existing.shopifyProductId) { const deleted = await adminGraphql(admin, PRODUCT_DELETE_MUTATION, { input: { id: existing.shopifyProductId } }); assertNoErrors(deleted.productDelete, 'Could not delete the linked Shopify product'); } await remove(admin, body.itemId); return Response.json({ deletedId: body.itemId, deletedProductId: existing.shopifyProductId || null });
    }
    return Response.json({ error: 'Unsupported operation' }, { status: 400 });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}
