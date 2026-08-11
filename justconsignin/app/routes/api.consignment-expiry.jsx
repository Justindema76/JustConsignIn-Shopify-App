import { authenticate } from '../shopify.server';

const ITEM_QUERY = `#graphql query ConsignmentExpiryItem($id: ID!) { node(id: $id) { ... on Metaobject { id type handle } } }`;
const LIST_QUERY = `#graphql query ConsignmentExpiryItems { metaobjects(type: "consignment_item", first: 250) { nodes { id fields { key jsonValue } } } }`;
const UPSERT_MUTATION = `#graphql mutation UpdateConsignmentExpiry($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) { metaobjectUpsert(handle: $handle, metaobject: $metaobject) { metaobject { id handle } userErrors { field message code } } }`;
async function graphql(admin, query, variables = {}) { const response = await admin.graphql(query, { variables }); const payload = await response.json(); if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join(', ')); return payload.data; }

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  try { const data = await graphql(admin, LIST_QUERY); const values = Object.fromEntries((data.metaobjects?.nodes || []).map((node) => { const fields = Object.fromEntries(node.fields.map((field) => [field.key, field.jsonValue])); return [node.id, { receivedDate: fields.date_received || '', consignmentTerm: fields.consignment_term || '', expiryDate: fields.expiry_date || '' }]; })); return Response.json({ values }); }
  catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  if (request.method !== 'POST') return Response.json({ error: 'Unsupported operation' }, { status: 405 });
  try {
    const body = await request.json();
    if (!body.itemId) return Response.json({ error: 'Item id is required' }, { status: 400 });
    const data = await graphql(admin, ITEM_QUERY, { id: body.itemId }); const item = data.node;
    if (!item || item.type !== 'consignment_item') return Response.json({ error: 'Consignment item not found' }, { status: 404 });
    const fields = [];
    if (body.receivedDate) fields.push({ key: 'date_received', value: String(body.receivedDate) });
    if (body.consignmentTerm) fields.push({ key: 'consignment_term', value: String(body.consignmentTerm) });
    if (body.expiryDate) fields.push({ key: 'expiry_date', value: String(body.expiryDate) });
    if (!fields.length) return Response.json({ ok: true, unchanged: true });
    const updated = await graphql(admin, UPSERT_MUTATION, { handle: { type: 'consignment_item', handle: item.handle }, metaobject: { fields } });
    const errors = updated.metaobjectUpsert?.userErrors || []; if (errors.length) throw new Error(errors.map((error) => error.message).join(', '));
    return Response.json({ ok: true, id: updated.metaobjectUpsert.metaobject?.id || item.id });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
}
