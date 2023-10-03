import React, { useState } from "react";
import "../styles/globals.css";
import WalletContextWrapper from "../src/components/WalletContextWrapper";

function MyApp({ Component, pageProps }) {
  return (
    <WalletContextWrapper>
      <Component {...pageProps} />
    </WalletContextWrapper>
  );
}

export default MyApp;
