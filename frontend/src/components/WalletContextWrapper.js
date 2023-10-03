import { useState, createContext, useReducer } from "react";
import WalletContext from "../../context/WalletContext";
import { reducer } from "../../reducer/Reducer";

const WalletContextWrapper = ({ children }) => {

  let data = {
    user: {
      // account: "KBZT7EGYVDGMXBG5MNKTGM6U3ZUHNDOYIOA2BIFB7HMS5JYIQXKBGRWPTU",
      // wallet: "myalgo"
    },
    algodServer: process.env.NEXT_PUBLIC_ALGOD_SERVER,
    indexerServer: process.env.NEXT_PUBLIC_INDEXER_SERVER,
    // indexerServerMainet: process.env.NEXT_PUBLIC_INDEXER_SERVER_MAINET,
    token: process.env.NEXT_PUBLIC_PURE_STAKE_TOKEN,
    adminAddress: process.env.NEXT_PUBLIC_ADMIN_ADDRESS,
    escrowAddress: process.env.NEXT_PUBLIC_ESCROW_ADDRESS,
    port: process.env.NEXT_PUBLIC_PORT,
    serverUrl: process.env.NEXT_PUBLIC_SERVER_URL,
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_APPLICATION_ADDRESS,
    contractApplictionId: process.env.NEXT_PUBLIC_CONTRACT_APPLICATION_ID,
    tokenId: process.env.NEXT_PUBLIC_CONTRACT_TOKEN_ID,
    peraWalletChainId: process.env.NEXT_PUBLIC_CURRENT_ENV === "dev" ? 416002 : 416001
    // adminAddress: "3HEYVAERR3GCSJTNACCWBMZZY6VCV7TOLDW2O4CACA5MLWKV7JUY3RVSPQ",   // Testnet
    // adminAddress: "IHIA5T4ZH33FGKTA6TZMFYMC4QL4AL4GAFBU4LOONMMRQHH2MI2WSOHSLU",  // Mainnet
    // adminAddress: "QFZBGJ62UDKOFML7AZFYTG7QXCLQ56UDDY2NRFGUTDFDNC6HH4SBAX2XY4",  // Bogus

    // escrowAddress: "QFZBGJ62UDKOFML7AZFYTG7QXCLQ56UDDY2NRFGUTDFDNC6HH4SBAX2XY4", // Bogus
    // escrowAddress: "4AZMMP4ZFD6OYAF4EJTJK6HIKCQZP74MANIC245N6I6S642SV4ZYC7UUU4",    // Testnet
  }

  const [state, dispatch] = useReducer(reducer, data)

  return (
    <WalletContext.Provider value={{ state, dispatch }}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContextWrapper;
