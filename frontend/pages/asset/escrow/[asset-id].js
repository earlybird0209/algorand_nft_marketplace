import { useRouter } from "next/router";
import { useEffect, useState, useContext } from "react";
import WalletContext from "../../../context/WalletContext";
import Header from "../../../src/components/header";
import LoadingButton from "../../../src/components/LoadingButton";
import { getEachAssetInfo, getAllUserAssets, getAssetDetailsDb, getAllEscrowAssets, microAlgoToAlgo, algoToMicroAlgo } from "../../../src/helpers";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PeraWalletConnect } from "@perawallet/connect";
export default function Test() {
  let { state, dispatch } = useContext(WalletContext);
  const router = useRouter();
  const [assetInfo, setAssetInfo] = useState(null);
  const [assetId, setAssetId] = useState("");
  const [isUserHaveThisAsset, setIsUserHaveThisAsset] = useState();
  const [loadingButton, setLoadingButton] = useState(true);
  const [showPurchaseAssetModal, setShowPurchaseAssetModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [optningIn, setOptningIn] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const showToastSuccess = (message) => toast.success(message);
  const showToastError = (message) => toast.error(message);

  let txParamsJS = {};
  let algodClient = {};
  let indexerClient = {};
  let indexerClientMainet = {};
  let tnAccounts = [];
  let assetsList = [];
  let signedTxs;
  let tx = {};

  useEffect(() => {
    async function getInfo() {
      let pricingDetails = await getAssetDetailsDb(state);
      if (pricingDetails) {
        let eachAssetInfo = await getEachAssetInfo(state, assetId);
        let temp = pricingDetails.filter((eachAsset) => eachAsset?.assetId == assetId)[0]
        setAssetInfo({ ...eachAssetInfo.assets[0], "pricing": { ...temp } });
        if (temp?.owner == state?.user?.account) {
          setLoadingButton(true)
          window.location.href = `/myassets/${assetId}`
        }
      }
    }
    if (assetId) {
      getInfo()
    }
  }, [assetId])

  useEffect(() => { //checking user already have this asset || // checking soldout or frozen

    async function soldOutFreezingCheck() {
      let data = await getAllEscrowAssets(state)
      data.assets = data?.assets?.filter((eachAsset) => eachAsset["asset-id"] == assetId)
      // console.log("data", data)
      if (data?.assets && data?.assets.length) {
        if (data?.assets[0].amount <= 0) setIsSoldOut(true);
        if (data?.assets[0]["is-frozen"]) setIsFrozen(true);
      }
    }

    async function getUserAssetInfo() {
      let allUserAssets = await getAllUserAssets(state);
      let temp = allUserAssets?.assets?.filter((eachAsset) => eachAsset["asset-id"] == assetId).length > 0;
      // console.log("temp", temp)
      // console.log("allUserAssets", allUserAssets)
      if (temp) setLoadingButton(false)
      if (!temp) setLoadingButton(false)
      setIsUserHaveThisAsset(temp);
    }

    if (assetId) {
      soldOutFreezingCheck()
      getUserAssetInfo()
    }

  }, [state?.user?.account, state?.user?.wallet, assetId])

  useEffect(() => {

    algodClient = new algosdk.Algodv2(state?.token, state?.algodServer, state?.port);
    indexerClient = new algosdk.Indexer(state?.token, state?.indexerServer, state?.port);
    indexerClientMainet = new algosdk.Indexer(state?.token, state?.indexerServerMainet, state?.port);

  }, [algodClient, indexerClient, indexerClientMainet])

  useEffect(() => {
    if (router.query["asset-id"]) {
      if ((router.query["asset-id"]).toString().length > 8) {
        window.location.href = "/myassets"
      }
      setAssetId(router.query["asset-id"])
    }
  }, [router])

  function optIn(note = "No note provided") { //opt in function
    setOptningIn(true);
    let myAlgoConnect = new MyAlgoConnect();
    let peraWallet = new PeraWalletConnect({shouldShowSignTxnToast: false});
    algodClient.getTransactionParams().do()
      .then((d) => {
        txParamsJS = d;

        const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: state?.user?.account,
          to: state?.user?.account,
          assetIndex: +assetId,
          // note: AlgoSigner.encoding.stringToByteArray(note),
          amount: 0,
          suggestedParams: { ...txParamsJS }
        });

        if (state?.user?.wallet == "myalgo") {
          myAlgoConnect.signTransaction(txn.toByte())
            .then((signedTxs) => {
              algodClient.sendRawTransaction(signedTxs.blob).do()
                .then((txn) => {
                  // display purchase modal
                  setShowPurchaseAssetModal(true)
                  // { txId: "IMXOKHFRXGJUBDNOHYB5H6HASYACQ3PE5R6VFWLW4QHARFWLTVTQ" }
                })
                .catch((err) => {
                  if (err.toString().includes("overspend")) {
                    showToastError("Insufficient balance");
                    console.error("error", err);
                    return;
                  } else {
                    showToastError("Error in optning in");
                    console.error("error", err);
                    return;
                  }
                })
                .finally(() => {
                  setOptningIn(false);
                })
            })
            .catch((err) => {
              setOptningIn(false);
              if (err.toString().includes("cancelled")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(err);
                return;
              }
            })
        }else if (state?.user?.wallet == "perawallet") {
          const singleTx = [{ txn: txn, signers: [state?.user?.account] }];

          peraWallet.signTransaction([singleTx])
            .then((signedTxs) => {
              algodClient.sendRawTransaction(signedTxs).do()
                .then((txn) => {
                  // display purchase modal
                  setShowPurchaseAssetModal(true)
                  // { txId: "IMXOKHFRXGJUBDNOHYB5H6HASYACQ3PE5R6VFWLW4QHARFWLTVTQ" }
                })
                .catch((err) => {
                  if (err.toString().includes("overspend")) {
                    showToastError("Insufficient balance");
                    console.error("error", err);
                    return;
                  } else {
                    showToastError("Error in optning in");
                    console.error("error", err);
                    return;
                  }
                })
                .finally(() => {
                  setOptningIn(false);
                })
            })
            .catch((err) => {
              setOptningIn(false);
              if (err.toString().includes("cancelled")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(err);
                return;
              }
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
                .then((d) => {
                  tx = d;
                  // console.log("Sended Tx", d)
                  setShowPurchaseAssetModal(true);
                })
                .catch((e) => {
                  if (e.message.includes("overspend")) {
                    showToastError("Insufficient balance");
                    console.error("error", e);
                    return;
                  } else {
                    showToastError("Error in optning in");
                    console.error(e);
                  }
                })
                .finally(() => {
                  setOptningIn(false);
                })
            })
            .catch((e) => {
              setOptningIn(false);
              if (e.message.includes("[RequestError.UserRejected] The extension user does not authorize the request")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(e);
                return;
              }
            })
        }
      })
      .catch((e) => {
        console.error(e);
      })
  }

  function purchaseFromEscrow(fromModal, price) {
    setIsPurchasing(true)
    let myAlgoConnect = new MyAlgoConnect();

    // console.log("fromModal", fromModal)
    // getting params
    algodClient.getTransactionParams().do()
      .then((d) => {
        txParamsJS = d;
        // console.log(algoToMicroAlgo(price))
        const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: state?.user?.account,
          to: state?.escrowAddress,
          amount: +price,
          // note: AlgoSigner.encoding.stringToByteArray(document.getElementById('note-pay').value),
          suggestedParams: { ...txParamsJS }
        });

        if (state?.user?.wallet == "myalgo") {
          myAlgoConnect.signTransaction(txn.toByte())
            .then((signedTxs) => {
              // console.log("test", signedTxs)
              algodClient.sendRawTransaction(signedTxs.blob).do()
                .then((txn) => {
                  // console.log("MINE", txn);
                  let data = {
                    "txn": txn,
                    "receiverAddr": state?.user?.account,
                    "buyingPrice": +price,
                    "sellerAddress": assetInfo?.pricing?.owner,
                    "assetId": +assetId
                  }
                  try {
                    fetch(`${state?.serverUrl}/receive-asset-from-escrow`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                    })
                      .then(response => response.json())
                      .then(data => {
                        // let newData = {
                        //   assetId: assetId
                        // }
                        // try {
                        //   fetch(`${state?.serverUrl}/remove-asset-from-db`, { // removing asset from ddb
                        //     method: 'POST',
                        //     headers: {
                        //       'Content-Type': 'application/json',
                        //     },
                        //     body: JSON.stringify(newData),
                        //   })
                        //     .then(response => response.json())
                        //     .then(data => {
                        // console.log('Success:', data);
                        showToastSuccess("Purchased Successfully");
                        setIsPurchasing(false);
                        setIsPurchased(true);
                        if (fromModal) {
                          setShowPurchaseAssetModal(false)
                        }
                        setTimeout(() => {
                          window.location.href = "/myassets"
                        }, 3000);
                        //     })
                        //     .catch((error) => {
                        //       setIsPurchasing(false);
                        //       showToastError("Error in purchasing");
                        //       console.error('Error:', error);
                        //     })
                        // }
                        // catch (err) {
                        //   showToastError("Error in purchasing");
                        //   console.error('Error:', error);
                        // }
                      })
                      .catch((error) => {
                        setIsPurchasing(false);
                        showToastError("Error in purchasing");
                        console.error('Error:', error);
                      })
                  }
                  catch (err) {
                    showToastError("Error in purchasing");
                    console.error('Error:', error);
                  }
                  // { txId: "IMXOKHFRXGJUBDNOHYB5H6HASYACQ3PE5R6VFWLW4QHARFWLTVTQ" }
                })
                .catch((err) => {
                  setIsPurchasing(false);
                  if (err.toString().includes("overspend")) {
                    showToastError("Insufficient balance");
                    console.error("error", err);
                    return;
                  } else {
                    showToastError("Error in purchasing");
                    console.error("error", err);
                    return;
                  }

                })
            })
            .catch((err) => {
              setIsPurchasing(false);
              if (err.toString().includes("cancelled")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(err);
                return;
              }
            })

        } else if (state?.user?.wallet == "perawallet") {
          const singleTx = [{ txn: txn, signers: [state?.user?.account] }];
          peraWallet.signTransaction([singleTx])
            .then((signedTxs) => {
              // console.log("test", signedTxs)
              algodClient.sendRawTransaction(signedTxs).do()
                .then((txn) => {
                  // console.log("MINE", txn);
                  let data = {
                    "txn": txn,
                    "receiverAddr": state?.user?.account,
                    "buyingPrice": +price,
                    "sellerAddress": assetInfo?.pricing?.owner,
                    "assetId": +assetId
                  }
                  try {
                    fetch(`${state?.serverUrl}/receive-asset-from-escrow`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                    })
                      .then(response => response.json())
                      .then(data => {
                        // let newData = {
                        //   assetId: assetId
                        // }
                        // try {
                        //   fetch(`${state?.serverUrl}/remove-asset-from-db`, { // removing asset from ddb
                        //     method: 'POST',
                        //     headers: {
                        //       'Content-Type': 'application/json',
                        //     },
                        //     body: JSON.stringify(newData),
                        //   })
                        //     .then(response => response.json())
                        //     .then(data => {
                        // console.log('Success:', data);
                        showToastSuccess("Purchased Successfully");
                        setIsPurchasing(false);
                        setIsPurchased(true);
                        if (fromModal) {
                          setShowPurchaseAssetModal(false)
                        }
                        setTimeout(() => {
                          window.location.href = "/myassets"
                        }, 3000);
                        //     })
                        //     .catch((error) => {
                        //       setIsPurchasing(false);
                        //       showToastError("Error in purchasing");
                        //       console.error('Error:', error);
                        //     })
                        // }
                        // catch (err) {
                        //   showToastError("Error in purchasing");
                        //   console.error('Error:', error);
                        // }
                      })
                      .catch((error) => {
                        setIsPurchasing(false);
                        showToastError("Error in purchasing");
                        console.error('Error:', error);
                      })
                  }
                  catch (err) {
                    showToastError("Error in purchasing");
                    console.error('Error:', error);
                  }
                  // { txId: "IMXOKHFRXGJUBDNOHYB5H6HASYACQ3PE5R6VFWLW4QHARFWLTVTQ" }
                })
                .catch((err) => {
                  setIsPurchasing(false);
                  if (err.toString().includes("overspend")) {
                    showToastError("Insufficient balance");
                    console.error("error", err);
                    return;
                  } else {
                    showToastError("Error in purchasing");
                    console.error("error", err);
                    return;
                  }

                })
            })
            .catch((err) => {
              setIsPurchasing(false);
              if (err.toString().includes("cancelled")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(err);
                return;
              }
            })

        }
        else {
          // Use the AlgoSigner encoding library to make the transactions base64
          let txn_b64 = AlgoSigner.encoding.msgpackToBase64(txn.toByte());
          AlgoSigner.signTxn([{ txn: txn_b64 }])
            .then((d) => {
              signedTxs = d;
              // console.log("signedTxs", signedTxs)
              AlgoSigner.send({
                ledger: 'TestNet',
                tx: signedTxs[0].blob
              })
                .then((d) => {
                  tx = d;
                  let data = {
                    "txn": tx,
                    "receiverAddr": state?.user?.account,
                    "buyingPrice": +price,
                    "sellerAddress": assetInfo?.pricing?.owner,
                    "assetId": +assetId
                  }
                  try {
                    fetch(`${state?.serverUrl}/receive-asset-from-escrow`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                    })
                      .then(response => response.json())
                      .then(data => {
                        // let newData = {
                        //   assetId: assetId
                        // }
                        // try {
                        //   fetch(`${state?.serverUrl}/remove-asset-from-db`, { // removing asset from ddb
                        //     method: 'POST',
                        //     headers: {
                        //       'Content-Type': 'application/json',
                        //     },
                        //     body: JSON.stringify(newData),
                        //   })
                        //     .then(response => response.json())
                        //     .then(data => {
                        // console.log('Success:', data);
                        showToastSuccess("Purchased Successfully");
                        setIsPurchasing(false);
                        setIsPurchased(true);
                        if (fromModal) {
                          setShowPurchaseAssetModal(false)
                        }
                        setTimeout(() => {
                          window.location.href = "/myassets"
                        }, 3000);
                        //     })
                        //     .catch((error) => {
                        //       setIsPurchasing(false);
                        //       showToastError("Error in purchasing");
                        //       console.error('Error:', error);
                        //     })
                        // }
                        // catch (err) {
                        //   showToastError("Error in purchasing");
                        //   console.error('Error:', error);
                        // }
                      })
                      .catch((error) => {
                        setIsPurchasing(false);
                        showToastError("Error in purchasing");
                        console.error('Error:', error);
                      })
                  }
                  catch (error) {
                    showToastError("Error in purchasing");
                    console.error('Error:', error);
                  }
                })
                .catch((e) => {
                  if (e.message.includes("overspend")) {
                    showToastError("Insufficient balance");
                    console.error("error", e);
                    return;
                  } else {
                    showToastError("Error in optning in");
                    console.error(e);
                  }
                })

            })
            .catch((e) => {
              setIsPurchasing(false);
              if (e.message.includes("[RequestError.UserRejected] The extension user does not authorize the request")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(e);
                return;
              }
            })
        }

      })
      .catch((e) => {
        console.error(e);
      })
  }

  return (
    <>
      <ToastContainer />
      <Header />
      <section className="single-product-desc">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="item-preview item-preview2">
                <div className="prev-slide" id="color-code-div"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "350px",
                    backgroundColor: (assetInfo && assetInfo?.params["unit-name"]) ? assetInfo?.params["unit-name"] : "#fff"
                  }}
                >
                  {(assetInfo && assetInfo?.params["unit-name"]) ? <h2 style={{
                    color: assetInfo?.params["unit-name"],
                    backgroundColor: "rgb(255 255 255 / 60%)",
                    padding: "0.5em 1em",
                    borderRadius: "10px",
                    WebkitTextStroke: "1px",
                    WebkitTextStrokeColor: "#00002b66",
                  }}
                  > {assetInfo?.params["unit-name"]}</h2> : null}
                  {!assetInfo && <h2 id="loading-heading">LOADING...</h2>}
                </div>
              </div>

              <div className="item-info">
                <div className="tab-content">
                  <div className="tab-pane fade show product-tab active" id="product-details">
                    <div className="tab-content-wrapper">
                      {
                        !assetInfo ?
                          <h1 style={{ padding: 0 }} id="asset-color-code-heading">LOADING...</h1>
                          : <h1 style={{ padding: 0 }} id="asset-color-code-heading">{assetInfo?.params["name"]}</h1>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: showPurchaseAssetModal ? "flex" : "none" }} id="purchase-from-escrow-modal">
              <div onClick={() => setShowPurchaseAssetModal(false)} className="overlay"></div>
              <div style={{ paddingBottom: "2em", height: "fitContent", minHeight: 0 }}
                className="global-modal_contents modal-transition">
                <div className="global-modal-header">
                  <h3>
                    <b>Buy Asset</b>
                  </h3>
                  <span onClick={() => setShowPurchaseAssetModal(false)} className="mobile-close">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                      <path
                        d="M0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256zM175 208.1L222.1 255.1L175 303C165.7 312.4 165.7 327.6 175 336.1C184.4 346.3 199.6 346.3 208.1 336.1L255.1 289.9L303 336.1C312.4 346.3 327.6 346.3 336.1 336.1C346.3 327.6 346.3 312.4 336.1 303L289.9 255.1L336.1 208.1C346.3 199.6 346.3 184.4 336.1 175C327.6 165.7 312.4 165.7 303 175L255.1 222.1L208.1 175C199.6 165.7 184.4 165.7 175 175C165.7 184.4 165.7 199.6 175 208.1V208.1z" />
                    </svg>
                  </span>
                </div>
                <div className="global-modal-body">
                  {
                    isPurchasing
                      ?
                      <div id="purchase-from-admin-btn" style={{ backgroundColor: 'none' }} className="purchase-button">
                        <LoadingButton heading="Purchasing" />
                      </div>
                      :
                      isSoldOut || isFrozen ?
                        <div style={{ backgroundColor: "transparent" }} id="purchase-from-escrow-btn" className="purchase-button">
                          <button disabled className="btn btn--lg btn--round" style={{ background: "#7347c1", color: 'white' }}>Asset not available</button>
                          <p style={{ textAlign: "center", marginTop: "1em" }}>Either this asset is sold out or frozen</p>
                        </div>
                        :
                        isPurchased
                          ?
                          <div style={{ backgroundColor: "transparent", }} id="purchased-from-escrow-btn" className="purchase-button">
                            <button className="btn btn--lg btn--round" style={{ width: "100%", background: "#3cb043" }}>Purchased</button>
                          </div>
                          :
                          <div style={{ backgroundColor: "transparent" }} onClick={() => purchaseFromEscrow(true, assetInfo?.pricing?.price)} id="purchase-from-escrow-btn" className="purchase-button">
                            <button className="btn btn--lg btn--round" style={{ width: "100%", background: "#7347c1" }}>Purchase Now</button>
                          </div>
                  }
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <aside className="sidebar sidebar--single-product">

                <div className="sidebar-card card-pricing card--pricing2">
                  <div className="price">
                    <h1>
                      <span>
                        {
                          !assetInfo || !assetInfo?.pricing ?
                            // TODO: try to put spinner here
                            <>
                              ...
                            </>
                            :
                            <>
                              {algoToMicroAlgo(assetInfo?.pricing?.price)}
                              <sup>A</sup>
                            </>
                        }

                      </span>
                    </h1>
                  </div>

                  {state?.user?.wallet && state?.user?.account
                    ?
                    loadingButton
                      ?
                      <div id="purchase-from-admin-btn" className="purchase-button">
                        <LoadingButton heading="Loading" />
                      </div>
                      :
                      isUserHaveThisAsset ?
                        isPurchasing
                          ?
                          <div id="purchase-from-admin-btn" className="purchase-button">
                            <LoadingButton heading="Purchasing" />
                          </div>
                          :
                          isSoldOut || isFrozen ?
                            <div style={{ backgroundColor: "transparent" }} id="purchase-from-escrow-btn" className="purchase-button">
                              <button disabled className="btn btn--lg btn--round" style={{ background: "#7347c1", color: 'white' }}>Asset not available</button>
                              <p style={{ textAlign: "center", marginTop: "1em" }}>Either this asset is sold out or frozen</p>
                            </div>
                            :
                            isPurchased
                              ?
                              (
                                <div id="purchased-from-admin-btn" className="purchase-button">
                                  <button className="btn btn--lg btn--round" style={{ background: "#3cb043", color: 'white' }}>Purchased</button>
                                </div>
                              )
                              :
                              (
                                <div onClick={() => purchaseFromEscrow(false, assetInfo?.pricing?.price)} id="purchase-from-admin-btn" className="purchase-button">
                                  <button className="btn btn--lg btn--round" style={{ background: "#7347c1", color: 'white' }}>Purchase Now</button>
                                </div>
                              )
                        :
                        optningIn
                          ?
                          (
                            <div className="purchase-button" >
                              <LoadingButton heading="Opting in" />
                            </div>
                          )
                          :
                          (
                            <div onClick={optIn} className="purchase-button" >
                              <button className="btn btn--lg btn--round" style={{ background: "#7347c1", color: 'white' }}>Opt in</button>
                            </div>
                          )
                    :
                    (
                      <div className="purchase-button">
                        <button disabled className="btn btn--lg btn--round" style={{ background: "#7347c1", color: 'white' }}>Wallet not connected</button>
                      </div>
                    )
                  }
                </div>

                <div className="sidebar-card card--metadata">
                  <ul className="data">
                    <li>
                      <p>
                        <span className="lnr lnr-cart pcolor"></span>Asset Id
                      </p>
                      {
                        !assetInfo ?
                          <span>LOADING...</span>
                          :
                          <span>{assetId}</span>
                      }
                    </li>
                    <li>
                      <p>
                        <span className="lnr lnr-user scolor"></span>Owned by
                      </p>
                      {
                        !assetInfo ?
                          <span>LOADING...</span>
                          :
                          <span>{assetInfo?.pricing?.owner.substring(0, 3)}...{assetInfo?.pricing?.owner.substring(assetInfo?.pricing?.owner.length - 3)}</span>
                      }
                    </li>
                    <li>
                      <p>
                        <span className="lnr lnr-star mcolor2"></span>Featured
                      </p>
                      {
                        !assetInfo ? <span>LOADING...</span>
                          : <span>{assetInfo?.pricing?.isFeatured ? "Yes" : "No"}</span>
                      }
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section >
    </>
  )
}
