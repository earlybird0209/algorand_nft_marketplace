import React from 'react'
import { useEffect, useState, useContext } from "react";
import WalletContext from '../context/WalletContext';
import Header from '../src/components/header';

export default function test() {
  let { state, dispatch } = useContext(WalletContext);
  const [nftId, setNftId] = useState(0);

  let txParamsJS = {};
  let algodClient = {};
  let indexerClient = {};
  let indexerClientMainet = {};
  let tnAccounts = [];
  let assetsList = [];
  let signedTxs;
  let tx = {};

  useEffect(() => {
    algodClient = new algosdk.Algodv2(state?.token, state?.algodServer, state?.port);
    indexerClient = new algosdk.Indexer(state?.token, state?.indexerServer, state?.port);
    indexerClientMainet = new algosdk.Indexer(state?.token, state?.indexerServerMainet, state?.port);
  }, [algodClient, indexerClient, indexerClientMainet])

  // read global state of application
  const readGlobalState = async () => {
    const index = +(process.env.NEXT_PUBLIC_CONTRACT_APPLICATION_ID)
    try {
      let applicationInfoResponse = await algodClient.getApplicationByID(index).do();
      let globalState = applicationInfoResponse['params']['global-state']
      console.log(globalState)
      console.log("Owner", decodeURIComponent(escape(window.atob(globalState[0]?.key))))
      return globalState.map((state) => {
        return state
      })
    } catch (err) {
      console.log(err)
    }
  }

  // get balance of account address 
  const checkContractBalance = async () => {
    let address = process.env.NEXT_PUBLIC_CONTRACT_APPLICATION_ADDRESS

    try {
      const accountInfo = await algodClient.accountInformation(address).do();
      console.log("Account info:", accountInfo)
    } catch (err) {
      console.log(err)
    }
  }

  // call application with arguments
  const buyTokenFromContract = async (sender, index) => {
    try {
      let myAlgoConnect = new MyAlgoConnect();

      let buyAsset = "buyAsset"

      const appArgs = []
      appArgs.push(
        new Uint8Array(Buffer.from(buyAsset)),
      )
      let params = await algodClient.getTransactionParams().do()
      params.fee = 1000;
      params.flatFee = true;

      // create unsigned transaction
      let txn =
        algosdk.makeApplicationNoOpTxn(
          state?.user?.account,
          params,
          +(process.env.NEXT_PUBLIC_CONTRACT_APPLICATION_ID),
          appArgs,
          undefined,
          undefined,
          [+(process.env.NEXT_PUBLIC_CONTRACT_TOKEN_ID)]
        )

      let txId = txn.txID().toString();

      if (state?.user?.wallet == "myalgo") {
        myAlgoConnect.signTransaction(txn.toByte())
          .then((signedTxs) => {
            algodClient.sendRawTransaction(signedTxs.blob).do()
              .then(async (txn) => {
                console.log("Txn", txn)
                const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
                console.log("confirmed" + confirmedTxn)
                console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
              })
              .catch((err) => {
                if (err.toString().includes("overspend")) {
                  console.error("error", err);
                  return;
                } else {
                  console.error("error", err);
                  return;
                }
              })
          })
          .catch((err) => {
            console.log("Error", err)
          })
      } else {

        // Use the AlgoSigner encoding library to make the transactions base64
        const txn_b64 = AlgoSigner.encoding.msgpackToBase64(txn.toByte());

        AlgoSigner.signTxn([{ txn: txn_b64 }])
          .then((d) => {
            signedTxs = d;
            // console.log("signedTxs", d)

            AlgoSigner.send({
              ledger: 'TestNet',
              tx: signedTxs[0].blob
            })
              .then(async (d) => {
                tx = d;
                console.log("Sended Tx", d)
                const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
                console.log("confirmed" + confirmedTxn)
                console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
              })
              .catch((e) => {
                console.log("error", e)
              })
          })
          .catch((e) => {
            console.log("error", e)
          })
      }

    } catch (err) {
      console.log(err)
    }
  }


  const claimNftReward = async (e) => {
    e.preventDefault();
    const data = {
      assetId: nftId,
      receiverAddr: state?.user?.account
    }

    fetch(`${state?.serverUrl}/claim-reward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        console.log("Response", response)

      })
      .catch((error) => {
        console.log("error",)
      })

  }


  return (
    <>
      <Header />
      {
        (state?.user?.wallet && state?.user?.account) &&
        (
          <>
            <button onClick={checkContractBalance}>Contract Balance</button>
            <hr />
            <button onClick={readGlobalState}>Read Global State</button>
            <hr />
            <button onClick={buyTokenFromContract}>Contract buy token</button>

            <hr />
            <hr />
            <h1>Staking Reward form</h1>
            <form onSubmit={claimNftReward}>
              <input required onChange={(e) => setNftId(e.target.value)} />
              <button type='submit'>Claim my reward my nft</button>
            </form>



          </>
        )
      }

    </>
  )
}
