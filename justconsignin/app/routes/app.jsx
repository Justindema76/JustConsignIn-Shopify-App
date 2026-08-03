import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { ensureMetaobjectsInstalled } from "../metaobjects.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const setup = await ensureMetaobjectsInstalled(admin, session.shop);
  if (!setup.ok) {
    throw new Response(`Metaobject setup failed: ${setup.errors[0]?.message || "Unknown error"}`, { status: 500 });
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Consignment</s-link>
        <s-link href="/app/setup">Setup</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
