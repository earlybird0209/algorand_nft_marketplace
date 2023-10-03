import { useState, useEffect, useContext } from "react";
import ReactPaginate from "react-paginate";
import WalletContext from "../context/WalletContext";
import Header from "../src/components/header";
import LoadingButton from "../src/components/LoadingButton";
import { getAllUserAssets, getEachAssetInfo, getAssetDetailsDb, getStakingAssetDetails, getAllAdminAssets } from "../src/helpers";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PeraWalletConnect } from "@perawallet/connect"

export default function Myasset() {
  const [isLoading, setIsLoading] = useState(true);
  const [usersAssets, setUsersAssets] = useState([]);
  const [allusersAssets, setAllUsersAssets] = useState([]);
  let { state, dispatch } = useContext(WalletContext);
  const [pageCount, setPageCount] = useState([]);
  const [forceActivePageNumber, setForceActivePageNumber] = useState(0);
  const [paginationNumber, setPaginationNumber] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const showToastSuccess = (message) => toast.success(message);
  const showToastError = (message) => toast.error(message);

  useEffect(() => {
    if (state?.user?.account && state?.user?.wallet) {
      async function useEffectAsyncFunction() {

        let adminAssetsData = await getAllAdminAssets(state)

        let adminAssetIds = adminAssetsData.assets.map((eachAdminAsset) => eachAdminAsset["asset-id"]);

        let data = await getAllUserAssets(state)

        data.assets = data?.assets?.filter((eachAsset) => !eachAsset["is-frozen"] && adminAssetIds.includes(eachAsset["asset-id"]));
        setAllUsersAssets(data.assets);
      }
      useEffectAsyncFunction()
    }
  }, [state?.user?.account, state?.user?.wallet, state?.adminAddress])

  useEffect(() => {
    if (allusersAssets && allusersAssets.length) {
      setIsLoading(true);
      async function useEffectAsyncFunction() {
        const stakingDetailsFromDb = await getStakingAssetDetails(state);

        let fromDb = await getAssetDetailsDb(state);
        let mergedDataUser = [];
        for (let mainIndex = 0; mainIndex < allusersAssets.length; mainIndex++) {

          let assetAmount = allusersAssets[mainIndex].amount;
          if (assetAmount == 0) {
            let assetId = allusersAssets[mainIndex]["asset-id"];

            for (let nestedIndex = 0; nestedIndex < fromDb.length; nestedIndex++) {

              // staking details
              const thisAsset = stakingDetailsFromDb.filter((eachAsset) => eachAsset.assetId == assetId)[0];
              let differenceInDays = 0;
              if (thisAsset) {
                const differenceInMilliSeconds = new Date() - new Date(thisAsset?.lastClaimedAt)
                differenceInDays = Math.floor(((differenceInMilliSeconds / 1000) / 3600) / 24);
              }

              if ((fromDb[nestedIndex].owner == state.user.account) && (fromDb[nestedIndex].assetId == assetId)) {
                let assetInfo = await getEachAssetInfo(state, allusersAssets[mainIndex]["asset-id"])
                mergedDataUser.push({ "assetInfo": { ...allusersAssets[mainIndex] }, "assetDetails": { ...assetInfo.assets[0] }, "stakingReward": differenceInDays })
              }
            }

          } else {
            let assetId = allusersAssets[mainIndex]["asset-id"];

            // staking details
            const thisAsset = stakingDetailsFromDb.filter((eachAsset) => eachAsset.assetId == assetId)[0];
            let differenceInDays = 0;
            if (thisAsset) {
              const differenceInMilliSeconds = new Date() - new Date(thisAsset?.lastClaimedAt)
              differenceInDays = Math.floor(((differenceInMilliSeconds / 1000) / 3600) / 24);
            }
            let assetInfo = await getEachAssetInfo(state, allusersAssets[mainIndex]["asset-id"])
            mergedDataUser.push({ "assetInfo": { ...allusersAssets[mainIndex] }, "assetDetails": { ...assetInfo.assets[0] }, "stakingReward": differenceInDays })
          }
        }
        setPageCount(mergedDataUser);
        mergedDataUser = mergedDataUser.slice(paginationNumber, (paginationNumber + Number(process.env.NEXT_PUBLIC_MY_ASSETS_LIMIT_PER_PAGE)))
        setUsersAssets(mergedDataUser);
        setIsLoading(false);
      }
      useEffectAsyncFunction()
    }
  }, [allusersAssets, paginationNumber])

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

  const handlePageClick = (e) => {
    if (typeof e.nextSelectedPage !== 'undefined') {
      setForceActivePageNumber(e.nextSelectedPage);
      setPaginationNumber(e.nextSelectedPage * Number(process.env.NEXT_PUBLIC_MY_ASSETS_LIMIT_PER_PAGE));
    }
  }

  const loopLength = Math.ceil(Object.keys(usersAssets).length ? pageCount?.length / Number(process.env.NEXT_PUBLIC_MY_ASSETS_LIMIT_PER_PAGE) : 0);

  const claimReward = async (assetId, rewardAmount) => {
    setShowModal(true);

    axios.post(`${state?.serverUrl}/can-claim-reward`, { assetId: assetId, receiverAddr: state?.user?.account })
      .then((response) => {
        console.log("response", response)
        if (!response?.data?.success) {
          setShowModal(false);
          console.error("Not success");
          showToastError("Can't claim");
          return;
        }
        let myAlgoConnect = new MyAlgoConnect();
        let peraWallet = new PeraWalletConnect({shouldShowSignTxnToast: false});
        // getting params
        algodClient.getTransactionParams().do()
          .then((d) => {
            txParamsJS = d;
            const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              from: state?.user?.account,
              to: state?.contractAddress,
              amount: +1000,
              // note: AlgoSigner.encoding.stringToByteArray(document.getElementById('note-pay').value),
              suggestedParams: { ...txParamsJS }
            });

            if (state?.user?.wallet == "myalgo") {
              myAlgoConnect.signTransaction(txn.toByte())
                .then((signedTxs) => {
                  // console.log("test", signedTxs)
                  algodClient.sendRawTransaction(signedTxs.blob).do()
                    .then((txn) => {
                      axios.post(`${state?.serverUrl}/claim-reward`, { assetId: assetId, receiverAddr: state?.user?.account, txn })
                        .then((response) => {
                          console.log("Response", response);
                          showToastSuccess(`${rewardAmount} XCOLORS claimed successfully`)
                        })
                        .catch((error) => {
                          console.log("error", error?.response?.data?.message);
                          showToastError(error?.response?.data?.message);
                        })
                        .finally(() => {
                          setShowModal(false);
                        })
                    })
                    .catch((err) => {
                      setShowModal(false);
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
                  setShowModal(false);
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
                  // console.log("test", signedTxs)
                  algodClient.sendRawTransaction(signedTxs).do()
                    .then((txn) => {
                      axios.post(`${state?.serverUrl}/claim-reward`, { assetId: assetId, receiverAddr: state?.user?.account, txn })
                        .then((response) => {
                          console.log("Response", response);
                          showToastSuccess(`${rewardAmount} XCOLORS claimed successfully`)
                        })
                        .catch((error) => {
                          console.log("error", error?.response?.data?.message);
                          showToastError(error?.response?.data?.message);
                        })
                        .finally(() => {
                          setShowModal(false);
                        })
                    })
                    .catch((err) => {
                      setShowModal(false);
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
                  setShowModal(false);
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
                    .then((txn) => {
                      axios.post(`${state?.serverUrl}/claim-reward`, { assetId: assetId, receiverAddr: state?.user?.account, txn })
                        .then((response) => {
                          console.log("Response", response);
                          showToastSuccess(`${rewardAmount} XCOLORS claimed successfully`)
                        })
                        .catch((error) => {
                          console.log("error", error?.response?.data?.message);
                          showToastError(error?.response?.data?.message);
                        })
                        .finally(() => {
                          setShowModal(false);
                        })
                    })
                    .catch((e) => {
                      setShowModal(false);
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
                  setShowModal(false);
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
            setShowModal(false);
            console.error(e);
          })
      })
      .catch((error) => {
        setShowModal(false);
        console.error("error", error?.response?.data?.message);
        showToastError(error?.response?.data?.message);
      })
  }

  return (
    <>
      <ToastContainer />
      <Header></Header>
      {
        showModal && (
          <div
            style={{
              background: `rgba(255, 255, 255, 0.4)`,
              display: 'flex', alignItems: "center"
            }}
            className="overlay"
          >
            <div
              id="loading-nfts-admin-div"
              style={{ display: "flex", justifyContent: "center", padding: '4em 0' }}
              className="col-lg-12 col-md-12"
            >
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          </div>
        )
      }

      <section className="breadcrumb-area breadcrumb--center">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="page_title">
                <h3>Welcome to MartPlace Author</h3>
                <p>& Sell Your Products</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="products">
        <div className="container">
          <div id="main-nfts-user-container" className="row">
            {
              !state?.user?.wallet || !state?.user?.account ?
                (
                  <div id="loading-nfts-user-div" className="col-lg-12 col-md-12">
                    <h4>Wallet not connected</h4>
                  </div>
                )
                :
                isLoading
                  ?
                  (
                    <div
                      id="loading-nfts-admin-div"
                      style={{ display: "flex", justifyContent: "center", padding: '4em 0' }}
                      className="col-lg-12 col-md-12"
                    >
                      <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                    </div>
                  )
                  :
                  !usersAssets.length && (
                    <div id="loading-nfts-user-div" className="col-lg-12 col-md-12">
                      <h4>No NFT's Found</h4>
                    </div>
                  )
            }

            {!isLoading && usersAssets?.map((eachUserAsset, index) => {
              if (eachUserAsset?.assetInfo["is-frozen"]) { //frozen asset
                return (
                  <div key={index} className="col-lg-4 col-md-6">
                    <div className="product product--card product--card3">
                      <div className="product__thumbnail" style={{ boxShadow: "rgb(0 0 0 / 9%) 0px 2px 4px", display: "flex", justifyContent: 'center', alignItems: "center", backgroundColor: eachUserAsset?.assetDetails?.params["unit-name"] }}>
                        <h3 style={{ fontWeight: "bold" }}>Frozen</h3>
                      </div>
                      <div className="product-desc">
                        <a style={{ width: "95%" }} className="product_title">
                          <div style={{
                            wordBreak: "break-word",
                            paddingRight: "0.4em",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontSize: "22px",
                            color: "black",

                          }}
                          >
                            {eachUserAsset?.assetDetails?.params["name"]}
                          </div>
                        </a>
                        <ul className="titlebtm">
                          <li>
                            <p>
                              <a>Owned by</a>
                            </p>
                          </li>
                          <li className="product_cat">
                            <a>
                              <span className="lnr lnr-user"></span>
                              {state.user.account.substring(0, 3)}...{state.user.account.substring(state.user.account.length - 3)}
                            </a>
                          </li>
                          <br />
                          {/* <li className="product_cat"> Amount: <a>{eachUserAsset?.assetInfo?.amount}</a></li>
                          <br /> */}
                          <li className="product_cat">
                            Asset id: <a>{eachUserAsset?.assetInfo["asset-id"]}</a>
                          </li>
                          <br />
                          <li className="product_cat">
                            XCOLOR: <a>{eachUserAsset?.stakingReward}</a>
                          </li>

                        </ul>
                      </div>
                    </div>
                  </div>
                )
              }

              else {//not Sold
                return (
                  <div key={index} className="col-lg-4 col-md-6">
                    <div className="product product--card product--card3">
                      <div className="product__thumbnail" style={{ boxShadow: "rgb(0 0 0 / 9%) 0px 2px 4px", backgroundColor: eachUserAsset?.assetDetails?.params["unit-name"] }}></div>
                      <div className="product-desc">
                        <a style={{ width: "95%" }} href={`./myassets/${eachUserAsset?.assetInfo["asset-id"]}`} className="product_title">
                          <div style={{
                            wordBreak: "break-word",
                            paddingRight: "0.4em",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontSize: "22px",
                            color: "black",

                          }}
                          >
                            {eachUserAsset?.assetDetails?.params["name"]}
                          </div>
                        </a>
                        <ul className="titlebtm">
                          <li>
                            <p>
                              <a>Owned by</a>
                            </p>
                          </li>
                          <li className="product_cat">
                            <a>
                              <span className="lnr lnr-user"></span>
                              {state.user.account.substring(0, 3)}...{state.user.account.substring(state.user.account.length - 3)}
                            </a>
                          </li>
                          <br />
                          {/* <li className="product_cat"> Amount: <a>{eachUserAsset?.assetInfo?.amount}</a></li>
                          <br /> */}
                          <li className="product_cat">
                            Asset id: <a>{eachUserAsset?.assetInfo["asset-id"]}</a>
                          </li>
                          <br />
                          <li className="product_cat">
                            XCOLOR: <a>{eachUserAsset?.stakingReward}</a>
                          </li>
                          {
                            eachUserAsset?.stakingReward ?
                              (
                                <button
                                  style={{
                                    color: "white",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "#F3BA47",
                                    margin: "0 1em",
                                    padding: "0 0.7em"
                                  }}
                                  onClick={() => claimReward(eachUserAsset?.assetInfo["asset-id"], eachUserAsset?.stakingReward)}
                                >
                                  Claim
                                </button>
                              )
                              : null
                          }

                        </ul>
                      </div>
                    </div>
                  </div>
                )
              }
            })}

            {isLoading ? (
              <nav className="col-lg-12 col-md-12 mb-3" aria-label="Page navigation example">
                <ReactPaginate
                  previousLabel="< Previous"
                  nextLabel="Next >"
                  breakLabel="..."
                  pageCount={loopLength} // total number of pages to be displayed
                  marginPagesDisplayed={2} // length of numbers displayed after pagination 

                  containerClassName="disabled pagination justify-content-end"
                  pageClassName="disabled page-item btn"
                  pageLinkClassName="disabled page-link"

                  previousClassName="disabled page-item btn"
                  previousLinkClassName="disabled page-link"
                  nextClassName="disabled page-item btn"
                  nextLinkClassName="disabled page-link"

                  breakClassName="disabled page-item btn"
                  breakLinkClassName="disabled page-link"

                  activeClassName="disabled active btn"

                />
              </nav>
            ) : ""}

            {(!isLoading && loopLength) ? (
              <nav className="col-lg-12 col-md-12 mb-3" aria-label="Page navigation example">
                <ReactPaginate
                  previousLabel="< Previous"
                  nextLabel="Next >"
                  breakLabel="..."
                  pageCount={loopLength} // total number of pages to be displayed
                  marginPagesDisplayed={2} // length of numbers displayed after pagination 
                  onClick={handlePageClick}
                  forcePage={forceActivePageNumber}

                  containerClassName="pagination justify-content-end"
                  pageClassName="page-item btn"
                  pageLinkClassName="page-link"

                  previousClassName="page-item btn"
                  previousLinkClassName="page-link"
                  nextClassName="page-item btn"
                  nextLinkClassName="page-link"

                  breakClassName="page-item btn"
                  breakLinkClassName="page-link"

                  activeClassName="active btn"

                />
              </nav>
            ) : ""}

          </div>
        </div>
      </section >

    </>
  )
}
