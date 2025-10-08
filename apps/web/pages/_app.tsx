"use client";

import type { ReactElement, ReactNode } from "react";
import type { AppProps } from "next/app";
import type { NextPage } from "next";

import PageProviders from "@/providers/page-providers";

import "@/components/dynamic-ui-system/css/tokens.css";
import "@/components/dynamic-ui-system/css/styles.css";
import "@/app/dynamic-ui.css";
import "@/app/globals.css";

export type NextPageWithLayout<P = Record<string, never>, IP = P> =
  & NextPage<P, IP>
  & {
    readonly getLayout?: (page: ReactElement) => ReactNode;
  };

export type AppPropsWithLayout = AppProps & {
  readonly Component: NextPageWithLayout;
};

export default function DynamicCapitalApp(
  { Component, pageProps }: AppPropsWithLayout,
) {
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);

  return (
    <PageProviders>{getLayout(<Component {...pageProps} />)}</PageProviders>
  );
}
