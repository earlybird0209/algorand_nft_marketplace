import React, { useContext, useEffect, useState } from 'react'
import Head from "next/head";
import WalletContext from '../context/WalletContext';
import Footer from '../src/components/Footer'
import Header from '../src/components/header'
import { algoToMicroAlgo, getAllUserAssets, contractBalance, loadContract, microAlgoToAlgo } from '../src/helpers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingButton from '../src/components/LoadingButton';
import { PeraWalletConnect } from "@perawallet/connect"

export default function buyXcolor() {
  const { state, dispatch } = useContext(WalletContext);
  const [listingPriceError, setListingPriceError] = useState({
    isValid: true,
    message: ''
  });
  const showToastSuccess = (message) => toast.success(message);
  const showToastError = (message) => toast.error(message);
  const [isBuying, setIsBuying] = useState(false);
  const [isUserHaveThisAsset, setIsUserHaveThisAsset] = useState();

  // for global state of contract
  const [contractData, setContractData] = useState({});

  // just for price and asset amounts
  const [contractDetails, setContractDetails] = useState();
  // console.log("contractDetails", contractDetails)
  const [algoToBePaid, setAlgoToBePaid] = useState("");

  async function getContract() {
    // const contract = await loadContract(state)
    // setContractData(contract)

    const contract = await contractBalance(state)
    setContractDetails(contract)
  }
  function contractTokenAmount() {
    if (contractDetails) {
      const temp = contractDetails?.assets?.filter(eachAsset => eachAsset["asset-id"] == state.tokenId)[0]
      // console.log(temp)
      return temp.amount;
    }
  }
  function contractAlgoAmount() {
    if (contractDetails) {
      return algoToMicroAlgo(contractDetails?.amount)
    }
  }

  function resetInputBox() {
    setAlgoToBePaid("");
    setListingPriceError({
      isValid: true,
      message: ''
    })
  }

  useEffect(() => {
    getContract();
  }, [])
  useEffect(() => {
    getUserAssetInfo()
  }, [state?.user])

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
      setAlgoToBePaid(e.target.value)
    } else {
      setListingPriceError((previousState) => {
        return {
          isValid: true,
          message: "Valid Price"
        }
      })
      // console.log("algoToMicroAlgo", algoToMicroAlgo(e.target.value));
      setAlgoToBePaid(e.target.value)
      return;
    }
  }

  const checkSellingIsOn = async () => {
    // check if claiming in on by the admin
    let applicationInfoResponse = await algodClient.getApplicationByID(state?.contractApplictionId).do();
    let globalState = applicationInfoResponse['params']['global-state']
    // console.log("globalState", globalState)
    const canBuyGlobalState = globalState.filter((eachState) => eachState.key == "Y2FuQnV5")[0]
    if (canBuyGlobalState?.value?.uint == 1) {
      return true;
    } else {
      return false;
    }

  }
  async function getUserAssetInfo() {
    let allUserAssets = await getAllUserAssets(state);
    let temp = allUserAssets?.assets?.filter((eachAsset) => eachAsset["asset-id"] == process.env.NEXT_PUBLIC_CONTRACT_TOKEN_ID).length > 0;
    setIsUserHaveThisAsset(temp);
  }

  const buyTokenFromContract = async () => {
    setIsBuying(true);
    const myAlgoConnect = new MyAlgoConnect();
    const peraWallet = new PeraWalletConnect({shouldShowSignTxnToast: false});

    const isSellingisOnByOwner = await checkSellingIsOn();
    if (!isSellingisOnByOwner) {
      setIsBuying(false);
      showToastError("Selling is not on by owner of contract");
      return;
    }

    if (contractTokenAmount() < (algoToBePaid * 100)) {
      showToastError("Contract have not enough XCOLORS");
      setIsBuying(false);
      return;
    }

    if (!isUserHaveThisAsset) { // opt-in first
      console.log("Optining")
      algodClient.getTransactionParams().do()
        .then((d) => {
          txParamsJS = d;
          const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: state?.user?.account,
            to: state?.user?.account,
            assetIndex: +process.env.NEXT_PUBLIC_CONTRACT_TOKEN_ID,
            // note: AlgoSigner.encoding.stringToByteArray(note),
            amount: 0,
            suggestedParams: { ...txParamsJS }
          });

          if (state?.user?.wallet == "myalgo") {
            myAlgoConnect.signTransaction(txn.toByte())
              .then((signedTxs) => {
                algodClient.sendRawTransaction(signedTxs.blob).do()
                  .then(async (txn) => {
                    const ALGORAND_ZERO_ADDRESS_STRING = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"

                    try {
                      const appArgs = []
                      appArgs.push(
                        new Uint8Array(Buffer.from("buyToken")),
                      )
                      let params = await algodClient.getTransactionParams().do()

                      // create unsigned transaction
                      let appCallTxn = algosdk.makeApplicationNoOpTxn(state?.user?.account, params, +state?.contractApplictionId, appArgs, undefined, undefined, [+state?.tokenId])
                      let paymentTxn = algosdk.makePaymentTxnWithSuggestedParams(state?.user?.account, state?.contractAddress, +(microAlgoToAlgo(algoToBePaid) + 1000), ALGORAND_ZERO_ADDRESS_STRING, undefined, params)

                      const txns = [appCallTxn, paymentTxn]

                      const groupID = algosdk.computeGroupID(txns)
                      for (let i = 0; i < 2; i++) txns[i].group = groupID;


                      if (state?.user?.wallet == "myalgo") {
                        myAlgoConnect.signTransaction(txns.map(txn => txn.toByte()))
                          .then((signedTxs) => {
                            console.log("signedTxs", signedTxs);
                            let signed = [];
                            signed.push(signedTxs[0].blob);
                            signed.push(signedTxs[1].blob);
                            console.log("signed", signed);

                            algodClient.sendRawTransaction(signed).do()
                              .then(async (data) => {
                                let confirmedAtomicTxn = await algosdk.waitForConfirmation(algodClient, data.txId, 4);
                                //Get the completed Transaction
                                console.log("confirmed atomic Transaction " + data.txId + " confirmed in round " + confirmedAtomicTxn["confirmed-round"]);
                                showToastSuccess(`Bought ${algoToBePaid * 100} XCOLOR Successfully`);
                                setAlgoToBePaid("")
                              })
                              .catch((err) => {
                                console.log("Err===>", err)
                                if (JSON.stringify(err).includes("overspend")) {
                                  showToastError("Insufficient balance");
                                  return;
                                } else {
                                  showToastError("Error in buying token");
                                  return;
                                }
                              })
                              .finally(() => {
                                setIsBuying(false);
                              })
                          })
                          .catch((err) => {
                            console.log("Error", err)
                            setIsBuying(false);
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

                        const txn_b64_1 = AlgoSigner.encoding.msgpackToBase64(txns[0].toByte());
                        const txn_b64_2 = AlgoSigner.encoding.msgpackToBase64(txns[1].toByte());

                        AlgoSigner.signTxn([{ txn: txn_b64_1 }, { txn: txn_b64_2 }])
                          .then((d) => {
                            signedTxs = d;
                            console.log("signedTxs", d)

                            let signedTx1Binary = AlgoSigner.encoding.base64ToMsgpack(signedTxs[0].blob);
                            let signedTx2Binary = AlgoSigner.encoding.base64ToMsgpack(signedTxs[1].blob);

                            let combinedBinaryTxns = new Uint8Array(signedTx1Binary.byteLength + signedTx2Binary.byteLength);
                            combinedBinaryTxns.set(signedTx1Binary, 0);
                            combinedBinaryTxns.set(signedTx2Binary, signedTx1Binary.byteLength);

                            // Convert the combined array values back to base64
                            let combinedBase64Txns = AlgoSigner.encoding.msgpackToBase64(combinedBinaryTxns);

                            AlgoSigner.send({
                              ledger: 'TestNet',
                              tx: combinedBase64Txns
                            })
                              .then((d) => {
                                console.log("In then")
                                tx = d;
                                console.log("Sended Tx", d)
                                algosdk.waitForConfirmation(algodClient, tx.txId, 4)
                                  .then((data) => {
                                    console.log("Success")
                                    showToastSuccess(`Bought ${algoToBePaid * 100} XCOLOR Successfully`);
                                    setAlgoToBePaid("")
                                    setIsBuying(false);
                                  })
                                  .catch((e) => {
                                    setIsBuying(false);
                                    console.log("In catch")
                                    showToastError("Error in buying");
                                  })
                              })
                              .catch((e) => {
                                setIsBuying(false);
                                console.log("In catch")
                                if (e.message.includes("overspend")) {
                                  showToastError("Insufficient balance");
                                  return;
                                } else {
                                  showToastError("Error in featuring");
                                  return;
                                }
                              })
                          })
                          .catch((e) => {
                            setIsBuying(false);
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
                      return;
                    } catch (err) {
                      console.log("err===>", err)
                    }
                  })
                  .catch((err) => {
                    if (err.toString().includes("below min")) {
                      showToastError("Insufficient balance");
                      console.error("error", err);
                      return;
                    } else {
                      showToastError("Error in optning in");
                      console.error("error", err);
                      return;
                    }
                  })
              })
              .catch((err) => {
                if (err.toString().includes("cancelled")) {
                  showToastError("Operation cancelled");
                  return;
                } else {
                  console.error(err);
                  return;
                }
              })
          } else if(state?.user?.wallet === "perawallet"){
            const singleTx = [{ txn: txn, signers: [state?.user?.account] }];
            peraWallet.signTransaction([singleTx])
              .then((signedTxs) => {
                algodClient.sendRawTransaction(signedTxs).do()
                  .then(async (txn) => {
                    const ALGORAND_ZERO_ADDRESS_STRING = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"

                    try {
                      const appArgs = []
                      appArgs.push(
                        new Uint8Array(Buffer.from("buyToken")),
                      )
                      let params = await algodClient.getTransactionParams().do()

                      // create unsigned transaction
                      let appCallTxn = algosdk.makeApplicationNoOpTxn(state?.user?.account, params, +state?.contractApplictionId, appArgs, undefined, undefined, [+state?.tokenId])
                      let paymentTxn = algosdk.makePaymentTxnWithSuggestedParams(state?.user?.account, state?.contractAddress, +(microAlgoToAlgo(algoToBePaid) + 1000), ALGORAND_ZERO_ADDRESS_STRING, undefined, params)

                      const txns = [appCallTxn, paymentTxn]

                      const groupID = algosdk.computeGroupID(txns)
                      for (let i = 0; i < 2; i++) txns[i].group = groupID;


                      if (state?.user?.wallet == "myalgo") {
                        myAlgoConnect.signTransaction(txns.map(txn => txn.toByte()))
                          .then((signedTxs) => {
                            console.log("signedTxs", signedTxs);
                            let signed = [];
                            signed.push(signedTxs[0].blob);
                            signed.push(signedTxs[1].blob);
                            console.log("signed", signed);

                            algodClient.sendRawTransaction(signed).do()
                              .then(async (data) => {
                                let confirmedAtomicTxn = await algosdk.waitForConfirmation(algodClient, data.txId, 4);
                                //Get the completed Transaction
                                console.log("confirmed atomic Transaction " + data.txId + " confirmed in round " + confirmedAtomicTxn["confirmed-round"]);
                                showToastSuccess(`Bought ${algoToBePaid * 100} XCOLOR Successfully`);
                                setAlgoToBePaid("")
                              })
                              .catch((err) => {
                                console.log("Err===>", err)
                                if (JSON.stringify(err).includes("overspend")) {
                                  showToastError("Insufficient balance");
                                  return;
                                } else {
                                  showToastError("Error in buying token");
                                  return;
                                }
                              })
                              .finally(() => {
                                setIsBuying(false);
                              })
                          })
                          .catch((err) => {
                            console.log("Error", err)
                            setIsBuying(false);
                            if (err.toString().includes("cancelled")) {
                              showToastError("Operation cancelled");
                              return;
                            } else {
                              console.error(err);
                              return;
                            }
                          })
                      }else if(state?.user?.wallet === "perawallet"){
                        const groupTx = txns.map(txn => ({txn: txn, signers: [state?.user?.account]}));
                        peraWallet.signTransaction([groupTx])
                          .then((signedTxs) => {
                            algodClient.sendRawTransaction(signedTxs).do()
                              .then(async (data) => {
                                let confirmedAtomicTxn = await algosdk.waitForConfirmation(algodClient, data.txId, 4);
                                //Get the completed Transaction
                                console.log("confirmed atomic Transaction " + data.txId + " confirmed in round " + confirmedAtomicTxn["confirmed-round"]);
                                showToastSuccess(`Bought ${algoToBePaid * 100} XCOLOR Successfully`);
                                setAlgoToBePaid("")
                              })
                              .catch((err) => {
                                console.log("Err===>", err)
                                if (JSON.stringify(err).includes("overspend")) {
                                  showToastError("Insufficient balance");
                                  return;
                                } else {
                                  showToastError("Error in buying token");
                                  return;
                                }
                              })
                              .finally(() => {
                                setIsBuying(false);
                              })
                          })
                          .catch((err) => {
                            console.log("Error", err)
                            setIsBuying(false);
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

                        const txn_b64_1 = AlgoSigner.encoding.msgpackToBase64(txns[0].toByte());
                        const txn_b64_2 = AlgoSigner.encoding.msgpackToBase64(txns[1].toByte());

                        AlgoSigner.signTxn([{ txn: txn_b64_1 }, { txn: txn_b64_2 }])
                          .then((d) => {
                            signedTxs = d;
                            console.log("signedTxs", d)

                            let signedTx1Binary = AlgoSigner.encoding.base64ToMsgpack(signedTxs[0].blob);
                            let signedTx2Binary = AlgoSigner.encoding.base64ToMsgpack(signedTxs[1].blob);

                            let combinedBinaryTxns = new Uint8Array(signedTx1Binary.byteLength + signedTx2Binary.byteLength);
                            combinedBinaryTxns.set(signedTx1Binary, 0);
                            combinedBinaryTxns.set(signedTx2Binary, signedTx1Binary.byteLength);

                            // Convert the combined array values back to base64
                            let combinedBase64Txns = AlgoSigner.encoding.msgpackToBase64(combinedBinaryTxns);

                            AlgoSigner.send({
                              ledger: 'TestNet',
                              tx: combinedBase64Txns
                            })
                              .then((d) => {
                                console.log("In then")
                                tx = d;
                                console.log("Sended Tx", d)
                                algosdk.waitForConfirmation(algodClient, tx.txId, 4)
                                  .then((data) => {
                                    console.log("Success")
                                    showToastSuccess(`Bought ${algoToBePaid * 100} XCOLOR Successfully`);
                                    setAlgoToBePaid("")
                                    setIsBuying(false);
                                  })
                                  .catch((e) => {
                                    setIsBuying(false);
                                    console.log("In catch")
                                    showToastError("Error in buying");
                                  })
                              })
                              .catch((e) => {
                                setIsBuying(false);
                                console.log("In catch")
                                if (e.message.includes("overspend")) {
                                  showToastError("Insufficient balance");
                                  return;
                                } else {
                                  showToastError("Error in featuring");
                                  return;
                                }
                              })
                          })
                          .catch((e) => {
                            setIsBuying(false);
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
                      return;
                    } catch (err) {
                      console.log("err===>", err)
                    }
                  })
                  .catch((err) => {
                    if (err.toString().includes("below min")) {
                      showToastError("Insufficient balance");
                      console.error("error", err);
                      return;
                    } else {
                      showToastError("Error in optning in");
                      console.error("error", err);
                      return;
                    }
                  })
              })
              .catch((err) => {
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
                  .then(async (d) => {
                    const ALGORAND_ZERO_ADDRESS_STRING = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"

                    try {
                      const appArgs = []
                      appArgs.push(
                        new Uint8Array(Buffer.from("buyToken")),
                      )
                      let params = await algodClient.getTransactionParams().do()

                      // create unsigned transaction
                      let appCallTxn = algosdk.makeApplicationNoOpTxn(state?.user?.account, params, +state?.contractApplictionId, appArgs, undefined, undefined, [+state?.tokenId])
                      let paymentTxn = algosdk.makePaymentTxnWithSuggestedParams(state?.user?.account, state?.contractAddress, +(microAlgoToAlgo(algoToBePaid) + 1000), ALGORAND_ZERO_ADDRESS_STRING, undefined, params)

                      const txns = [appCallTxn, paymentTxn]

                      const groupID = algosdk.computeGroupID(txns)
                      for (let i = 0; i < 2; i++) txns[i].group = groupID;


                      if (state?.user?.wallet == "myalgo") {
                        myAlgoConnect.signTransaction(txns.map(txn => txn.toByte()))
                          .then((signedTxs) => {
                            console.log("signedTxs", signedTxs);
                            let signed = [];
                            signed.push(signedTxs[0].blob);
                            signed.push(signedTxs[1].blob);
                            console.log("signed", signed);

                            algodClient.sendRawTransaction(signed).do()
                              .then(async (data) => {
                                let confirmedAtomicTxn = await algosdk.waitForConfirmation(algodClient, data.txId, 4);
                                //Get the completed Transaction
                                console.log("confirmed atomic Transaction " + data.txId + " confirmed in round " + confirmedAtomicTxn["confirmed-round"]);
                                showToastSuccess(`Bought ${algoToBePaid * 100} XCOLOR Successfully`);
                                setAlgoToBePaid("")
                              })
                              .catch((err) => {
                                console.log("Err===>", err)
                                if (JSON.stringify(err).includes("overspend")) {
                                  showToastError("Insufficient balance");
                                  return;
                                } else {
                                  showToastError("Error in buying token");
                                  return;
                                }
                              })
                              .finally(() => {
                                setIsBuying(false);
                              })
                          })
                          .catch((err) => {
                            console.log("Error", err)
                            setIsBuying(false);
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

                        const txn_b64_1 = AlgoSigner.encoding.msgpackToBase64(txns[0].toByte());
                        const txn_b64_2 = AlgoSigner.encoding.msgpackToBase64(txns[1].toByte());

                        AlgoSigner.signTxn([{ txn: txn_b64_1 }, { txn: txn_b64_2 }])
                          .then((d) => {
                            signedTxs = d;
                            console.log("signedTxs", d)

                            let signedTx1Binary = AlgoSigner.encoding.base64ToMsgpack(signedTxs[0].blob);
                            let signedTx2Binary = AlgoSigner.encoding.base64ToMsgpack(signedTxs[1].blob);

                            let combinedBinaryTxns = new Uint8Array(signedTx1Binary.byteLength + signedTx2Binary.byteLength);
                            combinedBinaryTxns.set(signedTx1Binary, 0);
                            combinedBinaryTxns.set(signedTx2Binary, signedTx1Binary.byteLength);

                            // Convert the combined array values back to base64
                            let combinedBase64Txns = AlgoSigner.encoding.msgpackToBase64(combinedBinaryTxns);

                            AlgoSigner.send({
                              ledger: 'TestNet',
                              tx: combinedBase64Txns
                            })
                              .then((d) => {
                                console.log("In then")
                                tx = d;
                                console.log("Sended Tx", d)
                                algosdk.waitForConfirmation(algodClient, tx.txId, 4)
                                  .then((data) => {
                                    console.log("Success")
                                    showToastSuccess(`Bought ${algoToBePaid * 100} XCOLOR Successfully`);
                                    setAlgoToBePaid("")
                                    setIsBuying(false);
                                  })
                                  .catch((e) => {
                                    setIsBuying(false);
                                    console.log("In catch")
                                    showToastError("Error in buying");
                                  })
                              })
                              .catch((e) => {
                                setIsBuying(false);
                                console.log("In catch")
                                if (e.message.includes("overspend")) {
                                  showToastError("Insufficient balance");
                                  return;
                                } else {
                                  showToastError("Error in featuring");
                                  return;
                                }
                              })
                          })
                          .catch((e) => {
                            setIsBuying(false);
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
                      return;
                    } catch (err) {
                      console.log("err===>", err)
                    }
                  })
                  .catch((e) => {
                    if (e.message.includes("below min")) {
                      showToastError("Insufficient balance");
                      console.error("error", e);
                      return;
                    } else {
                      showToastError("Error in optning in");
                      console.error(e);
                      return;
                    }
                  })
              })
              .catch((e) => {
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
          showToastError("Error in optning");
          console.error(e);
          return;
        })
    } else {
      const ALGORAND_ZERO_ADDRESS_STRING = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"

      try {
        const appArgs = []
        appArgs.push(
          new Uint8Array(Buffer.from("buyToken")),
        )
        let params = await algodClient.getTransactionParams().do()

        // create unsigned transaction
        let appCallTxn = algosdk.makeApplicationNoOpTxn(state?.user?.account, params, +state?.contractApplictionId, appArgs, undefined, undefined, [+state?.tokenId])
        let paymentTxn = algosdk.makePaymentTxnWithSuggestedParams(state?.user?.account, state?.contractAddress, +(microAlgoToAlgo(algoToBePaid) + 1000), ALGORAND_ZERO_ADDRESS_STRING, undefined, params)

        const txns = [appCallTxn, paymentTxn]

        const groupID = algosdk.computeGroupID(txns)
        for (let i = 0; i < 2; i++) txns[i].group = groupID;


        if (state?.user?.wallet == "myalgo") {
          myAlgoConnect.signTransaction(txns.map(txn => txn.toByte()))
            .then((signedTxs) => {
              console.log("signedTxs", signedTxs);
              let signed = [];
              signed.push(signedTxs[0].blob);
              signed.push(signedTxs[1].blob);
              console.log("signed", signed);

              algodClient.sendRawTransaction(signed).do()
                .then(async (data) => {
                  let confirmedAtomicTxn = await algosdk.waitForConfirmation(algodClient, data.txId, 4);
                  //Get the completed Transaction
                  console.log("confirmed atomic Transaction " + data.txId + " confirmed in round " + confirmedAtomicTxn["confirmed-round"]);
                  showToastSuccess(`Bought ${algoToBePaid * 100} XCOLOR Successfully`);
                  setAlgoToBePaid("")
                })
                .catch((err) => {
                  console.log("Err===>", err)
                  if (JSON.stringify(err).includes("overspend")) {
                    showToastError("Insufficient balance");
                    return;
                  } else {
                    showToastError("Error in buying token");
                    return;
                  }
                })
                .finally(() => {
                  setIsBuying(false);
                })
            })
            .catch((err) => {
              console.log("Error", err)
              setIsBuying(false);
              if (err.toString().includes("cancelled")) {
                showToastError("Operation cancelled");
                return;
              } else {
                console.error(err);
                return;
              }
            })
        }else if(state?.user?.wallet === "perawallet"){
          const groupTx = txns.map(txn => ({txn: txn, signers: [state?.user?.account]}));
          peraWallet.signTransaction([groupTx])
          .then((signedTxs) => {
            console.log("signedTxs", signedTxs);
            // let signed = [];
            // signed.push(signedTxs[0].blob);
            // signed.push(signedTxs[1].blob);
            // console.log("signed", signed);

            algodClient.sendRawTransaction(signedTxs).do()
              .then(async (data) => {
                let confirmedAtomicTxn = await algosdk.waitForConfirmation(algodClient, data.txId, 4);
                //Get the completed Transaction
                console.log("confirmed atomic Transaction " + data.txId + " confirmed in round " + confirmedAtomicTxn["confirmed-round"]);
                showToastSuccess(`Bought ${algoToBePaid * 100} XCOLOR Successfully`);
                setAlgoToBePaid("")
              })
              .catch((err) => {
                console.log("Err===>", err)
                if (JSON.stringify(err).includes("overspend")) {
                  showToastError("Insufficient balance");
                  return;
                } else {
                  showToastError("Error in buying token");
                  return;
                }
              })
              .finally(() => {
                setIsBuying(false);
              })
          })
          .catch((err) => {
            console.log("Error", err)
            setIsBuying(false);
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

          const txn_b64_1 = AlgoSigner.encoding.msgpackToBase64(txns[0].toByte());
          const txn_b64_2 = AlgoSigner.encoding.msgpackToBase64(txns[1].toByte());

          AlgoSigner.signTxn([{ txn: txn_b64_1 }, { txn: txn_b64_2 }])
            .then((d) => {
              signedTxs = d;
              console.log("signedTxs", d)

              let signedTx1Binary = AlgoSigner.encoding.base64ToMsgpack(signedTxs[0].blob);
              let signedTx2Binary = AlgoSigner.encoding.base64ToMsgpack(signedTxs[1].blob);

              let combinedBinaryTxns = new Uint8Array(signedTx1Binary.byteLength + signedTx2Binary.byteLength);
              combinedBinaryTxns.set(signedTx1Binary, 0);
              combinedBinaryTxns.set(signedTx2Binary, signedTx1Binary.byteLength);

              // Convert the combined array values back to base64
              let combinedBase64Txns = AlgoSigner.encoding.msgpackToBase64(combinedBinaryTxns);

              AlgoSigner.send({
                ledger: 'TestNet',
                tx: combinedBase64Txns
              })
                .then((d) => {
                  console.log("In then")
                  tx = d;
                  console.log("Sended Tx", d)
                  algosdk.waitForConfirmation(algodClient, tx.txId, 4)
                    .then((data) => {
                      console.log("Success")
                      showToastSuccess(`Bought ${algoToBePaid * 100} XCOLOR Successfully`);
                      setAlgoToBePaid("")
                      setIsBuying(false);
                    })
                    .catch((e) => {
                      setIsBuying(false);
                      console.log("In catch")
                      showToastError("Error in buying");
                    })
                })
                .catch((e) => {
                  setIsBuying(false);
                  console.log("In catch")
                  if (e.message.includes("overspend")) {
                    showToastError("Insufficient balance");
                    return;
                  } else {
                    showToastError("Error in featuring");
                    return;
                  }
                })
            })
            .catch((e) => {
              setIsBuying(false);
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
        return;
      } catch (err) {
        console.log("err===>", err)
      }
    }

  }

  return (
    <>
      <Head>
        <title>XColorand</title>
      </Head>
      <ToastContainer />
      <Header></Header>

      <section className="breadcrumb-area">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h1 className="page-title">XCOLOR</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-area">

        <div className="dashboard_contents">
          <div className="container">
            <div className="row">
              <div className="col-md-12">
                <div className="dashboard_title_area clearfix">
                  <div className="dashboard__title pull-left">
                    <h3>XCOLOR</h3>
                  </div>

                  <div className="pull-right">
                    <a href="#" className="btn btn--round btn--md">1 A = 100 XCOLOR</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-12">
                <div className="withdraw_module cardify">
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="modules__title">
                        <h3>Available Balance</h3>
                      </div>

                      <div className="modules__content">
                        <div className="options">
                          <div className="custom-radio">
                            <input type="radio" id="opt1" className="" name="filter_opt" />
                            <label htmlFor="opt1">
                              Algo:
                              <span className="bold"> {contractAlgoAmount()}</span>
                            </label>
                          </div>

                          <div className="custom-radio">
                            <input type="radio" id="opt2" className="" name="filter_opt" />
                            <label htmlFor="opt2">
                              XCOLOR:
                              <span className="bold"> {contractTokenAmount()}</span>
                            </label>
                          </div>

                          <div className="custom-radio">
                            <input type="radio" id="opt3" className="" name="filter_opt" />
                            <label htmlFor="opt3">
                              Colors:
                              <span className="bold"> --</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="modules__title">
                        <h3>Buy XCOLOR</h3>
                      </div>

                      <div className="modules__content">
                        <div className="options">

                          <div className="withdraw_amount">
                            <div className="input-group">
                              <span className="input-group-addon">A</span>
                              <input
                                type="text"
                                id="rlicense"
                                className="text_field"
                                placeholder="0"
                                onChange={handlePriceChange}
                                value={algoToBePaid}
                                style={{ border: !listingPriceError.isValid ? "1px solid red" : "1px solid grey" }}
                              />
                              <small style={{ marginLeft: '10px' }}>Enter price in Algo's</small>

                            </div>
                            {/* <small style={{ textAlign: "left", width: "100%", marginBottom: "0.7em" }}>Greater than or equal to 0.005</small> */}
                            <span style={{ marginLeft: '10px', display: !listingPriceError.isValid ? "flex" : "none", color: "red", fontFamily: 'inherit' }}>{listingPriceError.message}</span>
                            <span className="fee">XCOLOR: {algoToBePaid * 100} $X</span>
                          </div>
                        </div>

                        <div className="button_wrapper">
                          {
                            state?.user?.account && state?.user?.wallet ?
                              isBuying
                                ?
                                <LoadingButton
                                  heading="Buying"
                                  backgroundColor="#0674ec"
                                  classes="btn btn--round btn--md"
                                  width="inherit"
                                />
                                :
                                <button
                                  onClick={buyTokenFromContract}
                                  disabled={(!listingPriceError.isValid || !algoToBePaid) ? true : false}
                                  className="btn btn--round btn--md"
                                >
                                  Buy
                                </button>
                              :
                              <button disabled type="submit" className="btn btn--round btn--md">Wallet not connected</button>
                          }
                          <button onClick={resetInputBox} className="btn btn--round btn-sm cancel_btn">Clear</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer></Footer>

    </>
  )
}

