import { useRouter } from "next/router";
import { useEffect, useState, useContext } from "react";
import WalletContext from "../../context/WalletContext";
import Header from "../../src/components/header";
import LoadingButton from "../../src/components/LoadingButton";
import { getEachAssetInfo, getStakingAssetDetails, getAllUserAssets, getAllEscrowAssets, algoToMicroAlgo, microAlgoToAlgo, getAssetDetailsDb } from "../../src/helpers";

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PeraWalletConnect } from "@perawallet/connect";
export default function Te({ asset }) {
  let { state, dispatch } = useContext(WalletContext);
  const router = useRouter();
  const [assetInfo, setAssetInfo] = useState(null);
  const [currentUserAssets, setCurrentUserAssets] = useState([]);
  const [assetDbInfo, setAssetDbInfo] = useState([]);
  const [isCurrentUserAsset, setIsCurrentUserAsset] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isListing, setIsListing] = useState(false);
  const [confirmListing, setConfirmListing] = useState(false);
  const [isListed, setIsListed] = useState(false);
  const [unListed, setUnListed] = useState(false);
  const [isEscrowHaveThisAsset, setIsEscrowHaveThisAsset] = useState();
  const [isEscrowHaveThisAssetWithZeroAmount, setIsEscrowHaveThisAssetWithZeroAmount] = useState(false);
  const [loadingButton, setLoadingButton] = useState(true);
  const [listingPrice, setListingPrice] = useState("");
  const [isFeaturing, setIsFeaturing] = useState(false);
  const [alreadyFeatured, setAlreadyFeatured] = useState(false);
  const [remainingClaimedReward, setRemainingClaimedReward] = useState(0);
  const [listingPriceError, setListingPriceError] = useState({
    isValid: true,
    message: ''
  });
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [showConfirmListing, setShowConfirmListing] = useState(false);
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
      let temp = await getEachAssetInfo(state, assetId)

      const stakingDetailsFromDb = await getStakingAssetDetails(state);
      const thisAsset = stakingDetailsFromDb.filter((eachAsset) => eachAsset.assetId == assetId)[0];
      if(thisAsset){
        const differenceInMilliSeconds = new Date() - new Date(thisAsset?.lastClaimedAt)
        const differenceInDays = Math.floor(((differenceInMilliSeconds / 1000) / 3600) / 24);
        setRemainingClaimedReward(differenceInDays);
      }

      let assetDetailsFromDb = await getAssetDetailsDb(state)
      setAssetDbInfo(assetDetailsFromDb.filter((eachAsset) => eachAsset.assetId == assetId));
      let thisAssetInDb = assetDetailsFromDb.filter((eachAsset) => eachAsset.assetId == assetId)[0];
      if (thisAssetInDb) {
        let isFeaturedInDB = thisAssetInDb["isFeatured"];
        setAlreadyFeatured(isFeaturedInDB);
      } else {
        setAlreadyFeatured(false);
      }

      const user_assets = await getAllUserAssets(state);
      
      if(user_assets){
        if(assetDetailsFromDb || user_assets){
          setIsCurrentUserAsset( assetDetailsFromDb.filter((eachAsset) => eachAsset.assetId == assetId && eachAsset.owner === state?.user?.account).length > 0 || user_assets.assets.filter(asset => asset['asset-id'] === +assetId && asset['amount'] > 0).length > 0);
        }
        if(!(assetDetailsFromDb && assetDetailsFromDb.filter((eachAsset) => eachAsset.assetId == assetId && eachAsset.owner === state?.user?.account).length) && !(user_assets && user_assets.assets.filter(asset => asset['asset-id'] === +assetId && asset['amount'] > 0).length)
        ){
          router.push("/asset/"+assetId);
          return;
        }

        setCurrentUserAssets(user_assets?.assets);
      }

      setCurrentUserAssets(user_assets?.assets);

      setAssetInfo(temp.assets[0])
      setIsLoading(false)
    }
    if (assetId) {
      getInfo()
    }
  }, [assetId])

  useEffect(() => {

    algodClient = new algosdk.Algodv2(state?.token, state?.algodServer, state?.port);
    indexerClient = new algosdk.Indexer(state?.token, state?.indexerServer, state?.port);
    indexerClientMainet = new algosdk.Indexer(state?.token, state?.indexerServerMainet, state?.port);

  }, [algodClient, indexerClient, indexerClientMainet])

  useEffect(() => { // checking soldout or frozen

    async function soldOutFreezingCheck() {
      let data = await getAllUserAssets(state)
      data.assets = data?.assets?.filter((eachAsset) => eachAsset["asset-id"] == assetId)
      // console.log("data", data)
      if (data?.assets && data?.assets.length) {
        // if (data?.assets[0].amount <= 0) setIsSoldOut(true);
        if (data?.assets[0]["is-frozen"]) setIsFrozen(true);
      }
    }

    // async function getUserAssetInfo() {
    //   let allUserAssets = await getAllUserAssets(state);
    //   let temp = allUserAssets?.assets?.filter((eachAsset) => eachAsset["asset-id"] == assetId).length > 0;
    //   // console.log("temp", temp)
    //   // console.log("allUserAssets", allUserAssets)
    //   if (temp) setLoadingButton(false)
    //   if (!temp) setLoadingButton(false)
    //   setIsUserHaveThisAsset(temp);
    // }
    if (assetId && state?.user?.account && state?.user?.wallet) {
      soldOutFreezingCheck()
      // getUserAssetInfo()
    }
  }, [state?.user?.account, state?.user?.wallet, assetId])


  useEffect(() => {
    if (router.query["asset-id"]) {
      if ((router.query["asset-id"]).toString().length > 8) {
        // window.location.href = "/myassets"
      }
      setAssetId(router.query["asset-id"])
    }
  }, [router])

  useEffect(() => { //checking escrow already have this asset
    async function getEscrowAssetInfo() {
      let allEscrowAssets = await getAllEscrowAssets(state);
      let temp = allEscrowAssets?.assets?.filter((eachAsset) => eachAsset["asset-id"] == assetId)[0]?.amount > 0;
      // console.log("allEscrowAssets", allEscrowAssets)
      if (temp) setLoadingButton(false)
      if (!temp) setLoadingButton(false)
      setIsEscrowHaveThisAsset(temp);

      // if temp2 is true escrow will not have to opt in again
      let temp2 = allEscrowAssets?.assets?.filter((eachAsset) => eachAsset["asset-id"] == assetId).length > 0;
      setIsEscrowHaveThisAssetWithZeroAmount(temp2);

    }
    if (assetId) {
      getEscrowAssetInfo()
    }
  }, [state?.user?.account, state?.user?.wallet, assetId])


  function listMyAsset(e) {
    e.preventDefault()
    setIsListing(true);
    let myAlgoConnect = new MyAlgoConnect();
    let peraWallet = new PeraWalletConnect({shouldShowSignTxnToast: false});
    if (isEscrowHaveThisAssetWithZeroAmount) {
      setShowConfirmListing(true);
      return;
    } else {

      // getting params
      algodClient.getTransactionParams().do()
        .then((d) => {
          txParamsJS = d;
          const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: state?.user?.account,
            to: state?.escrowAddress,
            amount: 1000,
            // note: AlgoSigner.encoding.stringToByteArray(document.getElementById('note-pay').value),
            suggestedParams: { ...txParamsJS }
          });
          // myalgo
          if (state?.user?.wallet == "myalgo") {
            myAlgoConnect.signTransaction(txn.toByte())
              .then((signedTxs) => {
                algodClient.sendRawTransaction(signedTxs.blob).do()
                  .then((txn) => {
                    let data = {
                      "assetId": +assetId,
                      "receiverAddr": state?.user?.account,
                      "note": "Transferring to escrow",
                      "txn": txn
                    }
                    try {

                      fetch(`${state?.serverUrl}/escrow-opt-in`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data),
                      })
                        .then(response => response.json())
                        .then(data => {
                          if (!data?.success) {
                            setIsListing(false)
                            showToastError("Error in Listing");
                            console.error(data.message);
                            return;
                          }
                          // console.log('Success:', data);
                          setShowConfirmListing(true);
                        })
                        .catch((error) => {
                          showToastError("Error in listing");
                          setIsListing(false);
                          console.error('Error:', error);
                        });

                    }
                    catch (err) {
                      showToastError("Error in listing");
                      setIsListing(false);
                      console.error('Error:', error);
                    }
                  })
                  .catch((err) => {
                    setIsListing(false)
                    if (JSON.stringify(err).includes("overspend")) {
                      showToastError("Insufficient balance");
                      return;
                    } else {
                      showToastError("Error in featuring");
                      return;
                    }
                  })
              })
              .catch((err) => {
                setIsListing(false)
                if (err.toString().includes("cancelled")) {
                  showToastError("Operation cancelled");
                  return;
                } else {
                  console.error(err);
                  return;
                }
              })
          }
          else if (state?.user?.wallet == "perawallet") {
            const singleTx = [{ txn: txn, signers: [state?.user?.account] }];
            peraWallet.signTransaction([singleTx])
              .then((signedTxs) => {
                algodClient.sendRawTransaction(signedTxs).do()
                  .then((txn) => {
                    let data = {
                      "assetId": +assetId,
                      "receiverAddr": state?.user?.account,
                      "note": "Transferring to escrow",
                      "txn": txn
                    }
                    try {

                      fetch(`${state?.serverUrl}/escrow-opt-in`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data),
                      })
                        .then(response => response.json())
                        .then(data => {
                          if (!data?.success) {
                            setIsListing(false)
                            showToastError("Error in Listing");
                            console.error(data.message);
                            return;
                          }
                          // console.log('Success:', data);
                          setShowConfirmListing(true);
                        })
                        .catch((error) => {
                          showToastError("Error in listing");
                          setIsListing(false);
                          console.error('Error:', error);
                        });

                    }
                    catch (err) {
                      showToastError("Error in listing");
                      setIsListing(false);
                      console.error('Error:', error);
                    }
                  })
                  .catch((err) => {
                    setIsListing(false)
                    if (JSON.stringify(err).includes("overspend")) {
                      showToastError("Insufficient balance");
                      return;
                    } else {
                      showToastError("Error in featuring");
                      return;
                    }
                  })
              })
              .catch((err) => {
                setIsListing(false)
                if (err.toString().includes("cancelled")) {
                  showToastError("Operation cancelled");
                  return;
                } else {
                  console.error(err);
                  return;
                }
              })
          }
          // algosigner
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
                  .then((txn) => {
                    let data = {
                      "assetId": +assetId,
                      "receiverAddr": state?.user?.account,
                      "note": "Transferring to escrow",
                      "txn": txn
                    }
                    try {
                      fetch(`${state?.serverUrl}/escrow-opt-in`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data),
                      })
                        .then(response => response.json())
                        .then(data => {
                          if (!data?.success) {
                            setIsListing(false)
                            showToastError("Error in Listing");
                            console.error(data.message);
                            return;
                          }
                          // console.log('Success:', data);
                          setShowConfirmListing(true);
                        })
                        .catch((error) => {
                          showToastError("Error in listing");
                          setIsListing(false);
                          console.error('Error:', error);
                        });
                    }
                    catch (err) {
                      setIsListing(false)
                      showToastError("Error in Listing");
                      console.error('Error:', error);
                    }
                  })
                  .catch((err) => {
                    setIsListing(false)
                    if (err.message.includes("overspend")) {
                      showToastError("Insufficient balance");
                      return;
                    } else {
                      // console.log("Hey", err)
                      showToastError("Error in listing");
                      return;
                    }
                  })
              })
              .catch((e) => {
                setIsListing(false)
                if (e.message.includes("[RequestError.UserRejected] The extension user does not authorize the request")) {
                  showToastError("Operation cancelled");
                  return;
                } else {
                  console.error(e);
                  showToastError("Error in listing");
                  return;
                }
              })
          }
        })
        .catch((e) => {
          console.error("Error in getting params", e);
          showToastError("Error in listing");
        })
      return;
    }

  }

  async function confirmListMyAsset() {
    setConfirmListing(true);
    let myAlgoConnect = new MyAlgoConnect();
    let peraWallet = new PeraWalletConnect({shouldShowSignTxnToast: false});
    let txParamsJS = await algodClient.getTransactionParams().do() // getting params

    let escrow_address = state.escrowAddress;
    let sender = state?.user?.account;

    const txn = algosdk?.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender,
      to: escrow_address,
      assetIndex: +assetId,
      // note: AlgoSigner.encoding.stringToByteArray("Transferring asset"),
      amount: 1,
      suggestedParams: { ...txParamsJS }
    });

    if (state?.user?.wallet == "myalgo") {
      myAlgoConnect.signTransaction(txn.toByte())
        .then((signedTxs) => {
          algodClient.sendRawTransaction(signedTxs.blob).do()
            .then((txn) => {
              tx = txn
              // console.log("Sended Tx", txn)
              // console.log("Success")
              let listMyAssetData = {
                assetId,
                owner: state.user.account,
                firstOwner: assetInfo?.params["reserve"],
                price: microAlgoToAlgo(listingPrice),
                txn: tx
              }
              fetch(`${state?.serverUrl}/list-my-asset`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(listMyAssetData),
              })
                .then(response => response.json())
                .then(data => {
                  // console.log("Server response", data);
                  showToastSuccess("Listed Successfully");
                  setIsListed(true);
                  setShowConfirmListing(false);
                  setTimeout(() => {
                    // document.location.reload();
                    window.location.href = "/myassets"
                  }, 4000);
                })
                .catch((error) => {
                  console.error(error)
                  showToastError("Error in listing");
                })
                .finally(() => {
                  setIsListing(false);
                  setConfirmListing(false);
                })
            })
            .catch((err) => {
              setIsFeaturing(false);
              if (JSON.stringify(err).includes("overspend")) {
                showToastError("Insufficient balance");
                return;
              } else {
                showToastError("Error in featuring");
                return;
              }
            })
        })
        .catch((err) => {
          setConfirmListing(false);
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
          algodClient.sendRawTransaction(signedTxs).do()
            .then((txn) => {
              tx = txn
              // console.log("Sended Tx", txn)
              // console.log("Success")
              let listMyAssetData = {
                assetId,
                owner: state.user.account,
                firstOwner: assetInfo?.params["reserve"],
                price: microAlgoToAlgo(listingPrice),
                txn: tx
              }
              fetch(`${state?.serverUrl}/list-my-asset`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(listMyAssetData),
              })
                .then(response => response.json())
                .then(data => {
                  // console.log("Server response", data);
                  showToastSuccess("Listed Successfully");
                  setIsListed(true);
                  setShowConfirmListing(false);
                  setTimeout(() => {
                    // document.location.reload();
                    window.location.href = "/myassets"
                  }, 4000);
                })
                .catch((error) => {
                  console.error(error)
                  showToastError("Error in listing");
                })
                .finally(() => {
                  setIsListing(false);
                  setConfirmListing(false);
                })
            })
            .catch((err) => {
              setIsFeaturing(false);
              if (JSON.stringify(err).includes("overspend")) {
                showToastError("Insufficient balance");
                return;
              } else {
                showToastError("Error in featuring");
                return;
              }
            })
        })
        .catch((err) => {
          setConfirmListing(false);
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
              // console.log("Success")
              let listMyAssetData = {
                assetId,
                owner: state.user.account,
                firstOwner: assetInfo?.params["reserve"],
                price: microAlgoToAlgo(listingPrice),
                txn: tx
              }
              fetch(`${state?.serverUrl}/list-my-asset`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(listMyAssetData),
              })
                .then(response => response.json())
                .then(data => {
                  // console.log("Server response", data);
                  showToastSuccess("Listed Successfully");
                  setIsListed(true);
                  setTimeout(() => {
                    // document.location.reload();
                    window.location.href = "/myassets"
                  }, 4000);
                })
                .catch((error) => {
                  console.error(error)
                  showToastError("Error in listing");
                })
                .finally(() => {
                  setIsListing(false);
                  setConfirmListing(false);
                })
            })
            .catch((e) => {
              setIsFeaturing(false);
              if (err.message.includes("overspend")) {
                showToastError("Insufficient balance");
                return;
              } else {
                showToastError("Error in featuring");
                return;
              }
            })
        })
        .catch((e) => {
          setConfirmListing(false);
          if (e.message.includes("[RequestError.UserRejected] The extension user does not authorize the request")) {
            showToastError("Operation cancelled");
            return;
          } else {
            console.error(e);
            showToastError("Error in featuring");
            return;
          }
        })
    }

  }

  function unListMyAsset(e) {
    e.preventDefault();
    setIsListing(true);
    // console.log("Executing asset index: ", +assetId);

    let myAlgoConnect = new MyAlgoConnect();
    let peraWallet = new PeraWalletConnect({shouldShowSignTxnToast: false});
    // getting params
    algodClient.getTransactionParams().do()
      .then((d) => {
        txParamsJS = d;
        const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: state?.user?.account,
          to: state?.escrowAddress,
          amount: 1000,
          // note: AlgoSigner.encoding.stringToByteArray(document.getElementById('note-pay').value),
          suggestedParams: { ...txParamsJS }
        });
        // myalgo
        if (state?.user?.wallet == "myalgo") {
          myAlgoConnect.signTransaction(txn.toByte())
            .then((signedTxs) => {
              algodClient.sendRawTransaction(signedTxs.blob).do()
                .then((txn) => {
                  let data = {
                    "assetId": +assetId,
                    "receiverAddr": state?.user?.account,
                    "txn": txn
                  }
                  try {
                    fetch(`${state?.serverUrl}/un-list-my-asset`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                    })
                      .then(response => response.json())
                      .then((data) => {
                        if (!data?.success) {
                          setIsListing(false)
                          showToastError("Error in Listing");
                          console.error(data.message);
                          return;
                        }
                        showToastSuccess("Unlisted successfully");
                        setUnListed(true);
                        setTimeout(() => {
                          window.location.href = "/myassets"
                        }, 3000);
                      })
                      .catch((error) => {
                        showToastError("Error in unlisting");
                        console.error('Error:', error);
                      })
                      .finally(() => {
                        setIsListing(false)
                      })
                  }
                  catch (err) {
                    setIsListing(false)
                    showToastError("Error in Listing");
                    console.error('Error:', error);
                  }
                })
                .catch((err) => {
                  setIsListing(false)
                  if (JSON.stringify(err).includes("overspend")) {
                    showToastError("Insufficient balance");
                    return;
                  } else {
                    showToastError("Error in featuring");
                    return;
                  }
                })
            })
            .catch((err) => {
              setIsListing(false)
              if (err.toString().includes("cancelled")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(err);
                return;
              }
            })
        }

        else  if (state?.user?.wallet == "perawallet") {
          const singleTx = [{ txn: txn, signers: [state?.user?.account] }];

          peraWallet.signTransaction([singleTx])
            .then((signedTxs) => {
              algodClient.sendRawTransaction(signedTxs).do()
                .then((txn) => {
                  let data = {
                    "assetId": +assetId,
                    "receiverAddr": state?.user?.account,
                    "txn": txn
                  }
                  try {
                    fetch(`${state?.serverUrl}/un-list-my-asset`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                    })
                      .then(response => response.json())
                      .then((data) => {
                        if (!data?.success) {
                          setIsListing(false)
                          showToastError("Error in Listing");
                          console.error(data.message);
                          return;
                        }
                        showToastSuccess("Unlisted successfully");
                        setUnListed(true);
                        setTimeout(() => {
                          window.location.href = "/myassets"
                        }, 3000);
                      })
                      .catch((error) => {
                        showToastError("Error in unlisting");
                        console.error('Error:', error);
                      })
                      .finally(() => {
                        setIsListing(false)
                      })
                  }
                  catch (err) {
                    setIsListing(false)
                    showToastError("Error in Listing");
                    console.error('Error:', error);
                  }
                })
                .catch((err) => {
                  setIsListing(false)
                  if (JSON.stringify(err).includes("overspend")) {
                    showToastError("Insufficient balance");
                    return;
                  } else {
                    showToastError("Error in featuring");
                    return;
                  }
                })
            })
            .catch((err) => {
              setIsListing(false)
              if (err.toString().includes("cancelled")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(err);
                return;
              }
            })
        }
        // algosigner
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
                .then((txn) => {
                  let data = {
                    "assetId": +assetId,
                    "receiverAddr": state?.user?.account,
                    "txn": txn
                  }
                  try {
                    fetch(`${state?.serverUrl}/un-list-my-asset`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                    })
                      .then(response => response.json())
                      .then((data) => {
                        if (!data?.success) {
                          setIsListing(false)
                          showToastError("Error in Listing");
                          console.error(data.message);
                          return;
                        }
                        showToastSuccess("Unlisted successfully");
                        setUnListed(true);
                        setTimeout(() => {
                          window.location.href = "/myassets"
                        }, 3000);
                      })
                      .catch((error) => {
                        showToastError("Error in unlisting");
                        console.error('Error:', error);
                      })
                      .finally(() => {
                        setIsListing(false)
                      })
                  }
                  catch (err) {
                    setIsListing(false)
                    showToastError("Error in Listing");
                    console.error('Error:', error);
                  }
                })
                .catch((err) => {
                  setIsListing(false)
                  if (err.message.includes("overspend")) {
                    showToastError("Insufficient balance");
                    return;
                  } else {
                    // console.log("Hey", err)
                    showToastError("Error in Unlisting");
                    return;
                  }
                })
            })
            .catch((e) => {
              setIsListing(false)
              if (e.message.includes("[RequestError.UserRejected] The extension user does not authorize the request")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(e);
                showToastError("Error in Unlisting");
                return;
              }
            })
        }
      })
      .catch((error) => {
        showToastError("Error in unlisting");
        console.error('Error:', error);
      })
      .finally(() => {
        setIsListing(false)
      })
  }

  const handlePriceChange = (e) => {
    let myPattern = /^[0-9]*\.?[0-9]*$/;
    let temp = myPattern.test(e.target.value);
    if (!temp) {
      setListingPriceError((previousState) => {
        return {
          isValid: false,
          message: "Characters not allowed"
        }
      })
      return;
    }
    if (parseFloat(e.target.value) * 1000000 < 5000) {
      setListingPriceError((previousState) => {
        return {
          isValid: false,
          message: "Invalid Price"
        }
      })
      setListingPrice(e.target.value)
    } else {
      setListingPriceError((previousState) => {
        return {
          isValid: true,
          message: "Valid Price"
        }
      })
      // console.log("algoToMicroAlgo", algoToMicroAlgo(e.target.value));
      setListingPrice(e.target.value)
      return;
    }
  }

  function featureMyAsset() {
    setIsFeaturing(true);

    let myAlgoConnect = new MyAlgoConnect();
    let peraWallet = new PeraWalletConnect({shouldShowSignTxnToast: false})
    // getting params
    algodClient.getTransactionParams().do()
      .then((d) => {
        txParamsJS = d;
        const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: state?.user?.account,
          to: state?.adminAddress,
          amount: 2000000,
          // note: AlgoSigner.encoding.stringToByteArray(document.getElementById('note-pay').value),
          suggestedParams: { ...txParamsJS }
        });
        // myalgo
        if (state?.user?.wallet == "myalgo") {
          myAlgoConnect.signTransaction(txn.toByte())
            .then((signedTxs) => {
              algodClient.sendRawTransaction(signedTxs.blob).do()
                .then((txn) => {
                  let data = {
                    "txn": txn,
                    "owner": state?.user?.account,
                    "assetId": +assetId
                  }
                  try {
                    fetch(`${state?.serverUrl}/feature-my-asset`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                    })
                      .then(response => response.json())
                      .then(data => {
                        if (!data?.success) {
                          setIsFeaturing(false);
                          showToastError("Error in purchasing");
                          console.error(data.message);
                          return;
                        }
                        showToastSuccess("Featured Successfully");
                        setIsFeaturing(false);
                        // setIsFeatured(true);
                        setTimeout(() => {
                          // window.location.reload()
                        }, 4000);
                      })
                      .catch((error) => {
                        setIsFeaturing(false);
                        showToastError("Error in purchasing");
                        console.error('Error:', error);
                      })
                  }
                  catch (err) {
                    setIsFeaturing(false);
                    showToastError("Error in featuring");
                    console.error('Error:', error);
                  }
                })
                .catch((err) => {
                  setIsFeaturing(false);
                  if (JSON.stringify(err).includes("overspend")) {
                    showToastError("Insufficient balance");
                    return;
                  } else {
                    showToastError("Error in featuring");
                    return;
                  }
                })
            })
            .catch((err) => {
              setIsFeaturing(false);
              if (err.toString().includes("cancelled")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(err);
                return;
              }
            })
        }
        else if (state?.user?.wallet == "perawallet") {
          const singleTx = [{ txn: txn, signers: [state?.user?.account] }];
          peraWallet.signTransaction([singleTx])
            .then((signedTxs) => {
              algodClient.sendRawTransaction(signedTxs).do()
                .then((txn) => {
                  let data = {
                    "txn": txn,
                    "owner": state?.user?.account,
                    "assetId": +assetId
                  }
                  try {
                    fetch(`${state?.serverUrl}/feature-my-asset`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                    })
                      .then(response => response.json())
                      .then(data => {
                        if (!data?.success) {
                          setIsFeaturing(false);
                          showToastError("Error in purchasing");
                          console.error(data.message);
                          return;
                        }
                        showToastSuccess("Featured Successfully");
                        setIsFeaturing(false);
                        // setIsFeatured(true);
                        setTimeout(() => {
                          // window.location.reload()
                        }, 4000);
                      })
                      .catch((error) => {
                        setIsFeaturing(false);
                        showToastError("Error in purchasing");
                        console.error('Error:', error);
                      })
                  }
                  catch (err) {
                    setIsFeaturing(false);
                    showToastError("Error in featuring");
                    console.error('Error:', error);
                  }
                })
                .catch((err) => {
                  setIsFeaturing(false);
                  if (JSON.stringify(err).includes("overspend")) {
                    showToastError("Insufficient balance");
                    return;
                  } else {
                    showToastError("Error in featuring");
                    return;
                  }
                })
            })
            .catch((err) => {
              setIsFeaturing(false);
              if (err.toString().includes("cancelled")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(err);
                return;
              }
            })
        }
        // algosigner
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
                .then((txn) => {
                  let data = {
                    "txn": txn,
                    "owner": state?.user?.account,
                    "assetId": +assetId
                  }
                  try {
                    fetch(`${state?.serverUrl}/feature-my-asset`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(data),
                    })
                      .then(response => response.json())
                      .then(data => {
                        if (!data?.success) {
                          setIsFeaturing(false);
                          showToastError("Error in purchasing");
                          console.error(data.message);
                          return;
                        }
                        // console.log('Success:', data);
                        showToastSuccess("Featured Successfully");
                        setIsFeaturing(false);
                        // setIsFeatured(true);
                        setTimeout(() => {
                          window.location.href = "/myassets"
                        }, 3000);
                      })
                      .catch((error) => {
                        setIsFeaturing(false);
                        showToastError("Error in purchasing");
                        console.error('Error:', error);
                      })
                  }
                  catch (err) {
                    setIsFeaturing(false);
                    showToastError("Error in featuring");
                    console.error('Error:', error);
                  }
                })
                .catch((err) => {
                  setIsFeaturing(false);
                  if (err.message.includes("overspend")) {
                    showToastError("Insufficient balance");
                    return;
                  } else {
                    // console.log("Hey", err)
                    showToastError("Error in featuring");
                    return;
                  }
                })
            })
            .catch((e) => {
              setIsFeaturing(false);
              if (e.message.includes("[RequestError.UserRejected] The extension user does not authorize the request")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(e);
                showToastError("Error in featuring");
                return;
              }
            })
        }
      })
      .catch((e) => {
        showToastError("Error in featuring asset");
        setIsFeaturing(false)
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
                  {(assetInfo && assetInfo?.params["unit-name"]) ? <h2
                    style={{
                      color: assetInfo?.params["unit-name"],
                      backgroundColor: "rgb(255 255 255 / 60%)",
                      padding: "0.5em 1em",
                      borderRadius: "10px",
                      WebkitTextStroke: "1px",
                      WebkitTextStrokeColor: "#00002b66",
                    }}
                  >
                    {assetInfo?.params["unit-name"]}</h2> : null}
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

            <div className="col-lg-4">
              <aside className="sidebar sidebar--single-product">
                <div className="sidebar-card card-pricing card--pricing2">
                  <div className="price">
                    <h1 style={{ visibility: "hidden" }}>
                      <sup>A</sup>
                      <span>60.00</span>
                    </h1>
                  </div>

                  {isCurrentUserAsset ? state?.user?.wallet && state?.user?.account
                    ?
                    isLoading
                      ?
                      (
                        <div className="purchase-button" >
                          <form className="listMyAssetForm"  >
                            <input style={{ opacity: 0.5 }} disabled className="listMyAssetFormInput" />
                            <LoadingButton heading="Loading" />
                          </form>
                        </div>
                      )
                      :
                      isListing
                        ?
                        (
                          <div className="purchase-button" >
                            <form className="listMyAssetForm"  >
                              <input style={{ opacity: 0.5 }} disabled className="listMyAssetFormInput" />
                              <LoadingButton heading="Listing" />
                            </form>
                          </div>
                        )
                        :
                        isSoldOut || isFrozen ?
                          (
                            <div className="purchase-button" >
                              <form className="listMyAssetForm" >
                                <input disabled className="listMyAssetFormInput" />
                                <button disabled type="submit" className="btn btn--lg btn--round" style={{ background: "#7347c1", color: 'white' }}>Asset not available</button>
                                <p style={{ textAlign: "center", marginTop: "1em" }}>Either this asset is sold out or frozen</p>
                              </form>
                            </div>
                          )
                          :
                          isEscrowHaveThisAsset
                            ?
                            unListed
                              ?
                              (
                                <div className="purchase-button">
                                  <form onSubmit={(e) => e.preventDefault()} className="listMyAssetForm">
                                    <input disabled className="listMyAssetFormInput" />
                                    <button type="submit" className="btn btn--lg btn--round" style={{ background: "#3cb043", color: 'white' }}>Unlisted</button>
                                  </form>
                                </div>
                              )
                              :
                              alreadyFeatured ? (
                                <div className="purchase-button" >
                                  <form className="listMyAssetForm" onSubmit={unListMyAsset} >
                                    <input disabled className="listMyAssetFormInput" />
                                    <button type="submit" className="btn btn--lg btn--round" style={{ background: "#7347c1", color: 'white' }}>Unlist Asset</button>
                                  </form>
                                  {/* <button type="submit" className="btn btn--lg btn--round" style={{ marginTop: "1em", border: "3px solid goldenrod", background: "white", color: 'black' }}>Already Featured</button> */}
                                </div>
                              )
                                :
                                isFeaturing ?
                                  (
                                    <div className="purchase-button" >
                                      <form style={{ marginBottom: "1em" }} className="listMyAssetForm" onSubmit={(e) => e.preventDefault()} >
                                        <input disabled className="listMyAssetFormInput" />
                                        <button type="submit" className="btn btn--lg btn--round" style={{ background: "#7347c1", color: 'white' }}>Unlist Asset</button>
                                      </form>
                                      <LoadingButton heading="Featuring" />
                                      {/* <button type="submit" className="btn btn--lg btn--round" style={{ marginTop: "1em", border: "3px solid goldenrod", background: "white", color: 'black' }}>Featured</button> */}
                                    </div>
                                  )
                                  : (
                                    <div className="purchase-button" >
                                      <form className="listMyAssetForm" onSubmit={unListMyAsset} >
                                        <input disabled className="listMyAssetFormInput" />
                                        <button type="submit" className="btn btn--lg btn--round" style={{ background: "#7347c1", color: 'white' }}>Unlist Asset</button>
                                      </form>
                                      <button onClick={featureMyAsset} type="submit" className="btn btn--lg btn--round" style={{ marginTop: "1em", border: "3px solid goldenrod", background: "white", color: 'black' }}>Feature my asset</button>
                                    </div>
                                  )
                            :
                            isListed
                              ?
                              (
                                <div className="purchase-button" >
                                  <form onSubmit={(e) => e.preventDefault()} className="listMyAssetForm">
                                    <input disabled defaultValue={listingPrice} className="listMyAssetFormInput" />
                                    <button type="submit" className="btn btn--lg btn--round" style={{ background: "#3cb043", color: 'white' }}>Listed</button>
                                  </form>
                                </div>
                              )
                              :
                              (
                                <div className="purchase-button" >
                                  {/* final one */}
                                  <form className="input-group mb-3" onSubmit={listMyAsset} >
                                    <input
                                      type="string"
                                      defaultValue={listingPrice}
                                      onChange={handlePriceChange}
                                      className="form-control"
                                      required
                                      maxLength={8}
                                      style={{ border: !listingPriceError.isValid ? "1px solid red" : "1px solid grey" }}
                                    />
                                    <div className="input-group-append">
                                      <span className="input-group-text">A</span>
                                    </div>
                                    <small style={{ textAlign: "left", width: "100%", marginTop: "0.3em" }}>Enter price in Algo's</small>
                                    <small style={{ textAlign: "left", width: "100%", marginBottom: "0.7em" }}>Greater than or equal to 0.005</small>
                                    <span style={{ display: !listingPriceError.isValid ? "flex" : "none", color: "red", marginBottom: "1em", fontFamily: 'inherit' }}>{listingPriceError.message}</span>
                                    <button disabled={!listingPriceError.isValid ? true : false} type="submit" className="btn btn--lg btn--round" style={{ width: "100%", background: "#7347c1", color: 'white' }}>List My Asset</button>
                                  </form>

                                </div>
                              )
                    :
                    (
                      <div className="purchase-button" >
                        <form className="listMyAssetForm"  >
                          <input style={{ opacity: 0.5 }} disabled className="listMyAssetFormInput" />
                          <button disabled className="btn btn--lg btn--round" style={{ background: "#7347c1", color: 'white' }}>Wallet not connected</button>
                        </form>
                      </div>
                    ) : ""
                  }

                </div>

                <div style={{ display: showConfirmListing ? "flex" : "none" }} id="purchase-from-escrow-modal">
                  <div onClick={() => { setShowConfirmListing(false); setIsListing(false); }} className="overlay"></div>
                  <div style={{ paddingBottom: "2em", height: "fitContent", minHeight: 0 }}
                    className="global-modal_contents modal-transition">
                    <div className="global-modal-header">
                      <h3>
                        <b>Confirm Listing</b>
                      </h3>
                      <button style={{ border: "none", backgroundColor: "transparent", cursor: "pointer" }} onClick={() => { setShowConfirmListing(false); setIsListing(false); }} className="mobile-close">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                          <path
                            d="M0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256zM175 208.1L222.1 255.1L175 303C165.7 312.4 165.7 327.6 175 336.1C184.4 346.3 199.6 346.3 208.1 336.1L255.1 289.9L303 336.1C312.4 346.3 327.6 346.3 336.1 336.1C346.3 327.6 346.3 312.4 336.1 303L289.9 255.1L336.1 208.1C346.3 199.6 346.3 184.4 336.1 175C327.6 165.7 312.4 165.7 303 175L255.1 222.1L208.1 175C199.6 165.7 184.4 165.7 175 175C165.7 184.4 165.7 199.6 175 208.1V208.1z" />
                        </svg>
                      </button>
                    </div>
                    <div className="global-modal-body">
                      {
                        confirmListing
                          ?
                          <div id="purchase-from-admin-btn" style={{ backgroundColor: 'transparent' }} className="purchase-button">
                            <LoadingButton heading="Confirming" />
                          </div>
                          :
                          <div style={{ backgroundColor: "transparent" }} onClick={() => confirmListMyAsset()} id="purchase-from-escrow-btn" className="purchase-button">
                            <button className="btn btn--lg btn--round" style={{ width: "100%", background: "#7347c1" }}>Confirm Listing</button>
                          </div>
                      }
                    </div>
                  </div>
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
                        <span className="lnr lnr-gift"></span>XCOLOR
                      </p>
                      {
                        !assetInfo ?
                          <span>LOADING...</span>
                          :
                          <span>{remainingClaimedReward}</span>
                      }
                    </li>
                    <li>
                      <p>
                        <span class="lnr lnr-apartment"></span>Owned by
                      </p>
                      {
                        !assetInfo ?
                          <span>LOADING...</span>
                          :
                          assetDbInfo.length ?

                          <span>{assetDbInfo[0].owner.substring(0, 3)}...{assetDbInfo[0].owner.substring(assetDbInfo[0].owner.length - 3)}</span> :

                          currentUserAssets && currentUserAssets.filter(asset => asset['asset-id'] === +assetId && asset['amount'] > 0).length ?  

                          <span>{state.user.account.substring(0, 3)}...{state.user.account.substring(state.user.account.length - 3)}</span> : 

                          ""
                      }
                    </li>
                    <li>
                      <p>
                        <span className="lnr lnr-star mcolor2"></span>Featured
                      </p>
                      {
                        isLoading ? <span>LOADING...</span>
                          : alreadyFeatured ? <span>Yes</span> :
                            <span>No</span>
                      }
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </div >
      </section >
    </>
  )
}
