import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { ensureMetaobjectsInstalled } from "../metaobjects.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const setup = await ensureMetaobjectsInstalled(admin, session.shop);
  if (!setup.ok) {
    console.warn(`Metaobject setup skipped for ${session.shop}:`, setup.errors);
  }
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Consignment</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
