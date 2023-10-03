import { useEffect, useState, useContext, useRef } from "react";
import Head from "next/head";
import WalletContext from "../context/WalletContext";
import Header from "../src/components/header";
import {
  getAllUserAssets,
  getEachAssetInfo,
  getAllAdminAssets,
} from "../src/helpers";
import adminJson from "../adminAssetsInfo.json";
import { ToastContainer, toast } from "react-toastify";
import { PeraWalletConnect } from "@perawallet/connect"


/**
 * Icons
 */
// import UserIcon from "public/images/svg/user.svg";
// import CartIcon from "public/images/svg/cart.svg";

const PixelArt = () => {
  let { state, dispatch } = useContext(WalletContext);

  /**
   * State declarations
   */
  const [currentColor, setCurrentColor] = useState({});
  const [tableData, setTableData] = useState({});
  const [canvasData, setCanvasData] = useState([]);
  const [tableArrayGen, setTableArrayGen] = useState([]);
  const [assets, setAssets] = useState([]);
  const [userAssets, setUsersAssets] = useState([]);
  const old_assets = useRef({});

  const [price, setPrice] = useState(1000000);
  const [allusersAssets, setAllUsersAssets] = useState([]);
  const [currentUserTokens, setCurrentUserTokens] = useState(0);

  const [currentHoverPosition, setCurrentHoverPosition] = useState("x,y");
  const [currentHoverOwner, setCurentHoverOwner] = useState("");
  const [currentHoverPrice, setCurrentHoverPrice] = useState("");

  const algodClient = {};
  const indexerClient = {};
  const indexerClientMainet = {};
  const txParamsJS = {};

  const getSavedCavas = async () => {
    await fetch(`${state.serverUrl}/get-canvas-assets`)
      .then((res) => res.json())
      .then((data) => {
        let canvasData = {};
        setCanvasData(data);
        data.forEach((item) => {
          canvasData[item.position] = { color: item.name };
        });
        setAssets([]);
        old_assets.current = JSON.parse(JSON.stringify(canvasData));
        setTableData({ ...canvasData });
      })
      .catch((err) => console.log("Error: ", err.response));
  };

  useEffect(() => {
    async function updateCanvas() {
      setTableArrayGen(new Array(32).fill(1));
      await getSavedCavas();
    }
    updateCanvas();
  }, []);

  useEffect(() => {
    algodClient = new algosdk.Algodv2(
      state?.token,
      state?.algodServer,
      state?.port
    );
    indexerClient = new algosdk.Indexer(
      state?.token,
      state?.indexerServer,
      state?.port
    );
    indexerClientMainet = new algosdk.Indexer(
      state?.token,
      state?.indexerServerMainet,
      state?.port
    );
  }, [algodClient, indexerClient, indexerClientMainet]);

  useEffect(() => {
    if (state?.user?.account && state?.user?.wallet) {
      async function useEffectAsyncFunction() {
        let adminAssetsData = await getAllAdminAssets(state);
        let adminAssetIds = adminAssetsData.assets.map(
          (eachAdminAsset) => eachAdminAsset["asset-id"]
        );

        let data = await getAllUserAssets(state);
        data.assets = data?.assets?.filter(
          (eachAsset) =>
            !eachAsset["is-frozen"] &&
            adminAssetIds.includes(eachAsset["asset-id"])
        );

        setCurrentUserTokens(
          data.assets.filter((a) => a["asset-id"] == state?.tokenId)[0]?.amount
        );

        let userAssets = data.assets.filter(
          (a) =>
            a.amount !== 0 &&
            adminJson.filter((b) => b.assetInfo["asset-id"] === a["asset-id"])
              .length === 1
        );
        let mergeData = [];
        for (
          let asset_index = 0;
          asset_index < userAssets.length;
          asset_index++
        ) {
          const asset = userAssets[asset_index];
          // let assetInfo = await getEachAssetInfo(state, asset["asset-id"]);

          let assetInfo = adminJson.filter(
            (a) => a.assetInfo["asset-id"] === asset["asset-id"]
          )[0].assetDetails;

          if (asset_index === 0) {
            setCurrentColor({
              id: assetInfo.index,
              color: assetInfo.params["unit-name"],
            });
          }
          mergeData.push({
            assetInfo: { ...userAssets[asset_index] },
            assetDetails: { ...assetInfo },
          });
        }
        setUsersAssets(mergeData);
      }
      useEffectAsyncFunction();
    }
  }, [state?.user?.account, state?.user?.wallet]);

  const buyNewCanvas = async (data) => {
    window.loadingToast = toast.loading("Please wait. Purchasing spot");
    fetch(`${state?.serverUrl}/buy-canvas-spot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then(async (data) => {
        let asset_data = await getAllUserAssets(state);
        setCurrentUserTokens(
          asset_data.assets.filter(
            (a) => a["asset-id"] == state?.tokenId
          )[0]?.amount
        );
        await getSavedCavas();
        toast.dismiss(window.loadingToast);
        toast.success("Purchased Successfully");
      })
      .catch(async (error) => {
        toast.dismiss(window.loadingToast);
        await getSavedCavas();
        console.error("Error:", error);
        toast.error("Error in purchasing");
      })
  }

  const signRawTransaction = async (signedTxs) => {
    algodClient
      .sendRawTransaction(signedTxs)
      .do()
      .then((txn) => {
        // wait for confirmation of trsaction on the server here
        // console.log("MINE", txn);
        let data = {
          txn: txn,
          receiverAddr: state?.user?.account,
          assets: assets,
        };
        buyNewCanvas(data);
        // Show toast while purchasing spot

      })
      .catch(async (err) => {
        toast.dismiss(window.loadingToast);
        await getSavedCavas();
        if (err.toString().includes("below min")) {
          toast.error("Insufficient balance");
          console.error("error", err);
          return;
        } else {
          toast.error("Error in optning in");
          console.error("error", err);
          return;
        }
      });
  }


  const purchaseSlot = async () => {
    let price = 0;
    assets.map((a) => {
      const currentOwners = canvasData.filter(
        (c) => c.position === a.canvasPosition
      ).length;

      price += currentOwners === 0 ? 1 : currentOwners + 1;
    });
    let myAlgoConnect = new MyAlgoConnect();
    let peraWallet = new PeraWalletConnect();
    algodClient
      .getTransactionParams()
      .do()
      .then(async (d) => {
        txParamsJS = d;
        const txn = await algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: state?.user?.account,
          to: state?.adminAddress,
          assetIndex: +state?.tokenId,
          amount: price,
          suggestedParams: { ...txParamsJS },
        });

        if (state?.user?.wallet == "myalgo") {
          myAlgoConnect
            .signTransaction(txn.toByte())
            .then(async (signedTxs) => {
              const broadcast = await signRawTransaction(signedTxs.blob);
            })
            .catch(async (err) => {
              await getSavedCavas();
              if (err.toString().includes("cancelled")) {
                toast.error("Operation cancelled");
                return;
              } else {
                console.error(err);
                return;
              }
            });
        } else if (state?.user?.wallet === "perawallet") {
          try {
            const singleTx = [{ txn: txn, signers: [state?.user?.account] }];
            const signedTxs = await peraWallet.signTransaction([singleTx]);
            const broadcast = await signRawTransaction(signedTxs);
          } catch (err) {
            await getSavedCavas();
            if (err.toString().includes("cancelled")) {
              toast.error("Operation cancelled");
              return;
            } else {
              console.error(err);
              return;
            }
          }
        } else {
          // Use the AlgoSigner encoding library to make the transactions base64
          let txn_b64 = AlgoSigner.encoding.msgpackToBase64(txn.toByte());
          AlgoSigner.signTxn([{ txn: txn_b64 }])
            .then((d) => {
              let signedTxs = d;
              AlgoSigner.send({
                ledger: "TestNet",
                tx: signedTxs[0].blob,
              })
                .then(async (d) => {
                  let tx = d;
                  let data = {
                    txn: tx,
                    receiverAddr: state?.user?.account,
                    assets: assets,
                  };
                  let buy_canvas = await buyNewCanvas(data);
                })
                .catch(async (e) => {
                  await getSavedCavas();
                  if (e.message.includes("below min")) {
                    toast.error("Insufficient balance");
                    console.error("error", e);
                    return;
                  } else {
                    toast.error("Error in optning in");
                    console.error(e);
                  }
                });
            })
            .catch(async (e) => {
              await getSavedCavas();
              if (
                e.message.includes(
                  "[RequestError.UserRejected] The extension user does not authorize the request"
                )
              ) {
                toast.error("Operation cancelled");
                return;
              } else {
                console.error(e);
                return;
              }
            });
        }
      })
      .catch((e) => {
        console.error(e);
      });
  };

  return (
    <>
      <Head>
        <title>Pixel Art | Xcolorand</title>
      </Head>
      <ToastContainer />
      <Header></Header>
      <main className="page">
        <div className="content-wrapper">
          <section>
            {/**------------
                Pixel Table
              --------------- */}
            <table
              id="pixel-canvas"
              style={{ height: 770, width: 642, overflow: "auto" }}
            >
              <tbody>
                {tableArrayGen.map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {tableArrayGen.map((_, colIndex) => (
                      <td
                        id={`${rowIndex}-${colIndex}`}
                        key={colIndex}
                        onMouseEnter={() => {
                          if (tableData[`${rowIndex}-${colIndex}`]) {
                            setCurrentHoverPosition(`${rowIndex}-${colIndex}`);
                            setCurentHoverOwner(
                              canvasData.filter(
                                (c) => c.position === `${rowIndex}-${colIndex}`
                              ).length === 0
                                ? state?.user?.account
                                : canvasData.filter(
                                  (c) =>
                                    c.position === `${rowIndex}-${colIndex}`
                                )[0].owner
                            );
                            setCurrentHoverPrice(
                              canvasData.filter(
                                (c) => c.position === `${rowIndex}-${colIndex}`
                              ).length + 1
                            );
                          } else {
                            setCurrentHoverPosition(`${rowIndex}-${colIndex}`);
                            setCurentHoverOwner("");
                            setCurrentHoverPrice("1");
                          }
                        }}
                        onClick={() => {
                          if (
                            state?.user?.account &&
                            state?.user?.wallet &&
                            userAssets.length > 0
                          ) {
                            tableData[`${rowIndex}-${colIndex}`] =
                              tableData[`${rowIndex}-${colIndex}`] || {};
                            tableData[`${rowIndex}-${colIndex}`].color =
                              currentColor.color;

                            setAssets((prevState, props) => {
                              let unique_positions = prevState.filter(
                                (a) =>
                                  a.canvasPosition !== `${rowIndex}-${colIndex}`
                              );

                              return [
                                ...unique_positions,
                                {
                                  canvasPosition: `${rowIndex}-${colIndex}`,
                                  assetName: currentColor.color,
                                  assetId: currentColor.id,
                                },
                              ];
                            });
                            setTableData({ ...tableData });
                          }
                        }}
                        style={{
                          background:
                            tableData?.[`${rowIndex}-${colIndex}`]?.color ||
                            "url('/images/transparent.jpg')",
                          backgroundSize: !tableData?.[
                            `${rowIndex}-${colIndex}`
                          ]?.color
                            ? "contain"
                            : "unset",
                          backgroundRepeat: !tableData?.[
                            `${rowIndex}-${colIndex}`
                          ]?.color
                            ? "no-repeat"
                            : "unset",
                        }}
                      ></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section
            className="mt-3 m-lg-0"
            style={{ width: 300, overflow: "auto" }}
          >
            {/** -------------------
              Color Palette Section
            ------------------------ */}
            <div className="color-palette">
              <p
                className="d-flex justify-content-center align-items-center m-0 text-white"
                style={{
                  height: 100,
                  backgroundColor: "#353a40",
                  fontSize: 24,
                }}
              >
                Colors
              </p>
              <div className="d-flex" style={{ flexWrap: "wrap" }}>
                {state.user.account ? (
                  userAssets
                    .filter((asset) => asset?.assetInfo?.amount !== 0)
                    .map((NFT) => (
                      <div
                        key={NFT.assetDetails.index}
                        style={{
                          border: "1px solid #000",
                          height: 32,
                          width: 30,
                          backgroundColor: NFT.assetDetails.params["unit-name"],
                          cursor: "pointer",
                          position: "relative",
                        }}
                        onClick={() => {
                          setCurrentColor({
                            id: NFT.assetDetails.index,
                            color: NFT.assetDetails.params["unit-name"],
                          });
                          document
                            .querySelectorAll(".fa-check")
                            .forEach((elem) => (elem.style.display = "none"));
                          document.querySelector(
                            `[data-color="${NFT.assetDetails.index}"]`
                          ).style.display = "block";
                        }}
                      >
                        <i
                          style={{
                            display:
                              NFT.assetDetails.index === currentColor.id
                                ? "block"
                                : "none",
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            color: "#fff",
                            strokeWidth: "30px",
                            stroke: "#000",
                          }}
                          data-color={NFT.assetDetails.index}
                          className="fa fa-check"
                          aria-hidden="true"
                        ></i>
                      </div>
                    ))
                ) : (
                  <>Please connect wallet</>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {assets.length > 0 ? (
                <>
                  <div
                    onClick={() => {
                      if (assets.length) {
                        const popped_asset = assets.pop();
                        /**
                         * (^◡^)
                         * If user overwrite some other user data then it revert it back to previous value.
                         * If the position is not occupied then old_assets.current[popped_asset.canvasPosition] is undefined
                         */
                        tableData[popped_asset.canvasPosition] =
                          old_assets.current[popped_asset.canvasPosition];

                        setAssets([...assets]);
                        setTableData({ ...tableData });
                      }
                    }}
                    className="asset_functions"
                  >
                    Undo
                  </div>
                  <div
                    className="asset_functions"
                    onClick={() => {
                      /**
                       * Remove al assets from tableData one by one.
                       * Can't just empty table data because it also holds other users assets
                       */
                      assets.forEach((asset) => {
                        tableData[asset.canvasPosition] =
                          old_assets.current[asset.canvasPosition];
                      });
                      setAssets([]);
                      setTableData({ ...tableData });
                    }}
                  >
                    Reset
                  </div>
                </>
              ) : (
                ""
              )}
            </div>

            {/** -------------------
                Description Section
            --------------------- */}
            <div
              style={{ backgroundColor: "#fff", marginTop: 16, padding: 24 }}
            >
              <section className="desc-item d-flex justify-content-between align-items-center">
                <div>
                  {/* <CartIcon style={{ height: 24, fill: "#d7d7d7" }} /> */}
                  <span className="ml-2">XCOLOR</span>
                </div>

                <p className="m-0 fw-bold">
                  {assets.length > 0
                    ? assets
                      .map((a) => {
                        return (
                          canvasData.filter(
                            (c) => c.position === a.canvasPosition
                          ).length + 1
                        );
                      })
                      .reduce((a, b) => a + b)
                    : 0}
                  /{currentUserTokens || 0}
                </p>
              </section>

              <section className="desc-item d-flex justify-content-between align-items-center">
                <div>
                  {/* <UserIcon style={{ height: 24, fill: "#d7d7d7" }} /> */}
                  <span className="ml-2">Price</span>
                </div>
                <p className="m-0 fw-bold">{currentHoverPrice} XCLR</p>
              </section>

              <section className="desc-item d-flex justify-content-between align-items-center">
                <div>
                  {/* <UserIcon style={{ height: 24, fill: "#d7d7d7" }} /> */}
                  <span className="ml-2">Info</span>
                </div>
                <p className="m-0 fw-bold">{`[${currentHoverPosition.replace(
                  "-",
                  ","
                )}]`}</p>
              </section>

              <section className="desc-item d-flex justify-content-between align-items-center">
                <div>
                  {/* <UserIcon style={{ height: 24, fill: "#d7d7d7" }} /> */}
                  <span className="ml-2">Owned by</span>
                </div>
                <p className="m-0 fw-bold">
                  {currentHoverOwner.substr(0, 4) +
                    "..." +
                    currentHoverOwner.substr(-4)}
                </p>
              </section>
              <section style={{ textAlign: "center", marginTop: 24 }}>
                {state?.user?.wallet &&
                  state?.user?.account &&
                  currentUserTokens > 0 ? (
                  <button
                    onClick={() => purchaseSlot()}
                    className="btn btn-md btn--round btn-secondary"
                  >
                    Purchase
                  </button>
                ) : (
                  ""
                )}
              </section>
            </div>
          </section>

          <style>{my_page_css}</style>
        </div>
      </main>
    </>
  );
};

export default PixelArt;

const my_page_css = `
  .page {
    background-color: #f0f1f5;
    padding: 32px;
    min-height: 100vh;
  }

  .desc-item {
    margin-top: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f0f0f0;
  }

  .desc-item span {
    font-weight: 300;
    color: #9a9a9a;
  }

  #pixel-canvas {
    border-collapse: collapse;
  }

  #pixel-canvas tr,
  #pixel-canvas td {
    border: 1px solid black;
    cursor: pointer;
  }

  tr {
    height: 24px;
  }
  td {
    width: 20px;
  }

  .content-wrapper {
    display: flex;
    justify-content: center;
    gap: 48px;
  }

    
  .asset_functions{
    color: #7347c1;
    font-weight: bold;
    font-size: 1em;
    cursor: pointer;
  }

  @media only screen and (max-width: 992px) {
    .content-wrapper {
      display: block;
    }
  }
`;
